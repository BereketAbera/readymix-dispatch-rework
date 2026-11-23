import { describe, expect, it } from "vitest";
import {
  BOARD_CLOCK,
  LOAD_SIZE_M3,
  LOAD_STAGES,
  SAMPLE_DATE,
  activeLoads,
  assignTruck,
  cancelOrder,
  computeKpis,
  filterOrders,
  formatClock,
  generateDispatchDay,
  getDispatchDay,
  getRisk,
  holdOrder,
  hourlyVolume,
  isUnassigned,
  matchesQuery,
  releaseHold,
  viewCounts,
  type Order,
} from "@/lib/dispatch";

const day = generateDispatchDay({ date: SAMPLE_DATE });

function order(patch: Partial<Order>): Order {
  return { ...day.orders[0], status: "scheduled", delayMin: 0, truckIds: ["T-101"], ...patch };
}

describe("generateDispatchDay", () => {
  it("is deterministic for the same seed and date", () => {
    const again = generateDispatchDay({ date: SAMPLE_DATE });
    expect(again).toEqual(day);
    expect(getDispatchDay()).toEqual(day);
    const other = generateDispatchDay({ date: SAMPLE_DATE, seed: 7 });
    expect(other.orders.map((o) => o.volumeM3)).not.toEqual(day.orders.map((o) => o.volumeM3));
  });

  it("builds a full day: 3 plants, 18 trucks, 40 orders on the sample day, a June weekday", () => {
    expect(day.date).toBe("2026-06-09");
    expect(new Date(`${day.date}T12:00:00Z`).getUTCDay()).toBe(2);
    expect(day.plants).toHaveLength(3);
    expect(day.trucks).toHaveLength(18);
    expect(day.orders).toHaveLength(40);
    expect(new Set(day.orders.map((o) => o.number)).size).toBe(40);
  });

  it("splits every order into loads of at most 8 m³ that add up to the order", () => {
    for (const o of day.orders) {
      expect(o.loadsTotal).toBe(Math.ceil(o.volumeM3 / LOAD_SIZE_M3));
      expect(o.loads.every((l) => l.volumeM3 > 0 && l.volumeM3 <= LOAD_SIZE_M3)).toBe(true);
      const total = o.loads.reduce((sum, l) => sum + l.volumeM3, 0);
      expect(total).toBeCloseTo(o.volumeM3, 5);
      expect(o.loadsDelivered).toBeLessThanOrEqual(o.loadsTotal);
    }
  });

  it("keeps load stages in time order and consistent with the board clock", () => {
    for (const o of day.orders) {
      for (const l of o.loads) {
        const times = LOAD_STAGES.map((s) => l.times[s]);
        expect([...times].sort((a, b) => a - b)).toEqual(times);
        if (l.stage !== "pending" && l.truckId) {
          expect(l.times[l.stage]).toBeLessThanOrEqual(day.clock);
        }
      }
    }
  });

  it("only uses a plant's own trucks and never books a truck on two loads at once", () => {
    const plantOf = new Map(day.trucks.map((t) => [t.id, t.plantId]));
    const windows = new Map<string, Array<[number, number]>>();
    for (const o of day.orders) {
      for (const l of o.loads) {
        if (!l.truckId) continue;
        expect(plantOf.get(l.truckId)).toBe(o.plantId);
        const list = windows.get(l.truckId) ?? [];
        list.push([l.times.batched, l.times.returned + o.travelMin]);
        windows.set(l.truckId, list);
      }
    }
    for (const list of windows.values()) {
      list.sort((a, b) => a[0] - b[0]);
      for (let i = 1; i < list.length; i++) {
        expect(list[i][0]).toBeGreaterThanOrEqual(list[i - 1][1]);
      }
    }
  });

  it("derives statuses that match the loads", () => {
    for (const o of day.orders) {
      if (o.status === "complete") expect(o.loadsDelivered).toBe(o.loadsTotal);
      if (o.status === "scheduled") expect(o.loads.every((l) => l.stage === "pending")).toBe(true);
      if (o.status === "on_hold" || o.status === "cancelled") expect(o.truckIds).toEqual([]);
    }
    const statuses = new Set(day.orders.map((o) => o.status));
    for (const s of ["scheduled", "batching", "en_route", "pouring", "complete", "on_hold", "cancelled"]) {
      expect(statuses.has(s as Order["status"])).toBe(true);
    }
  });
});

