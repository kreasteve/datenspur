#!/usr/bin/env python3
"""Erzeugt die Datenspur-Icons aus dem offiziellen Logo
(assets/datenspur-logo.jpg): Motiv freistellen, kreisförmig maskieren,
in alle Größen verkleinern.

JPEG-Dekodierung übernimmt `sips` (macOS-Bordmittel) über den Umweg BMP;
alles Weitere ist reine Python-Standardbibliothek. Fehlt sips, bleiben
die vorhandenen PNGs unangetastet.
"""
import struct
import subprocess
import sys
import tempfile
import zlib
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
LOGO = ROOT / "assets" / "datenspur-logo.jpg"
OUT = ROOT / "src" / "icons"
SIZES = [16, 32, 48, 128]


def read_bmp(path: Path):
    """Unkomprimiertes 24/32-Bit-BMP → (breite, hoehe, pixel[y][x] = (r,g,b))."""
    data = path.read_bytes()
    if data[:2] != b"BM":
        raise ValueError("kein BMP")
    off = int.from_bytes(data[10:14], "little")
    w = int.from_bytes(data[18:22], "little", signed=True)
    h = int.from_bytes(data[22:26], "little", signed=True)
    bpp = int.from_bytes(data[28:30], "little")
    comp = int.from_bytes(data[30:34], "little")
    if bpp not in (24, 32) or comp not in (0, 3):
        raise ValueError(f"BMP-Format nicht unterstuetzt (bpp={bpp}, comp={comp})")
    bottom_up = h > 0
    h = abs(h)
    bytes_pp = bpp // 8
    row_len = ((w * bytes_pp + 3) // 4) * 4
    px = []
    for y in range(h):
        src_y = (h - 1 - y) if bottom_up else y
        base = off + src_y * row_len
        row = []
        for x in range(w):
            i = base + x * bytes_pp
            b, g, r = data[i], data[i + 1], data[i + 2]
            row.append((r, g, b))
        px.append(row)
    return w, h, px


def glyph_box(w, h, px):
    """Bounding-Box der dunklen Logo-Pixel, mit Rand, quadratisch gemacht."""
    x0, y0, x1, y1 = w, h, 0, 0
    for y in range(h):
        for x in range(w):
            r, g, b = px[y][x]
            if (r + g + b) / 3 < 200:  # Glyphe ist dunkelgrau, Hintergrund fast weiß
                if x < x0: x0 = x
                if x > x1: x1 = x
                if y < y0: y0 = y
                if y > y1: y1 = y
    if x1 <= x0:  # nichts gefunden → ganzes Bild
        return 0, 0, min(w, h)
    side = max(x1 - x0, y1 - y0)
    side = int(side * 1.36)  # großzügiger Rand, damit der Kreis nichts anschneidet
    cx, cy = (x0 + x1) // 2, (y0 + y1) // 2
    side = min(side, w, h)
    bx = max(0, min(w - side, cx - side // 2))
    by = max(0, min(h - side, cy - side // 2))
    return bx, by, side


def render(size, w, h, px, box):
    """Kreis-maskiertes, flächen-gemitteltes Downscaling → RGBA-Bytes."""
    bx, by, side = box
    out = bytearray(size * size * 4)
    cx, cy = side / 2.0, side / 2.0
    radius = side / 2.0 - side * 0.01
    r2 = radius * radius
    for ty in range(size):
        sy0 = by + int(ty * side / size)
        sy1 = by + max(sy0 - by + 1, int((ty + 1) * side / size))
        for tx in range(size):
            sx0 = bx + int(tx * side / size)
            sx1 = bx + max(sx0 - bx + 1, int((tx + 1) * side / size))
            acc = [0, 0, 0]
            inside = 0
            total = 0
            for sy in range(sy0, min(sy1, by + side)):
                for sx in range(sx0, min(sx1, bx + side)):
                    total += 1
                    dx, dy = sx - bx - cx, sy - by - cy
                    if dx * dx + dy * dy > r2:
                        continue
                    p = px[sy][sx]
                    acc[0] += p[0]; acc[1] += p[1]; acc[2] += p[2]
                    inside += 1
            k = (ty * size + tx) * 4
            if inside:
                out[k] = acc[0] // inside
                out[k + 1] = acc[1] // inside
                out[k + 2] = acc[2] // inside
                out[k + 3] = 255 * inside // total  # Kantenglättung des Kreisrands
    return bytes(out)


def write_png(path: Path, size: int, rgba: bytes) -> None:
    def chunk(tag: bytes, data: bytes) -> bytes:
        return (struct.pack(">I", len(data)) + tag + data
                + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF))

    raw = b"".join(b"\x00" + rgba[y * size * 4:(y + 1) * size * 4] for y in range(size))
    png = (b"\x89PNG\r\n\x1a\n"
           + chunk(b"IHDR", struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0))
           + chunk(b"IDAT", zlib.compress(raw, 9))
           + chunk(b"IEND", b""))
    path.write_bytes(png)


def main() -> None:
    if not LOGO.exists():
        print(f"Logo fehlt ({LOGO}) — vorhandene Icons bleiben unverändert.")
        return
    try:
        subprocess.run(["sips", "--version"], capture_output=True, check=True)
    except (OSError, subprocess.CalledProcessError):
        print("sips nicht verfügbar — vorhandene Icons bleiben unverändert.")
        return
    OUT.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory() as td:
        bmp = Path(td) / "logo.bmp"
        subprocess.run(["sips", "-s", "format", "bmp", str(LOGO), "--out", str(bmp)],
                       capture_output=True, check=True)
        w, h, px = read_bmp(bmp)
    box = glyph_box(w, h, px)
    for s in SIZES:
        write_png(OUT / f"icon-{s}.png", s, render(s, w, h, px, box))
        print(f"icon-{s}.png geschrieben (aus Logo, Ausschnitt {box[2]}px)")


if __name__ == "__main__":
    main()
