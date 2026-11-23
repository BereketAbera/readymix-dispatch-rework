"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CalendarX2, Check, LoaderCircle, Plus, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Field, UnitInput } from "@/components/form-field";
import { ChartLegend, ChartSkeleton, HourlyTable } from "@/components/dispatch/chart-parts";
import { OrderCards } from "@/components/dispatch/order-cards";
import { OrderSheet, type OrderAction } from "@/components/dispatch/order-sheet";
import { OrdersTable } from "@/components/dispatch/orders-table";
import { SchedulePourDialog } from "@/components/dispatch/schedule-pour-dialog";
import { RiskBadge, STATUS_META, StatusBadge } from "@/components/dispatch/status";
import { CardsSkeleton, EmptyState, ErrorState, PartialNotice, TableSkeleton } from "@/components/states";
import {
  assignTruck,
  cancelOrder,
  filterOrders,
  holdOrder,
  hourlyVolume,
  releaseHold,
  viewCounts,
  type DispatchDay,
  type NewOrderInput,
  type Order,
  type OrderStatus,
  type SavedView,
} from "@/lib/dispatch";
import { checkTestValue, parseDecimal, specFor } from "@/lib/validation";

const HourlyChart = dynamic(() => import("@/components/dispatch/hourly-chart").then((m) => m.HourlyChart), {
  ssr: false,
  loading: () => <ChartSkeleton height={160} className="mb-3.5 ml-9" />,
});

function Frame({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <figure className="min-w-0 overflow-hidden rounded-lg border bg-card">
      <figcaption className="border-b bg-muted/50 px-3 py-1.5 text-xs font-medium text-muted-foreground">{label}</figcaption>
      <div className="min-w-0">{children}</div>
    </figure>
  );
}

/** The real table and side sheet on a few of the sample's orders: rows open their detail, as rule TB7 says. */
export function TablesExample({ day }: { day: DispatchDay }) {
  const [orders, setOrders] = useState<Order[]>(() =>
    day.orders.filter((o) => o.status !== "complete" && o.status !== "cancelled").slice(0, 9),
  );
  const [openId, setOpenId] = useState<string | null>(null);
  const [shownId, setShownId] = useState<string | null>(null);
  const shown = orders.find((o) => o.id === shownId) ?? null;
  const open = useCallback((id: string) => {
    setShownId(id);
    setOpenId(id);
  }, []);
  function act(orderId: string, action: OrderAction) {
    const apply = action === "hold" ? holdOrder : action === "release" ? releaseHold : cancelOrder;
    setOrders((list) => list.map((o) => (o.id === orderId ? apply(o) : o)));
  }
  return (
    <div className="grid gap-3">
      <Frame label="Live example · click a row to open it; scroll inside the table to see the sticky header">
        <div className="hidden h-[320px] md:block">
          <OrdersTable orders={orders} clock={day.clock} selectedId={openId} onOpen={open} className="h-full" />
        </div>
        <div className="p-3 md:hidden">
          <OrderCards orders={orders} clock={day.clock} onOpen={open} />
        </div>
      </Frame>
      <Frame label="Status and risk badges">
        <div className="flex flex-wrap gap-2 p-3">
          {(Object.keys(STATUS_META) as OrderStatus[]).map((s) => (
            <StatusBadge key={s} status={s} />
          ))}
          <RiskBadge risk={{ level: "late", minutes: 21, reason: "", short: "" }} />
          <RiskBadge risk={{ level: "at_risk", minutes: 8, reason: "", short: "" }} />
        </div>
      </Frame>
      <OrderSheet
        order={shown}
        plants={day.plants}
        trucks={day.trucks}
        clock={day.clock}
        open={openId !== null}
        onOpenChange={(next) => !next && setOpenId(null)}
        onAssign={(orderId, truckId) => setOrders((list) => list.map((o) => (o.id === orderId ? assignTruck(o, truckId) : o)))}
        onAction={act}
        onCloseAutoFocus={(e) => {
          e.preventDefault();
          const el = Array.from(document.querySelectorAll<HTMLElement>(`[data-order-open="${shownId}"]`)).find(
            (x) => x.getClientRects().length > 0,
          );
          el?.focus();
        }}
      />
    </div>
  );
}

