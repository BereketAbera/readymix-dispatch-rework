import type { Metadata } from "next";
import { FileText, Link2 } from "lucide-react";
import { DemoBar } from "@/components/demo-bar";
import { SiteFooter } from "@/components/site-footer";
import { STANDARD, STANDARD_INTRO } from "@/content/standard";
import { getDispatchDay } from "@/lib/dispatch";
import { ChartsExample, FiltersExample, FormsExample, StatesExample, TablesExample } from "./examples";

export const metadata: Metadata = {
  title: "UI standard: tables, filters, forms, states, charts",
};

export default function StandardPage() {
  const day = getDispatchDay();
  const examples: Record<string, React.ReactNode> = {
    tables: <TablesExample day={day} />,
    filters: <FiltersExample day={day} />,
    forms: <FormsExample />,
    states: <StatesExample day={day} />,
    charts: <ChartsExample day={day} />,
  };
  return (
    <div className="min-h-dvh bg-background">
      <DemoBar />
      <main className="mx-auto max-w-5xl px-4 py-8 md:px-6 md:py-12">
        <p className="text-sm font-medium text-muted-foreground">Prairie Ready-Mix operations portal · fictional</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">UI standard</h1>
        <p className="mt-3 max-w-2xl text-base text-muted-foreground">
          {STANDARD_INTRO} The examples below are the same components the dispatch board uses.
        </p>
        <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          <a
            href="/ui-standard.md"
            className="inline-flex items-center gap-1.5 rounded-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
          >
            <FileText className="size-4" aria-hidden />
            Markdown version for pull requests
          </a>
          <span className="text-muted-foreground">
            In the repository: <code className="font-mono text-xs">docs/ui-standard.md</code> and a pull request
            checklist that cites these IDs.
          </span>
        </p>
        <nav aria-label="On this page" className="mt-5">
          <ul className="flex flex-wrap gap-2 text-sm">
            {STANDARD.map((s) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  className="inline-flex h-8 items-center gap-1.5 rounded-full border bg-card px-3 font-medium hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none max-md:h-11"
                >
                  {s.title}
                  <span className="font-mono text-xs text-muted-foreground">{s.prefix}</span>
                </a>
              </li>
            ))}
          </ul>
        </nav>

        {STANDARD.map((section) => (
          <section key={section.id} id={section.id} aria-labelledby={`${section.id}-heading`} className="mt-12 scroll-mt-6">
            <h2 id={`${section.id}-heading`} className="text-xl font-semibold tracking-tight">
              {section.title} <span className="font-mono text-base font-normal text-muted-foreground">{section.prefix}</span>
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">{section.intro}</p>
            <ol className="mt-4 divide-y rounded-lg border bg-card">
              {section.rules.map((r) => (
                <li
                  key={r.id}
                  id={r.id}
                  className="group grid scroll-mt-6 gap-1 px-4 py-3 target:bg-amber-50 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] md:gap-6"
                >
                  <p className="text-sm font-medium">
                    <a
                      href={`#${r.id}`}
                      className="mr-2 inline-flex items-center gap-0.5 rounded-sm font-mono text-xs text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
                      aria-label={`Link to rule ${r.id}`}
                    >
                      {r.id}
                      <Link2 className="size-3 opacity-0 group-hover:opacity-100" aria-hidden />
                    </a>
                    {r.rule}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium text-foreground/80">Why: </span>
                    {r.why}
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