describe("risk", () => {
  it("flags late at 15 min behind and at risk from 5 min", () => {
    expect(getRisk(order({ status: "pouring", delayMin: 15 }), BOARD_CLOCK)?.level).toBe("late");
    expect(getRisk(order({ status: "pouring", delayMin: 14 }), BOARD_CLOCK)?.level).toBe("at_risk");
    expect(getRisk(order({ status: "pouring", delayMin: 4 }), BOARD_CLOCK)).toBeNull();
  });

  it("flags an order with no truck that starts within the hour", () => {
    const soon = order({ truckIds: [], scheduledStart: BOARD_CLOCK + 33 });
    expect(getRisk(soon, BOARD_CLOCK)).toMatchObject({ level: "at_risk", minutes: 33 });
    const later = order({ truckIds: [], scheduledStart: BOARD_CLOCK + 90 });
    expect(getRisk(later, BOARD_CLOCK)).toBeNull();
  });

  it("never flags closed orders", () => {
    for (const status of ["complete", "on_hold", "cancelled"] as const) {
      expect(getRisk(order({ status, delayMin: 40, truckIds: [] }), BOARD_CLOCK)).toBeNull();
    }
  });
});

describe("KPIs", () => {
  it("adds up m³, loads and trucks for the whole company", () => {
    const k = computeKpis(day, "all");
    const live = day.orders.filter((o) => o.status !== "cancelled");
    expect(k.scheduledM3).toBeCloseTo(live.reduce((s, o) => s + o.volumeM3, 0), 5);
    const loads = live.flatMap((o) => o.loads);
    expect(k.loadsEnRoute).toBe(loads.filter((l) => l.stage === "en_route").length);
    expect(k.deliveredM3).toBeLessThan(k.scheduledM3);
    expect(k.trucksInService + k.trucksOutOfService).toBe(18);
    expect(k.trucksAvailable).toBe(day.trucks.filter((t) => t.status === "available").length);
  });

  it("matches the sample board as of 09:42", () => {
    expect(formatClock(day.clock)).toBe("09:42");
    const k = computeKpis(day, "all");
    expect(k).toMatchObject({ scheduledM3: 582.5, deliveredM3: 208.5, late: 2, atRisk: 3, trucksAvailable: 4 });
  });

  it("scopes to one plant", () => {
    const all = computeKpis(day, "all");
    const perPlant = (["rgn", "sas", "mjw"] as const).map((p) => computeKpis(day, p));
    expect(perPlant.reduce((s, k) => s + k.scheduledM3, 0)).toBeCloseTo(all.scheduledM3, 5);
    expect(perPlant.reduce((s, k) => s + k.late + k.atRisk, 0)).toBe(all.late + all.atRisk);
  });
});

