import type {
  DispatchDay,
  Order,
  OrderStatus,
  PlantFilter,
  Risk,
  SavedView,
  Truck,
} from "./types";

/** A late order is this many minutes or more behind plan. */
export const LATE_AFTER_MIN = 15;
/** An order running this far behind (but not yet late) is at risk. */
export const SLIPPING_AFTER_MIN = 5;
/** An order with no truck that starts within this window is at risk. */
export const NO_TRUCK_WINDOW_MIN = 60;

const CLOSED: OrderStatus[] = ["complete", "cancelled", "on_hold"];

export function isClosed(order: Order): boolean {
  return CLOSED.includes(order.status);
}

export function getRisk(order: Order, clock: number): Risk | null {
  if (isClosed(order)) return null;
  if (order.delayMin >= LATE_AFTER_MIN) {
    return {
      level: "late",
      minutes: order.delayMin,
      reason:
        order.status === "scheduled"
          ? `First truck projected ${order.delayMin} min late`
          : `Next load is ${order.delayMin} min behind plan`,
    };
  }
  const startsIn = order.scheduledStart - clock;
  if (order.truckIds.length === 0 && startsIn <= NO_TRUCK_WINDOW_MIN) {
    return {
      level: "at_risk",
      minutes: Math.max(0, startsIn),
      reason:
        startsIn > 0
          ? `Starts in ${startsIn} min with no truck assigned`
          : "Start time has passed with no truck assigned",
    };
  }
  if (order.delayMin >= SLIPPING_AFTER_MIN) {
    return {
      level: "at_risk",
      minutes: order.delayMin,
      reason:
        order.status === "scheduled"
          ? `First truck projected ${order.delayMin} min late`
          : `Spacing is slipping: next load ${order.delayMin} min behind plan`,
    };
  }
  return null;
}

export function isUnassigned(order: Order): boolean {
  return !isClosed(order) && order.truckIds.length === 0;
}

export function matchesView(order: Order, view: SavedView, clock: number): boolean {
  switch (view) {
    case "today":
      return true;
    case "at_risk":
      return getRisk(order, clock) !== null;
    case "unassigned":
      return isUnassigned(order);
    case "on_hold":
      return order.status === "on_hold";
  }
}

export function matchesQuery(order: Order, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = [
    order.number,
    order.customer,
    order.siteAddress,
    order.mix.label,
    order.mix.code,
    order.pourType,
    ...order.truckIds,
  ]
    .join(" ")
    .toLowerCase();
  return q.split(/\s+/).every((term) => haystack.includes(term));
}

export interface OrderFilter {
  plant: PlantFilter;
  view: SavedView;
  query: string;
}

export function filterOrders(orders: Order[], filter: OrderFilter, clock: number): Order[] {
  return orders.filter(
    (o) =>
      (filter.plant === "all" || o.plantId === filter.plant) &&
      matchesView(o, filter.view, clock) &&
      matchesQuery(o, filter.query),
  );
}

export function viewCounts(
  orders: Order[],
  plant: PlantFilter,
  clock: number,
): Record<SavedView, number> {
  const inPlant = orders.filter((o) => plant === "all" || o.plantId === plant);
  return {
    today: inPlant.length,
    at_risk: inPlant.filter((o) => matchesView(o, "at_risk", clock)).length,
    unassigned: inPlant.filter((o) => matchesView(o, "unassigned", clock)).length,
    on_hold: inPlant.filter((o) => matchesView(o, "on_hold", clock)).length,
  };
}

export interface Kpis {
  scheduledM3: number;
  deliveredM3: number;
  loadsEnRoute: number;
  loadsOnSite: number;
  trucksAvailable: number;
  trucksInService: number;
  trucksOutOfService: number;
  late: number;
  atRisk: number;
}

export function computeKpis(day: DispatchDay, plant: PlantFilter, orders: Order[] = day.orders): Kpis {
  const inPlant = orders.filter((o) => plant === "all" || o.plantId === plant);
  const live = inPlant.filter((o) => o.status !== "cancelled");
  let deliveredM3 = 0;
  let loadsEnRoute = 0;
  let loadsOnSite = 0;
  for (const o of live) {
    for (const l of o.loads) {
      if (l.stage === "returned") deliveredM3 += l.volumeM3;
      if (l.stage === "en_route") loadsEnRoute += 1;
      if (l.stage === "on_site" || l.stage === "pouring") loadsOnSite += 1;
    }
  }
  const trucks = day.trucks.filter((t: Truck) => plant === "all" || t.plantId === plant);
  const risks = inPlant.map((o) => getRisk(o, day.clock)).filter((r): r is Risk => r !== null);
  return {
    scheduledM3: round1(live.reduce((sum, o) => sum + o.volumeM3, 0)),
    deliveredM3: round1(deliveredM3),
    loadsEnRoute,
    loadsOnSite,
    trucksAvailable: trucks.filter((t) => t.status === "available").length,
    trucksInService: trucks.filter((t) => t.status !== "out_of_service").length,
    trucksOutOfService: trucks.filter((t) => t.status === "out_of_service").length,
    late: risks.filter((r) => r.level === "late").length,
    atRisk: risks.filter((r) => r.level === "at_risk").length,
  };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/**
 * Add a truck to an order's rotation. Loads that have no truck yet are
 * shared round-robin across the order's trucks.
 */
export function assignTruck(order: Order, truckId: string): Order {
  if (order.truckIds.includes(truckId)) return order;
  const truckIds = [...order.truckIds, truckId];
  let turn = 0;
  const loads = order.loads.map((l) => {
    if (l.truckId || l.stage !== "pending") return l;
    const next = truckIds[turn % truckIds.length];
    turn += 1;
    return { ...l, truckId: next };
  });
  return { ...order, truckIds, loads };
}
