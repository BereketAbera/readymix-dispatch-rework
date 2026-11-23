import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { DemoBar } from "@/components/demo-bar";
import { RiskStrip } from "@/components/risk-strip";
import { SiteFooter } from "@/components/site-footer";
import { CHANGES } from "@/content/changes";

const PAIR = [
  {
    href: "/before",
    label: "Before",
    image: "/shots/before.png",
    alt: "The before screen: an orders table with 14 columns of raw codes, a panel of filter dropdowns and four buttons on every row.",
    text: "A typical first-version orders table: 14 equal columns, raw codes, a panel of dropdowns and four buttons on every row.",
  },
  {
    href: "/after",
    label: "After",
    image: "/shots/after.png",
    alt: "The reworked board: four number tiles with an hourly chart, saved-view chips with counts, and a seven-column table with status words.",
    text: "The reworked board: numbers first, saved views, a side sheet with the load timeline, and every state designed.",
  },
];

const MORE = [
  {
    href: "/field",
    label: "Field",
    text: "Phone and tablet views: the driver’s tickets and big step buttons, and the QC tech’s field tests.",
  },
  {
    href: "/standard",
    label: "Standard",
    text: "One page of rules for tables, filters, forms, states and charts, with live examples from the same components.",
  },
];

/** Counted on this sample, not on real users. */
const TASKS: [task: string, before: string, after: string][] = [
  ["See whether the day is on track", "No totals. Read 40 rows over 4 pages.", "No clicks: four tiles and the hourly chart."],
  [
    "Find the late pours",
    "Nothing marks a pour late. Both late pours are on page 2; compare times and codes yourself.",
    "1 click: At risk lists 5 orders, each saying how far behind.",
  ],
  ["Book a pour", "2 clicks to reach New order, the 5th item in the Actions menu.", "1 click: Schedule pour. Each field is checked as you leave it."],
  [
    "Give a truck to an order that has none",
    "No filter for it; the Trucks column says “null”. The first is on page 3.",
    "5 clicks: Unassigned, the order, Choose a truck, the truck, Assign.",
  ],
  ["Find a job from a ticket number", "Tickets are not on the screen or in the filters.", "Type it in the search; “/” jumps there."],
];

const STACK: { title: string; text: string; changes: number[] }[] = [
  { title: "Plain words in the table", text: "Status words and icons, minutes late, loads as 3/7, units in the headers, 14 columns cut to 7.", changes: [4, 5] },
  { title: "Saved views, one search, filters in the URL", text: "Today, At risk, Unassigned and On hold with counts; “/” search; rare filters behind one button.", changes: [3] },
  { title: "Order detail in a side sheet", text: "Load timeline, Assign truck, Hold, and Cancel behind a confirm; Back closes it.", changes: [6] },
  { title: "Schedule pour as the one primary action", text: "The button and its form, with validation on blur and times typed the way people type them.", changes: [1] },
  { title: "Numbers first", text: "The four tiles and the hourly chart, with the same states as the table.", changes: [2, 9] },
  { title: "Shared states and the written standard", text: "Loading, empty, refresh failed and partial data from one set of components, plus the standard page and its Markdown copy.", changes: [7] },
  { title: "Phone cards and width-aware columns", text: "Cards below 768 px, columns that follow the table’s width, 44 px tap targets on phones.", changes: [8] },
];

/** The question the threshold strip answers for now. */
const HOW_LATE = "How late is late for your customers: 10, 15 or 20 minutes behind?";

const QUESTIONS = [
  "Who books pours, and who assigns trucks? If an order desk books, Schedule pour moves to their screen and Assign takes its place here.",
  "When a driver or a customer calls, what do they give you first: the customer, the site, a ticket or a truck number?",
  "How many plants does one dispatcher watch, and do trucks move between plants during the day?",
  HOW_LATE,
  "What do you check on a phone in the yard, and what waits until you are back at the desk?",
  "When a pour is held halfway, who calls whom, and what gets invoiced?",
];

const link =
  "inline-flex items-center gap-1 rounded-sm text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none";
const card =
  "group flex h-full flex-col rounded-lg border bg-card transition-colors hover:border-primary/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none";

