import type { DispatchDay, Load, Order, Truck } from "@/lib/dispatch";

export interface Ticket {
  load: Load;
  order: Order;
}

/** The truck shown in the driver view: one on the road at the board time, with the most tickets today. */
export function pickDriverTruck(day: DispatchDay): Truck {
  const ticketsPerTruck = (id: string) => day.orders.flatMap((o) => o.loads).filter((l) => l.truckId === id).length;
  return (
    day.trucks
      .filter((t) => t.status === "en_route")
      .sort((a, b) => ticketsPerTruck(b.id) - ticketsPerTruck(a.id) || a.unit.localeCompare(b.unit))[0] ?? day.trucks[0]
  );
}

export function ticketsFor(day: DispatchDay, truckId: string): Ticket[] {
  return day.orders
    .flatMap((order) => order.loads.filter((l) => l.truckId === truckId).map((load) => ({ load, order })))
    .sort((a, b) => a.load.times.batched - b.load.times.batched);
}

/** The load the truck is on now: batched or on the road, not yet back. */
export function currentTicket(tickets: Ticket[]): Ticket | undefined {
  return tickets.find((t) => t.load.stage !== "returned" && t.load.stage !== "pending");
}

export type TestStatus = "done" | "due" | "arriving" | "later";

export interface TestResult {
  slump: number;
  air: number;
  temp: number;
  cylinders: number;
  /** Minutes after midnight. */
  at: number;
}

export interface PlannedTest extends Ticket {
  status: TestStatus;
  /** Recorded result for tests already done before the board time. */
  result: TestResult | null;
}

/** Test plan used by the sample: the first load of every pour, then one more for every 50 m³ after that. */
export const TEST_EVERY_M3 = 50;

function testedLoads(order: Order): Load[] {
  const picked: Load[] = [];
  let poured = 0;
  let nextMark = 0;
  for (const load of order.loads) {
    if (poured >= nextMark) {
      picked.push(load);
      nextMark += TEST_EVERY_M3;
    }
    poured += load.volumeM3;
  }
  return picked;
}

/** A plausible, repeatable result for a test done before the board time (derived from the ticket number). */
function seededResult(order: Order, load: Load): TestResult {
  const n = Number(load.ticket);
  const air = order.mix.airPct ? order.mix.airPct + ((n % 7) - 3) / 10 : 1.2 + (n % 5) / 10;
  return {
    slump: 70 + (n % 6) * 5,
    air: Math.round(air * 10) / 10,
    temp: 17 + (n % 5),
    cylinders: 3,
    at: load.times.pouring + 4,
  };
}

/** Field tests at one plant on the sample day, in arrival order. */
export function testsForPlant(day: DispatchDay, plantId: string): PlannedTest[] {
  const tests: PlannedTest[] = [];
  for (const order of day.orders) {
    if (order.plantId !== plantId || order.status === "cancelled" || order.status === "on_hold") continue;
    for (const load of testedLoads(order)) {
      const status: TestStatus =
        load.stage === "returned"
          ? "done"
          : load.stage === "on_site" || load.stage === "pouring"
            ? "due"
            : load.stage === "pending"
              ? "later"
              : "arriving";
      tests.push({ order, load, status, result: status === "done" ? seededResult(order, load) : null });
    }
  }
  return tests.sort((a, b) => a.load.times.on_site - b.load.times.on_site);
}
