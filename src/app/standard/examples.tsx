"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarX2, LoaderCircle, Plus, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Field, UnitInput } from "@/components/form-field";
import { OrdersTable } from "@/components/dispatch/orders-table";
import { RiskBadge, STATUS_META, StatusBadge } from "@/components/dispatch/status";
import { EmptyState, ErrorState, PartialNotice, TableSkeleton } from "@/components/states";
import { filterOrders, viewCounts, type DispatchDay, type OrderStatus, type SavedView } from "@/lib/dispatch";

function Frame({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <figure className="min-w-0 overflow-hidden rounded-lg border bg-card">
      <figcaption className="border-b bg-muted/50 px-3 py-1.5 text-xs font-medium text-muted-foreground">{label}</figcaption>
      <div className="min-w-0">{children}</div>
    </figure>
  );
}

export function TablesExample({ day }: { day: DispatchDay }) {
  const sample = useMemo(() => {
    const open = day.orders.filter((o) => o.status !== "complete" && o.status !== "cancelled");
    return open.slice(0, 9);
  }, [day.orders]);
  return (
    <div className="grid gap-3">
      <Frame label="Live example · scroll inside the table to see the sticky header">
        <div className="h-[300px]">
          <OrdersTable orders={sample} clock={day.clock} onOpen={() => {}} hiddenColumns={["mix"]} className="h-full" />
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
      e.preventDefault();
      ref.current?.focus();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <Frame label="Live example · press / to search">
      <div className="grid gap-3 p-3">
        <div className="flex flex-wrap items-center gap-2">
          <ToggleGroup
            type="single"
            value={view}
            onValueChange={(v) => v && setView(v as SavedView)}
            aria-label="Saved views"
            spacing={1}
            className="flex-wrap"
          >
            {VIEWS.map((v) => (
              <ToggleGroupItem
                key={v.id}
                value={v.id}
                className="h-8 gap-1.5 rounded-full border border-input bg-card px-3 data-[state=on]:border-slate-900 data-[state=on]:bg-slate-900 data-[state=on]:text-white"
              >
                {v.label}
                <span className="rounded-full bg-muted px-1.5 text-xs font-semibold text-muted-foreground tabular group-data-[state=on]/toggle:bg-white/15 group-data-[state=on]/toggle:text-white">
                  {counts[v.id]}
                </span>
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <div className="relative w-full sm:ml-auto sm:w-60">
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
              className="h-9 pr-9 pl-8"
            />
            <kbd className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 rounded border bg-muted px-1.5 font-mono text-xs text-muted-foreground">
              /
            </kbd>
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
      </div>
    </Frame>
  );
}

export function FormsExample() {
  const [volume, setVolume] = useState("12");
  const [slump, setSlump] = useState("135");
  const [touched, setTouched] = useState({ volume: true, slump: true });
  const [saving, setSaving] = useState(false);
  const vNum = Number(volume);
  const volumeError =
    touched.volume && (!volume.trim() ? "Enter the volume in cubic metres." : !Number.isFinite(vNum) || vNum < 1 || vNum > 200 ? "Enter a volume between 1 and 200 m³." : null);
  const sNum = Number(slump);
  const slumpError = touched.slump && (!slump.trim() ? "Enter the slump." : !Number.isFinite(sNum) ? "Use numbers only, for example 80." : null);
  const slumpWarning =
    touched.slump && !slumpError && (sNum < 50 || sNum > 110) ? "Outside spec (50–110 mm). Save it, then tell dispatch before the next load." : null;

  return (
    <Frame label="Live example · change a value and leave the field">
      <div className="grid gap-4 p-3 sm:grid-cols-2">
        <Field id="ex-volume" label="Volume" unitLabel="cubic metres" hint="Up to 8 m³ per truck" error={volumeError || null}>
          <UnitInput
            unit="m³"
            className="h-9"
            value={volume}
            onChange={(e) => setVolume(e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, volume: true }))}
          />
        </Field>
        <Field id="ex-slump" label="Slump" unitLabel="millimetres" hint="Spec 50–110 mm" error={slumpError || null} warning={slumpWarning}>
          <UnitInput
            unit="mm"
            className="h-9"
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
            disabled={saving || Boolean(volumeError) || Boolean(slumpError)}
            aria-busy={saving}
            className="min-w-28"
          >
            {saving && <LoaderCircle className="animate-spin" aria-hidden />}
            {saving ? "Saving…" : "Save test"}
          </Button>
          <Button variant="outline" disabled>
            Assign
          </Button>
          <span className="text-xs text-muted-foreground">Disabled, with the reason beside it: choose a truck first.</span>
        </div>
      </div>
    </Frame>
  );
}

export function StatesExample() {
  const [retrying, setRetrying] = useState(false);
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <Frame label="Loading: skeleton in the shape of the table">
        <TableSkeleton rows={3} columns={5} />
      </Frame>
      <Frame label="Empty: say what is empty, offer the next action">
        <EmptyState
          icon={CalendarX2}
          title="No pours scheduled today"
          className="py-6"
          action={
            <Button size="sm">
              <Plus aria-hidden />
              Schedule pour
            </Button>
          }
        >
          New orders appear here as soon as they are scheduled.
        </EmptyState>
      </Frame>
      <Frame label="Error: plain words, what still works, Retry">
        <ErrorState
          title="Today's orders didn't load"
          className="py-6"
          retrying={retrying}
          onRetry={() => {
            setRetrying(true);
            window.setTimeout(() => setRetrying(false), 1200);
          }}
        >
          The dispatch service didn&apos;t answer in time. Nothing you entered is lost.
        </ErrorState>
      </Frame>
      <Frame label="Partial data: show what loaded, flag what didn't">
        <div className="grid gap-3 p-3">
          <PartialNotice action={<Button size="sm" variant="outline" className="bg-white">Refresh</Button>}>
            <strong className="font-semibold">GPS for Moose Jaw trucks stopped at 09:31.</strong> ETAs for MJW loads may
            be up to 11 min old.
          </PartialNotice>
          <div className="flex flex-wrap gap-2">
            <StatusBadge status="en_route" />
            <StatusBadge status="pouring" />
            <StatusBadge status="scheduled" />
          </div>
        </div>
      </Frame>
    </div>
  );
}
