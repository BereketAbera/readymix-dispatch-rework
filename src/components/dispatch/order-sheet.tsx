"use client";

import { useState } from "react";
import { Check, CirclePause, CirclePlay } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { TruckChip, TruckChips, formatM3 } from "@/components/dispatch/bits";
import { RiskBadge, StatusBadge } from "@/components/dispatch/status";
import {
  LOAD_STAGES,
  formatClock,
  getRisk,
  isClosed,
  type Load,
  type LoadStage,
  type Order,
  type Plant,
  type Truck,
} from "@/lib/dispatch";
import { cn } from "@/lib/utils";

const STAGE_LABEL: Record<LoadStage, string> = {
  batched: "Batched",
  loaded: "Loaded",
  en_route: "En route",
  on_site: "On site",
  pouring: "Pouring",
  returned: "Washout / returned",
};

function loadSummary(load: Load, clock: number): { text: string; tone: "done" | "live" | "late" | "plan" } {
  if (!load.truckId) return { text: "Needs a truck", tone: "late" };
  const late = load.delayMin >= 5 ? ` · ${load.delayMin} min late` : "";
  switch (load.stage) {
    case "returned":
      return { text: `Delivered ${formatClock(load.times.returned)}`, tone: "done" };
    case "pouring":
      return { text: `Pouring since ${formatClock(load.times.pouring)}`, tone: "live" };
    case "on_site":
      return { text: `On site since ${formatClock(load.times.on_site)}`, tone: "live" };
    case "en_route":
      return { text: `En route · ETA ${formatClock(load.times.on_site)}${late}`, tone: late ? "late" : "live" };
    case "batched":
    case "loaded":
      return { text: `At the plant · leaves ${formatClock(load.times.en_route)}`, tone: "live" };
    default:
      return {
        text: `Planned ${formatClock(load.times.on_site)}${late}`,
        tone: late ? "late" : load.times.batched - clock < 30 ? "live" : "plan",
      };
  }
}

