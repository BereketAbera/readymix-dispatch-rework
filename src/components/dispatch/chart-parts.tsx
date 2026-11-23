import { formatM3 } from "@/components/dispatch/bits";
import { formatClock, type HourBucket } from "@/lib/dispatch";
import { cn } from "@/lib/utils";

/* Light pieces of the hourly chart that do not need Recharts, so they can render before it loads. */

export const hh = (hour: number) => String(hour).padStart(2, "0");
export const range = (hour: number) => `${hh(hour)}:00–${hh(hour + 1)}:00`;

export function ChartLegend({ clock, className }: { clock: number; className?: string }) {
  return (
    <ul className={cn("flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground", className)}>
      <li className="flex items-center gap-1">
        <span className="size-2 rounded-[2px] bg-(--chart-done)" aria-hidden />
        Delivered
      </li>
      <li className="flex items-center gap-1">
        <span className="size-2 rounded-[2px] bg-(--chart-planned)" aria-hidden />
        To pour
      </li>
      <li className="flex items-center gap-1">
        <span className="h-2.5 w-px bg-foreground/70" aria-hidden />
        Now {formatClock(clock)}
      </li>
    </ul>
  );
}

/** The same numbers as a table: the chart's accessible twin. */
export function HourlyTable({ data, caption }: { data: HourBucket[]; caption: string }) {
  return (
    <table className="w-full text-sm">
      <caption className="sr-only">{caption}</caption>
      <thead>
        <tr className="border-b text-xs text-muted-foreground">
          <th scope="col" className="py-1.5 pr-3 text-left font-medium">
            Hour
          </th>
          <th scope="col" className="py-1.5 pr-3 text-right font-medium">
            Due m³
          </th>
          <th scope="col" className="py-1.5 pr-3 text-right font-medium">
            Delivered m³
          </th>
          <th scope="col" className="py-1.5 text-right font-medium">
            To pour m³
          </th>
        </tr>
      </thead>
      <tbody className="font-mono tabular">
        {data.map((d) => (
          <tr key={d.hour} className="border-b last:border-0">
            <th scope="row" className="py-1 pr-3 text-left font-normal">
              {range(d.hour)}
            </th>
            <td className="py-1 pr-3 text-right">{formatM3(d.delivered + d.toCome)}</td>
            <td className="py-1 pr-3 text-right">{formatM3(d.delivered)}</td>
            <td className="py-1 text-right">{formatM3(d.toCome)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function ChartSkeleton({ height = 44, className }: { height?: number; className?: string }) {
  const bars = [30, 55, 70, 85, 60, 75, 50, 65, 40, 30, 20];
  return (
    <div className={cn("flex items-end gap-1.5", className)} style={{ height }} aria-hidden>
      {bars.map((h, i) => (
        <span key={i} className="flex-1 animate-pulse rounded-t-sm bg-muted" style={{ height: `${h}%` }} />
      ))}
    </div>
  );
}
