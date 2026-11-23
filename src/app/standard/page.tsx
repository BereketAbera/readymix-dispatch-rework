import type { Metadata } from "next";
import { DemoBar } from "@/components/demo-bar";
import { SiteFooter } from "@/components/site-footer";
import { getDispatchDay } from "@/lib/dispatch";
import { FiltersExample, FormsExample, StatesExample, TablesExample } from "./examples";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "UI standard: tables, filters, forms, states",
};

type Rule = [rule: string, why: string];

const SECTIONS: { id: string; title: string; intro: string; rules: Rule[] }[] = [
  {
    id: "tables",
    title: "Tables",
    intro: "For any list people scan and act on: orders, tickets, lab results, invoices, trucks.",
    rules: [
      ["Rows are 52 px, text is 14 px, and a cell holds two lines at most.", "Ten to twelve orders fit on a laptop screen without cramping clicks or taps."],
      ["Numbers are right-aligned in tabular figures; times are 24-hour HH:MM.", "Digits line up, so totals and outliers stand out without reading every value."],
      ["Units go in the column header (Volume m³), not in every cell.", "Every number stays unambiguous with less noise in the rows."],
      ["Status is a word, an icon and a colour; risk adds a line that says how late.", "Works for colour-blind users and in a sunlit cab, and nobody learns codes."],
      ["The header row stays visible while the table scrolls.", "Column meaning is still clear on row 30."],
      ["Columns have a priority: Trucks hide below 1024 px, Mix below 1280 px, and below 768 px the table becomes cards.", "Nothing scrolls sideways, and the fields that survive are the ones the job needs."],
      ["Clicking a row opens its detail; actions live there, and destructive ones ask to confirm.", "Rows stay calm, and nobody cancels an order by hitting the wrong row button."],
    ],
  },
  {
    id: "filters",
    title: "Filters",
    intro: "For narrowing a list without losing your place.",
    rules: [
      ["Saved views are chips with live counts, one for each question people ask all day.", "“What's at risk?” is one click, and the counts show where the work is."],
      ["One search box matches customer, site, truck, mix and order number; / focuses it, Esc clears it.", "Phone calls start with a name or a truck number."],
      ["“Clear all” appears next to the result count as soon as anything is filtered.", "There is always one obvious way back to the full list."],
      ["Filter state lives in the URL, for example ?view=at-risk&q=t-104.", "A view can be bookmarked or sent to a colleague, and it survives a refresh."],
      ["Rarely used filters go in a panel, never in the toolbar.", "The toolbar stays short and the common path stays fast."],
    ],
  },
  {
    id: "forms",
    title: "Forms",
    intro: "For booking pours, recording tests and anything else people type into.",
    rules: [
      ["Labels sit above inputs in sentence case; placeholders never replace labels.", "Labels stay visible while typing, and the form reads in one column on a phone."],
      ["Units are suffixes inside the field: mm, %, °C, m³.", "No guessing between mm and cm, and the number stays easy to edit."],
      ["Validate when a field loses focus, and put the message under it, saying how to fix it.", "Nobody sees red text while they are still typing."],
      ["Errors block saving; out-of-spec warnings do not.", "Field data has to be recorded even when it is bad news."],
      ["One primary button per form, named for the action (Schedule pour, Save test).", "The next step is always the obvious one."],
      ["Disabled means not possible yet, with the reason shown; loading changes the label and blocks double submits.", "People can tell whether to wait or to fix something."],
    ],
  },
  {
    id: "states",
    title: "States",
    intro: "Every screen designs these four before it ships.",
    rules: [
      ["Loading uses skeletons in the shape of the final layout, never a blank page or full-screen spinner.", "Nothing jumps when data arrives, and people can see what is coming."],
      ["Empty says what is empty and offers the next action, such as Schedule pour or Clear search.", "An empty screen should lead somewhere, not look broken."],
      ["Errors use plain words, say what still works and offer Retry.", "Dispatch cannot stop; people need to know whether what they see is stale."],
      ["Partial data shows what loaded and flags what didn't, with the time of the last good update.", "One missing feed should not blank the whole screen."],
    ],
  },
];

export default function StandardPage() {
  const day = getDispatchDay();
  const examples: Record<string, React.ReactNode> = {
    tables: <TablesExample day={day} />,
    filters: <FiltersExample day={day} />,
    forms: <FormsExample />,
    states: <StatesExample />,
  };
  return (
    <div className="min-h-dvh bg-background">
      <DemoBar />
      <main className="mx-auto max-w-5xl px-4 py-8 md:px-6 md:py-12">
        <p className="text-sm font-medium text-muted-foreground">Prairie Ready-Mix operations portal · fictional</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">UI standard</h1>
        <p className="mt-3 max-w-2xl text-base text-muted-foreground">
          One page for tables, filters, forms and states. Every screen in the portal follows it; when a screen has a
          good reason to break a rule, its pull request says why. The examples below are the same components the
          dispatch board uses.
        </p>
        <nav aria-label="On this page" className="mt-5">
          <ul className="flex flex-wrap gap-2 text-sm">
            {SECTIONS.map((s) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  className="inline-flex h-8 items-center rounded-full border bg-card px-3 font-medium hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                >
                  {s.title}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        {SECTIONS.map((section) => (
          <section key={section.id} id={section.id} aria-labelledby={`${section.id}-heading`} className="mt-12 scroll-mt-6">
            <h2 id={`${section.id}-heading`} className="text-xl font-semibold tracking-tight">
              {section.title}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">{section.intro}</p>
            <ol className="mt-4 divide-y rounded-lg border bg-card">
              {section.rules.map(([rule, why], i) => (
                <li key={rule} className="grid gap-1 px-4 py-3 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] md:gap-6">
                  <p className="text-sm font-medium">
                    <span className="mr-2 font-mono text-xs text-muted-foreground">
                      {section.title[0]}
                      {i + 1}
                    </span>
                    {rule}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium text-foreground/80">Why: </span>
                    {why}
                  </p>
                </li>
              ))}
            </ol>
            <div className="mt-4">{examples[section.id]}</div>
          </section>
        ))}
      </main>
      <SiteFooter />
    </div>
  );
}
