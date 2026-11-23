"use client";

import { ArrowRight } from "lucide-react";
import { TileSkeleton } from "@/components/states";
import { formatM3 } from "@/components/dispatch/bits";
import type { Kpis } from "@/lib/dispatch";
import { cn } from "@/lib/utils";

function Tile({
  label,
  value,
  unit,
  detail,
  tone = "default",
  onClick,
  actionLabel,
}: {
  label: string;
  value: string;
  unit?: string;
  detail: string;
  tone?: "default" | "alert";
  onClick?: () => void;
  actionLabel?: string;
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
        <span className={cn("text-2xl font-semibold tracking-tight tabular", tone === "alert" && "text-red-700")}>
          {value}
        </span>
        {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
      </span>
      <span className="mt-0.5 block truncate text-xs text-muted-foreground">{detail}</span>
    </>
  );
  const base = "block min-w-0 rounded-lg border bg-card px-3 py-2.5 text-left";
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          base,
          "transition-colors hover:border-primary/40 hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
          tone === "alert" && "border-red-200",
        )}
      >
        {body}
      </button>
    );
  }
  return <div className={base}>{body}</div>;
}

export function KpiTiles({
  kpis,
  state = "ready",
  onShowAtRisk,
}: {
  kpis: Kpis;
  state?: "ready" | "loading" | "unavailable";
  onShowAtRisk: () => void;
}) {
  if (state === "loading") {
    return (
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4" aria-hidden>
        {Array.from({ length: 4 }, (_, i) => (
          <TileSkeleton key={i} />
        ))}
      </div>
    );
  }
  const na = state === "unavailable";
  const risky = kpis.late + kpis.atRisk;
  const pct = kpis.scheduledM3 ? Math.round((kpis.deliveredM3 / kpis.scheduledM3) * 100) : 0;
  return (
    <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
      <Tile
        label="Scheduled today"
        value={na ? "—" : formatM3(kpis.scheduledM3)}
        unit="m³"
        detail={na ? "Not available" : `${formatM3(kpis.deliveredM3)} m³ delivered · ${pct}%`}
      />
      <Tile
        label="Loads en route"
        value={na ? "—" : String(kpis.loadsEnRoute)}
        detail={na ? "Not available" : `${kpis.loadsOnSite} on site or pouring`}
      />
      <Tile
        label="Trucks available"
        value={na ? "—" : String(kpis.trucksAvailable)}
        unit={na ? undefined : `of ${kpis.trucksInService}`}
        detail={
          na
            ? "Not available"
            : kpis.trucksOutOfService
              ? `${kpis.trucksOutOfService} in the shop`
              : "All trucks in service"
        }
      />
      <Tile
        label="Orders at risk"
        value={na ? "—" : String(risky)}
        tone={!na && risky > 0 ? "alert" : "default"}
        detail={na ? "Not available" : risky ? `${kpis.late} late · ${kpis.atRisk} at risk` : "Everything on plan"}
        onClick={!na && risky > 0 ? onShowAtRisk : undefined}
        actionLabel="Show"
      />
    </div>
  );
}
