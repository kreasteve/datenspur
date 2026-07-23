#!/usr/bin/env python3
"""Erzeugt die WebWatch-Icons (Auge-Motiv) als PNGs — nur mit der
Python-Standardbibliothek (zlib + struct), keine Abhängigkeiten."""
import math
import struct
import zlib
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "src" / "icons"
SIZES = [16, 32, 48, 128]

BG = (27, 42, 74)        # dunkles Blau
EYE = (252, 252, 251)    # Weiß der Augenform
IRIS = (57, 135, 229)    # Akzent-Blau
PUPIL = (13, 13, 13)


def render(size: int, ss: int = 4) -> bytes:
    """Rendert das Icon mit Supersampling und gibt rohe RGBA-Bytes zurück."""
    n = size * ss
    px = bytearray(n * n * 4)
    c = (n - 1) / 2.0
    r_bg = n / 2.0 - ss * 0.5
    # Augenform: Schnitt zweier Kreise (Linsenform)
    lens_r = n * 0.62
    lens_off = n * 0.42
    iris_r = n * 0.20
    pupil_r = n * 0.095
    glint_r = n * 0.045
    glint_x, glint_y = c + iris_r * 0.35, c - iris_r * 0.35

    for y in range(n):
        for x in range(n):
            i = (y * n + x) * 4
            dx, dy = x - c, y - c
            if dx * dx + dy * dy > r_bg * r_bg:
                continue  # transparent
            col = BG
            d_top = dx * dx + (dy + lens_off) ** 2
            d_bot = dx * dx + (dy - lens_off) ** 2
            if d_top < lens_r * lens_r and d_bot < lens_r * lens_r:
                col = EYE
                d_iris = dx * dx + dy * dy
                if d_iris < iris_r * iris_r:
                    col = IRIS
                    if d_iris < pupil_r * pupil_r:
                        col = PUPIL
                    gdx, gdy = x - glint_x, y - glint_y
                    if gdx * gdx + gdy * gdy < glint_r * glint_r:
                        col = EYE
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
