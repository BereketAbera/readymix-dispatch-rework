"use client";

import { useId, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Marker } from "@/components/annotations";
import { OrderLoads, formatM3, isDone } from "@/components/dispatch/bits";
import { RiskNote, StaleNote, StatusBadge } from "@/components/dispatch/status";
import { formatClock, getRisk, type Order } from "@/lib/dispatch";
import { cn } from "@/lib/utils";

const NO_STALE: ReadonlySet<string> = new Set();

/** Phone layout of the board: one card per order with the fields a dispatcher needs, finished work folded away. */
export function OrderCards({
  orders,
  clock,
  onOpen,
  annotate = false,
  stale = NO_STALE,
  staleText = "",
}: {
  orders: Order[];
  clock: number;
  onOpen: (id: string) => void;
  annotate?: boolean;
  stale?: ReadonlySet<string>;
  staleText?: string;
}) {
  const [showDone, setShowDone] = useState(false);
  const doneId = useId();
  const sorted = [...orders].sort((a, b) => a.scheduledStart - b.scheduledStart);
  const open = sorted.filter((o) => !isDone(o));
  const done = sorted.filter(isDone);
  // With nothing open (a search that only matches finished work), show the finished cards.
  const doneVisible = showDone || open.length === 0;
  const props = { clock, onOpen, stale, staleText };
  return (
    <div className="grid gap-3">
      {open.length > 0 && <CardList orders={open} label="Open orders" annotateFirst={annotate} {...props} />}
      {done.length > 0 && (
        <div className="grid gap-2">
          <button
            type="button"
            aria-expanded={doneVisible}
            aria-controls={doneId}
            onClick={() => setShowDone((s) => !s)}
            className="flex h-11 items-center justify-between rounded-lg border bg-muted/50 px-3 text-sm font-semibold text-muted-foreground hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
          >
            Completed and cancelled · {done.length}
            <ChevronDown className={cn("size-4 transition-transform", doneVisible && "rotate-180")} aria-hidden />
          </button>
          {doneVisible && <CardList id={doneId} orders={done} label="Completed and cancelled orders" {...props} />}
        </div>
      )}
    </div>
  );
}

function CardList({
  id,
  orders,
  clock,
  onOpen,
  label,
  annotateFirst = false,
  stale,
  staleText,
}: {
  id?: string;
  orders: Order[];
  clock: number;
  onOpen: (id: string) => void;
  label: string;
  annotateFirst?: boolean;
  stale: ReadonlySet<string>;
  staleText: string;
}) {
  return (
    <ul id={id} className="grid grid-cols-1 gap-2" aria-label={label}>
      {orders.map((o, i) => {
        const risk = getRisk(o, clock);
        const isStale = stale.has(o.id);
        return (
          <li key={o.id} data-testid="order-card" className="relative min-w-0">
            <button
              type="button"
              data-order-open={o.id}
              onClick={() => onOpen(o.id)}
              className={cn(
                "relative flex w-full min-w-0 items-center gap-3 overflow-hidden rounded-lg border bg-card p-3 text-left shadow-xs transition-colors hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none",
                // The risk stripe is drawn over the padding, so every card's content lines up.
                risk && "before:absolute before:inset-y-0 before:left-0 before:w-1",
                risk?.level === "late" && "before:bg-red-600",
                risk?.level === "at_risk" && "before:bg-amber-500",
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
                  <OrderLoads order={o} />
                  <span className="font-mono text-muted-foreground tabular">{formatM3(o.volumeM3)} m³</span>
                </div>
                {risk && <RiskNote risk={risk} />}
                {isStale && <StaleNote text={staleText} />}
              </div>
              <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden />
              <span className="sr-only">, open order {o.number}</span>
            </button>
            {annotateFirst && i === 0 && (
              <>
                <Marker n={5} className="top-2 -left-2.5 size-5 text-[11px]" />
                <Marker n={4} className="top-10 -left-2.5 size-5 text-[11px]" />
                <Marker n={6} className="top-1/2 -right-2.5 size-5 -translate-y-1/2 text-[11px]" />
              </>
            )}
          </li>
        );
      })}
    </ul>
  );
}
