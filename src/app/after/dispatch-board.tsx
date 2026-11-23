"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CalendarX2, Plus, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { AnnotationBar, AnnotationColumn, AnnotationsProvider, Marker } from "@/components/annotations";
import { DemoBar } from "@/components/demo-bar";
import { KpiTiles } from "@/components/dispatch/kpi-tiles";
import { OrderCards } from "@/components/dispatch/order-cards";
import { OrderSheet, type OrderAction } from "@/components/dispatch/order-sheet";
import { OrdersTable } from "@/components/dispatch/orders-table";
import { SchedulePourDialog } from "@/components/dispatch/schedule-pour-dialog";
import { ProductShell } from "@/components/product-shell";
import { CardsSkeleton, EmptyState, PartialNotice, RefreshFailedBanner, TableSkeleton } from "@/components/states";
import {
  assignTruck,
  cancelOrder,
  computeKpis,
  createOrder,
  filterOrders,
  formatClock,
  formatDayLabel,
  holdOrder,
  hourlyVolume,
  isClosed,
  releaseHold,
  viewCounts,
  type DispatchDay,
  type NewOrderInput,
  type Order,
  type PlantFilter,
  type SavedView,
} from "@/lib/dispatch";
import { cn } from "@/lib/utils";
import { ActiveFilters, MoreFilters } from "./board-filters";
import {
  QUERY_MAX,
  boardSearch,
  clampQuery,
  hasFilters,
  parseBoardParams,
  type BoardParams,
  type PreviewState,
} from "./board-params";

const VIEWS: { id: SavedView; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "at_risk", label: "At risk" },
  { id: "unassigned", label: "Unassigned" },
  { id: "on_hold", label: "On hold" },
];

/** Demo control: which of the standard states to show. The board itself is a fixed sample. */
const STATE_LABELS: Record<PreviewState, string> = {
  normal: "Sample data",
  loading: "Loading",
  empty: "Empty day",
  error: "Refresh failed",
  partial: "Partial data",
};

const STALE_GPS = "GPS 11 min old";
const NO_IDS: ReadonlySet<string> = new Set();

/**
 * Edits made on the board (assign, hold, cancel, book) survive moving to
 * another page of the sample and back. They live in memory only, so a reload
 * starts the sample day fresh.
 */
let sessionOrders: { date: string; orders: Order[] } | null = null;

