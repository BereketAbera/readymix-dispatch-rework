"use client";

import { ChevronRight } from "lucide-react";
import { LoadProgress, formatM3, isDone } from "@/components/dispatch/bits";
import { RiskNote, StatusBadge } from "@/components/dispatch/status";
import { formatClock, getRisk, type Order } from "@/lib/dispatch";
import { cn } from "@/lib/utils";

/** Phone layout of the board: one card per order with the four fields a dispatcher needs. */
export function OrderCards({
  orders,
  clock,
  onOpen,
}: {
  orders: Order[];
  clock: number;
  onOpen: (id: string) => void;
}) {
  const sorted = [...orders].sort((a, b) => a.scheduledStart - b.scheduledStart);
  const open = sorted.filter((o) => !isDone(o));
  const done = sorted.filter(isDone);
  return (
    <div className="grid gap-4">
      {open.length > 0 && <CardList orders={open} clock={clock} onOpen={onOpen} label="Open orders" />}
      {done.length > 0 && (
        <div className="grid gap-2">
          <h2 className="text-xs font-semibold text-muted-foreground">Completed and cancelled · {done.length}</h2>
          <CardList orders={done} clock={clock} onOpen={onOpen} label="Completed and cancelled orders" />
        </div>
      )}
    </div>
  );
}

function CardList({
  orders,
  clock,
  onOpen,
  label,
}: {
  orders: Order[];
  clock: number;
  onOpen: (id: string) => void;
  label: string;
}) {
  return (
    <ul className="grid gap-2" aria-label={label}>
      {orders.map((o) => {
        const risk = getRisk(o, clock);
        return (
          <li key={o.id} data-testid="order-card">
            <button
              type="button"
              onClick={() => onOpen(o.id)}
              className={cn(
                "flex w-full min-w-0 items-center gap-3 rounded-lg border bg-card p-3 text-left shadow-xs transition-colors hover:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                risk?.level === "late" && "border-l-4 border-l-red-600",
                risk?.level === "at_risk" && "border-l-4 border-l-amber-500",
              )}
            >
              <div className="grid min-w-0 flex-1 gap-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-base font-semibold tabular">{formatClock(o.scheduledStart)}</span>
                  <StatusBadge status={o.status} />
                </div>
                <p className={cn("truncate font-medium", o.status === "cancelled" && "line-through")}>{o.customer}</p>
                <p className="truncate text-sm text-muted-foreground">{o.siteAddress}</p>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                  <LoadProgress delivered={o.loadsDelivered} total={o.loadsTotal} />
                  <span className="font-mono text-muted-foreground tabular">{formatM3(o.volumeM3)} m³</span>
                </div>
                {risk && <RiskNote risk={risk} />}
              </div>
              <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
