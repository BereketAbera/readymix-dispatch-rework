# Dispatch screen rework (sample)

A trial-style rework of one screen, done in advance: the dispatch screen of a ready-mix operations portal, before and after, on fictional data. The company ("Prairie Ready-Mix (fictional)"), its three plants, customers, job sites, trucks and drivers are all invented.

Live: https://readymix-dispatch-rework.vercel.app

| Route | What it shows |
| --- | --- |
| `/` | Overview and the reasoning list |
| `/before` | A typical first-version orders table, reconstructed for comparison |
| `/after` | The reworked dispatch board. Add `?notes=1` for the numbered annotations and `?state=loading`, `empty`, `error` or `partial` for the standard states |
| `/field` | Phone and tablet view for a driver or QC tech: tickets, delivery steps, field test form |
| `/standard` | The one-page UI standard, with live examples |

## What changed and why

1. **One primary action.** "Schedule pour" is the one filled button, top right, because booking the next pour is the dispatcher's most frequent task and it used to sit inside an Actions menu.
2. **Numbers first.** Four tiles (m³ today, loads en route, trucks available, orders at risk) sit above the table, so the dispatcher knows whether the day is on track before reading a single row.
3. **Saved views instead of a filter panel.** Saved views (Today, At risk, Unassigned, On hold) and a search on the "/" key replace a panel of eight filter fields and an Apply button, because those are the questions a dispatcher asks all day and each is now one click.
4. **7 columns instead of 14.** The table drops from 14 equal columns to 7, led by start time, customer and site, because that is how a dispatcher finds a job when a driver or a customer calls.
5. **Status and progress in plain words.** Status reads as a word with an icon, late orders say how many minutes behind they are, and loads show as "3/7" with a thin bar, so nobody decodes "ENRT" or subtracts two columns to see where a pour stands.
6. **Detail without leaving the board.** Clicking a row opens a side sheet with the load timeline and an inline "Assign truck" control, so the dispatcher acts without leaving the board, and Delete no longer sits beside every row.
7. **One set of states.** Loading, empty and error states come from one shared standard, so an empty filter offers a next step and a failed load offers a retry instead of a blank table.
8. **Works on a phone.** Below tablet width the table turns into cards with the four fields that matter and nothing scrolls sideways, so the board works on a phone in the yard.

## Where the standard lives

The written standard is the `/standard` page (`src/app/standard/page.tsx`): tables, filters, forms and states, one line of rule and one line of why each. Its live examples use the same components as the board:

- `src/components/states.tsx`: loading skeletons, empty state with a next action, error with retry, partial-data notice
- `src/components/form-field.tsx`: label above the input, unit suffix, errors that block saving and warnings that don't
- `src/components/dispatch/`: status and risk badges, load progress, truck chips, the orders table (TanStack Table) and the phone cards

## Data

`src/lib/dispatch/generate.ts` builds the day from a fixed seed: 3 plants, 18 trucks, 40 orders, and every load with batched, loaded, en route, on site, pouring and washout times. Trucks are handed out in batching order, so no truck is ever on two loads at once; delays come from truck shortages plus two scripted incidents. The date is today in America/Regina and the board is shown as of 09:42. Changes made on the board (assign a truck, hold, cancel, schedule a pour) stay in the browser.

## Run it

```bash
pnpm install
pnpm dev                 # http://localhost:3000
pnpm lint
pnpm typecheck
pnpm test                # Vitest: generator, KPIs, risk rules, filters
pnpm build
pnpm exec playwright install chromium
pnpm test:e2e            # starts the production build on :3100
BASE_URL=https://readymix-dispatch-rework.vercel.app pnpm test:e2e   # or run against a deployment
```

## Stack

Next.js 15 (App Router), React 19, TypeScript (strict), Tailwind CSS 4, shadcn/ui on Radix, TanStack Table 8, lucide icons. Vitest and Playwright for tests.