function LoadTimeline({ order, clock }: { order: Order; clock: number }) {
  return (
    <div>
      <div className="grid grid-cols-6 gap-1 px-2.5 pb-1.5 text-[11px] leading-tight font-medium text-muted-foreground" aria-hidden>
        {LOAD_STAGES.map((s) => (
          <span key={s}>
            {s === "returned" ? (
              <>
                Washout/
                <wbr />
                returned
              </>
            ) : (
              STAGE_LABEL[s]
            )}
          </span>
        ))}
      </div>
      <ol className="grid gap-2">
        {order.loads.map((load) => {
          const reached = load.stage === "pending" || !load.truckId ? -1 : LOAD_STAGES.indexOf(load.stage);
          const summary = loadSummary(load, clock);
          return (
            <li key={load.id} className="rounded-lg border p-2.5" data-testid="load">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium">
                  Load {load.index}
                  <span className="font-normal text-muted-foreground">
                    {" "}
                    of {order.loadsTotal} · {formatM3(load.volumeM3)} m³
                  </span>
                </p>
                <div className="flex items-center gap-1.5">
                  {load.truckId && <TruckChip unit={load.truckId} />}
                  <span className="font-mono text-xs text-muted-foreground">#{load.ticket}</span>
                </div>
              </div>
              <p
                className={cn(
                  "mt-0.5 text-xs",
                  summary.tone === "done" && "text-emerald-800",
                  summary.tone === "live" && "text-sky-800",
                  summary.tone === "late" && "font-medium text-red-700",
                  summary.tone === "plan" && "text-muted-foreground",
                )}
              >
                {summary.text}
              </p>
              <ol className="mt-2 grid grid-cols-6 gap-1" aria-label={`Load ${load.index} timeline`}>
                {LOAD_STAGES.map((stage, i) => {
                  const done = i < reached || (i === reached && stage === "returned");
                  const current = i === reached && stage !== "returned";
                  const time = formatClock(load.times[stage]);
                  return (
                    <li key={stage} className="min-w-0">
                      <span
                        aria-hidden
                        className={cn(
                          "block h-1.5 rounded-full",
                          done && "bg-primary",
                          current && "bg-primary ring-2 ring-primary/25 motion-safe:animate-pulse",
                          !done && !current && "bg-slate-200",
                        )}
                      />
                      <span
                        className={cn(
                          "mt-1 block font-mono text-[11px] tabular",
                          !done && !current && "text-muted-foreground",
                          current && "font-semibold",
                        )}
                      >
                        <span className="sr-only">
                          {STAGE_LABEL[stage]}: {done ? "done at" : current ? "now, since" : "expected"}{" "}
                        </span>
                        {!done && !current && <span aria-hidden>~</span>}
                        {time}
                      </span>
                    </li>
                  );
                })}
              </ol>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function AssignTruck({
  order,
  trucks,
  onAssign,
}: {
  order: Order;
  trucks: Truck[];
  onAssign: (truckId: string) => void;
}) {
  const [choice, setChoice] = useState<string>("");
  const [message, setMessage] = useState<string>("");
  const candidates = trucks
    .filter((t) => t.plantId === order.plantId && t.status !== "out_of_service" && !order.truckIds.includes(t.id))
    .sort((a, b) => (a.status === "available" ? -1 : 0) - (b.status === "available" ? -1 : 0) || (a.backAt ?? 0) - (b.backAt ?? 0));
  const labelId = `assign-${order.id}`;
  return (
    <div className="grid gap-2">
      <div className="flex items-end gap-2">
        <div className="grid min-w-0 flex-1 gap-1.5">
          <label id={labelId} className="text-sm font-medium" htmlFor={`${labelId}-trigger`}>
            Assign truck
          </label>
          <Select value={choice} onValueChange={setChoice}>
            <SelectTrigger id={`${labelId}-trigger`} className="h-9 w-full" aria-labelledby={labelId}>
              <SelectValue placeholder="Choose a truck" />
            </SelectTrigger>
            <SelectContent>
              {candidates.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  <span className="font-mono">{t.unit}</span>
                  <span className="text-muted-foreground">
                    {t.driver} · {t.status === "available" ? "at the plant" : `back ${formatClock(t.backAt ?? 0)}`}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          className="h-9"
          disabled={!choice}
          onClick={() => {
            onAssign(choice);
            setMessage(`${choice} assigned to ${order.number}.`);
            setChoice("");
          }}
        >
          Assign
        </Button>
      </div>
      <p className="min-h-4 text-xs text-muted-foreground" aria-live="polite">
        {message ? (
          <span className="inline-flex items-center gap-1 font-medium text-emerald-800">
            <Check className="size-3.5" aria-hidden />
            {message}
          </span>
        ) : order.truckIds.length === 0 ? (
          "Loads without a truck are shared across the trucks you add."
        ) : (
          "Adding a truck puts it into this job's rotation."
        )}
      </p>
    </div>
  );
}

export function OrderSheet({
  order,
  plants,
  trucks,
  clock,
  open,
  onOpenChange,
  onAssign,
  onSetStatus,
}: {
  order: Order | null;
  plants: Plant[];
  trucks: Truck[];
  clock: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAssign: (orderId: string, truckId: string) => void;
  onSetStatus: (orderId: string, status: Order["status"]) => void;
}) {
  const [confirmCancel, setConfirmCancel] = useState(false);
  if (!order) return null;
  const risk = getRisk(order, clock);
  const plant = plants.find((p) => p.id === order.plantId);
  const closed = order.status === "complete" || order.status === "cancelled";

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!next) setConfirmCancel(false);
        onOpenChange(next);
      }}
    >
      <SheetContent side="right" className="w-full gap-0 p-0 sm:max-w-[540px]" data-testid="order-sheet">
        <SheetHeader className="gap-1.5 border-b px-5 pt-4 pb-4">
          <p className="font-mono text-xs text-muted-foreground">
            {order.number} · {plant?.name}
          </p>
          <SheetTitle className="pr-8 text-lg leading-snug font-semibold">{order.customer}</SheetTitle>
          <SheetDescription>{order.siteAddress}</SheetDescription>
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <StatusBadge status={order.status} />
            {risk && <RiskBadge risk={risk} />}
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto">
          {risk && (
            <p
              className={cn(
                "mx-5 mt-4 rounded-lg px-3 py-2 text-sm",
                risk.level === "late" ? "bg-red-50 text-red-900" : "bg-amber-50 text-amber-950",
              )}
            >
              {risk.reason}
            </p>
          )}

          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 px-5 py-4 text-sm">
            <div>
              <dt className="text-xs text-muted-foreground">First truck on site</dt>
              <dd className="font-mono font-medium tabular">{formatClock(order.scheduledStart)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Volume</dt>
              <dd className="font-medium">
                <span className="font-mono tabular">{formatM3(order.volumeM3)}</span> m³ in {order.loadsTotal}{" "}
                {order.loadsTotal === 1 ? "load" : "loads"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Mix</dt>
              <dd className="font-medium">{order.mix.label}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Pour</dt>
              <dd className="font-medium">
                {order.pourType} · {order.placement}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Spacing</dt>
              <dd className="font-medium">Every {order.spacingMin} min</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Travel from plant</dt>
              <dd className="font-medium">{order.travelMin} min</dd>
            </div>
            <div className="col-span-2">
              <dt className="text-xs text-muted-foreground">Trucks on this job</dt>
              <dd className="mt-1">
                <TruckChips order={order} max={8} />
              </dd>
            </div>
            {order.notes && (
              <div className="col-span-2">
                <dt className="text-xs text-muted-foreground">Notes</dt>
                <dd className="mt-0.5">{order.notes}</dd>
              </div>
            )}
          </dl>

          {!closed && order.status !== "on_hold" && (
            <section className="border-t px-5 py-4" aria-label="Assign truck">
              <AssignTruck order={order} trucks={trucks} onAssign={(truckId) => onAssign(order.id, truckId)} />
            </section>
          )}

          <section className="border-t px-5 py-4" aria-labelledby="loads-heading">
            <h3 id="loads-heading" className="mb-2 text-sm font-semibold">
              Loads
            </h3>
            {order.status === "cancelled" ? (
              <p className="text-sm text-muted-foreground">No loads: this order was cancelled.</p>
            ) : (
              <LoadTimeline order={order} clock={clock} />
            )}
          </section>
        </div>

        {!closed && (
          <SheetFooter className="flex-row flex-wrap items-center gap-2 border-t px-5 py-3">
            {confirmCancel ? (
              <>
                <p className="w-full text-sm">
                  Cancel {order.number}? Loads already out will still be delivered and invoiced.
                </p>
                <Button
                  variant="destructive"
                  onClick={() => {
                    onSetStatus(order.id, "cancelled");
                    setConfirmCancel(false);
                  }}
                >
                  Cancel order
                </Button>
                <Button variant="ghost" onClick={() => setConfirmCancel(false)}>
                  Keep order
                </Button>
              </>
            ) : (
              <>
                {order.status === "on_hold" ? (
                  <Button variant="outline" onClick={() => onSetStatus(order.id, "scheduled")}>
                    <CirclePlay aria-hidden />
                    Release hold
                  </Button>
                ) : (
                  !isClosed(order) && (
                    <Button variant="outline" onClick={() => onSetStatus(order.id, "on_hold")}>
                      <CirclePause aria-hidden />
                      Put on hold
                    </Button>
                  )
                )}
                <Button variant="ghost" className="ml-auto text-destructive hover:text-destructive" onClick={() => setConfirmCancel(true)}>
                  Cancel order…
                </Button>
              </>
            )}
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}