export function DispatchBoard({ day }: { day: DispatchDay }) {
  const clock = day.clock;
  // The URL is the source of truth for every filter, the preview state and the open order.
  const searchParams = useSearchParams();
  const params = useMemo(() => parseBoardParams(searchParams), [searchParams]);
  const { plant, view, hour, status, pour, place, state: preview, notes } = params;

  const [orders, setOrders] = useState<Order[]>(() =>
    sessionOrders?.date === day.date ? sessionOrders.orders : day.orders,
  );
  useEffect(() => {
    sessionOrders = { date: day.date, orders };
  }, [day.date, orders]);
  const ordersRef = useRef(orders);
  useEffect(() => {
    ordersRef.current = orders;
  }, [orders]);

  // Search text is local while typing and mirrored to the URL; Back and links bring the URL's value back.
  const [query, setQuery] = useState(params.q);
  const urlQuery = useRef(params.q);
  useEffect(() => {
    if (params.q !== urlQuery.current) {
      urlQuery.current = params.q;
      setQuery(params.q);
    }
  }, [params.q]);

  const writeUrl = useCallback((patch: Partial<BoardParams>, mode: "replace" | "push" = "replace") => {
    if (window.location.pathname !== "/after") return;
    const current = parseBoardParams(new URLSearchParams(window.location.search));
    const next = { ...current, ...patch };
    if ("q" in patch) urlQuery.current = clampQuery(next.q);
    const url = `/after${boardSearch(next)}`;
    if (url === `${window.location.pathname}${window.location.search}`) return;
    if (mode === "push") window.history.pushState(null, "", url);
    else window.history.replaceState(null, "", url);
  }, []);

  const [retrying, setRetrying] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const timers = useRef<number[]>([]);
  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach((t) => window.clearTimeout(t));
  }, []);

  // "/" jumps to search from anywhere on the board.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName))) return;
      if (document.querySelector("[role=dialog]")) return;
      e.preventDefault();
      searchRef.current?.focus();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  /* ---------------------------------------------------------------- */
  /* The order sheet: opened with ?order= in history, so Back closes it */
  /* ---------------------------------------------------------------- */

  const sheetOrder = params.order ? (orders.find((o) => o.number === params.order) ?? null) : null;
  // Keep the last order on screen while the sheet animates out.
  const [shownOrderId, setShownOrderId] = useState<string | null>(null);
  if (sheetOrder && sheetOrder.id !== shownOrderId) setShownOrderId(sheetOrder.id);
  const shownOrder = sheetOrder ?? orders.find((o) => o.id === shownOrderId) ?? null;

  const pushedOrder = useRef(false);
  const openerId = useRef<string | null>(null);
  useEffect(() => {
    if (!params.order) pushedOrder.current = false;
  }, [params.order]);

  const open = useCallback(
    (id: string) => {
      const o = ordersRef.current.find((x) => x.id === id);
      if (!o) return;
      openerId.current = id;
      pushedOrder.current = true;
      writeUrl({ order: o.number }, "push");
    },
    [writeUrl],
  );

  const closeSheet = useCallback(() => {
    if (pushedOrder.current) {
      pushedOrder.current = false;
      window.history.back();
    } else {
      writeUrl({ order: null });
    }
  }, [writeUrl]);

  /** Focus goes back to the row or card that opened the sheet, not to the top of the page. */
  const returnFocusToRow = useCallback((e: Event) => {
    e.preventDefault();
    const id = openerId.current ?? shownOrderId;
    const target = id
      ? Array.from(document.querySelectorAll<HTMLElement>(`[data-order-open="${id}"]`)).find(
          (el) => el.getClientRects().length > 0,
        )
      : undefined;
    (target ?? searchRef.current)?.focus();
  }, [shownOrderId]);

  /* ---------------------------------------------------------------- */
  /* Schedule pour                                                      */
  /* ---------------------------------------------------------------- */

  const scheduleOpener = useRef<HTMLElement | null>(null);
  const justCreated = useRef(false);

  function openSchedule(e: React.MouseEvent<HTMLElement>) {
    scheduleOpener.current = e.currentTarget;
    setScheduleOpen(true);
  }

  function scheduleCloseFocus(e: Event) {
    e.preventDefault();
    if (justCreated.current) {
      // The new order's sheet is opening and takes focus.
      justCreated.current = false;
      return;
    }
    const opener = scheduleOpener.current;
    (opener?.isConnected ? opener : document.getElementById("schedule-pour"))?.focus();
  }

  function create(input: NewOrderInput) {
    const sequence = ordersRef.current.filter((o) => o.id.startsWith("ord-new-")).length + 1;
    const order = createOrder(input, sequence);
    setOrders((list) => [...list, order]);
    justCreated.current = true;
    setScheduleOpen(false);
    setQuery("");
    openerId.current = order.id;
    pushedOrder.current = true;
    // Show the new order: clear filters, follow its plant, open its sheet.
    writeUrl(
      {
        q: "",
        view: "today",
        hour: null,
        status: [],
        pour: [],
        place: [],
        plant: plant === "all" ? "all" : input.plantId,
        order: order.number,
      },
      "push",
    );
  }

  function act(orderId: string, action: OrderAction) {
    const apply = action === "hold" ? holdOrder : action === "release" ? releaseHold : cancelOrder;
    setOrders((list) => list.map((o) => (o.id === orderId ? apply(o) : o)));
  }

  /* ---------------------------------------------------------------- */
  /* Preview states (demo control)                                      */
  /* ---------------------------------------------------------------- */

  function retry() {
    setRetrying(true);
    timers.current.push(
      window.setTimeout(() => {
        setRetrying(false);
        writeUrl({ state: "loading" });
        timers.current.push(window.setTimeout(() => writeUrl({ state: "normal" }), 900));
      }, 700),
    );
  }

  /* ---------------------------------------------------------------- */
  /* Derived data                                                       */
  /* ---------------------------------------------------------------- */

  // An empty day shows only pours booked during it.
  const source = useMemo(
    () => (preview === "empty" ? orders.filter((o) => o.id.startsWith("ord-new-")) : orders),
    [preview, orders],
  );
  const scope = useMemo(() => ({ plant, hour, statuses: status, pourTypes: pour, placements: place }), [plant, hour, status, pour, place]);
  const filtered = useMemo(() => filterOrders(source, { ...scope, view, query }, clock), [source, scope, view, query, clock]);
  const counts = useMemo(() => viewCounts(source, scope, clock), [source, scope, clock]);
  const kpis = useMemo(() => computeKpis(day, plant, source), [day, plant, source]);
  const hours = useMemo(() => hourlyVolume(source, plant), [source, plant]);
  const stale = useMemo(
    () =>
      preview === "partial"
        ? new Set(source.filter((o) => o.plantId === "mjw" && !isClosed(o) && o.status !== "scheduled").map((o) => o.id))
        : NO_IDS,
    [preview, source],
  );
  const filtersActive = hasFilters({ view, q: query, hour, status, pour, place });
  const plantName = plant === "all" ? null : day.plants.find((p) => p.id === plant)?.name;
  const loading = preview === "loading";
  const failed = preview === "error";
  const lastGood = formatClock(clock - 1);
  const emptyDay = preview === "empty" && source.length === 0;
  const showList = !loading && !emptyDay;

  function clearAll() {
    setQuery("");
    writeUrl({ view: "today", q: "", hour: null, status: [], pour: [], place: [] });
  }

  return (
    <AnnotationsProvider enabled={notes}>
      <div className="flex flex-col md:h-dvh">
        <DemoBar>
          <div className="flex min-h-11 items-center gap-2 md:min-h-0">
            <Switch id="annotations-toggle" checked={notes} onCheckedChange={(on) => writeUrl({ notes: on })} />
            <Label htmlFor="annotations-toggle" className="text-sm font-normal text-zinc-200">
              <span className="md:hidden">Annotations</span>
              <span className="hidden md:inline">Show annotations</span>
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Marker n={7} className="relative shrink-0" />
            <Label htmlFor="preview-state" className="text-sm font-normal text-zinc-200">
              <span className="md:hidden">State</span>
              <span className="hidden md:inline">Show state</span>
            </Label>
            <Select value={preview} onValueChange={(v) => writeUrl({ state: v as PreviewState })}>
              <SelectTrigger
                id="preview-state"
                size="sm"
                className="min-w-32 border-zinc-700 bg-zinc-800 text-zinc-100 data-placeholder:text-zinc-300 max-md:data-[size=sm]:h-11 [&_svg]:text-zinc-300!"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="end">
                {(Object.keys(STATE_LABELS) as PreviewState[]).map((s) => (
                  <SelectItem key={s} value={s}>
                    {STATE_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </DemoBar>

        <ProductShell compactNav={notes} aside={<AnnotationColumn onClose={() => writeUrl({ notes: false })} />}>
          <main className={cn("flex min-h-0 flex-1 flex-col", notes && "max-xl:pb-20")}>
            <header className="flex flex-wrap items-center gap-x-4 gap-y-3 border-b bg-card px-4 py-3 md:px-6">
              <div className="mr-auto min-w-0">
                <h1 className="text-xl font-semibold tracking-tight">Dispatch</h1>
                <p className="text-sm text-muted-foreground" data-testid="board-time">
                  {loading ? (
                    "Loading today’s board…"
                  ) : (
                    <>
                      {formatDayLabel(day.date)} <span className="text-muted-foreground">(sample day)</span> ·{" "}
                      {failed ? (
                        <span className="font-medium text-red-700">
                          board as of <span className="font-mono tabular">{lastGood}</span>, not updating
                        </span>
                      ) : (
                        <>
                          board as of <span className="font-mono tabular">{formatClock(clock)}</span>
                        </>
                      )}
                    </>
                  )}
                </p>
              </div>
              <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
                <Label htmlFor="plant-switcher" className="sr-only">
                  Plant
                </Label>
                <Select value={plant} onValueChange={(v) => writeUrl({ plant: v as PlantFilter })}>
                  <SelectTrigger id="plant-switcher" className="min-w-0 flex-1 sm:min-w-44 sm:flex-none">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All plants</SelectItem>
                    {day.plants.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="relative">
                  <Button id="schedule-pour" size="lg" className="h-9 px-3.5 max-md:h-11" onClick={openSchedule}>
                    <Plus aria-hidden />
                    Schedule pour
                  </Button>
                  <Marker n={1} className="-top-3 -right-3" />
                </div>
              </div>
            </header>

            <section aria-label="Today at a glance" className="relative px-4 pt-4 md:px-6">
              <KpiTiles
                kpis={kpis}
                hours={hours}
                clock={clock}
                state={loading ? "loading" : "ready"}
                empty={source.length === 0}
                selectedHour={hour}
                onPickHour={(h) => writeUrl({ hour: h })}
                onShowAtRisk={() => {
                  setQuery("");
                  writeUrl({ view: "at_risk", q: "" });
                }}
              />
              <Marker n={2} className="top-1 left-1 md:left-3" />
            </section>

            <div className="flex flex-wrap items-center gap-2 px-4 py-3 md:px-6">
              <div className="relative w-full md:w-auto">
                <ToggleGroup
                  type="single"
                  value={view}
                  onValueChange={(v) => v && writeUrl({ view: v as SavedView })}
                  aria-label="Saved views"
                  className="grid w-full grid-cols-2 md:flex md:w-fit md:flex-wrap"
                  spacing={1}
                >
                  {VIEWS.map((v) => (
                    <ToggleGroupItem
                      key={v.id}
                      value={v.id}
                      disabled={loading}
                      className="h-8 gap-1.5 rounded-full border border-input bg-card px-3 data-[state=on]:border-slate-900 data-[state=on]:bg-slate-900 data-[state=on]:text-white max-md:h-11"
                      data-testid={`view-${v.id}`}
                    >
                      {v.label}
                      {loading ? (
                        <Skeleton className="h-4 w-5 rounded-full" />
                      ) : (
                        <span
                          className={cn(
                            "rounded-full px-1.5 text-xs font-semibold tabular",
                            v.id === "at_risk" && counts.at_risk > 0 ? "bg-red-100 text-red-800" : "bg-muted text-muted-foreground",
                            "group-data-[state=on]/toggle:bg-white/15 group-data-[state=on]/toggle:text-white",
                          )}
                        >
                          {counts[v.id]}
                        </span>
                      )}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
                <Marker n={3} className="-top-3.5 -left-3.5" />
              </div>
              <div className="relative w-full md:ml-auto md:w-80">
                <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                <Label htmlFor="board-search" className="sr-only">
                  Search orders
                </Label>
                <Input
                  ref={searchRef}
                  id="board-search"
                  type="search"
                  value={query}
                  maxLength={QUERY_MAX}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    writeUrl({ q: e.target.value });
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      setQuery("");
                      writeUrl({ q: "" });
                      e.currentTarget.blur();
                    }
                  }}
                  placeholder="Search customer, site, truck, ticket"
                  className="h-9 bg-card pr-9 pl-8 max-md:h-11"
                  disabled={loading}
                  aria-keyshortcuts="/"
                />
                {!query && (
                  <kbd className="pointer-events-none absolute top-1/2 right-2 hidden -translate-y-1/2 rounded border bg-muted px-1.5 font-mono text-xs text-muted-foreground md:block">
                    /
                  </kbd>
                )}
              </div>
              <div className="flex w-full flex-wrap items-center gap-2 md:w-auto">
                <MoreFilters params={{ status, pour, place }} onChange={(patch) => writeUrl(patch)} disabled={loading} />
                <p className="text-sm text-muted-foreground" aria-live="polite" data-testid="result-count">
                  {loading ? "Loading…" : `${filtered.length} ${filtered.length === 1 ? "order" : "orders"}`}
                </p>
                {filtersActive && !loading && (
                  <Button variant="ghost" size="sm" className="max-md:h-11" onClick={clearAll}>
                    <X aria-hidden />
                    Clear all
                  </Button>
                )}
                {notes && (
                  <span className="relative ml-auto hidden items-center gap-2 pl-7 text-xs text-muted-foreground md:flex">
                    <Marker n={8} className="top-1/2 left-0 -translate-y-1/2" />
                    Narrow the window below 768 px for the phone cards
                  </span>
                )}
              </div>
              {!loading && (
                <div className="w-full empty:hidden">
                  <ActiveFilters params={{ status, pour, place, hour }} onChange={(patch) => writeUrl(patch)} />
                </div>
              )}
            </div>

            <section id="board" aria-label="Orders" className="relative flex min-h-0 flex-1 flex-col gap-3 px-4 pb-4 md:px-6">
              {failed && (
                <RefreshFailedBanner title={`Couldn’t refresh the board since ${lastGood}.`} onRetry={retry} retrying={retrying}>
                  The orders below are from {lastGood} and may be out of date. Nothing you entered is lost; call the
                  plant if this keeps failing.
                </RefreshFailedBanner>
              )}
              {preview === "partial" && (
                <PartialNotice
                  action={
                    <Button size="sm" variant="outline" className="bg-white max-md:h-11" onClick={() => writeUrl({ state: "normal" })}>
                      Refresh
                    </Button>
                  }
                >
                  <strong className="font-semibold">GPS for Moose Jaw trucks stopped updating at 09:31.</strong> Orders
                  are current; ETAs for Moose Jaw loads may be up to 11 min old, and those rows are flagged.
                </PartialNotice>
              )}

              {loading && (
                <>
                  <div className="hidden overflow-hidden rounded-lg border bg-card md:block">
                    <TableSkeleton rows={10} />
                  </div>
                  <div className="md:hidden">
                    <CardsSkeleton />
                  </div>
                </>
              )}

              {emptyDay && (
                <div className="rounded-lg border bg-card">
                  <EmptyState
                    icon={CalendarX2}
                    title="No pours scheduled today"
                    action={
                      <Button variant="outline" className="max-md:h-11" onClick={openSchedule}>
                        <Plus aria-hidden />
                        Schedule pour
                      </Button>
                    }
                  >
                    Nothing is booked {plantName ? `at ${plantName}` : "at any plant"} on {formatDayLabel(day.date)}. New
                    orders appear here as soon as they are scheduled.
                  </EmptyState>
                </div>
              )}

              {showList && filtered.length === 0 && (
                <div className="rounded-lg border bg-card">
                  <EmptyState
                    title={query.trim() ? `No orders match “${query.trim()}”` : `No orders in ${VIEWS.find((v) => v.id === view)?.label}`}
                    action={
                      <Button variant="outline" className="max-md:h-11" onClick={clearAll}>
                        Show all of today
                      </Button>
                    }
                  >
                    {query.trim()
                      ? "Search looks at customer, site, truck, ticket, mix and order number."
                      : view === "at_risk"
                        ? "Every order is on plan right now."
                        : "Nothing here with the current plant and filters."}
                  </EmptyState>
                </div>
              )}

              {showList && filtered.length > 0 && (
                <>
                  <div className="hidden min-h-0 flex-col overflow-hidden rounded-lg border bg-card md:flex">
                    <OrdersTable
                      orders={filtered}
                      clock={clock}
                      selectedId={sheetOrder?.id ?? null}
                      onOpen={open}
                      annotate={notes}
                      stale={stale}
                      staleText={STALE_GPS}
                      className="min-h-0 flex-1"
                    />
                  </div>
                  <div className="relative md:hidden">
                    <OrderCards
                      orders={filtered}
                      clock={clock}
                      onOpen={open}
                      annotate={notes}
                      stale={stale}
                      staleText={STALE_GPS}
                    />
                    <Marker n={8} className="-top-3 right-8" />
                  </div>
                </>
              )}
            </section>
          </main>
        </ProductShell>
      </div>

      <OrderSheet
        order={shownOrder}
        plants={day.plants}
        trucks={day.trucks}
        clock={clock}
        open={sheetOrder !== null}
        onOpenChange={(next) => {
          if (!next) closeSheet();
        }}
        onAssign={(orderId, truckId) =>
          setOrders((list) => list.map((o) => (o.id === orderId ? assignTruck(o, truckId) : o)))
        }
        onAction={act}
        onCloseAutoFocus={returnFocusToRow}
      />
      <SchedulePourDialog
        open={scheduleOpen}
        onOpenChange={setScheduleOpen}
        plants={day.plants}
        defaultPlant={plant === "all" ? "rgn" : plant}
        clock={clock}
        onCreate={create}
        onCloseAutoFocus={scheduleCloseFocus}
      />
      <AnnotationBar onClose={() => writeUrl({ notes: false })} />
    </AnnotationsProvider>
  );
}
