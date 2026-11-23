#!/usr/bin/env python3
"""Packs the mark's 16, 32 and 48 px PNG exports into one favicon.ico.

Older Safari versions and many link previewers ask for /favicon.ico and ignore the
SVG icon. An .ico file may hold PNG images as they are, so this only writes the
header and the directory in front of them.

Usage: python3 design/favicon_ico.py OUT.ico IN-16.png IN-32.png IN-48.png
"""

import struct
import sys
from pathlib import Path


def png_size(data: bytes) -> tuple[int, int]:
    if data[:8] != b"\x89PNG\r\n\x1a\n" or data[12:16] != b"IHDR":
        raise ValueError("not a PNG file")
    return struct.unpack(">II", data[16:24])


def main(out: str, *pngs: str) -> None:
    images = [Path(p).read_bytes() for p in pngs]
    header = struct.pack("<HHH", 0, 1, len(images))  # reserved, type 1 = icon, image count
    offset = len(header) + 16 * len(images)
    entries, blobs = b"", b""
    for data in images:
        w, h = png_size(data)
        # width and height are one byte each; 0 stands for 256
        entries += struct.pack("<BBBBHHII", w % 256, h % 256, 0, 0, 1, 32, len(data), offset)
        blobs += data
        offset += len(data)
    Path(out).write_bytes(header + entries + blobs)
    print(f"design/favicon_ico.py: {out} ({len(images)} sizes)")


if __name__ == "__main__":
    if len(sys.argv) < 3:
        sys.exit(__doc__)
    main(sys.argv[1], *sys.argv[2:])
