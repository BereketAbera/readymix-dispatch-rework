"use client";

import { useId, useRef, useState, type KeyboardEvent } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartContainer, type ChartConfig } from "@/components/ui/chart";
import { formatM3 } from "@/components/dispatch/bits";
import { hh, range } from "@/components/dispatch/chart-parts";
import { type HourBucket } from "@/lib/dispatch";
import { cn } from "@/lib/utils";

const config = {
  delivered: { label: "Delivered", color: "var(--chart-done)" },
  toCome: { label: "Still to pour", color: "var(--chart-planned)" },
} satisfies ChartConfig;

type SegmentProps = {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  fill?: string;
  payload?: HourBucket;
};

/**
 * One stacked segment: 4 px rounded data end on whichever segment is on top,
 * square at the baseline, and a 2 px surface gap between the two segments.
 */
function segment(kind: "delivered" | "toCome", dim: (hour: number) => boolean) {
  function Segment({ x = 0, y = 0, width = 0, height = 0, fill, payload }: SegmentProps) {
    if (!payload || height <= 0) return null;
    const onTop = kind === "toCome" || payload.toCome === 0;
    const h = kind === "toCome" && payload.delivered > 0 ? Math.max(0, height - 2) : height;
    if (h <= 0) return null;
    const r = onTop ? Math.min(4, h, width / 2) : 0;
    const d = r
      ? `M${x},${y + h} V${y + r} Q${x},${y} ${x + r},${y} H${x + width - r} Q${x + width},${y} ${x + width},${y + r} V${y + h} Z`
      : `M${x},${y} H${x + width} V${y + h} H${x} Z`;
    return <path d={d} fill={fill} opacity={dim(payload.hour) ? 0.3 : 1} />;
  }
  return Segment;
}

/**
 * Concrete due on site per hour, delivered against still to pour, with a line
 * at the board time. Recharts draws the bars; a row of buttons over the bands
 * gives every hour a hover and keyboard tooltip and makes it clickable, so no
 * value depends on hovering.
 */
