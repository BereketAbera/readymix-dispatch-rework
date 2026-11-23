"use client";

import dynamic from "next/dynamic";
import { ArrowRight } from "lucide-react";
import { Marker } from "@/components/annotations";
import { TileSkeleton } from "@/components/states";
import { formatM3 } from "@/components/dispatch/bits";
import { ChartLegend, ChartSkeleton } from "@/components/dispatch/chart-parts";
import type { HourBucket, Kpis } from "@/lib/dispatch";
import { cn } from "@/lib/utils";

// Recharts loads in its own chunk, after the board is on screen.
const HourlyChart = dynamic(() => import("@/components/dispatch/hourly-chart").then((m) => m.HourlyChart), {
  ssr: false,
  loading: () => <ChartSkeleton className="mb-3.5" />,
});

/** Whole numbers stay whole: "0", "17"; volumes keep one decimal: "582.5". */
function m3(value: number): string {
  return value === 0 ? "0" : formatM3(value);
}

function Tile({
  label,
  value,
  unit,
  detail,
  tone = "default",
  onClick,
  actionLabel,
  className,
}: {
  label: string;
  value: string;
  unit?: string;
  detail: string;
  tone?: "default" | "alert";
  onClick?: () => void;
  actionLabel?: string;
  className?: string;
}) {
  const body = (
    <>
      <span className="flex items-center justify-between gap-2 text-xs font-medium text-muted-foreground">
        {label}
        {onClick && (
          <span className="inline-flex items-center gap-0.5 text-primary">
            {actionLabel}
            <ArrowRight className="size-3.5" aria-hidden />
          </span>
        )}
      </span>
      <span className="mt-1 flex items-baseline gap-1">
        <span className={cn("text-2xl font-semibold tracking-tight", tone === "alert" && "text-red-700")}>{value}</span>
        {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
      </span>
      <span className="mt-0.5 block truncate text-xs text-muted-foreground">{detail}</span>
    </>
  );
  const base = "flex min-w-0 flex-col justify-start rounded-lg border bg-card px-3 py-2.5 text-left";
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          base,
          "transition-colors hover:border-primary/40 hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none",
          tone === "alert" && "border-red-200",
          className,
        )}
      >
        {body}
      </button>
    );
  }
  return <div className={cn(base, className)}>{body}</div>;
}

/**
 * The numbers above the board. The m³ tile carries the hourly chart; on a
 * phone it spans the row, beside the table it takes two of five columns.
 */
export function KpiTiles({
  kpis,
  hours,
  clock,
  state = "ready",
  empty = false,
  selectedHour = null,
  onPickHour,
  onShowAtRisk,
}: {
  kpis: Kpis;
  hours: HourBucket[];
  clock: number;
  state?: "ready" | "loading";
  /** Nothing is booked (the empty-day state). */
  empty?: boolean;
  selectedHour?: number | null;
  onPickHour: (hour: number | null) => void;
  onShowAtRisk: () => void;
}) {
  // Phone: chart tile, two tiles, at-risk tile. Tablet: chart tile over three tiles. Wide: one row, the chart tile widest.
  const grid =
    "grid grid-cols-2 gap-2 @min-[480px]/kpis:grid-cols-3 @min-[880px]/kpis:grid-cols-[minmax(0,2.4fr)_repeat(3,minmax(0,1fr))]";
  const wide = "col-span-2 @min-[480px]/kpis:col-span-3 @min-[880px]/kpis:col-span-1";
  const risk = "col-span-2 @min-[480px]/kpis:col-span-1";
  if (state === "loading") {
    return (
      <div className="@container/kpis" aria-hidden>
        <div className={grid}>
          <div className={cn("flex gap-4 rounded-lg border bg-card p-3", wide)}>
            <TileSkeleton className="w-32 shrink-0 border-0 p-0" />
            <ChartSkeleton className="min-w-0 flex-1 self-end" />
          </div>
          <TileSkeleton />
          <TileSkeleton />
          <TileSkeleton className={risk} />
        </div>
      </div>
    );
  }
  const risky = kpis.late + kpis.atRisk;
  const pct = kpis.scheduledM3 ? Math.round((kpis.deliveredM3 / kpis.scheduledM3) * 100) : 0;
  return (
    <div className="@container/kpis">
      <div className={grid}>
        <div className={cn("@container/tile relative min-w-0 rounded-lg border bg-card px-3 py-2.5", wide)}>
          <div className="flex flex-col gap-2 @min-[340px]/tile:flex-row @min-[340px]/tile:gap-4">
            <div className="shrink-0">
              <p className="text-xs font-medium text-muted-foreground">Scheduled today</p>
              <p className="mt-1 flex items-baseline gap-1">
                <span className="text-2xl font-semibold tracking-tight">{m3(kpis.scheduledM3)}</span>
                <span className="text-sm text-muted-foreground">m³</span>
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {empty ? "Nothing scheduled" : `${m3(kpis.deliveredM3)} m³ delivered · ${pct}%`}
              </p>
            </div>
            <div className="relative min-w-0 flex-1">
              <div className="mb-1 flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5">
                <p className="text-[11px] font-medium text-muted-foreground">m³ due on site, by hour</p>
                <ChartLegend clock={clock} />
              </div>
              <HourlyChart data={hours} clock={clock} selectedHour={selectedHour} onPickHour={onPickHour} />
            </div>
          </div>
          <Marker n={9} className="-top-2.5 -right-2.5" />
        </div>
        <Tile
          label="Loads en route"
          value={String(kpis.loadsEnRoute)}
          detail={empty ? "Nothing on the road" : `${kpis.loadsOnSite} on site or pouring`}
        />
        <Tile
          label="Trucks available"
          value={String(kpis.trucksAvailable)}
          unit={`of ${kpis.trucksInService}`}
          detail={kpis.trucksOutOfService ? `${kpis.trucksOutOfService} in the shop` : "All trucks in service"}
        />
        <Tile
          label="Orders at risk"
          value={String(risky)}
          tone={risky > 0 ? "alert" : "default"}
          detail={empty ? "Nothing booked yet" : risky ? `${kpis.late} late · ${kpis.atRisk} at risk` : "Everything on plan"}
          onClick={risky > 0 ? onShowAtRisk : undefined}
          actionLabel="Show"
          className={risk}
        />
      </div>
    </div>
  );
}