describe("filters and saved views", () => {
  const clock = day.clock;

  it("returns every order for Today and only holds for On hold", () => {
    expect(filterOrders(day.orders, { plant: "all", view: "today", query: "" }, clock)).toHaveLength(40);
    const holds = filterOrders(day.orders, { plant: "all", view: "on_hold", query: "" }, clock);
    expect(holds.length).toBe(2);
    expect(holds.every((o) => o.status === "on_hold")).toBe(true);
  });

  it("At risk matches the KPI tile and Unassigned has no trucks", () => {
    const risky = filterOrders(day.orders, { plant: "all", view: "at_risk", query: "" }, clock);
    const k = computeKpis(day, "all");
    expect(risky).toHaveLength(k.late + k.atRisk);
    const unassigned = filterOrders(day.orders, { plant: "all", view: "unassigned", query: "" }, clock);
    expect(unassigned.length).toBe(3);
    expect(unassigned.every((o) => o.truckIds.length === 0)).toBe(true);
  });

  it("combines plant, view and a multi-word search", () => {
    const rgn = filterOrders(day.orders, { plant: "rgn", view: "today", query: "" }, clock);
    expect(rgn.every((o) => o.plantId === "rgn")).toBe(true);
    const truck = day.orders.find((o) => o.truckIds.length > 0)!.truckIds[0];
    const byTruck = filterOrders(day.orders, { plant: "all", view: "today", query: truck.toLowerCase() }, clock);
    expect(byTruck.length).toBeGreaterThan(0);
    expect(byTruck.every((o) => o.truckIds.includes(truck))).toBe(true);
    const target = day.orders[5];
    const words = `${target.customer.split(" ")[0]} ${target.number}`;
    expect(filterOrders(day.orders, { plant: "all", view: "today", query: words }, clock)).toEqual([target]);
    expect(filterOrders(day.orders, { plant: "all", view: "today", query: "no such site" }, clock)).toEqual([]);
  });

  it("finds a job by load ticket (with or without #) and by placement", () => {
    const target = day.orders.find((o) => o.loads.length > 1)!;
    const ticket = target.loads[1].ticket;
    expect(filterOrders(day.orders, { plant: "all", view: "today", query: ticket }, clock)).toEqual([target]);
    expect(matchesQuery(target, `#${ticket}`)).toBe(true);
    const pumps = filterOrders(day.orders, { plant: "all", view: "today", query: "pump" }, clock);
    expect(pumps.length).toBeGreaterThan(0);
    expect(pumps.every((o) => o.placement === "Pump")).toBe(true);
  });

  it("narrows by status, pour type and placement, and scopes the chip counts to them", () => {
    const filter = { plant: "all" as const, statuses: ["pouring" as const], placements: ["Pump" as const] };
    const list = filterOrders(day.orders, { ...filter, view: "today", query: "" }, clock);
    expect(list.every((o) => o.status === "pouring" && o.placement === "Pump")).toBe(true);
    expect(viewCounts(day.orders, filter, clock).today).toBe(list.length);
    const walls = filterOrders(day.orders, { plant: "all", view: "today", query: "", pourTypes: ["Wall"] }, clock);
    expect(walls.every((o) => o.pourType === "Wall")).toBe(true);
  });

  it("chip counts agree with the filtered lists", () => {
    for (const plant of ["all", "rgn", "sas", "mjw"] as const) {
      const counts = viewCounts(day.orders, plant, clock);
      for (const view of ["today", "at_risk", "unassigned", "on_hold"] as const) {
        expect(counts[view]).toBe(filterOrders(day.orders, { plant, view, query: "" }, clock).length);
      }
    }
  });
});

describe("assignTruck", () => {
  it("shares pending loads across the order's trucks and clears Unassigned", () => {
    const target = day.orders.find((o) => isUnassigned(o) && o.loadsTotal >= 2)!;
    const one = assignTruck(target, "T-107");
    expect(isUnassigned(one)).toBe(false);
    expect(one.loads.every((l) => l.truckId === "T-107")).toBe(true);
    expect(assignTruck(one, "T-107")).toBe(one);
    expect(getRisk(one, day.clock)).toBeNull();
  });
});

describe("scripted incidents", () => {
  it("names the load the train actually delays", () => {
    const late = day.orders.find((o) => o.notes.includes("held by a train"))!;
    const n = Number(/Load (\d+) held/.exec(late.notes)![1]);
    // The site is waiting for that load: it is the next one to arrive, and its delay is the order's.
    const next = late.loads.find((l) => ["pending", "batched", "loaded", "en_route"].includes(l.stage))!;
    expect(next.index).toBe(n);
    expect(next.delayMin).toBe(late.delayMin);
    expect(next.delayMin).toBeGreaterThanOrEqual(15);
    expect(getRisk(late, day.clock)?.level).toBe("late");
  });
});

