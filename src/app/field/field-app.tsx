"use client";

import { useMemo, useRef, useState } from "react";
import { Check, CircleCheck, LoaderCircle, MapPin, Truck as TruckIcon, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Field, UnitInput } from "@/components/form-field";
import { MixLabel, formatM3 } from "@/components/dispatch/bits";
import { formatClock, type DispatchDay, type Load, type Order, type Truck } from "@/lib/dispatch";
import { cn } from "@/lib/utils";

interface Ticket {
  load: Load;
  order: Order;
}

type StepId = "arrived" | "pouring" | "complete";
const STEPS: { id: StepId; label: string; done: string }[] = [
  { id: "arrived", label: "Arrived on site", done: "Arrived on site" },
  { id: "pouring", label: "Start pour", done: "Pour started" },
  { id: "complete", label: "Pour complete", done: "Pour complete" },
];

/* ------------------------------------------------------------------ */
/* Field test: validation rules, shared with the standard page.       */
/* ------------------------------------------------------------------ */

export type TestField = "slump" | "air" | "temp" | "cylinders";

export interface Spec {
  slump: [number, number];
  air: [number, number];
  temp: [number, number];
}

export function specFor(order: Order): Spec {
  const air = order.mix.airPct;
  return {
    slump: [50, 110],
    air: air ? [air - 1, air + 2] : [0, 3],
    temp: [10, 25],
  };
}

const LIMITS: Record<TestField, { min: number; max: number; unit: string; name: string; integer?: boolean }> = {
  slump: { min: 0, max: 300, unit: "mm", name: "slump" },
  air: { min: 0, max: 15, unit: "%", name: "air content" },
  temp: { min: -10, max: 50, unit: "°C", name: "concrete temperature" },
  cylinders: { min: 0, max: 12, unit: "", name: "number of cylinders", integer: true },
};

export function checkTestValue(
  field: TestField,
  raw: string,
  spec: Spec,
): { error: string | null; warning: string | null } {
  const limit = LIMITS[field];
  if (!raw.trim()) return { error: `Enter the ${limit.name}.`, warning: null };
  const n = Number(raw.replace(",", "."));
  if (!Number.isFinite(n)) return { error: "Use numbers only, for example 80 or 6.5.", warning: null };
  if (limit.integer && !Number.isInteger(n)) return { error: "Count whole cylinders, for example 3.", warning: null };
  if (n < limit.min || n > limit.max) {
    return { error: `That looks wrong: ${limit.name} should be between ${limit.min} and ${limit.max}${limit.unit ? ` ${limit.unit}` : ""}.`, warning: null };
  }
  if (field !== "cylinders") {
    const [lo, hi] = spec[field];
    if (n < lo || n > hi) {
      return {
        error: null,
        warning: `Outside spec (${lo}–${hi} ${limit.unit}). Save it, then tell dispatch before the next load.`,
      };
    }
  }
  return { error: null, warning: null };
}

/* ------------------------------------------------------------------ */

function ticketState(t: Ticket, current: Ticket | undefined): "delivered" | "current" | "later" {
  if (current && t.load.id === current.load.id) return "current";
  return t.load.stage === "returned" ? "delivered" : "later";
}

