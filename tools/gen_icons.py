#!/usr/bin/env python3
"""Erzeugt die Datenspur-Icons (Spur aus Datenpunkten) als PNGs — nur mit
der Python-Standardbibliothek (zlib + struct), keine Abhängigkeiten."""
import struct
import zlib
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "src" / "icons"
SIZES = [16, 32, 48, 128]

BG = (27, 42, 74)        # dunkles Blau
DOT = (252, 252, 251)    # Weiß der Spur-Punkte
ACCENT = (57, 135, 229)  # Akzent-Blau des Zielpunkts


def render(size: int, ss: int = 4) -> bytes:
    """Rendert das Icon mit Supersampling und gibt rohe RGBA-Bytes zurück."""
    n = size * ss
    px = bytearray(n * n * 4)
    c = (n - 1) / 2.0
    r_bg = n / 2.0 - ss * 0.5

    # Spur: Punkte wachsender Größe entlang einer sanften Kurve
    # (quadratische Bézier-Kurve von unten links nach oben rechts)
    p0 = (0.24 * n, 0.76 * n)
    ctrl = (0.34 * n, 0.34 * n)
    p2 = (0.76 * n, 0.32 * n)

    def bezier(t):
        u = 1.0 - t
        return (
            u * u * p0[0] + 2 * u * t * ctrl[0] + t * t * p2[0],
            u * u * p0[1] + 2 * u * t * ctrl[1] + t * t * p2[1],
        )

    dots = []
    for t, rf in [(0.03, 0.052), (0.36, 0.072), (0.67, 0.097), (0.99, 0.145)]:
        x, y = bezier(t)
        dots.append((x, y, rf * n))

    for y in range(n):
        for x in range(n):
            i = (y * n + x) * 4
            dx, dy = x - c, y - c
            if dx * dx + dy * dy > r_bg * r_bg:
                continue  # transparent
            col = BG
            for idx, (cx2, cy2, r) in enumerate(dots):
                ddx, ddy = x - cx2, y - cy2
                if ddx * ddx + ddy * ddy < r * r:
                    col = ACCENT if idx == len(dots) - 1 else DOT
            px[i:i + 4] = bytes((*col, 255))

    # Box-Downsampling ss×ss → size×size
    out = bytearray(size * size * 4)
    for y in range(size):
        for x in range(size):
            acc = [0, 0, 0, 0]
            for sy in range(ss):
                for sx in range(ss):
                    j = ((y * ss + sy) * n + (x * ss + sx)) * 4
                    a = px[j + 3]
                    acc[0] += px[j] * a
                    acc[1] += px[j + 1] * a
                    acc[2] += px[j + 2] * a
                    acc[3] += a
            k = (y * size + x) * 4
            if acc[3]:
                out[k] = acc[0] // acc[3]
                out[k + 1] = acc[1] // acc[3]
                out[k + 2] = acc[2] // acc[3]
            out[k + 3] = acc[3] // (ss * ss)
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
    OUT.mkdir(parents=True, exist_ok=True)
    for s in SIZES:
        write_png(OUT / f"icon-{s}.png", s, render(s))
        print(f"icon-{s}.png geschrieben")


if __name__ == "__main__":
    main()
