import type { Metadata } from "next";
import { DemoBar } from "@/components/demo-bar";
import { ProductBrand } from "@/components/product-shell";
import { formatClock, formatDayLabel, getDispatchDay } from "@/lib/dispatch";
import { FieldApp } from "./field-app";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Field: driver and QC view",
};

export default function FieldPage() {
  const day = getDispatchDay();
  // The truck shown is one that is on the road at the board clock, with the most tickets today.
  const ticketsPerTruck = (id: string) => day.orders.flatMap((o) => o.loads).filter((l) => l.truckId === id).length;
  const truck =
    day.trucks
      .filter((t) => t.status === "en_route")
      .sort((a, b) => ticketsPerTruck(b.id) - ticketsPerTruck(a.id) || a.unit.localeCompare(b.unit))[0] ?? day.trucks[0];
  const plant = day.plants.find((p) => p.id === truck.plantId);

  return (
    <div className="min-h-dvh bg-background">
      <DemoBar />
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 md:px-6">
          <ProductBrand subtitle="Field" />
          <div className="ml-auto text-right">
            <p className="text-sm font-semibold">
              <span className="font-mono">{truck.unit}</span> · {truck.driver}
            </p>
            <p className="text-xs text-muted-foreground">
              {plant?.name} · {formatDayLabel(day.date)} · <span className="font-mono">{formatClock(day.clock)}</span>
            </p>
          </div>
        </div>
      </header>
      <FieldApp day={day} truck={truck} />
    </div>
  );
}
