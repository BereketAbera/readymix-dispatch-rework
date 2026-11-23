"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CalendarX2, Plus, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { AnnotationLegend, AnnotationsProvider, Marker } from "@/components/annotations";
import { DemoBar } from "@/components/demo-bar";
import { KpiTiles } from "@/components/dispatch/kpi-tiles";
import { OrderCards } from "@/components/dispatch/order-cards";
import { OrderSheet } from "@/components/dispatch/order-sheet";
import { OrdersTable } from "@/components/dispatch/orders-table";
import { SchedulePourDialog } from "@/components/dispatch/schedule-pour-dialog";
import { ProductShell } from "@/components/product-shell";
import { CardsSkeleton, EmptyState, ErrorState, PartialNotice, TableSkeleton } from "@/components/states";
import {
  assignTruck,
  computeKpis,
  createOrder,
  filterOrders,
  formatClock,
  formatDayLabel,
  viewCounts,
  type DispatchDay,
  type NewOrderInput,
  type Order,
  type PlantFilter,
  type SavedView,
} from "@/lib/dispatch";
import { cn } from "@/lib/utils";
import { boardSearch, type BoardParams, type PreviewState } from "./board-params";

const VIEWS: { id: SavedView; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "at_risk", label: "At risk" },
  { id: "unassigned", label: "Unassigned" },
  { id: "on_hold", label: "On hold" },
];

const STATE_LABELS: Record<PreviewState, string> = {
  live: "Live data",
  loading: "Loading",
  empty: "Empty day",
  error: "Error",
  partial: "Partial data",
};