export function HourlyChart({
  data,
  clock,
  selectedHour = null,
  onPickHour,
  size = "tile",
  className,
}: {
  data: HourBucket[];
  clock: number;
  selectedHour?: number | null;
  onPickHour?: (hour: number | null) => void;
  size?: "tile" | "large";
  className?: string;
}) {
  const [active, setActive] = useState<number | null>(null);
  const [focusIndex, setFocusIndex] = useState(() => Math.max(0, data.findIndex((d) => d.hour === Math.floor(clock / 60))));
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const tipId = useId();
  const n = data.length;
  const first = data[0]?.hour ?? 6;
  const large = size === "large";
  const axisWidth = large ? 36 : 0;
  const plotHeight = large ? 160 : 44;
  const empty = data.every((d) => d.delivered + d.toCome === 0);
  const nowPct = ((clock / 60 - first) / n) * 100;
  const dim = (hour: number) => selectedHour !== null && hour !== selectedHour;
  const shown = active ?? null;
  const tip = shown !== null ? data[shown] : null;

  function onKeyDown(e: KeyboardEvent<HTMLButtonElement>, i: number) {
    const next = e.key === "ArrowRight" ? i + 1 : e.key === "ArrowLeft" ? i - 1 : e.key === "Home" ? 0 : e.key === "End" ? n - 1 : null;
    if (next === null) return;
    e.preventDefault();
    const target = Math.min(n - 1, Math.max(0, next));
    setFocusIndex(target);
    buttons.current[target]?.focus();
  }

  return (
    <div className={cn("relative", className)}>
      <div className="relative" style={{ height: plotHeight }}>
        <ChartContainer config={config} className="aspect-auto h-full w-full" initialDimension={{ width: 240, height: plotHeight }}>
          <BarChart
            data={data}
            margin={{ top: large ? 8 : 2, right: 0, bottom: 0, left: 0 }}
            barCategoryGap={large ? "24%" : "18%"}
            accessibilityLayer={false}
          >
            {large && <CartesianGrid vertical={false} stroke="var(--border)" />}
            <XAxis dataKey="hour" hide />
            {large && (
              <YAxis
                width={axisWidth}
                tickLine={false}
                axisLine={false}
                tickMargin={6}
                tickCount={4}
                allowDecimals={false}
                tick={{ fontSize: 11 }}
              />
            )}
            <Bar
              dataKey="delivered"
              stackId="m3"
              fill="var(--color-delivered)"
              maxBarSize={24}
              isAnimationActive={false}
              shape={segment("delivered", dim)}
            />
            <Bar
              dataKey="toCome"
              stackId="m3"
              fill="var(--color-toCome)"
              maxBarSize={24}
              isAnimationActive={false}
              shape={segment("toCome", dim)}
            />
          </BarChart>
        </ChartContainer>

        <div className="pointer-events-none absolute inset-y-0 right-0" style={{ left: axisWidth }}>
          {/* Baseline and the line at the board time. */}
          <span className="absolute inset-x-0 bottom-0 h-px bg-border" aria-hidden />
          {nowPct >= 0 && nowPct <= 100 && (
            <span className="absolute -top-1 bottom-0 w-px bg-foreground/70" style={{ left: `${nowPct}%` }} aria-hidden />
          )}
          {empty && (
            <span className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
              No pours booked
            </span>
          )}
        </div>

        {!empty && (
          <div
            role="group"
            aria-label="Concrete due on site by hour"
            className="absolute inset-y-0 right-0 grid"
            style={{ left: axisWidth, gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}
            onMouseLeave={() => setActive(null)}
          >
            {data.map((d, i) => {
              const total = d.delivered + d.toCome;
              const picked = selectedHour === d.hour;
              return (
                <button
                  key={d.hour}
                  ref={(el) => {
                    buttons.current[i] = el;
                  }}
                  type="button"
                  tabIndex={i === focusIndex ? 0 : -1}
                  aria-pressed={onPickHour ? picked : undefined}
                  aria-label={`${range(d.hour)}: ${formatM3(total)} cubic metres due, ${formatM3(d.delivered)} delivered, ${formatM3(d.toCome)} to pour.${onPickHour ? (picked ? " Showing these pours." : " Show these pours.") : ""}`}
                  aria-describedby={active === i ? tipId : undefined}
                  onMouseEnter={() => setActive(i)}
                  onFocus={() => {
                    setActive(i);
                    setFocusIndex(i);
                  }}
                  onBlur={() => setActive(null)}
                  onKeyDown={(e) => onKeyDown(e, i)}
                  onClick={() => onPickHour?.(picked ? null : d.hour)}
                  className={cn(
                    "h-full rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
                    onPickHour ? "cursor-pointer hover:bg-foreground/5" : "cursor-default",
                  )}
                />
              );
            })}
          </div>
        )}

        {tip && shown !== null && (
          <div
            id={tipId}
            role="tooltip"
            className="pointer-events-none absolute bottom-full z-20 mb-1.5 w-max max-w-48 -translate-x-1/2 rounded-md border bg-popover px-2 py-1 text-xs shadow-md"
            style={{
              left: `calc(${axisWidth}px + (100% - ${axisWidth}px) * ${(shown + 0.5) / n})`,
            }}
          >
            <p className="font-semibold tabular">{formatM3(tip.delivered + tip.toCome)} m³ due</p>
            <p className="text-muted-foreground tabular">
              {formatM3(tip.delivered)} delivered · {formatM3(tip.toCome)} to pour
            </p>
            <p className="text-muted-foreground">{range(tip.hour)}</p>
          </div>
        )}
      </div>

      {/* Hour labels every three hours, aligned to the bands. */}
      <div
        className="mt-1 grid text-[10px] leading-none text-muted-foreground tabular"
        style={{ marginLeft: axisWidth, gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}
        aria-hidden
      >
        {data.map((d) => (
          <span key={d.hour} className="text-center">
            {(d.hour - first) % 3 === 0 ? hh(d.hour) : ""}
          </span>
        ))}
      </div>
    </div>
  );
}
