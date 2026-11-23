#!/usr/bin/env bash
# Rebuilds every drawn asset in the repo from the scripts in design/.
# Needs Python 3 (standard library only), the Inkscape 1.4 command line, and a `pnpm build`
# for the last step, which sets the link card in the site's face with Playwright's Chromium.
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

# 1. Vector sources: the mixer and chute glyphs and the mark (also written to src/components/glyphs.ts).
#    Stops here if a gap in a drawing is too small for the size it is used at.
python3 design/glyphs.py

# 2. The site's icons. The browser tab draws the SVG icon at 16 px, so icon.svg and favicon.ico's
#    16 px image are the small glyph on the tile; favicon.ico's 32 and 48 px images and the iOS
#    home-screen icon (opaque, iOS rounds the corners itself) are the mark
"$INKSCAPE" "$OUT/mark-small.svg" --export-type=svg --export-plain-svg --export-filename=src/app/icon.svg
png "$OUT/mark-square.svg" 180 src/app/apple-icon.png --export-png-color-mode=RGB_8
png "$OUT/mark-small.svg" 16 "$OUT/mark-16.png"
for size in 32 48; do png "$OUT/mark.svg" "$size" "$OUT/mark-$size.png"; done
python3 design/favicon_ico.py src/app/favicon.ico "$OUT/mark-16.png" "$OUT/mark-32.png" "$OUT/mark-48.png"

# 3. Size checks: each status glyph at 14 px (the badge on a 1x screen) and 28 px (on a 2x screen),
#    beside lucide's Factory and Clock, on one sheet with the icons, for DESIGN-NOTES.md
for status in en-route pouring batching scheduled; do
  for size in 14 28; do png "$OUT/check-$status.svg" "$size" "$OUT/check-$status-$size.png"; done
done
python3 design/previews.py
"$INKSCAPE" "$OUT/sizes.svg" --export-type=png --export-png-color-mode=RGB_8 --export-filename=design/previews/sizes.png

# 4. The link card (Open Graph image), from the overview's two screenshots, drawn in Chromium
#    with the IBM Plex Sans file from the last build (Inkscape would fall back to another face)
python3 design/og_image.py
node design/og_render.mjs

echo "design/build.sh: done"
