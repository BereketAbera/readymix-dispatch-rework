import { describe, expect, it } from "vitest";
import {
  BOARD_CLOCK,
  LOAD_SIZE_M3,
  LOAD_STAGES,
  assignTruck,
  computeKpis,
  filterOrders,
  formatClock,
  generateDispatchDay,
  getRisk,
  isUnassigned,
  todayInRegina,
  viewCounts,
  type Order,
} from "@/lib/dispatch";

const day = generateDispatchDay({ date: "2026-11-23" });

function order(patch: Partial<Order>): Order {
  return { ...day.orders[0], status: "scheduled", delayMin: 0, truckIds: ["T-101"], ...patch };
}

describe("generateDispatchDay", () => {
  it("is deterministic for the same seed and date", () => {
    const again = generateDispatchDay({ date: "2026-11-23" });
    expect(again).toEqual(day);
    const other = generateDispatchDay({ date: "2026-11-23", seed: 7 });
    expect(other.orders.map((o) => o.volumeM3)).not.toEqual(day.orders.map((o) => o.volumeM3));
  });

  it("builds a full day: 3 plants, 18 trucks, 40 orders on the given date", () => {
    expect(day.date).toBe("2026-11-23");
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

describe("todayInRegina", () => {
  it("uses Regina time (UTC-6, no daylight saving)", () => {
    expect(todayInRegina(new Date("2026-11-24T03:30:00Z"))).toBe("2026-11-23");
    expect(todayInRegina(new Date("2026-11-24T06:30:00Z"))).toBe("2026-11-24");
    expect(todayInRegina(new Date("2026-07-01T05:59:00Z"))).toBe("2026-06-30");
  });
});