export default function Home() {
  return (
    <div className="min-h-dvh bg-background">
      <DemoBar />
      <main className="mx-auto max-w-5xl px-4 py-10 md:px-6 md:py-14">
        <p className="text-sm font-medium text-muted-foreground">Prairie Ready-Mix (fictional) · operations portal</p>
        <h1 className="mt-2 max-w-3xl text-3xl font-semibold tracking-tight md:text-4xl">Dispatch screen rework</h1>
        <p className="mt-3 max-w-3xl text-lg text-muted-foreground">
          A one-screen trial, done in advance: the dispatch screen of a ready-mix operations portal, before and after, on
          invented data. No real company’s records were used.
        </p>

        <ul className="mt-8 grid gap-4 sm:grid-cols-2">
          {PAIR.map((v) => (
            <li key={v.href}>
              <Link href={v.href} className={`${card} overflow-hidden`}>
                <span className="block aspect-[16/10] overflow-hidden border-b bg-muted">
                  <Image
                    src={v.image}
                    alt={v.alt}
                    width={1440}
                    height={900}
                    sizes="(min-width: 1024px) 480px, (min-width: 640px) 50vw, 100vw"
                    className="h-full w-full object-cover object-top"
                    priority
                  />
                </span>
                <span className="block p-4">
                  <span className="flex items-center justify-between text-base font-semibold">
                    {v.label}
                    <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden />
                  </span>
                  <span className="mt-1 block text-sm text-muted-foreground">{v.text}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
        <ul className="mt-4 grid gap-4 sm:grid-cols-2">
          {MORE.map((v) => (
            <li key={v.href}>
              <Link href={v.href} className={`${card} p-4 hover:bg-accent`}>
                <span className="flex items-center justify-between text-base font-semibold">
                  {v.label}
                  <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden />
                </span>
                <span className="mt-1 text-sm text-muted-foreground">{v.text}</span>
              </Link>
            </li>
          ))}
        </ul>

        <section aria-labelledby="changes-heading" className="mt-14 max-w-3xl">
          <h2 id="changes-heading" className="text-xl font-semibold tracking-tight">
            What changed and why
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Each change, then the reason in terms of the dispatcher’s job. The reasons are assumptions: I have not met
            your dispatchers yet, and the first week is for checking them. The numbers match the markers on the reworked
            board.
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
            <Link href="/after?notes=1" className={link}>
              See them on the board
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </p>
        </section>

        <section aria-labelledby="tasks-heading" className="mt-14">
          <h2 id="tasks-heading" className="text-xl font-semibold tracking-tight">
            Five tasks, before and after
          </h2>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            Counted on this sample, not measured with real users. With your dispatchers I would time the same tasks on
            the real screen before and after each change.
          </p>
          <div className="mt-4 overflow-hidden rounded-lg border bg-card">
            <table className="w-full text-sm">
              <caption className="sr-only">Steps for five dispatch tasks on the before and after screens of this sample</caption>
              <thead className="bg-muted/60 text-left text-xs text-muted-foreground">
                <tr>
                  <th scope="col" className="px-4 py-2 font-semibold">
                    Task
                  </th>
                  <th scope="col" className="hidden px-4 py-2 font-semibold sm:table-cell">
                    Before
                  </th>
                  <th scope="col" className="hidden px-4 py-2 font-semibold sm:table-cell">
                    After
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {TASKS.map(([task, before, after]) => (
                  <tr key={task} className="align-top">
                    <th scope="row" className="px-4 py-3 text-left font-medium sm:w-1/4">
                      {task}
                      <span className="mt-1 block font-normal text-muted-foreground sm:hidden">
                        <span className="font-medium text-foreground/80">Before: </span>
                        {before}
                      </span>
                      <span className="mt-1 block font-normal sm:hidden">
                        <span className="font-medium">After: </span>
                        {after}
                      </span>
                    </th>
                    <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell">{before}</td>
                    <td className="hidden px-4 py-3 sm:table-cell">{after}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section aria-labelledby="ship-heading" className="mt-14 max-w-3xl">
          <h2 id="ship-heading" className="text-xl font-semibold tracking-tight">
            How this would ship
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Not as one redesign: as small pull requests against the current screen, in this order, each with before and
            after screenshots and the reasoning in its description. The field screens would follow as their own set.
          </p>
          <ol className="mt-5 grid gap-3">
            {STACK.map((pr, i) => (
              <li key={pr.title} className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 rounded-lg border bg-card px-4 py-3">
                <span className="font-mono text-sm font-semibold text-muted-foreground">PR {i + 1}</span>
                <div>
                  <p className="text-sm font-semibold">{pr.title}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">{pr.text}</p>
                  <p className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                    Changes
                    {pr.changes.map((n) => (
                      <span
                        key={n}
                        className="flex size-5 items-center justify-center rounded-full bg-fuchsia-700 text-[11px] font-bold text-white"
                      >
                        {n}
                      </span>
                    ))}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="ask-heading" className="mt-14 max-w-3xl">
          <h2 id="ask-heading" className="text-xl font-semibold tracking-tight">
            What I’d ask your dispatchers in week one
          </h2>
          <ul className="mt-4 grid list-disc gap-2 pl-5 text-[15px] leading-relaxed marker:text-muted-foreground">
            {QUESTIONS.map((q) => (
              <li key={q}>
                {q}
                {q === HOW_LATE && <RiskStrip className="mt-3 mb-2" />}
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="built-heading" className="mt-14">
          <h2 id="built-heading" className="text-xl font-semibold tracking-tight">
            How it is built
          </h2>
          <p className="mt-2 max-w-3xl text-[15px] leading-relaxed text-muted-foreground">
            Next.js 15 App Router, React 19, TypeScript, Tailwind CSS, shadcn/ui on Radix, TanStack Table and Recharts. The
            orders, trucks and plants come from a fixed seed for one sample day, a Tuesday in June, shown as of 09:42.
            Changes made on the board stay in this browser tab until it is reloaded.
          </p>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
