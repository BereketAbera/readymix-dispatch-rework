## What changed and why

<!-- One screen, one concern. Say who uses the screen and which task gets shorter. -->

## Before and after

<!-- Screenshots at 1440 and 390 px wide (and 820 px if tablets use the screen). -->

| Before | After |
| --- | --- |
|  |  |

## Standard

Rules: https://readymix-dispatch-rework.vercel.app/standard (Markdown: `docs/ui-standard.md`). Tick what applies.

- [ ] Tables: rows, units, status words, sticky header, column priority, detail on click (TB1–TB7)
- [ ] Filters: saved views, one search, Clear all, state in the URL, rare filters behind Filters (FL1–FL5)
- [ ] Forms: labels above, unit suffixes, validate on blur, warnings don't block, one primary action, one control height (FM1–FM7)
- [ ] States designed: loading, empty, refresh failed, partial data (ST1–ST4)
- [ ] Charts: one question, one axis, colour never alone, values reachable without hover (CH1–CH4)
- [ ] Checked at 390, 820 and 1440 px: nothing scrolls sideways (TB6)
- [ ] Keyboard: every action reachable, focus returns to where it started

**Rules this PR breaks, and why** (by ID, or "none"):

## Checks

- [ ] `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:e2e`, `pnpm build`
