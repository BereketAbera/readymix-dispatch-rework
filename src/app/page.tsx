import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { DemoBar } from "@/components/demo-bar";
import { SiteFooter } from "@/components/site-footer";
import { CHANGES } from "@/content/changes";

const VIEWS = [
  {
    href: "/before",
    label: "Before",
    text: "A typical first-version orders table: 14 equal columns, raw codes, a panel of dropdowns and four buttons on every row.",
  },
  {
    href: "/after",
    label: "After",
    text: "The reworked dispatch board: numbers first, saved views, and a side sheet with the load timeline. Switch on the annotations.",
  },
  {
    href: "/field",
    label: "Field",
    text: "Phone and tablet view for a driver or QC tech: today’s tickets, big step buttons and a field test form.",
  },
  {
    href: "/standard",
    label: "Standard",
    text: "The one-page UI standard for tables, filters, forms and states, with live examples from the same components.",
  },
];

export default function Home() {
  return (
    <div className="min-h-dvh bg-background">
      <DemoBar />
      <main className="mx-auto max-w-5xl px-4 py-10 md:px-6 md:py-14">
        <p className="text-sm font-medium text-muted-foreground">Prairie Ready-Mix (fictional) · operations portal</p>
        <h1 className="mt-2 max-w-3xl text-3xl font-semibold tracking-tight md:text-4xl">Dispatch screen rework</h1>
        <p className="mt-3 max-w-3xl text-lg text-muted-foreground">
          A one-screen trial, done in advance: the dispatch screen of a ready-mix operations portal, before and after,
          on anonymized data.
        </p>

        <ul className="mt-8 grid gap-3 sm:grid-cols-2">
          {VIEWS.map((v) => (
            <li key={v.href}>
              <Link
                href={v.href}
                className="group flex h-full flex-col rounded-lg border bg-card p-4 transition-colors hover:border-primary/50 hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
              >
                <span className="flex items-center justify-between text-base font-semibold">
                  {v.label}
                  <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden />
                </span>
                <span className="mt-1 text-sm text-muted-foreground">{v.text}</span>
              </Link>
            </li>
          ))}
        </ul>

        <section aria-labelledby="changes-heading" className="mt-14">
          <h2 id="changes-heading" className="text-xl font-semibold tracking-tight">
            What changed and why
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Each change, then the reason in terms of the dispatcher&apos;s job. The numbers match the markers on the
            reworked board.
          </p>
          <ol className="mt-5 grid gap-4">
            {CHANGES.map((c) => (
              <li key={c.n} className="flex gap-3">
                <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-fuchsia-700 text-xs font-bold text-white">
                  {c.n}
                </span>
                <p className="text-[15px] leading-relaxed">
                  <strong className="font-semibold">{c.title}.</strong> {c.text}
                </p>
              </li>
            ))}
          </ol>
          <p className="mt-6">
            <Link
              href="/after?notes=1"
              className="inline-flex items-center gap-1 rounded-sm text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              See them on the board
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </p>
        </section>

        <section aria-labelledby="built-heading" className="mt-14">
          <h2 id="built-heading" className="text-xl font-semibold tracking-tight">
            How it is built
          </h2>
          <p className="mt-2 max-w-3xl text-[15px] leading-relaxed text-muted-foreground">
            Next.js 15 App Router, React 19, TypeScript, Tailwind CSS, shadcn/ui on Radix, and TanStack Table. The
            orders, trucks and plants are generated from a fixed seed for today&apos;s date in Regina time, so every
            visit shows the same board as of 09:42. Edits made on the board stay in the browser.
          </p>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
