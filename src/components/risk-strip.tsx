import type { ReactNode } from "react";
import { LATE_AFTER_MIN, NO_TRUCK_WINDOW_MIN, SLIPPING_AFTER_MIN } from "@/lib/dispatch";
import { cn } from "@/lib/utils";

/** The same colours as the board's risk badges. */
const TONE = {
  none: "bg-slate-100 font-medium text-slate-600 ring-slate-200 border-slate-200",
  risk: "bg-amber-50 text-amber-900 ring-amber-300 border-amber-300",
  late: "bg-red-50 text-red-800 ring-red-200 border-red-200",
};

interface Band {
  label: string;
  tone: keyof typeof TONE;
  /** Minutes this band covers on its scale. */
  span: number;
  /** No upper end: the band runs off the right of the scale, with no edge or corner there. */
  open?: boolean;
}

interface Tick {
  label: string;
  /** Minutes from the left end of the scale. */
  at: number;
}

const GAP_PX = 4;

/**
 * The three numbers behind the board's At risk and Late flags, on two small scales.
 * It reads the constants the board uses, so it always shows what the board does.
 */
export function RiskStrip({ className }: { className?: string }) {
  // The no-truck scale runs from two windows before the start to a third of a window after it.
  const lead = 2 * NO_TRUCK_WINDOW_MIN;
  const tail = Math.round(NO_TRUCK_WINDOW_MIN / 3);
  return (
    <figure className={cn("max-w-xl rounded-lg border bg-card p-4", className)}>
      <p className="sr-only">
        On the board, an order {SLIPPING_AFTER_MIN} to {LATE_AFTER_MIN - 1} minutes behind plan is at risk, and one{" "}
        {LATE_AFTER_MIN} minutes or more behind is late. An order with no truck is at risk from {NO_TRUCK_WINDOW_MIN}{" "}
        minutes before its start.
      </p>
      <div aria-hidden className="grid gap-4">
        <Scale
          title="Minutes behind plan"
          bands={[
            { label: "On plan", tone: "none", span: SLIPPING_AFTER_MIN },
            { label: "At risk", tone: "risk", span: LATE_AFTER_MIN - SLIPPING_AFTER_MIN },
            // Late has no upper end: it gets the same width as On plan and stays open on the right.
            { label: "Late", tone: "late", span: SLIPPING_AFTER_MIN, open: true },
          ]}
          ticks={[
            { label: "0", at: 0 },
            { label: String(SLIPPING_AFTER_MIN), at: SLIPPING_AFTER_MIN },
            { label: String(LATE_AFTER_MIN), at: LATE_AFTER_MIN },
          ]}
        />
        <Scale
          title="No truck assigned"
          bands={[
            { label: "Not flagged yet", tone: "none", span: lead - NO_TRUCK_WINDOW_MIN },
            { label: "At risk", tone: "risk", span: NO_TRUCK_WINDOW_MIN + tail },
          ]}
          ticks={[
            { label: `${NO_TRUCK_WINDOW_MIN} min before start`, at: lead - NO_TRUCK_WINDOW_MIN },
            { label: "Start", at: lead },
          ]}
        />
      </div>
      <figcaption className="mt-3 text-xs leading-normal text-muted-foreground">
        What this sample assumes today. Your answers in week one replace these three thresholds.
      </figcaption>
    </figure>
  );
}

function Scale({ title, bands, ticks }: { title: ReactNode; bands: Band[]; ticks: Tick[] }) {
  const total = bands.reduce((sum, b) => sum + b.span, 0);
  const gaps = (bands.length - 1) * GAP_PX;
  return (
    <div className="grid gap-1.5 sm:grid-cols-[9.5rem_minmax(0,1fr)] sm:gap-x-4">
      <p className="text-xs leading-5 font-medium text-foreground/80 sm:leading-7">{title}</p>
      <div>
        <div className="flex h-7" style={{ gap: GAP_PX }}>
          {bands.map((b) => (
            <span
              key={b.label}
              style={{ flex: `${b.span} 1 0` }}
              className={cn(
                "flex min-w-0 items-center justify-center px-1 text-xs font-semibold whitespace-nowrap",
                b.open ? "rounded-l-md border border-r-0" : "rounded-md ring-1 ring-inset",
                TONE[b.tone],
              )}
            >
              {b.label}
            </span>
          ))}
        </div>
        <div className="relative mt-1 h-4 text-xs text-muted-foreground tabular">
          {ticks.map((t) => (
            <span
              key={t.label}
              style={{ left: position(bands, t.at, gaps, total) }}
              className={cn(
                "absolute top-0 whitespace-nowrap",
                t.at === total ? "-translate-x-full" : t.at > 0 && "-translate-x-1/2",
              )}
            >
              {t.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Where a value sits on the bar. A value on a band edge sits in the middle of the gap between the two bands. */
function position(bands: Band[], at: number, gaps: number, total: number): string {
  let end = 0;
  let gapPx = gaps;
  for (let i = 0; i < bands.length; i++) {
    end += bands[i].span;
    const last = i === bands.length - 1;
    if (at === end && !last) {
      gapPx = (i + 0.5) * GAP_PX;
      break;
    }
    if (at < end) {
      gapPx = i * GAP_PX;
      break;
    }
  }
  return `calc((100% - ${gaps}px) * ${at / total} + ${gapPx}px)`;
}
