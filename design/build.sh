#!/usr/bin/env bash
# Rebuilds every drawn asset in the repo from the scripts in design/.
# Needs Python 3 (standard library only) and the Inkscape 1.4 command line.
#
#   design/build.sh
#
# The link card is drawn from public/shots/before.png and after.png. When the board
# changes, retake those first, then run this again:
#   pnpm build && pnpm start --port 3301
#   node design/shots.mjs http://localhost:3301
set -euo pipefail
cd "$(dirname "$0")/.."

INKSCAPE="${INKSCAPE:-inkscape}"
OUT=design/out
mkdir -p "$OUT" design/previews

png() { "$INKSCAPE" "$1" --export-type=png --export-width="$2" --export-filename="$3" "${@:4}"; }

# 1. Vector sources: the mixer and chute glyphs (also written to src/components/glyphs.ts) and the mark
python3 design/glyphs.py

# 2. The mark as the site's icons: the SVG favicon, the iOS home-screen icon (opaque, iOS rounds
#    the corners itself) and favicon.ico for browsers and link previews that ask for that file
"$INKSCAPE" "$OUT/mark.svg" --export-type=svg --export-plain-svg --export-filename=src/app/icon.svg
png "$OUT/mark-square.svg" 180 src/app/apple-icon.png --export-png-color-mode=RGB_8
for size in 16 32 48; do png "$OUT/mark.svg" "$size" "$OUT/mark-$size.png"; done
python3 design/favicon_ico.py src/app/favicon.ico "$OUT/mark-16.png" "$OUT/mark-32.png" "$OUT/mark-48.png"

# 3. Size checks: each status glyph at 14 px (the badge) and 28 px (the badge on a 2x screen),
#    on one sheet with the mark, for DESIGN-NOTES.md
for status in en-route pouring; do
  for size in 14 28; do png "$OUT/check-$status.svg" "$size" "$OUT/check-$status-$size.png"; done
done
python3 design/previews.py
"$INKSCAPE" "$OUT/sizes.svg" --export-type=png --export-png-color-mode=RGB_8 --export-filename=design/previews/sizes.png

# 4. The link card (Open Graph image), from the overview's two screenshots
python3 design/og_image.py
png "$OUT/og.svg" 1200 src/app/opengraph-image.png --export-png-color-mode=RGB_8

echo "design/build.sh: done"
