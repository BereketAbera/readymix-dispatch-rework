# Dispatch screen rework (sample)

A trial-style rework of one screen, done in advance: the dispatch screen of a ready-mix operations portal, before and after, on invented data. No real company's records were used. The company ("Prairie Ready-Mix (fictional)"), its three plants, customers, job sites, trucks and drivers are all made up.

Live: https://readymix-dispatch-rework.vercel.app

| Route | What it shows |
| --- | --- |
| `/` | Overview: the before and after pair, the reasoning, five tasks counted before and after, how it would ship as pull requests, and the questions for week one |
| `/before` | A typical first-version orders table, reconstructed for comparison, with three notes on what a dispatcher runs into |
| `/after` | The reworked dispatch board |
| `/field` | Driver view for a phone or tablet: the current load, big step buttons, today's tickets |
| `/field/qc` | QC tech view: today's field tests at one plant and the test form |
| `/standard` | The UI standard: tables, filters, forms, states and charts, with live examples |
| `/ui-standard.md` | The same standard as Markdown, for pull request comments |

The board keeps its state in the URL, so any view can be linked:

- `?view=at-risk|unassigned|on-hold`, `?q=…` (customer, site, truck, ticket, mix, order number), `?plant=rgn|sas|mjw`
- `?hour=10` (pours due on site 10:00–11:00, set by clicking the chart), `?status=…`, `?pour=…`, `?place=pump|chute|buggy`
- `?order=PRM-24115` opens that order's side sheet; Back closes it
- `?notes=1` shows the numbered annotations; `?state=loading|empty|error|partial` shows the standard states

## What changed and why

The reasons are assumptions made without meeting the people who use the screen; the first week is for checking them.

1. **One primary action.** "Schedule pour" is the one filled button, next to the plant switcher. On the old screen "New order" was the fifth item in an Actions menu. Assumes dispatch books pours from this screen; if an order desk does the booking, the button moves to their screen and this spot goes to Assign.
2. **Numbers first.** Four tiles (m³ today, loads en route, trucks available, orders at risk) sit above the table, so whether the day is on track shows before any row is read.
3. **Saved views instead of a filter panel.** Chips for Today, At risk, Unassigned and On hold with live counts, plus a search on the "/" key, replace eight filter fields and an Apply button. Rare filters moved behind a Filters button and show as removable chips.
4. **7 columns instead of 14.** Led by start time, customer and site; on narrower screens the least-used columns step out first.
5. **Status and progress in plain words.** Status words with icons, minutes late, and loads as "3/7" with a bar instead of codes like "ENRT".
6. **Detail without leaving the board.** A row opens a side sheet with the load timeline and Assign truck. Hold and Cancel live there, Cancel behind a confirm that focuses "Keep order".
7. **One set of states.** Loading, empty, refresh failed and partial data come from shared components: an empty day offers Schedule pour, a failed refresh keeps the last good board with Retry, and stale GPS is flagged on the rows it affects.
8. **Works on a phone and a tablet.** Cards below 768 px with 44 px tap targets; on tablets and laptops the columns follow the table's own width (container queries), so nothing scrolls sideways at any size.
9. **A chart that answers one question.** The m³ tile carries concrete due on site per hour, delivered against still to pour, with a line at the board time. Clicking an hour filters the table.

## How this would ship

As small pull requests against the current screen, each with before and after screenshots and the reasoning in its description:

1. Plain words in the table (changes 4, 5)
2. Saved views, one search, filters in the URL (3)
3. Order detail in a side sheet (6)
4. Schedule pour as the one primary action (1)
5. Numbers first: tiles and the hourly chart (2, 9)
6. Shared states and the written standard (7)
7. Phone cards and width-aware columns (8)

The field screens (driver and QC tech) would follow as their own set.

## Where the standard lives

- `src/content/standard.ts`: the rules, each with an ID (TB1–TB7, FL1–FL5, FM1–FM7, ST1–ST4, CH1–CH4). The `/standard` page renders them; `/standard#FM3` links one rule.
- `docs/ui-standard.md`: the same rules as Markdown. A unit test fails if it drifts from the page; `pnpm docs:standard` rewrites it.
- `.github/pull_request_template.md`: the checklist a pull request fills in, citing the rule IDs.
- `src/components/states.tsx`, `src/components/form-field.tsx` and `src/components/dispatch/`: the components the board and the standard's examples share.

## Data

`src/lib/dispatch/generate.ts` builds one sample day from a fixed seed: Tuesday 9 June 2026, shown as of 09:42. A June weekday keeps the work in season, and the fixed clock means every reader sees the same board. There are 3 plants, 18 trucks and 40 orders, and every load has batched, loaded, en route, on site, pouring and washout times. Trucks are handed out in batching order, so no truck is ever on two loads at once; delays come from truck shortages plus two scripted incidents. An order is at risk from 5 min behind plan and late from 15; one with no truck is at risk from 60 min before its start. Those three numbers are constants at the top of `src/lib/dispatch/derive.ts`, and the overview draws its threshold strip from them. Changes made on the board (assign, hold, release, cancel, book) stay in the browser tab until it is reloaded.

## Run it

```bash
pnpm install
pnpm dev --port 3301
pnpm lint
pnpm typecheck
pnpm test                # Vitest: data, KPIs, hold and cancel, filters, time and number parsing, URL state, the standard
pnpm build
pnpm exec playwright install chromium
pnpm test:e2e            # starts the production build on :3301
BASE_URL=https://readymix-dispatch-rework.vercel.app pnpm test:e2e   # or run against a deployment
```

The end-to-end suite covers the board's flows (views, search, sort, the sheet and Back, focus return, hold and release, cancel, Schedule pour, the chart and the filters), widths from 320 to 1920 px, the field views, and an axe check of every page and state at 1440 and 390 px.

## Known limits

- The day and the board time are fixed; edits are kept in memory for the tab, not saved anywhere.
- Sidebar items other than Dispatch, and every button on `/before`, do nothing on purpose.
- Light mode only.

## Stack

Next.js 15 (App Router, every page static), React 19, TypeScript (strict), Tailwind CSS 4, shadcn/ui on Radix, TanStack Table 8, Recharts 3 through the shadcn chart component, lucide icons. Vitest, Playwright and axe for tests.

The company mark, the En route and Pouring glyphs, the icons and the link preview image are drawn by the Python scripts in `design/` and exported with Inkscape (the link image in Chromium, to set it in the site's typeface); `DESIGN-NOTES.md` says what each one is for and how to rebuild them.
