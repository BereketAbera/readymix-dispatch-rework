#!/usr/bin/env python3
"""One sheet that shows the drawn assets at the sizes they are used, for DESIGN-NOTES.md.

The mark at 16 and 32 px on a light and a dark tab strip, the home-screen icon, and
both status glyphs at 14 px (a badge) and 28 px (the same badge on a 2x screen).
Each small export also appears blown up with hard pixel edges, which is where a
glyph that has turned to mush shows. Reads the PNGs build.sh exported to design/out/
and writes design/out/sizes.svg. Standard library only.
"""

from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "design" / "out"
FONT = "Helvetica Neue, Arial, sans-serif"


def image(x, y, size, href, pixelated=False):
    mode = ' image-rendering="optimizeSpeed"' if pixelated else ""
    return f'<image x="{x}" y="{y}" width="{size}" height="{size}"{mode} xlink:href="{href}"/>'


def label(x, y, text, fill="#52525b"):
    return f'<text x="{x}" y="{y}" font-size="12" fill="{fill}">{text}</text>'


def sheet() -> str:
    w, h = 640, 330
    parts = [
        f'<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" '
        f'width="{w}" height="{h}" viewBox="0 0 {w} {h}" font-family="{FONT}">',
        f'<rect width="{w}" height="{h}" fill="#ffffff"/>',
        label(16, 22, "Mark: favicon at 16 and 32 px on light and dark tab strips, home-screen icon at 180 px", "#18181b"),
        '<rect x="16" y="34" width="120" height="44" fill="#f1f3f4"/>',
        '<rect x="16" y="78" width="120" height="44" fill="#202124"/>',
    ]
    for y in (40, 84):
        parts += [image(30, y + 8, 16, "mark-16.png"), image(64, y, 32, "mark-32.png")]
    parts += [
        image(156, 34, 88, "mark-16.png", pixelated=True),
        image(256, 34, 88, "mark-32.png", pixelated=True),
        image(356, 34, 88, "../../src/app/apple-icon.png"),
        label(156, 140, "16 px, enlarged"),
        label(256, 140, "32 px, enlarged"),
        label(356, 140, "180 px, reduced"),
        label(16, 180, "Status glyphs: 14 px in the badge, 28 px on a 2x screen", "#18181b"),
    ]
    for i, (status, name) in enumerate((("en-route", "En route"), ("pouring", "Pouring"))):
        x = 16 + i * 310
        parts += [
            image(x, 196, 14, f"check-{status}-14.png"),
            image(x + 22, 196, 28, f"check-{status}-28.png"),
            image(x + 62, 196, 84, f"check-{status}-14.png", pixelated=True),
            image(x + 156, 196, 84, f"check-{status}-28.png", pixelated=True),
            label(x, 300, f"{name}: 14 and 28 px, then enlarged"),
        ]
    parts.append("</svg>\n")
    return "".join(parts)


def main():
    (OUT / "sizes.svg").write_text(sheet())
    print("design/previews.py: design/out/sizes.svg")


if __name__ == "__main__":
    main()
