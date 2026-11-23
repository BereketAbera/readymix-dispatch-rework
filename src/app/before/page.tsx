import type { Metadata } from "next";
import { DemoBar } from "@/components/demo-bar";
import { getDispatchDay } from "@/lib/dispatch";
import { LegacyOrders } from "./legacy-orders";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Before: a typical first-version screen",
};

const MENU = ["Dashboard", "Orders", "Dispatch", "Trucks", "Customers", "Reports", "Admin"];

export default function BeforePage() {
  const day = getDispatchDay();
  return (
    <div className="min-h-dvh bg-background">
      <DemoBar />
      <p className="border-b border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-950 md:px-6">
        <strong className="font-semibold">Before:</strong> a typical first-version screen, reconstructed for this demo.
        Same data and components as the reworked board; only the design decisions differ.
      </p>
      <header className="flex items-center gap-6 border-b bg-white px-4 md:px-6">
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
      </header>
      <LegacyOrders day={day} />
    </div>
  );
}