const VIEWS: { id: SavedView; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "at_risk", label: "At risk" },
  { id: "unassigned", label: "Unassigned" },
  { id: "on_hold", label: "On hold" },
];

export function FiltersExample({ day }: { day: DispatchDay }) {
  const [view, setView] = useState<SavedView>("today");
  const [q, setQ] = useState("");
  const ref = useRef<HTMLInputElement>(null);
  const counts = viewCounts(day.orders, "all", day.clock);
  const results = filterOrders(day.orders, { plant: "all", view, query: q }, day.clock);
  const params = new URLSearchParams();
  if (view !== "today") params.set("view", view.replace("_", "-"));
  if (q.trim()) params.set("q", q.trim());
  const href = `/after${params.toString() ? `?${params}` : ""}`;

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement | null;
      if (e.key !== "/" || (t && ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName))) return;
      if (document.querySelector("[role=dialog]")) return;
      e.preventDefault();
      ref.current?.focus();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <Frame label="Live example · press / to search; try a ticket number such as 418237">
      <div className="grid gap-3 p-3">
        <div className="flex flex-wrap items-center gap-2">
          <ToggleGroup
            type="single"
            value={view}
            onValueChange={(v) => v && setView(v as SavedView)}
            aria-label="Saved views"
            spacing={1}
            className="grid w-full grid-cols-2 md:flex md:w-fit md:flex-wrap"
          >
            {VIEWS.map((v) => (
              <ToggleGroupItem
                key={v.id}
                value={v.id}
                className="h-8 gap-1.5 rounded-full border border-input bg-card px-3 data-[state=on]:border-slate-900 data-[state=on]:bg-slate-900 data-[state=on]:text-white max-md:h-11"
              >
                {v.label}
                <span className="rounded-full bg-muted px-1.5 text-xs font-semibold text-muted-foreground tabular group-data-[state=on]/toggle:bg-white/15 group-data-[state=on]/toggle:text-white">
                  {counts[v.id]}
                </span>
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <div className="relative w-full md:ml-auto md:w-60">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Label htmlFor="standard-search" className="sr-only">
              Search orders
            </Label>
            <Input
              ref={ref}
              id="standard-search"
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Escape" && setQ("")}
              placeholder="Try T-104 or Granary"
              className="h-9 pr-9 pl-8 max-md:h-11"
            />
            {!q && (
              <kbd className="pointer-events-none absolute top-1/2 right-2 hidden -translate-y-1/2 rounded border bg-muted px-1.5 font-mono text-xs text-muted-foreground md:block">
                /
              </kbd>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted-foreground" aria-live="polite">
            {results.length} {results.length === 1 ? "order" : "orders"}
          </span>
          {(view !== "today" || q) && (
            <Button
              variant="ghost"
              size="sm"
              className="max-md:h-11"
              onClick={() => {
                setView("today");
                setQ("");
              }}
            >
              <X aria-hidden />
              Clear all
            </Button>
          )}
          <span className="ml-auto min-w-0 truncate font-mono text-xs text-muted-foreground">
            URL:{" "}
            <Link href={href} className="text-primary underline underline-offset-2">
              {href}
            </Link>
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          Rare filters (status, pour type, placement) sit behind the Filters button on the board, and each active one
          shows as a removable chip. <Link href="/after?place=pump&status=pouring" className="text-primary underline underline-offset-2">See it with two filters on</Link>.
        </p>
      </div>
    </Frame>
  );
}

export function FormsExample() {
  const [volume, setVolume] = useState("12");
  const [slump, setSlump] = useState("135");
  const [touched, setTouched] = useState({ volume: true, slump: true });
  const [saving, setSaving] = useState(false);
  const vNum = parseDecimal(volume);
  const volumeError =
    touched.volume &&
    (!volume.trim()
      ? "Enter the volume in cubic metres."
      : vNum === null
        ? "Use numbers only, for example 24 or 24.5."
        : vNum < 1 || vNum > 200
          ? "Enter a volume between 1 and 200 m³."
          : null);
  const slumpCheck = touched.slump ? checkTestValue("slump", slump, specFor({ mix: { airPct: 0, code: "", label: "", strengthMpa: 25, aggregateMm: 20 } })) : null;

  return (
    <Frame label="Live example · change a value and leave the field">
      <div className="grid gap-4 p-3 sm:grid-cols-2">
        <Field id="ex-volume" label="Volume" unitLabel="cubic metres" hint="Up to 8 m³ per truck" error={volumeError || null}>
          <UnitInput
            unit="m³"
            className="h-9 max-md:h-11"
            value={volume}
            onChange={(e) => setVolume(e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, volume: true }))}
          />
        </Field>
        <Field
          id="ex-slump"
          label="Slump"
          unitLabel="millimetres"
          hint="Spec 50–110 mm"
          error={slumpCheck?.error ?? null}
          warning={slumpCheck?.warning ?? null}
        >
          <UnitInput
            unit="mm"
            className="h-9 max-md:h-11"
            value={slump}
            onChange={(e) => setSlump(e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, slump: true }))}
          />
        </Field>
        <div className="flex flex-wrap items-center gap-2 sm:col-span-2">
          <Button
            onClick={() => {
              setSaving(true);
              window.setTimeout(() => setSaving(false), 1200);
            }}
            disabled={saving || Boolean(volumeError) || Boolean(slumpCheck?.error)}
            aria-busy={saving}
            className="h-9 min-w-28 max-md:h-11"
          >
            {saving && <LoaderCircle className="animate-spin" aria-hidden />}
            {saving ? "Saving…" : "Save test"}
          </Button>
          <Button variant="outline" disabled className="h-9 max-md:h-11">
            Assign
          </Button>
          <span className="text-xs text-muted-foreground">Disabled, with the reason beside it: choose a truck first.</span>
        </div>
      </div>
    </Frame>
  );
}

