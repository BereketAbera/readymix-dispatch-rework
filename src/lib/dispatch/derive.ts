import type {
  DispatchDay,
  Load,
  Order,
  OrderStatus,
  Placement,
  PlantFilter,
  PourType,
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

/** Order status from where its loads are. */
export function deriveOrderStatus(loads: Load[]): OrderStatus {
  if (loads.length === 0 || loads[0].stage === "pending") return "scheduled";
  if (loads.every((l) => l.stage === "returned")) return "complete";
  if (loads.some((l) => l.stage === "pouring" || l.stage === "returned")) return "pouring";
  const first = loads[0].stage;
  if (first === "batched" || first === "loaded") return "batching";
  if (first === "en_route") return "en_route";
  return "on_site";
}

/**
 * Loads that still count. A cancelled order keeps the loads that had already
 * been batched: they are delivered and invoiced. Only loads not yet batched drop.
 */
export function activeLoads(order: Order): Load[] {
  return order.status === "cancelled" ? order.loads.filter((l) => l.stage !== "pending") : order.loads;
}

/** Loads a cancellation took off the schedule. */
export function droppedLoads(order: Order): Load[] {
  return order.status === "cancelled" ? order.loads.filter((l) => l.stage === "pending") : [];
}

/** Hold the rest of a pour. Loads already out keep going. */
export function holdOrder(order: Order): Order {
  if (isClosed(order)) return order;
  return { ...order, status: "on_hold" };
}

/** Release a hold: the status comes back from the loads, so a pour in progress is "Pouring" again. */
export function releaseHold(order: Order): Order {
  if (order.status !== "on_hold") return order;
  return { ...order, status: deriveOrderStatus(order.loads) };
}

/** Cancel the loads not yet batched; loads already out stay with their trucks. */
export function cancelOrder(order: Order): Order {
  if (order.status === "complete" || order.status === "cancelled") return order;
  const loads = order.loads.map((l) => (l.stage === "pending" ? { ...l, truckId: null } : l));
  const truckIds = order.truckIds.filter((t) => loads.some((l) => l.truckId === t));
  return { ...order, status: "cancelled", loads, truckIds };
}

export function getRisk(order: Order, clock: number): Risk | null {
  if (isClosed(order)) return null;
  const projected = order.status === "scheduled";
  const d = order.delayMin;
  if (d >= LATE_AFTER_MIN) {
    return {
      level: "late",
      minutes: d,
      reason: projected
        ? `First truck is projected ${d} min late: no truck is back at the plant in time.`
        : `The next load is ${d} min behind plan.`,
      short: projected ? `Projected ${d} min late` : `Late · ${d} min behind`,
    };
  }
  const startsIn = order.scheduledStart - clock;
  if (order.truckIds.length === 0 && startsIn <= NO_TRUCK_WINDOW_MIN) {
    return {
      level: "at_risk",
      minutes: Math.max(0, startsIn),
      reason:
        startsIn > 0
          ? `Starts in ${startsIn} min and no truck is assigned.`
          : "The start time has passed and no truck is assigned.",
      short: startsIn > 0 ? `No truck · starts in ${startsIn} min` : "No truck · start passed",
    };
  }
  if (d >= SLIPPING_AFTER_MIN) {
    return {
      level: "at_risk",
      minutes: d,
      reason: projected
        ? `First truck is projected ${d} min late.`
        : `Spacing is slipping: the next load is ${d} min behind plan.`,
      short: projected ? `Projected ${d} min late` : `${d} min behind plan`,
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

/** Search matches order number, customer, site, mix, pour type, placement, trucks and load tickets. */
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
    order.placement,
    ...order.truckIds,
    ...order.loads.map((l) => l.ticket),
  ]
    .join(" ")
    .toLowerCase();
  return q
    .split(/\s+/)
    .map((term) => term.replace(/^#/, ""))
    .filter(Boolean)
    .every((term) => haystack.includes(term));
}

/** The hour (0-23) a load is expected on site. */
export function arrivalHour(load: Load): number {
  return Math.floor(load.times.on_site / 60);
}

export function matchesHour(order: Order, hour: number): boolean {
  return activeLoads(order).some((l) => arrivalHour(l) === hour);
}

export interface OrderFilter {
  plant: PlantFilter;
  view: SavedView;
  query: string;
  /** Orders with a load due on site in this hour. */
  hour?: number | null;
  statuses?: OrderStatus[];
  pourTypes?: PourType[];
  placements?: Placement[];
}

/** Everything except the saved view and the search: what the chip counts are scoped to. */
function matchesScope(o: Order, filter: Omit<OrderFilter, "view" | "query">): boolean {
  return (
    (filter.plant === "all" || o.plantId === filter.plant) &&
    (filter.hour == null || matchesHour(o, filter.hour)) &&
    (!filter.statuses?.length || filter.statuses.includes(o.status)) &&
    (!filter.pourTypes?.length || filter.pourTypes.includes(o.pourType)) &&
    (!filter.placements?.length || filter.placements.includes(o.placement))
  );
}

export function filterOrders(orders: Order[], filter: OrderFilter, clock: number): Order[] {
  return orders.filter(
    (o) => matchesScope(o, filter) && matchesView(o, filter.view, clock) && matchesQuery(o, filter.query),
  );
}

/** Live counts for the saved-view chips, scoped by plant and any active filters (not by the search). */
export function viewCounts(
  orders: Order[],
  scope: PlantFilter | Omit<OrderFilter, "view" | "query">,
  clock: number,
): Record<SavedView, number> {
  const filter = typeof scope === "string" ? { plant: scope } : scope;
  const inScope = orders.filter((o) => matchesScope(o, filter));
  return {
    today: inScope.length,
    at_risk: inScope.filter((o) => matchesView(o, "at_risk", clock)).length,
    unassigned: inScope.filter((o) => matchesView(o, "unassigned", clock)).length,
    on_hold: inScope.filter((o) => matchesView(o, "on_hold", clock)).length,
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

/**
 * The four numbers above the board. Concrete counts per load, so a cancelled
 * order still counts what was delivered or is on the road. A truck is busy only
 * while it is on a load of one of the orders shown.
 */
export function computeKpis(day: DispatchDay, plant: PlantFilter, orders: Order[] = day.orders): Kpis {
  const inPlant = orders.filter((o) => plant === "all" || o.plantId === plant);
  let scheduledM3 = 0;
  let deliveredM3 = 0;
  let loadsEnRoute = 0;
  let loadsOnSite = 0;
  for (const o of inPlant) {
    for (const l of activeLoads(o)) {
      scheduledM3 += l.volumeM3;
      if (l.stage === "returned") deliveredM3 += l.volumeM3;
      if (l.stage === "en_route") loadsEnRoute += 1;
      if (l.stage === "on_site" || l.stage === "pouring") loadsOnSite += 1;
    }
  }
  const shown = new Set(orders.map((o) => o.id));
  const trucks = day.trucks.filter((t: Truck) => plant === "all" || t.plantId === plant);
  const inService = trucks.filter((t) => t.status !== "out_of_service");
  const busy = (t: Truck) => t.status !== "available" && t.orderId !== null && shown.has(t.orderId);
  const risks = inPlant.map((o) => getRisk(o, day.clock)).filter((r): r is Risk => r !== null);
  return {
    scheduledM3: round1(scheduledM3),
    deliveredM3: round1(deliveredM3),
    loadsEnRoute,
    loadsOnSite,
    trucksAvailable: inService.filter((t) => !busy(t)).length,
    trucksInService: inService.length,
    trucksOutOfService: trucks.length - inService.length,
    late: risks.filter((r) => r.level === "late").length,
    atRisk: risks.filter((r) => r.level === "at_risk").length,
  };
}

export interface HourBucket {
  /** Hour of day, 0-23. */
  hour: number;
  /** m³ already discharged from loads due on site in this hour. */
  delivered: number;
  /** m³ still to pour from loads due on site in this hour. */
  toCome: number;
}

/** Concrete due on site per hour, split into delivered and still to pour. Covers at least 06:00-16:59. */
export function hourlyVolume(orders: Order[], plant: PlantFilter): HourBucket[] {
  const loads = orders
    .filter((o) => plant === "all" || o.plantId === plant)
    .flatMap((o) => activeLoads(o));
  const hours = loads.map(arrivalHour);
  const first = Math.min(6, ...hours);
  const last = Math.max(16, ...hours);
  const buckets: HourBucket[] = [];
  for (let hour = first; hour <= last; hour++) buckets.push({ hour, delivered: 0, toCome: 0 });
  for (const l of loads) {
    const bucket = buckets[arrivalHour(l) - first];
    if (l.stage === "returned") bucket.delivered += l.volumeM3;
    else bucket.toCome += l.volumeM3;
  }
  return buckets.map((b) => ({ ...b, delivered: round1(b.delivered), toCome: round1(b.toCome) }));
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