export function FieldApp({ day, truck }: { day: DispatchDay; truck: Truck }) {
  const tickets = useMemo<Ticket[]>(
    () =>
      day.orders
        .flatMap((order) => order.loads.filter((l) => l.truckId === truck.id).map((load) => ({ load, order })))
        .sort((a, b) => a.load.times.batched - b.load.times.batched),
    [day.orders, truck.id],
  );
  const current = tickets.find((t) => t.load.stage !== "returned" && t.load.stage !== "pending");
  const [selectedId, setSelectedId] = useState<string | undefined>(current?.load.id);
  const selected = tickets.find((t) => t.load.id === selectedId) ?? current ?? tickets[0];
  const plant = day.plants.find((p) => p.id === truck.plantId);

  return (
    <main className="mx-auto grid max-w-5xl gap-4 p-4 md:grid-cols-[minmax(0,280px)_minmax(0,1fr)] md:gap-6 md:p-6">
      <div className="grid min-w-0 content-start gap-4 md:order-2">
        {selected && selected.load.id === current?.load.id ? (
          <CurrentTicket ticket={selected} clock={day.clock} plantName={plant?.name ?? ""} />
        ) : selected ? (
          <TicketSummary ticket={selected} />
        ) : null}
        {current && <FieldTest key={current.load.id} ticket={current} clock={day.clock} />}
      </div>
      <section aria-labelledby="tickets-heading" className="min-w-0 md:order-1">
        <h2 id="tickets-heading" className="mb-2 text-sm font-semibold">
          Today&apos;s tickets · {tickets.length}
        </h2>
        <ol className="grid grid-cols-1 gap-2">
          {tickets.map((t) => {
            const state = ticketState(t, current);
            const active = t.load.id === selected?.load.id;
            return (
              <li key={t.load.id} className="min-w-0">
                <button
                  type="button"
                  onClick={() => setSelectedId(t.load.id)}
                  aria-current={active ? "true" : undefined}
                  className={cn(
                    "flex min-h-16 w-full items-center gap-3 rounded-xl border bg-card px-3 py-2.5 text-left transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                    active ? "border-primary ring-1 ring-primary" : "hover:bg-muted/60",
                  )}
                >
                  <span className="font-mono text-base font-semibold tabular">{formatClock(t.load.times.on_site)}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{t.order.customer}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      #{t.load.ticket} · {formatM3(t.load.volumeM3)} m³
                    </span>
                  </span>
                  <span
                    className={cn(
                      "shrink-0 rounded-md px-1.5 py-0.5 text-xs font-medium",
                      state === "delivered" && "bg-emerald-50 text-emerald-800",
                      state === "current" && "bg-sky-50 text-sky-800",
                      state === "later" && "bg-slate-100 text-slate-700",
                    )}
                  >
                    {state === "delivered" ? "Delivered" : state === "current" ? "Now" : "Later"}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
        <p className="mt-3 text-xs text-muted-foreground">
          {truck.unit} runs out of {plant?.name}. Tickets appear here as dispatch assigns them.
        </p>
      </section>
    </main>
  );
}

function TicketFacts({ ticket }: { ticket: Ticket }) {
  const { order, load } = ticket;
  return (
    <>
      <p className="font-mono text-xs text-muted-foreground">
        Ticket #{load.ticket} · load {load.index} of {order.loadsTotal} · {order.number}
      </p>
      <h2 className="mt-1 text-lg leading-snug font-semibold">{order.customer}</h2>
      <p className="mt-0.5 flex items-start gap-1.5 text-sm">
        <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
        {order.siteAddress}
      </p>
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-xs text-muted-foreground">This load</dt>
          <dd className="font-medium">
            <span className="font-mono tabular">{formatM3(load.volumeM3)}</span> m³
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Mix</dt>
          <dd className="font-medium">
            <MixLabel label={order.mix.label} />
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Pour</dt>
          <dd className="font-medium">
            {order.pourType} · {order.placement}
          </dd>
        </div>
      </dl>
      {order.notes && <p className="mt-3 rounded-lg bg-muted px-3 py-2 text-sm">{order.notes}</p>}
    </>
  );
}

function TicketSummary({ ticket }: { ticket: Ticket }) {
  const delivered = ticket.load.stage === "returned";
  return (
    <section className="rounded-xl border bg-card p-4" aria-label="Ticket">
      <TicketFacts ticket={ticket} />
      <p className={cn("mt-4 flex items-center gap-1.5 text-sm font-medium", delivered ? "text-emerald-800" : "text-muted-foreground")}>
        {delivered ? <CircleCheck className="size-4" aria-hidden /> : <TruckIcon className="size-4" aria-hidden />}
        {delivered
          ? `Delivered: pour complete at ${formatClock(ticket.load.times.returned)}`
          : `Planned on site at ${formatClock(ticket.load.times.on_site)}. Steps unlock when this is your current load.`}
      </p>
    </section>
  );
}

function CurrentTicket({ ticket, clock, plantName }: { ticket: Ticket; clock: number; plantName: string }) {
  const mounted = useRef(Date.now());
  const [times, setTimes] = useState<Partial<Record<StepId, number>>>({});
  const nextIndex = STEPS.findIndex((s) => times[s.id] === undefined);
  const next = nextIndex === -1 ? null : STEPS[nextIndex];
  const { load, order } = ticket;

  function record() {
    if (!next) return;
    const elapsed = Math.floor((Date.now() - mounted.current) / 60000);
    const now = clock + elapsed;
    const previous = nextIndex > 0 ? times[STEPS[nextIndex - 1].id]! : load.times.en_route;
    const floor =
      next.id === "arrived"
        ? Math.max(load.times.on_site, previous + 1)
        : next.id === "pouring"
          ? previous + 4
          : previous + Math.round(load.volumeM3 * 2.5);
    setTimes((t) => ({ ...t, [next.id]: Math.max(now, floor) }));
  }

  function undo() {
    const last = [...STEPS].reverse().find((s) => times[s.id] !== undefined);
    if (!last) return;
    setTimes((t) => {
      const copy = { ...t };
      delete copy[last.id];
      return copy;
    });
  }

  const doneSteps = [
    { label: "Loaded at the plant", time: load.times.loaded },
    { label: "Left the plant", time: load.times.en_route },
  ];

  return (
    <section className="overflow-hidden rounded-xl border bg-card" aria-labelledby="current-ticket">
      <div className="border-b bg-sky-50 px-4 py-2 text-sm font-medium text-sky-900" id="current-ticket">
        Current load
      </div>
      <div className="p-4">
        <TicketFacts ticket={ticket} />
      </div>
      <ol className="grid gap-1 border-t px-4 py-3" aria-label="Delivery steps">
        {doneSteps.map((s) => (
          <li key={s.label} className="flex items-center gap-2 text-sm">
            <Check className="size-4 text-emerald-700" aria-hidden />
            <span className="flex-1">{s.label}</span>
            <span className="font-mono text-muted-foreground tabular">{formatClock(s.time)}</span>
          </li>
        ))}
        {STEPS.map((s) => {
          const time = times[s.id];
          if (time === undefined) {
            return (
              <li key={s.id} className={cn("flex items-center gap-2 text-sm", s.id === next?.id ? "font-medium" : "text-muted-foreground")}>
                <span className="flex size-4 items-center justify-center" aria-hidden>
                  <span className={cn("size-2 rounded-full", s.id === next?.id ? "bg-primary" : "bg-slate-300")} />
                </span>
                <span className="flex-1">{s.label}</span>
                <span className="text-xs">{s.id === next?.id ? "Next" : "Not yet"}</span>
              </li>
            );
          }
          return (
            <li key={s.id} className="flex items-center gap-2 text-sm">
              <Check className="size-4 text-emerald-700" aria-hidden />
              <span className="flex-1">{s.done}</span>
              <span className="font-mono text-muted-foreground tabular">{formatClock(time)}</span>
            </li>
          );
        })}
      </ol>
      <div className="grid gap-2 border-t p-4" aria-live="polite">
        {next ? (
          <Button size="lg" className="h-14 w-full text-base" onClick={record} data-testid="step-button">
            {next.label}
          </Button>
        ) : (
          <p className="flex items-start gap-2 rounded-lg bg-emerald-50 px-3 py-3 text-sm font-medium text-emerald-900">
            <CircleCheck className="mt-0.5 size-4 shrink-0" aria-hidden />
            Load delivered at {formatClock(times.complete!)}. Wash out on site, then head back to {plantName}.
          </p>
        )}
        {Object.keys(times).length > 0 && (
          <Button variant="ghost" className="h-11 justify-self-start" onClick={undo}>
            <Undo2 aria-hidden />
            Undo last step
          </Button>
        )}
      </div>
      <span className="sr-only">{order.number}</span>
    </section>
  );
}

type SaveState = "idle" | "saving" | "saved";

function FieldTest({ ticket, clock }: { ticket: Ticket; clock: number }) {
  const spec = specFor(ticket.order);
  const [values, setValues] = useState<Record<TestField, string>>({ slump: "", air: "", temp: "", cylinders: "" });
  const [notes, setNotes] = useState("");
  const [touched, setTouched] = useState<Partial<Record<TestField, boolean>>>({});
  const [save, setSave] = useState<SaveState>("idle");
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [dirty, setDirty] = useState(false);
  const mounted = useRef(Date.now());
  const formRef = useRef<HTMLFormElement>(null);

  const check = (f: TestField) => (touched[f] ? checkTestValue(f, values[f], spec) : { error: null, warning: null });
  const change = (f: TestField) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setValues((v) => ({ ...v, [f]: e.target.value }));
    setDirty(true);
  };
  const blur = (f: TestField) => () => setTouched((t) => ({ ...t, [f]: true }));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const fields: TestField[] = ["slump", "air", "temp", "cylinders"];
    setTouched({ slump: true, air: true, temp: true, cylinders: true });
    const firstBad = fields.find((f) => checkTestValue(f, values[f], spec).error);
    if (firstBad) {
      formRef.current?.querySelector<HTMLElement>(`#test-${firstBad}`)?.focus();
      return;
    }
    setSave("saving");
    window.setTimeout(() => {
      setSave("saved");
      setDirty(false);
      setSavedAt(clock + Math.floor((Date.now() - mounted.current) / 60000) + 2);
    }, 800);
  }

  const airHint = ticket.order.mix.airPct
    ? `Spec ${spec.air[0]}–${spec.air[1]} % for this mix`
    : "Non-air mix: expect under 3 %";

  return (
    <section className="rounded-xl border bg-card" aria-labelledby="field-test-heading">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b px-4 py-3">
        <h2 id="field-test-heading" className="text-base font-semibold">
          Field test
        </h2>
        <p className="font-mono text-xs text-muted-foreground">Ticket #{ticket.load.ticket}</p>
      </div>
      <form ref={formRef} onSubmit={submit} noValidate className="grid gap-4 p-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="test-slump" label="Slump" unitLabel="millimetres" hint={`Spec ${spec.slump[0]}–${spec.slump[1]} mm`} {...check("slump")}>
            <UnitInput unit="mm" className="h-12 text-base" value={values.slump} onChange={change("slump")} onBlur={blur("slump")} />
          </Field>
          <Field id="test-air" label="Air content" unitLabel="percent" hint={airHint} {...check("air")}>
            <UnitInput unit="%" className="h-12 text-base" value={values.air} onChange={change("air")} onBlur={blur("air")} />
          </Field>
          <Field id="test-temp" label="Concrete temperature" unitLabel="degrees Celsius" hint={`Spec ${spec.temp[0]}–${spec.temp[1]} °C`} {...check("temp")}>
            <UnitInput unit="°C" inputMode="text" className="h-12 text-base" value={values.temp} onChange={change("temp")} onBlur={blur("temp")} />
          </Field>
          <Field id="test-cylinders" label="Cylinders taken" hint="Usually 3 per set" {...check("cylinders")}>
            <UnitInput unit="cyl." inputMode="numeric" className="h-12 text-base" value={values.cylinders} onChange={change("cylinders")} onBlur={blur("cylinders")} />
          </Field>
        </div>
        <Field id="test-notes" label="Notes" optional>
          <Textarea
            rows={2}
            className="text-base"
            value={notes}
            onChange={(e) => {
              setNotes(e.target.value);
              setDirty(true);
            }}
          />
        </Field>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Button
            type="submit"
            size="lg"
            className="h-12 w-full text-base sm:w-44"
            disabled={save === "saving" || (save === "saved" && !dirty)}
            aria-busy={save === "saving"}
            data-testid="save-test"
          >
            {save === "saving" && <LoaderCircle className="animate-spin" aria-hidden />}
            {save === "saving" ? "Saving…" : save === "saved" && !dirty ? "Saved" : save === "saved" ? "Save changes" : "Save test"}
          </Button>
          <p className="text-sm" role="status">
            {save === "saved" && !dirty && savedAt !== null ? (
              <span className="inline-flex items-center gap-1.5 font-medium text-emerald-800">
                <CircleCheck className="size-4" aria-hidden />
                Saved at {formatClock(savedAt)} and sent to the lab.
              </span>
            ) : dirty ? (
              <span className="text-muted-foreground">Unsaved changes</span>
            ) : (
              <span className="text-muted-foreground">Out-of-spec values can still be saved.</span>
            )}
          </p>
        </div>
      </form>
    </section>
  );
}