describe("hold, release and cancel", () => {
  const pouring = day.orders.find((o) => o.status === "pouring" && o.loads.some((l) => l.stage === "pending"))!;

  it("brings a held pour back to Pouring, not Scheduled", () => {
    const held = holdOrder(pouring);
    expect(held.status).toBe("on_hold");
    expect(getRisk(held, day.clock)).toBeNull();
    const released = releaseHold(held);
    expect(released.status).toBe("pouring");
    expect(released.loads).toEqual(pouring.loads);
    expect(getRisk(released, day.clock)).toEqual(getRisk(pouring, day.clock));
  });

  it("releases a hold on a pour that has not started to Scheduled", () => {
    const held = day.orders.find((o) => o.status === "on_hold")!;
    expect(releaseHold(held).status).toBe("scheduled");
  });

  it("cancels only the loads not yet batched and keeps the rest with their trucks", () => {
    const cancelled = cancelOrder(pouring);
    expect(cancelled.status).toBe("cancelled");
    const out = pouring.loads.filter((l) => l.stage !== "pending");
    expect(activeLoads(cancelled)).toEqual(out);
    expect(cancelled.loadsDelivered).toBe(pouring.loadsDelivered);
    for (const l of out) expect(cancelled.truckIds).toContain(l.truckId);
  });

  it("keeps delivered and out concrete in the KPIs after a cancel", () => {
    const before = computeKpis(day, "all");
    const orders = day.orders.map((o) => (o.id === pouring.id ? cancelOrder(o) : o));
    const after = computeKpis(day, "all", orders);
    const dropped = pouring.loads.filter((l) => l.stage === "pending").reduce((s, l) => s + l.volumeM3, 0);
    expect(after.deliveredM3).toBe(before.deliveredM3);
    expect(after.loadsEnRoute).toBe(before.loadsEnRoute);
    expect(after.loadsOnSite).toBe(before.loadsOnSite);
    expect(after.scheduledM3).toBeCloseTo(before.scheduledM3 - dropped, 5);
  });

  it("leaves complete orders alone", () => {
    const done = day.orders.find((o) => o.status === "complete")!;
    expect(cancelOrder(done)).toBe(done);
    expect(holdOrder(done)).toBe(done);
  });
});

describe("empty day", () => {
  it("shows every truck in service as available when nothing is booked", () => {
    const k = computeKpis(day, "all", []);
    expect(k).toMatchObject({ scheduledM3: 0, deliveredM3: 0, loadsEnRoute: 0, late: 0, atRisk: 0 });
    expect(k.trucksAvailable).toBe(k.trucksInService);
    expect(k.trucksInService).toBe(17);
  });
});

describe("hourly chart data", () => {
  it("adds up to the scheduled and delivered m³ and covers 06:00 to 16:59 at least", () => {
    const hours = hourlyVolume(day.orders, "all");
    const k = computeKpis(day, "all");
    expect(hours[0].hour).toBe(6);
    expect(hours.at(-1)!.hour).toBeGreaterThanOrEqual(16);
    expect(hours.reduce((s, h) => s + h.delivered + h.toCome, 0)).toBeCloseTo(k.scheduledM3, 5);
    expect(hours.reduce((s, h) => s + h.delivered, 0)).toBeCloseTo(k.deliveredM3, 5);
  });

  it("filters the table to the pours due in a clicked hour", () => {
    const tenOClock = filterOrders(day.orders, { plant: "all", view: "today", query: "", hour: 10 }, day.clock);
    expect(tenOClock.length).toBeGreaterThan(0);
    for (const o of tenOClock) expect(o.loads.some((l) => Math.floor(l.times.on_site / 60) === 10)).toBe(true);
  });
});
