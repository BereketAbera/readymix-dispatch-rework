"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, CircleCheck, Truck as TruckIcon, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { formatM3 } from "@/components/dispatch/bits";
import { formatClock, type DispatchDay, type Truck } from "@/lib/dispatch";
import { cn } from "@/lib/utils";
import { currentTicket, ticketsFor, type Ticket } from "./field-data";
import { TicketFacts } from "./ticket-facts";

type StepId = "arrived" | "pouring" | "complete";
const STEPS: { id: StepId; label: string; done: string }[] = [
  { id: "arrived", label: "Arrived on site", done: "Arrived on site" },
  { id: "pouring", label: "Start pour", done: "Pour started" },
  { id: "complete", label: "Pour complete", done: "Pour complete" },
];

/** After each step the button confirms it and ignores taps for this long: a double tap or a gloved bounce records one step. */
export const STEP_LOCK_MS = 900;

type TicketState = "delivered" | "current" | "later";

function ticketState(t: Ticket, current: Ticket | undefined): TicketState {
  if (current && t.load.id === current.load.id) return "current";
  return t.load.stage === "returned" ? "delivered" : "later";
}

const STATE_LABEL: Record<TicketState, string> = { delivered: "Delivered", current: "Now", later: "Later" };

export function DriverApp({ day, truck }: { day: DispatchDay; truck: Truck }) {
  const tickets = useMemo(() => ticketsFor(day, truck.id), [day, truck.id]);
  const current = currentTicket(tickets);
  const plant = day.plants.find((p) => p.id === truck.plantId);
  const [openId, setOpenId] = useState<string | null>(null);
  const [side, setSide] = useState<"right" | "bottom">("right");
  const opened = tickets.find((t) => t.load.id === openId) ?? null;
  const currentRef = useRef<HTMLElement>(null);

  function openTicket(t: Ticket) {
    if (current && t.load.id === current.load.id) {
      // The current load is already on screen: bring it into view instead of covering it.
      currentRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
      currentRef.current?.focus({ preventScroll: true });
      return;
    }
    setSide(window.matchMedia("(min-width: 768px)").matches ? "right" : "bottom");
    setOpenId(t.load.id);
  }

  return (
    <main className="mx-auto grid max-w-5xl gap-4 p-4 md:grid-cols-[minmax(0,300px)_minmax(0,1fr)] md:gap-6 md:p-6 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
      <div className="grid min-w-0 content-start gap-4 md:order-2">
        {current ? (
          <CurrentLoad ref={currentRef} ticket={current} clock={day.clock} plantName={plant?.name ?? ""} />
        ) : (
          <p className="rounded-xl border bg-card p-4 text-sm text-muted-foreground">No load on the truck right now.</p>
        )}
        <p className="flex items-start gap-2 rounded-lg border border-dashed px-3 py-2 text-sm text-muted-foreground">
          <TruckIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
          Field tests on this pour are done by the QC tech on site, not by the driver.
        </p>
      </div>
      <section aria-labelledby="tickets-heading" className="min-w-0 md:order-1">
        <h2 id="tickets-heading" className="mb-2 text-sm font-semibold">
          Today’s tickets · {tickets.length}
        </h2>
        <ol className="grid grid-cols-1 gap-2">
          {tickets.map((t) => {
            const state = ticketState(t, current);
            return (
              <li key={t.load.id} className="min-w-0">
                <button
                  type="button"
                  data-ticket-open={t.load.id}
                  onClick={() => openTicket(t)}
                  aria-current={state === "current" ? "true" : undefined}
                  className={cn(
                    "flex min-h-16 w-full items-start gap-3 rounded-xl border bg-card px-3 py-2.5 text-left transition-colors hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none",
                    state === "current" && "border-primary ring-1 ring-primary",
                  )}
                >
                  <span className="pt-0.5 font-mono text-base font-semibold tabular">{formatClock(t.load.times.on_site)}</span>
                  <span className="min-w-0 flex-1">
                    <span className="line-clamp-2 text-sm font-medium">{t.order.customer}</span>
                    <span className="block text-xs text-muted-foreground">
                      <span className="font-mono">#{t.load.ticket}</span> · {formatM3(t.load.volumeM3)} m³
                    </span>
                    <span
                      className={cn(
                        "mt-1 inline-block rounded-md px-1.5 py-0.5 text-xs font-medium",
                        state === "delivered" && "bg-emerald-50 text-emerald-800",
                        state === "current" && "bg-sky-50 text-sky-800",
                        state === "later" && "bg-slate-100 text-slate-700",
                      )}
                    >
                      {STATE_LABEL[state]}
                    </span>
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

      <Sheet open={opened !== null} onOpenChange={(next) => !next && setOpenId(null)}>
        <SheetContent
          side={side}
          className={cn(
            "gap-0 p-0",
            side === "right" ? "data-[side=right]:w-full data-[side=right]:sm:max-w-md" : "max-h-[85dvh] rounded-t-xl",
          )}
          onCloseAutoFocus={(e) => {
            e.preventDefault();
            if (openId) document.querySelector<HTMLElement>(`[data-ticket-open="${openId}"]`)?.focus();
          }}
        >
          {opened && (
            <>
              <SheetHeader className="border-b px-4 pt-4 pb-3 pr-14">
                <SheetTitle>Ticket #{opened.load.ticket}</SheetTitle>
                <SheetDescription>
                  {opened.load.stage === "returned"
                    ? `Delivered: pour complete at ${formatClock(opened.load.times.returned)}.`
                    : `Planned on site at ${formatClock(opened.load.times.on_site)}. Steps unlock when this is your current load.`}
                </SheetDescription>
              </SheetHeader>
              <div className="overflow-y-auto p-4">
                <TicketFacts ticket={opened} headingLevel="h3" />
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </main>
  );
}

function CurrentLoad({
  ref,
  ticket,
  clock,
  plantName,
}: {
  ref: React.Ref<HTMLElement>;
  ticket: Ticket;
  clock: number;
  plantName: string;
}) {
  const mounted = useRef(Date.now());
  const [times, setTimes] = useState<Partial<Record<StepId, number>>>({});
  const [recorded, setRecorded] = useState<{ label: string; time: number } | null>(null);
  const lock = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(lock.current), []);
  const nextIndex = STEPS.findIndex((s) => times[s.id] === undefined);
  const next = nextIndex === -1 ? null : STEPS[nextIndex];
  const { load } = ticket;

  function record() {
    if (!next || recorded) return;
    const elapsed = Math.floor((Date.now() - mounted.current) / 60000);
    const now = clock + elapsed;
    const previous = nextIndex > 0 ? times[STEPS[nextIndex - 1].id]! : load.times.en_route;
    const floor =
      next.id === "arrived"
        ? Math.max(load.times.on_site, previous + 1)
        : next.id === "pouring"
          ? previous + 4
          : previous + Math.round(load.volumeM3 * 2.5);
    const time = Math.max(now, floor);
    setTimes((t) => ({ ...t, [next.id]: time }));
    setRecorded({ label: next.done, time });
    window.clearTimeout(lock.current);
    lock.current = window.setTimeout(() => setRecorded(null), STEP_LOCK_MS);
  }

  function undo() {
    const last = [...STEPS].reverse().find((s) => times[s.id] !== undefined);
    if (!last) return;
    window.clearTimeout(lock.current);
    setRecorded(null);
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
    <section
      ref={ref}
      tabIndex={-1}
      className="scroll-mt-4 overflow-hidden rounded-xl border bg-card outline-none"
      aria-labelledby="current-ticket"
    >
      <h2 className="border-b bg-sky-50 px-4 py-2 text-sm font-medium text-sky-900" id="current-ticket">
        Current load
      </h2>
      <div className="p-4">
        <TicketFacts ticket={ticket} headingLevel="h3" />
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
        {recorded ? (
          <Button
            size="lg"
            className="h-14 w-full bg-emerald-700 text-base hover:bg-emerald-700"
            aria-disabled
            data-testid="step-button"
            onClick={() => {}}
          >
            <Check aria-hidden />
            {recorded.label} · {formatClock(recorded.time)}
          </Button>
        ) : next ? (
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
    </section>
  );
}
