#!/usr/bin/env python3
"""The link card (Open Graph image): the before and after screenshots side by side on
a dark card under the title, 1200 x 630.

Writes design/out/og.svg; build.sh exports it to src/app/opengraph-image.png. The
screenshots are linked, not copied: public/shots/before.png and after.png, the same
images the overview shows. Retake them with design/shots.mjs when the board changes.

The text asks for IBM Plex Sans, the site's face, and falls back to Helvetica Neue
or Arial where Plex is not installed. Standard library only.
"""

from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "design" / "out"

W, H = 1200, 630
BG, PANEL, TEXT, MUTED = "#18181b", "#27272a", "#fafafa", "#a1a1aa"  # zinc 900, 800, 50, 400: the sample bar's colours
FONT = "IBM Plex Sans, Helvetica Neue, Arial, sans-serif"

TITLE = "Dispatch screen rework"
SUBTITLE = "A ready-mix operations portal, one screen at a time · sample on invented data"

# label, pill width, pill fill, pill text, caption, screenshot
PANELS = [
    ("Before", 74, "#78350f", "#fef3c7", "14 columns of codes", "before.png"),  # amber 900 / 100
    ("After", 62, "#1e3a8a", "#dbeafe", "numbers first, plain words, one action", "after.png"),  # blue 900 / 100
]

PAD, TOP, GUTTER = 40, 132, 24
PANEL_W = (W - 2 * PAD - GUTTER) / 2
PANEL_H = H - TOP - 56
INSET = 10  # the screenshot's margin inside the panel
HEADER = 40  # pill row above the screenshot
SHOT_SCALE = (PANEL_H - HEADER) / 900  # the 1440 x 900 screenshot, fitted to the panel's height and cut on the right


def esc(text: str) -> str:
    return text.replace("&", "&amp;").replace("<", "&lt;")


def panel(i: int) -> str:
    label, pill_w, pill_fill, pill_text, caption, shot = PANELS[i]
    x = PAD + i * (PANEL_W + GUTTER)
    sx, sy = x + INSET, TOP + HEADER
    sw, sh = PANEL_W - 2 * INSET, PANEL_H - HEADER
    clip = f"shot{i}"
    r, rb = 6, 12 - INSET + 2  # rounded top like a window; the bottom follows the panel's corner
    shape = (
        f"M{sx} {sy + r}a{r} {r} 0 0 1 {r}-{r}h{sw - 2 * r}a{r} {r} 0 0 1 {r} {r}"
        f"v{sh - rb}a{rb} {rb} 0 0 1-{rb} {rb}h{-(sw - 2 * rb)}a{rb} {rb} 0 0 1-{rb}-{rb}z"
    )
    return (
        f'<rect x="{x}" y="{TOP}" width="{PANEL_W}" height="{PANEL_H}" rx="12" fill="{PANEL}"/>'
        f'<rect x="{x + 14}" y="{TOP + 10}" width="{pill_w}" height="25" rx="12.5" fill="{pill_fill}"/>'
        f'<text x="{x + 14 + pill_w / 2}" y="{TOP + 28}" text-anchor="middle" font-size="16" font-weight="600" fill="{pill_text}">{label}</text>'
        f'<text x="{x + 14 + pill_w + 10}" y="{TOP + 29}" font-size="20" font-weight="700" fill="{TEXT}">{esc(caption)}</text>'
        f'<clipPath id="{clip}"><path d="{shape}"/></clipPath>'
        f'<image x="{sx}" y="{sy}" width="{1440 * SHOT_SCALE:.1f}" height="{900 * SHOT_SCALE:.1f}" '
        f'preserveAspectRatio="none" clip-path="url(#{clip})" xlink:href="../../public/shots/{shot}"/>'
    )


def og_svg() -> str:
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" '
        f'width="{W}" height="{H}" viewBox="0 0 {W} {H}" font-family="{FONT}">'
        f'<rect width="{W}" height="{H}" fill="{BG}"/>'
        f'<text x="{PAD}" y="74" font-size="44" font-weight="700" fill="{TEXT}" letter-spacing="-0.5">{TITLE}</text>'
        f'<text x="{PAD}" y="106" font-size="20" fill="{MUTED}">{esc(SUBTITLE)}</text>'
        f"{panel(0)}{panel(1)}</svg>\n"
    )


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "og.svg").write_text(og_svg())
    print("design/og_image.py: design/out/og.svg")


if __name__ == "__main__":
    main()