/** Each state with its real next action: Schedule pour opens the real form, Retry and Refresh respond. */
export function StatesExample({ day }: { day: DispatchDay }) {
  const [retrying, setRetrying] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [booked, setBooked] = useState<string | null>(null);
  const [refreshed, setRefreshed] = useState(false);
  function book(input: NewOrderInput) {
    setScheduleOpen(false);
    setBooked(`${input.customer}, first truck ${String(Math.floor(input.scheduledStart / 60)).padStart(2, "0")}:${String(input.scheduledStart % 60).padStart(2, "0")}`);
  }
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <Frame label="Loading: skeleton in the shape of the list">
        <div className="hidden md:block">
          <TableSkeleton rows={3} columns={5} />
        </div>
        <div className="p-3 md:hidden">
          <CardsSkeleton count={2} />
        </div>
      </Frame>
      <Frame label="Empty: say what is empty, offer the next action">
        <EmptyState
          icon={CalendarX2}
          title="No pours scheduled today"
          headingLevel="h3"
          className="py-6"
          action={
            booked ? (
              <p className="flex items-center gap-1.5 text-sm font-medium text-emerald-800" role="status">
                <Check className="size-4" aria-hidden />
                Booked: {booked}. On the board it opens in the side sheet.
              </p>
            ) : (
              <Button variant="outline" className="max-md:h-11" onClick={() => setScheduleOpen(true)}>
                <Plus aria-hidden />
                Schedule pour
              </Button>
            )
          }
        >
          New orders appear here as soon as they are scheduled.
        </EmptyState>
      </Frame>
      <Frame label="Nothing loaded: plain words, what still works, Retry">
        <ErrorState
          title="Today’s orders didn’t load"
          headingLevel="h3"
          className="py-6"
          retrying={retrying}
          onRetry={() => {
            setRetrying(true);
            window.setTimeout(() => setRetrying(false), 1200);
          }}
        >
          The dispatch service didn’t answer in time. Nothing you entered is lost. When a refresh fails after data has
          loaded, the board keeps that data and says how old it is (try “Refresh failed” on the board).
        </ErrorState>
      </Frame>
      <Frame label="Partial data: show what loaded, flag what didn’t">
        <div className="grid gap-3 p-3">
          {refreshed ? (
            <p className="flex items-center gap-1.5 text-sm font-medium text-emerald-800" role="status">
              <Check className="size-4" aria-hidden />
              GPS is back. Moose Jaw ETAs updated at 09:42.
            </p>
          ) : (
            <PartialNotice
              action={
                <Button size="sm" variant="outline" className="bg-white max-md:h-11" onClick={() => setRefreshed(true)}>
                  Refresh
                </Button>
              }
            >
              <strong className="font-semibold">GPS for Moose Jaw trucks stopped at 09:31.</strong> ETAs for Moose Jaw
              loads may be up to 11 min old; those rows are flagged.
            </PartialNotice>
          )}
          <div className="flex flex-wrap gap-2">
            <StatusBadge status="en_route" />
            <StatusBadge status="pouring" />
            <StatusBadge status="scheduled" />
          </div>
        </div>
      </Frame>
      <SchedulePourDialog
        open={scheduleOpen}
        onOpenChange={setScheduleOpen}
        plants={day.plants}
        defaultPlant="rgn"
        clock={day.clock}
        onCreate={book}
      />
    </div>
  );
}