export function DispatchBoard({ day, initial }: { day: DispatchDay; initial: BoardParams }) {
  const clock = day.clock;
  const [orders, setOrders] = useState<Order[]>(day.orders);
  const [plant, setPlant] = useState<PlantFilter>(initial.plant);
  const [view, setView] = useState<SavedView>(initial.view);
  const [query, setQuery] = useState(initial.q);
  const [preview, setPreview] = useState<PreviewState>(initial.state);
  const [notes, setNotes] = useState(initial.notes);
  const [retrying, setRetrying] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sheetOrderId, setSheetOrderId] = useState<string | null>(null);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const created = useRef(0);
  const searchRef = useRef<HTMLInputElement>(null);

  // Keep the URL in step with the board without a server round trip.
  useEffect(() => {
    const search = boardSearch({ plant, view, q: query, state: preview, notes });
    const url = `${window.location.pathname}${search}`;
    if (url !== `${window.location.pathname}${window.location.search}`) {
      window.history.replaceState(window.history.state, "", url);
    }
  }, [plant, view, query, preview, notes]);

  // "/" jumps to search from anywhere on the board.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName))) return;
      e.preventDefault();
      searchRef.current?.focus();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const source = preview === "empty" ? [] : orders;
  const filtered = useMemo(() => filterOrders(source, { plant, view, query }, clock), [source, plant, view, query, clock]);
  const counts = useMemo(() => viewCounts(source, plant, clock), [source, plant, clock]);
  const kpis = useMemo(() => computeKpis(day, plant, source), [day, plant, source]);
  const sheetOrder = orders.find((o) => o.id === sheetOrderId) ?? null;
  const filtersActive = view !== "today" || query.trim() !== "";
  const plantName = plant === "all" ? "all plants" : day.plants.find((p) => p.id === plant)?.name;

  const open = useCallback((id: string) => {
    setSelectedId(id);
    setSheetOrderId(id);
  }, []);

  function clearAll() {
    setView("today");
    setQuery("");
  }

  function retry() {
    setRetrying(true);
    window.setTimeout(() => {
      setRetrying(false);
      setPreview("loading");
      window.setTimeout(() => setPreview("live"), 900);
    }, 700);
  }

  function create(input: NewOrderInput) {
    created.current += 1;
    const order = createOrder(input, created.current);
    setOrders((list) => [...list, order]);
    setScheduleOpen(false);
    setQuery("");
    setView("today");
    if (plant !== "all" && plant !== input.plantId) setPlant("all");
    open(order.id);
  }

  const loading = preview === "loading";
  const showTable = preview === "live" || preview === "partial";

  return (
    <AnnotationsProvider enabled={notes}>
      <div className="flex flex-col md:h-dvh">
        <DemoBar>
          <div className="flex items-center gap-2">
            <Switch id="annotations-toggle" checked={notes} onCheckedChange={setNotes} />
            <Label htmlFor="annotations-toggle" className="text-sm font-normal text-zinc-200">
              Show annotations
            </Label>
          </div>
          <div className="relative flex items-center gap-2">
            <Label htmlFor="preview-state" className="text-sm font-normal text-zinc-200">
              Preview state
            </Label>
            <Select value={preview} onValueChange={(v) => setPreview(v as PreviewState)}>
              <SelectTrigger
                id="preview-state"
                size="sm"
                className="min-w-32 border-zinc-700 bg-zinc-800 text-zinc-100 data-placeholder:text-zinc-300 [&_svg]:text-zinc-300!"
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
            <Marker n={7} className="-top-2 -right-3" />
          </div>
        </DemoBar>

        <ProductShell>
          <main className="flex min-h-0 flex-1 flex-col">
            <header className="flex flex-wrap items-center gap-x-4 gap-y-3 border-b bg-card px-4 py-3 md:px-6">
              <div className="min-w-0 mr-auto">
                <h1 className="text-xl font-semibold tracking-tight">Dispatch</h1>
                <p className="text-sm text-muted-foreground">
                  {formatDayLabel(day.date)} · board as of <span className="font-mono tabular">{formatClock(clock)}</span>
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="plant-switcher" className="sr-only">
                  Plant
                </Label>
                <Select value={plant} onValueChange={(v) => setPlant(v as PlantFilter)}>
                  <SelectTrigger id="plant-switcher" className="h-9 min-w-44">
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
                  <Button size="lg" className="h-9 px-3.5" onClick={() => setScheduleOpen(true)}>
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
                state={loading ? "loading" : preview === "error" ? "unavailable" : "ready"}
                onShowAtRisk={() => {
                  setView("at_risk");
                  setQuery("");
                }}
              />
              <Marker n={2} className="top-1 left-1 md:left-3" />
            </section>

            <div className="flex flex-wrap items-center gap-2 px-4 py-3 md:px-6">
              <div className="relative">
                <ToggleGroup
                  type="single"
                  value={view}
                  onValueChange={(v) => v && setView(v as SavedView)}
                  aria-label="Saved views"
                  className="flex-wrap"
                  spacing={1}
                >
                  {VIEWS.map((v) => (
                    <ToggleGroupItem
                      key={v.id}
                      value={v.id}
                      disabled={loading || preview === "error"}
                      className="h-8 gap-1.5 rounded-full border border-input bg-card px-3 data-[state=on]:border-slate-900 data-[state=on]:bg-slate-900 data-[state=on]:text-white"
                      data-testid={`view-${v.id}`}
                    >
                      {v.label}
                      <span
                        className={cn(
                          "rounded-full px-1.5 text-xs font-semibold tabular",
                          v.id === "at_risk" && counts.at_risk > 0 ? "bg-red-100 text-red-800" : "bg-muted text-muted-foreground",
                          "group-data-[state=on]/toggle:bg-white/15 group-data-[state=on]/toggle:text-white",
                        )}
                      >
                        {counts[v.id]}
                      </span>
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
                <Marker n={3} className="-top-3.5 -left-3.5" />
              </div>
              <div className="relative w-full sm:ml-auto sm:w-72">
                <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                <Label htmlFor="board-search" className="sr-only">
                  Search orders
                </Label>
                <Input
                  ref={searchRef}
                  id="board-search"
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      setQuery("");
                      e.currentTarget.blur();
                    }
                  }}
                  placeholder="Search customer, site, truck"
                  className="h-9 bg-card pr-9 pl-8"
                  disabled={loading || preview === "error"}
                  aria-keyshortcuts="/"
                />
                <kbd className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 rounded border bg-muted px-1.5 font-mono text-xs text-muted-foreground">
                  /
                </kbd>
              </div>
              <div className="flex w-full items-center justify-between gap-2 sm:w-auto">
                <p className="text-sm text-muted-foreground" aria-live="polite" data-testid="result-count">
                  {loading ? "Loading…" : `${filtered.length} ${filtered.length === 1 ? "order" : "orders"}`}
                </p>
                {filtersActive && !loading && (
                  <Button variant="ghost" size="sm" onClick={clearAll}>
                    <X aria-hidden />
                    Clear all
                  </Button>
                )}
              </div>
            </div>

            <section
              id="board"
              aria-label="Orders"
              className="relative flex min-h-0 flex-1 flex-col gap-3 px-4 pb-4 md:px-6"
            >
              <Marker n={8} className="-top-2 right-6 md:right-10" />
              {preview === "partial" && (
                <PartialNotice
                  action={
                    <Button size="sm" variant="outline" className="bg-white" onClick={() => setPreview("live")}>
                      Refresh
                    </Button>
                  }
                >
                  <strong className="font-semibold">GPS for Moose Jaw trucks stopped updating at 09:31.</strong>{" "}
                  Orders are current; ETAs for MJW loads may be up to 11 min old.
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

              {preview === "error" && (
                <div className="rounded-lg border bg-card">
                  <ErrorState title="Today's orders didn't load" onRetry={retry} retrying={retrying}>
                    The dispatch service didn&apos;t answer in time. Nothing you entered is lost. The last good update
                    was at {formatClock(clock - 1)}; try again, or call the plant if it keeps failing.
                  </ErrorState>
                </div>
              )}

              {preview === "empty" && (
                <div className="rounded-lg border bg-card">
                  <EmptyState
                    icon={CalendarX2}
                    title="No pours scheduled today"
                    action={
                      <Button onClick={() => setScheduleOpen(true)}>
                        <Plus aria-hidden />
                        Schedule pour
                      </Button>
                    }
                  >
                    Nothing is booked for {plantName} on {formatDayLabel(day.date)}. New orders appear here as soon as
                    they are scheduled.
                  </EmptyState>
                </div>
              )}

              {showTable && filtered.length === 0 && (
                <div className="rounded-lg border bg-card">
                  <EmptyState
                    title={query.trim() ? `No orders match “${query.trim()}”` : `No orders in ${VIEWS.find((v) => v.id === view)?.label}`}
                    action={
                      <Button variant="outline" onClick={clearAll}>
                        Show all of today
                      </Button>
                    }
                  >
                    {query.trim()
                      ? "Search looks at customer, site address, truck, mix and order number."
                      : view === "at_risk"
                        ? "Every order is on plan right now."
                        : "Nothing here for the selected plant."}
                  </EmptyState>
                </div>
              )}

              {showTable && filtered.length > 0 && (
                <>
                  <div className="hidden min-h-0 flex-1 flex-col overflow-hidden rounded-lg border bg-card md:flex">
                    <OrdersTable
                      orders={filtered}
                      clock={clock}
                      selectedId={selectedId}
                      onOpen={open}
                      annotate={notes}
                      className="min-h-0 flex-1"
                    />
                  </div>
                  <div className="md:hidden">
                    <OrderCards orders={filtered} clock={clock} onOpen={open} />
                  </div>
                </>
              )}
            </section>
          </main>
        </ProductShell>
      </div>

      <OrderSheet
        order={sheetOrder}
        plants={day.plants}
        trucks={day.trucks}
        clock={clock}
        open={selectedId !== null}
        onOpenChange={(next) => !next && setSelectedId(null)}
        onAssign={(orderId, truckId) =>
          setOrders((list) => list.map((o) => (o.id === orderId ? assignTruck(o, truckId) : o)))
        }
        onSetStatus={(orderId, status) =>
          setOrders((list) =>
            list.map((o) =>
              o.id === orderId
                ? { ...o, status, ...(status === "cancelled" ? { truckIds: [], loads: o.loads.map((l) => ({ ...l, truckId: l.stage === "pending" ? null : l.truckId })) } : {}) }
                : o,
            ),
          )
        }
      />
      <SchedulePourDialog
        open={scheduleOpen}
        onOpenChange={setScheduleOpen}
        plants={day.plants}
        defaultPlant={plant === "all" ? "rgn" : plant}
        clock={clock}
        onCreate={create}
      />
      <AnnotationLegend onClose={() => setNotes(false)} />
    </AnnotationsProvider>
  );
}
