# Design notes

Four visual changes to the sample, each with the reason it is there. The mark, the two status glyphs and the icons
are drawn by small Python scripts in `design/` (standard library only) and exported with the Inkscape command line;
the link image is laid out the same way and set in the site's typeface in Playwright's Chromium. All of them can be
rebuilt and changed like code. The threshold strip is a React component instead; change 3 says why.

![The tab icon at 16 px, the mark at 32 and 180 px, and the two status glyphs at 14 and 28 px beside lucide's Factory and Clock](design/previews/sizes.png)

## 1. A mixer truck for the company mark

**What.** A side-on ready-mix truck in dark ink on a yellow tile: the drum tilted rear-up, about 2.3 times as long
as it is deep, with one diagonal spiral fin and a clear gap to the frame and the cab; the cab and two wheels. It
replaces the yellow "PR" letter tile. At 16 px that drawing runs together, so the browser tab shows the simpler
glyph from change 2 on the same tile.

**Where.** The mark: the sidebar on `/after` (full and as the icon rail), the header of `/field` and `/field/qc`
(`BrandMark` in `src/components/product-shell.tsx`), the 32 and 48 px images in `src/app/favicon.ico` and the iOS
home-screen icon (`src/app/apple-icon.png`). The simpler drawing on the tile: the browser tab (`src/app/icon.svg`,
which browsers draw at 16 px) and the 16 px image in `favicon.ico`. The yellow is the `--brand` token in
`src/app/globals.css`.

**Why.** "PR" said nothing about the business, and on an overview that lists "PR 1" to "PR 7" it read as "pull
request". A mixer drum is the one thing every dispatcher, driver and QC tech in ready-mix knows on sight, so the
fictional company reads as a concrete producer at a glance. It is a plain pictogram with no letters, so it can't
be taken for a real producer's livery. The mark is a different drawing from the En route and Fleet icons, so it
still reads as the company's sign and not as one more icon in the list.

## 2. Mixer and chute glyphs in the status badges

**What.** En route shows a small mixer truck: a capsule drum tilted rear-up on one pedestal, the cab and two
wheels, with no fin. Pouring shows concrete falling off the end of a chute onto a heap in a shallow form. They
replace lucide's box van and water drops. The Fleet item in the sidebar and the driver's note on `/field` use the
small mixer too.

**Where.** `STATUS_META` in `src/components/dispatch/status.tsx`, so every row and phone card on `/after`, the
order sheet's header and the badge strip on `/standard`. The glyphs live in `src/components/glyphs.ts`.

**Why.** The status badge is the most repeated thing on the board, and rule TB4 makes its icon part of the
meaning. A parcel van and water drops are stand-ins; on a concrete board, water drops even hint at water added on
site, which QC watches for. The labels and colours did not change, so nobody relearns anything. Batching keeps
lucide's factory: a batch-plant drawing did not hold up at 14 px. The glyphs sit on lucide's grid (24 px, 2 px
round strokes) and are made with `createLucideIcon`, so they size, colour and align like the icons next to them.

**How they were checked.** The badge icon is 14 px, so on a desk screen at 100% (1x) one pixel is 1.7 grid units:
two parts closer than that print as one dark knot. The mark's drawing did exactly that
at badge size, which is why the glyph is a separate, simpler drawing. The small mixer keeps at least 1.7 units of
clear space between its drum, wheels, pedestal and cab, and the chute glyph between its stream, heap and floor;
`design/glyphs.py` measures those gaps and stops the build if one gets smaller. Without the heap, the stream
falling into an empty form read as a download icon, so the heap stays. Checked at 14 px at 1x on the sheet above,
beside lucide's Factory and Clock, and in Chromium at 100% zoom on `/after`, `/standard` and `/field`; at 2x and on
phones they are sharper still.

## 3. The board's risk thresholds on the overview

**What.** Two small scales under the question "How late is late for your customers": minutes behind plan (0 to 4
on plan, 5 to 14 at risk, 15 and over late, so the Late band stays open on the right), and no truck assigned (at
risk from 60 minutes before the start). The caption asks for the client's own numbers in week one. The question is
the last in the list, so the strip doesn't split it.

**Where.** `src/components/risk-strip.tsx`, in the week-one questions on `/`.

**Why.** Three numbers decide what lands in the At risk view, the "Orders at risk" tile and the red and amber
lines on the rows, but they only existed in code. Showing the current answer, in the board's own colours and
words, gives the client's dispatchers something concrete to correct on day 1 of the trial, and shows that the
rule is a setting rather than a guess built into the screen. It is a component, not a drawn file: it imports
`LATE_AFTER_MIN`, `SLIPPING_AFTER_MIN` and `NO_TRUCK_WINDOW_MIN` from `src/lib/dispatch/derive.ts`, so it can't
disagree with the board, its labels are live text that wraps on a phone, and screen readers get the rules as one
sentence.

## 4. The link preview image, redrawn

**What.** The 1200 × 630 image that chat apps show for a shared link: the before and after screens side by side
under the title, in the same layout as before, with the title set in IBM Plex Sans like the site.

**Where.** `src/app/opengraph-image.png`, drawn from `public/shots/before.png` and `after.png` (the overview's
two screenshots).

**Why.** The old image, and the overview's After screenshot, still showed the "PR" tile. A link sent to the client
should show the board as it is.

## Left as they were

- The empty states keep an icon in a circle: their copy is specific and the empty day offers Schedule pour, so a
  drawing would only decorate them.
- No illustration on the overview: the strip in change 3 is the one figure that carries information.
- `themeColor` stays `#18181b`: it matches the dark sample bar at the top of every page (now commented).

Also in this pass: the unused dark-mode tokens left from the shadcn template are gone from `globals.css` (the
sample is light only), and four lines of copy were reworded where they read like notes rather than sentences: the
States intro on `/standard`, the intro to "What changed and why", the QC test-plan footnote and the README's Data
section.

## Rebuilding the drawn assets

Needs Python 3, Inkscape 1.4 (`inkscape` on the PATH, or set `INKSCAPE`) and, for the link image, a `pnpm build`.
From the repo root:

```bash
design/build.sh
```

| Script | Makes |
| --- | --- |
| `design/glyphs.py` | `src/components/glyphs.ts` (MixerTruck, ChutePour and MixerMark) and the SVG sources for the icons. The two badge glyphs are placed by hand; the mark's drum outline is computed: a cone from the open rear to the full diameter, a straight body, then a domed front, tilted 12°. It checks the gaps from change 2 before it writes anything |
| Inkscape | `src/app/icon.svg` (plain SVG), `src/app/apple-icon.png` (180 px, opaque because iOS rounds the corners itself), the 16, 32 and 48 px PNGs |
| `design/favicon_ico.py` | `src/app/favicon.ico` from those three PNGs |
| `design/previews.py` | `design/previews/sizes.png`, the sheet above |
| `design/og_image.py`, `design/og_render.mjs` | `src/app/opengraph-image.png`: the layout as SVG, then drawn in Chromium with the IBM Plex Sans file the build put in `.next/static/media`, so nothing is downloaded |

To change a drawing, edit `design/glyphs.py` and run `design/build.sh`; don't edit `glyphs.ts` by hand. When the
board's look changes, retake the two overview screenshots first, then run the build again:

```bash
pnpm build && pnpm start --port 3301
node design/shots.mjs http://localhost:3301
design/build.sh
```

Intermediate files go to `design/out/`, which git ignores.