type ChartState = "data" | "loading" | "empty" | "error";

export function ChartsExample({ day }: { day: DispatchDay }) {
  const data = useMemo(() => hourlyVolume(day.orders, "all"), [day.orders]);
  const [state, setState] = useState<ChartState>("data");
  const [hour, setHour] = useState<number | null>(null);
  const empty = useMemo(() => data.map((d) => ({ ...d, delivered: 0, toCome: 0 })), [data]);
  return (
    <Frame label="Live example · hover, focus or click a bar; switch the state">
      <div className="grid gap-3 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold">When is concrete due on site today?</h3>
            <p className="text-xs text-muted-foreground">m³ per hour, all plants, delivered against still to pour</p>
          </div>
          <ToggleGroup
            type="single"
            value={state}
            onValueChange={(v) => v && setState(v as ChartState)}
            aria-label="Chart state"
            spacing={1}
            className="flex-wrap"
          >
            {(
              [
                ["data", "Sample data"],
                ["loading", "Loading"],
                ["empty", "Empty"],
                ["error", "Error"],
              ] as const
            ).map(([s, label]) => (
              <ToggleGroupItem
                key={s}
                value={s}
                className="h-7 rounded-full border border-input bg-card px-2.5 text-xs data-[state=on]:border-slate-900 data-[state=on]:bg-slate-900 data-[state=on]:text-white max-md:h-11"
              >
                {label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
        <ChartLegend clock={day.clock} />
        {state === "loading" ? (
          <div role="status">
            <span className="sr-only">Loading chart</span>
            <ChartSkeleton height={160} className="mb-3.5 ml-9" />
          </div>
        ) : state === "error" ? (
          <ErrorState title="The hourly figures didn’t load" headingLevel="h3" className="py-6" onRetry={() => setState("data")}>
            The table below the chart on the board still works.
          </ErrorState>
        ) : (
          <HourlyChart data={state === "empty" ? empty : data} clock={day.clock} size="large" selectedHour={hour} onPickHour={setHour} />
        )}
        {hour !== null && state === "data" && (
          <p className="text-xs text-muted-foreground" role="status">
            On the board this filters the table to pours due {String(hour).padStart(2, "0")}:00–
            {String(hour + 1).padStart(2, "0")}:00.{" "}
            <Link href={`/after?hour=${hour}`} className="text-primary underline underline-offset-2">
              Open it there
            </Link>
          </p>
        )}
        <details className="rounded-md border px-3 py-2 text-sm">
          <summary className="cursor-pointer font-medium">Show as a table</summary>
          <div className="mt-2 overflow-x-auto">
            <HourlyTable data={data} caption="Concrete due on site per hour, all plants" />
          </div>
        </details>
      </div>
    </Frame>
  );
}
