import { cn } from "@/lib/utils";
import type { Order } from "@/lib/dispatch";

export function LoadProgress({
  delivered,
  total,
  className,
}: {
  delivered: number;
  total: number;
  className?: string;
}) {
  const pct = total ? Math.round((delivered / total) * 100) : 0;
  const done = total > 0 && delivered === total;
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span className="font-mono text-sm tabular" aria-hidden>
        {delivered}/{total}
      </span>
      <span className="sr-only">
        {delivered} of {total} loads delivered
      </span>
      <span className="h-1.5 w-12 overflow-hidden rounded-full bg-slate-200" aria-hidden>
        <span
          className={cn("block h-full rounded-full", done ? "bg-emerald-600" : "bg-primary")}
          style={{ width: `${pct}%` }}
        />
      </span>
    </span>
  );
}

export function TruckChip({ unit, className }: { unit: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center rounded-md border border-slate-300 bg-white px-1.5 font-mono text-xs font-medium text-slate-800",
        className,
      )}
    >
      {unit}
    </span>
  );
}

export function TruckChips({ order, max = 3 }: { order: Order; max?: number }) {
  if (order.truckIds.length === 0) {
    if (order.status === "on_hold" || order.status === "cancelled" || order.status === "complete") {
      return (
        <span className="text-sm text-muted-foreground">
          <span aria-hidden>—</span>
          <span className="sr-only">No trucks</span>
        </span>
      );
    }
    return (
      <span className="inline-flex h-6 items-center rounded-md border border-dashed border-amber-500 bg-amber-50 px-1.5 text-xs font-medium text-amber-900">
        No truck
      </span>
    );
  }
  const shown = order.truckIds.slice(0, max);
  const extra = order.truckIds.length - shown.length;
  return (
    <span className="flex flex-nowrap items-center gap-1">
      {shown.map((t) => (
        <TruckChip key={t} unit={t} />
      ))}
      {extra > 0 && (
        <span className="text-xs font-medium text-muted-foreground">
          +{extra}
          <span className="sr-only"> more: {order.truckIds.slice(max).join(", ")}</span>
        </span>
      )}
    </span>
  );
}

/** "24.0" with tabular figures; the unit lives in the column header. */
export function formatM3(value: number): string {
  return new Intl.NumberFormat("en-CA", { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(value);
}

/** Complete and cancelled orders need no more action today. */
export function isDone(order: Order): boolean {
  return order.status === "complete" || order.status === "cancelled";
}

/** "32 MPa · 20 mm · 6% air" that wraps between parts, never inside one. */
export function MixLabel({ label }: { label: string }) {
  const parts = label.split(" · ");
  return (
    <>
      {parts.map((part, i) => (
        <span key={part}>
          <span className="whitespace-nowrap">
            {part}
            {i < parts.length - 1 ? "\u00a0·" : ""}
          </span>
          {i < parts.length - 1 ? " " : ""}
        </span>
      ))}
    </>
  );
}
