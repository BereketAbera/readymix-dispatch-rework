import type { Metadata } from "next";
import Link from "next/link";
import { DemoBar } from "@/components/demo-bar";
import { getDispatchDay } from "@/lib/dispatch";
import { LegacyOrders } from "./legacy-orders";

export const metadata: Metadata = {
  title: "Before: a typical first-version screen",
};

const MENU = ["Dashboard", "Orders", "Dispatch", "Trucks", "Customers", "Reports", "Admin"];

/** What a dispatcher runs into on this screen, each linked to the change that answers it. */
const NOTES: { text: string; href: string; link: string }[] = [
  {
    text: "Page 1 is ten finished jobs. The two late pours are on page 2, and nothing marks them late.",
    href: "/after?view=at-risk",
    link: "At risk, first thing on the board",
  },
  {
    text: "“New order” is the fifth item in the Actions menu.",
    href: "/after?notes=1",
    link: "One primary action",
  },
  {
    text: "Orders with no truck say “null” in Trucks, from page 3 on.",
    href: "/after?view=unassigned",
    link: "The Unassigned view",
  },
];

export default function BeforePage() {
  const day = getDispatchDay();
  return (
    <div className="min-h-dvh bg-background">
      <DemoBar />
      <main>
        <div className="border-b border-amber-300 bg-amber-50 px-4 py-2.5 text-sm text-amber-950 md:px-6">
          <p>
            <strong className="font-semibold">Before:</strong> a typical first-version screen, reconstructed for this
            demo. Same data and components as the reworked board; only the design decisions differ.
          </p>
          <ol className="mt-1.5 grid gap-1 md:grid-cols-3 md:gap-4">
            {NOTES.map((n, i) => (
              <li key={n.href} className="flex gap-2">
                <span className="mt-px flex size-5 shrink-0 items-center justify-center rounded-full bg-amber-900 text-[11px] font-bold text-white">
                  {i + 1}
                </span>
                <span>
                  {n.text}{" "}
                  <Link
                    href={n.href}
                    className="font-medium underline underline-offset-2 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
                  >
                    {n.link}
                  </Link>
                </span>
              </li>
            ))}
          </ol>
        </div>
        <div className="flex items-center gap-6 border-b bg-white px-4 md:px-6">
          <span className="py-3 text-sm font-bold tracking-wide whitespace-nowrap">PRM PORTAL</span>
          <nav aria-label="Main" className="hidden md:block">
            <ul className="flex gap-4 text-sm">
              {MENU.map((item) => (
                <li
                  key={item}
                  className={
                    item === "Dispatch"
                      ? "border-b-2 border-primary py-3 font-medium"
                      : "border-b-2 border-transparent py-3 text-muted-foreground"
                  }
                >
                  {item}
                </li>
              ))}
            </ul>
          </nav>
          <span className="ml-auto text-sm text-muted-foreground">dispatch01 ▾</span>
        </div>
        <LegacyOrders day={day} />
      </main>
    </div>
  );
}
