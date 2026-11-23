import { deriveOrderStatus } from "./derive";
import { createRng, type Rng } from "./random";
import type {
  DispatchDay,
  Load,
  LoadStage,
  Mix,
  Order,
  OrderStatus,
  Placement,
  Plant,
  PlantId,
  PourType,
  Truck,
} from "./types";

export const COMPANY = "Prairie Ready-Mix (fictional)";
export const DEFAULT_SEED = 2588;
/**
 * One fixed, labelled sample day in the building season (a Tuesday in June),
 * so the board never shows a snapshot from the future, a full schedule on a
 * Sunday or sidewalks in a prairie November.
 */
export const SAMPLE_DATE = "2026-06-09";
/** The board is shown as of 09:42, mid-morning on a busy day. */
export const BOARD_CLOCK = 9 * 60 + 42;
export const LOAD_SIZE_M3 = 8;

export const LOAD_STAGES: LoadStage[] = [
  "batched",
  "loaded",
  "en_route",
  "on_site",
  "pouring",
  "returned",
];

export const PLANTS: Plant[] = [
  { id: "rgn", name: "Regina North", code: "RGN", city: "Regina" },
  { id: "sas", name: "Saskatoon East", code: "SAS", city: "Saskatoon" },
  { id: "mjw", name: "Moose Jaw", code: "MJW", city: "Moose Jaw" },
];

const FLEET: Record<PlantId, string[]> = {
  rgn: ["T-101", "T-102", "T-103", "T-104", "T-105", "T-106", "T-107", "T-108"],
  sas: ["T-201", "T-202", "T-203", "T-204", "T-205", "T-206"],
  mjw: ["T-301", "T-302", "T-303", "T-304"],
};

const OUT_OF_SERVICE: Record<string, string> = {
  "T-106": "In shop: hydraulic leak on the drum motor",
};

const DRIVERS = [
  "Dana K.", "Marcel T.", "Priya S.", "Owen B.", "Lena H.", "Arjun P.",
  "Tess M.", "Wade R.", "Noor A.", "Curtis L.", "Mika J.", "Gord F.",
  "Hana W.", "Reid C.", "Sol D.", "Brynn E.", "Ike N.", "Joelle V.",
];

/** Each plant serves its own builders, so nobody pours in three cities at once. */
const CUSTOMERS: Record<PlantId, string[]> = {
  rgn: [
    "Kestrelview Homes", "Granary Point Builders", "Bluestem Lane Homes",
    "Saltbush Civil Works", "Tallgrass Ridge Developments", "Larkspur Row Construction",
    "Coldwater Flats Builders", "Silverberry Homes",
  ],
  sas: [
    "Prairie Smoke Contracting", "Ironwheel Civil", "Harrow and Disc Builders",
    "Ninemile Developments", "Combine Lane Homes", "Foxtail Commercial",
    "Elevator Row Lofts", "Sandhill Crane Builders",
  ],
  mjw: [
    "Chokecherry Homes", "Dry Creek Industrial", "Meadowmint Construction",
    "Lantern Coulee Builders", "Snowberry Custom Homes", "Badger Flats Contracting",
  ],
};

const STREETS = [
  "Furrow St", "Harrow Ave", "Quonset Way", "Swather Cres", "Auger Bay",
  "Grainline Rd", "Seeder Ave", "Thistle Way", "Fescue Cres", "Kestrel Bay",
  "Combine Ave", "Granary Ln", "Bison Run Dr", "Sage Meadow Rd", "Elevator Rd",
];

interface PourProfile {
  volume: [number, number];
  mixes: Mix[];
  placements: Placement[];
}

function mix(strengthMpa: number, aggregateMm: number, airPct: number): Mix {
  return {
    code: `C${strengthMpa}-${aggregateMm}${airPct ? `-A${airPct}` : "-NA"}`,
    strengthMpa,
    aggregateMm,
    airPct,
    label: `${strengthMpa} MPa · ${aggregateMm} mm · ${airPct ? `${airPct}% air` : "non-air"}`,
  };
}

const POUR_PROFILES: Record<PourType, PourProfile> = {
  Footing: { volume: [6, 16], mixes: [mix(25, 20, 0)], placements: ["Chute"] },
  Wall: { volume: [12, 28], mixes: [mix(25, 20, 0), mix(30, 20, 0)], placements: ["Pump", "Chute"] },
  "Basement floor": { volume: [10, 22], mixes: [mix(25, 20, 0)], placements: ["Pump", "Chute"] },
  "Slab on grade": { volume: [20, 44], mixes: [mix(32, 20, 6), mix(30, 20, 0)], placements: ["Pump", "Chute"] },
  "Suspended slab": { volume: [32, 56], mixes: [mix(35, 14, 0)], placements: ["Pump"] },
  "Grade beam": { volume: [8, 20], mixes: [mix(30, 20, 0)], placements: ["Pump", "Chute"] },
  Pile: { volume: [4, 12], mixes: [mix(25, 20, 0)], placements: ["Chute"] },
  Sidewalk: { volume: [3, 8], mixes: [mix(32, 20, 6)], placements: ["Chute", "Buggy"] },
  Driveway: { volume: [5, 12], mixes: [mix(32, 20, 6)], placements: ["Chute"] },
  "Curb and gutter": { volume: [6, 16], mixes: [mix(32, 20, 6), mix(35, 20, 7)], placements: ["Chute"] },
};

/** Residential work dominates; big structural pours are rare. */
const POUR_WEIGHTS: [PourType, number][] = [
  ["Footing", 4],
  ["Wall", 3],
  ["Basement floor", 3],
  ["Slab on grade", 2],
  ["Suspended slab", 1],
  ["Grade beam", 2],
  ["Pile", 2],
  ["Sidewalk", 3],
  ["Driveway", 3],
  ["Curb and gutter", 2],
];
const POUR_BAG: PourType[] = POUR_WEIGHTS.flatMap(([type, weight]) => Array<PourType>(weight).fill(type));

const ROUTINE_NOTES = [
  "Hot afternoon forecast: retarder in the mix, keep the drum turning.",
  "Call the site super 30 min before the first truck.",
  "Washout in the bin by the north gate only.",
  "Pump on site 15 min before start.",
  "Gravel access road; keep trucks off the boulevard.",
  "Inspector booked for the first load.",
  "Accelerator 1.5% per the customer’s request.",
  "",
  "",
  "",
];

/** First-truck times per plant for the day (16 + 14 + 10 = 40 orders). */
const START_TEMPLATE: Record<PlantId, string[]> = {
  rgn: ["06:15", "06:30", "07:00", "07:30", "07:45", "08:15", "08:45", "09:00", "09:30", "10:15", "10:45", "11:30", "12:15", "13:00", "13:45", "14:30"],
  sas: ["06:00", "06:45", "07:30", "08:00", "08:30", "09:00", "09:30", "10:30", "11:15", "12:00", "12:45", "13:30", "14:15", "15:00"],
  mjw: ["06:30", "07:30", "08:30", "09:15", "10:00", "11:00", "12:00", "13:00", "13:45", "14:30"],
};

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}
const TRAVEL_RANGE: Record<PlantId, [number, number]> = {
  rgn: [10, 24],
  sas: [10, 26],
  mjw: [8, 30],
};

const BATCH_MIN = 10;
const DEPART_AFTER_BATCH_MIN = 14;
const WASHOUT_MIN = 10;

interface Draft {
  id: string;
  number: string;
  plantId: PlantId;
  customer: string;
  siteAddress: string;
  mix: Mix;
  pourType: PourType;
  placement: Placement;
  volumeM3: number;
  scheduledStart: number;
  spacingMin: number;
  travelMin: number;
  notes: string;
  forcedStatus: "on_hold" | "cancelled" | null;
  unassigned: boolean;
  incident: { loadIndex: number; minutes: number } | null;
}

function shuffle<T>(rng: Rng, items: readonly T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng.next() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function dischargeMinutes(placement: Placement, volume: number): number {
  const perM3 = placement === "Pump" ? 2 : placement === "Chute" ? 2.5 : 4;
  return Math.round(volume * perM3);
}

/** Minutes between trucks for a newly booked pour. */
export function spacingForPlacement(placement: Placement): number {
  return placement === "Pump" ? 20 : placement === "Buggy" ? 35 : 25;
}

function spacingFor(rng: Rng, placement: Placement): number {
  if (placement === "Pump") return rng.pick([15, 20]);
  if (placement === "Buggy") return 35;
  return rng.pick([20, 25, 30]);
}

function draftOrders(rng: Rng): Draft[] {
  const drafts: Omit<Draft, "id" | "number">[] = [];
  for (const plant of PLANTS) {
    // Deal customers like cards so repeats stay realistic (two lots, not four cities).
    const pool = shuffle(rng, CUSTOMERS[plant.id]);
    let dealt = 0;
    for (const startText of START_TEMPLATE[plant.id]) {
      const start = toMinutes(startText);
      const pourType = rng.pick(POUR_BAG);
      const profile = POUR_PROFILES[pourType];
      const placement = rng.pick(profile.placements);
      const [minV, maxV] = profile.volume;
      const [minT, maxT] = TRAVEL_RANGE[plant.id];
      const street = rng.pick(STREETS);
      const civic = rng.int(1, 48) * 20 + rng.int(0, 9) * 2;
      drafts.push({
        plantId: plant.id,
        customer: pool[dealt++ % pool.length],
        siteAddress: `${civic} ${street}, ${plant.city}`,
        mix: rng.pick(profile.mixes),
        pourType,
        placement,
        volumeM3: rng.step(minV, maxV, 0.5),
        scheduledStart: start,
        spacingMin: spacingFor(rng, placement),
        travelMin: rng.int(minT, maxT),
        notes: rng.pick(ROUTINE_NOTES),
        forcedStatus: null,
        unassigned: false,
        incident: null,
      });
    }
  }
  drafts.sort((a, b) => a.scheduledStart - b.scheduledStart || a.plantId.localeCompare(b.plantId));
  return drafts.map((d, i) => ({
    ...d,
    id: `ord-${24101 + i}`,
    number: `PRM-${24101 + i}`,
  }));
}

/**
 * Scripted situations so every saved view has something in it, the way a
 * real morning would: holds, a cancellation, two incidents and orders that
 * still need trucks.
 */
function applyScenarios(drafts: Draft[], clock: number) {
  const find = (plantId: PlantId, hhmm: string) =>
    drafts.find((d) => d.plantId === plantId && d.scheduledStart === toMinutes(hhmm));

  const set = (d: Draft | undefined, patch: Partial<Draft>) => {
    if (d) Object.assign(d, patch);
  };

  set(find("rgn", "10:15"), {
    unassigned: true,
    notes: "T-106 was planned for this pour and is in the shop.",
  });
  set(find("sas", "10:30"), {
    unassigned: true,
    notes: "Added by phone at 09:05. Needs a truck from the next return.",
  });
  set(find("mjw", "13:00"), {
    unassigned: true,
    notes: "Customer confirmed the volume at 09:10. Trucks not assigned yet.",
  });
  set(find("rgn", "11:30"), {
    forcedStatus: "on_hold",
    notes: "Hold: rebar inspection failed. Re-inspection booked for 11:00.",
  });
  set(find("sas", "13:30"), {
    forcedStatus: "on_hold",
    notes: "Hold: customer confirming pump access on the east side.",
  });
  set(find("rgn", "13:00"), {
    forcedStatus: "cancelled",
    notes: "Cancelled by the customer at 07:10: subgrade too wet after overnight rain.",
  });

  // Two pours already underway run into trouble on the load that is out now.
  const late = find("rgn", "08:45");
  set(late, {
    pourType: "Slab on grade",
    mix: POUR_PROFILES["Slab on grade"].mixes[0],
    placement: "Chute",
    volumeM3: 36,
    spacingMin: 25,
  });
  const slipping = find("sas", "08:30");
  set(slipping, {
    pourType: "Wall",
    mix: POUR_PROFILES.Wall.mixes[1],
    placement: "Pump",
    volumeM3: 26.5,
    spacingMin: 20,
    notes: "Pump moved twice; spacing is slipping.",
  });
  for (const [d, minutes] of [[late, 21], [slipping, 8]] as const) {
    if (!d) continue;
    const loads = Math.ceil(d.volumeM3 / LOAD_SIZE_M3);
    const nextIndex = Math.min(loads - 1, Math.ceil((clock - d.scheduledStart) / d.spacingMin));
    d.incident = { loadIndex: nextIndex, minutes };
  }
  // The note names the load the incident actually delays.
  if (late?.incident) {
    late.notes = `Load ${late.incident.loadIndex + 1} held by a train at the Elevator Rd crossing.`;
  }
}

function stageAt(times: Record<LoadStage, number>, clock: number): LoadStage | "pending" {
  let reached: LoadStage | "pending" = "pending";
  for (const stage of LOAD_STAGES) {
    if (times[stage] <= clock) reached = stage;
  }
  return reached;
}

function buildTimes(arrival: number, travel: number, pourStart: number, discharge: number) {
  const batched = arrival - travel - DEPART_AFTER_BATCH_MIN;
  return {
    batched,
    loaded: batched + BATCH_MIN,
    en_route: batched + DEPART_AFTER_BATCH_MIN,
    on_site: arrival,
    pouring: pourStart,
    returned: pourStart + discharge,
  } satisfies Record<LoadStage, number>;
}

const ARRIVING: Load["stage"][] = ["pending", "batched", "loaded", "en_route"];

export interface GenerateOptions {
  date: string;
  seed?: number;
  clock?: number;
}

export function generateDispatchDay({
  date,
  seed = DEFAULT_SEED,
  clock = BOARD_CLOCK,
}: GenerateOptions): DispatchDay {
  const rng = createRng(seed);
  const drafts = draftOrders(rng);
  applyScenarios(drafts, clock);

  // Trucks start the day at their plant at 05:30.
  const freeAt = new Map<string, number>();
  for (const unit of Object.values(FLEET).flat()) {
    if (!OUT_OF_SERVICE[unit]) freeAt.set(unit, 5 * 60 + 30);
  }

  // Plan every load first, then hand out trucks in batching order.
  interface PlannedLoad {
    draft: Draft;
    index: number;
    volume: number;
    plannedArrival: number;
    plannedBatch: number;
  }
  const loadsByOrder = new Map<string, Load[]>();
  const planned: PlannedLoad[] = [];
  for (const d of drafts) {
    loadsByOrder.set(d.id, []);
    const count = Math.ceil(d.volumeM3 / LOAD_SIZE_M3);
    for (let i = 0; i < count; i++) {
      const volume = i === count - 1 ? d.volumeM3 - LOAD_SIZE_M3 * (count - 1) : LOAD_SIZE_M3;
      const plannedArrival = d.scheduledStart + i * d.spacingMin;
      planned.push({
        draft: d,
        index: i,
        volume,
        plannedArrival,
        plannedBatch: plannedArrival - d.travelMin - DEPART_AFTER_BATCH_MIN,
      });
    }
  }
  planned.sort((a, b) => a.plannedBatch - b.plannedBatch || a.draft.id.localeCompare(b.draft.id));

  const lastPourEnd = new Map<string, number>();
  const orderTrucks = new Map<string, string[]>();
  let ticketSeq = 0;

  for (const p of planned) {
    const d = p.draft;
    const ticket = String(418200 + ++ticketSeq);
    const discharge = dischargeMinutes(d.placement, p.volume);
    const setup = p.index === 0 ? 8 : 3;

    if (d.forcedStatus || d.unassigned) {
      const times = buildTimes(p.plannedArrival, d.travelMin, p.plannedArrival + setup, discharge);
      loadsByOrder.get(d.id)!.push({
        id: `${d.id}-L${p.index + 1}`,
        index: p.index + 1,
        ticket,
        volumeM3: p.volume,
        truckId: null,
        plannedArrival: p.plannedArrival,
        times,
        stage: "pending",
        delayMin: 0,
      });
      continue;
    }

    // Prefer a truck already on this job, otherwise the first one back at the plant.
    const plantTrucks = FLEET[d.plantId].filter((u) => freeAt.has(u));
    const onJob = orderTrucks.get(d.id) ?? [];
    const candidates = [...plantTrucks].sort((a, b) => {
      const fa = freeAt.get(a)!;
      const fb = freeAt.get(b)!;
      const readyA = fa <= p.plannedBatch;
      const readyB = fb <= p.plannedBatch;
      if (readyA !== readyB) return readyA ? -1 : 1;
      if (readyA && readyB) {
        const jobA = onJob.includes(a);
        const jobB = onJob.includes(b);
        if (jobA !== jobB) return jobA ? -1 : 1;
      }
      return fa - fb || a.localeCompare(b);
    });
    const truck = candidates[0];
    const incidentDelay = d.incident && d.incident.loadIndex === p.index ? d.incident.minutes : 0;
    const waitForTruck = Math.max(0, freeAt.get(truck)! - p.plannedBatch);
    const shift = waitForTruck + incidentDelay;
    const arrival = p.plannedArrival + shift;
    const pourStart = Math.max(arrival + setup, lastPourEnd.get(d.id) ?? 0);
    const times = buildTimes(arrival, d.travelMin, pourStart, discharge);
    // An incident delays the trip, not the batch: move batching back to plan.
    if (incidentDelay) {
      times.batched -= incidentDelay;
      times.loaded -= incidentDelay;
      times.en_route -= incidentDelay;
    }
    lastPourEnd.set(d.id, times.returned);
    freeAt.set(truck, times.returned + WASHOUT_MIN + d.travelMin);
    if (!onJob.includes(truck)) orderTrucks.set(d.id, [...onJob, truck]);

    loadsByOrder.get(d.id)!.push({
      id: `${d.id}-L${p.index + 1}`,
      index: p.index + 1,
      ticket,
      volumeM3: p.volume,
      truckId: truck,
      plannedArrival: p.plannedArrival,
      times,
      stage: stageAt(times, clock),
      delayMin: Math.max(0, arrival - p.plannedArrival),
    });
  }

  const orders: Order[] = drafts.map((d) => {
    const loads = loadsByOrder.get(d.id)!.sort((a, b) => a.index - b.index);
    const status: OrderStatus = d.forcedStatus ?? deriveOrderStatus(loads);
    const delivered = loads.filter((l) => l.stage === "returned").length;
    // Risk is about the next truck the site is waiting for.
    const next = loads.find((l) => ARRIVING.includes(l.stage));
    return {
      id: d.id,
      number: d.number,
      plantId: d.plantId,
      customer: d.customer,
      siteAddress: d.siteAddress,
      mix: d.mix,
      pourType: d.pourType,
      placement: d.placement,
      volumeM3: d.volumeM3,
      scheduledStart: d.scheduledStart,
      spacingMin: d.spacingMin,
      travelMin: d.travelMin,
      status,
      loads,
      loadsTotal: loads.length,
      loadsDelivered: d.forcedStatus ? 0 : delivered,
      truckIds: orderTrucks.get(d.id) ?? [],
      delayMin: next && !d.forcedStatus ? next.delayMin : 0,
      notes: d.notes,
    };
  });

  const trucks: Truck[] = [];
  let driverIndex = 0;
  for (const plant of PLANTS) {
    for (const unit of FLEET[plant.id]) {
      const driver = DRIVERS[driverIndex++ % DRIVERS.length];
      const outNote = OUT_OF_SERVICE[unit];
      let status: Truck["status"] = outNote ? "out_of_service" : "available";
      let orderId: string | null = null;
      let backAt: number | null = null;
      if (!outNote) {
        for (const o of orders) {
          for (const l of o.loads) {
            if (l.truckId !== unit) continue;
            const back = l.times.returned + WASHOUT_MIN + o.travelMin;
            if (l.times.batched <= clock && clock < back) {
              orderId = o.id;
              backAt = back;
              status =
                l.stage === "batched" || l.stage === "loaded"
                  ? "loading"
                  : l.stage === "en_route"
                    ? "en_route"
                    : l.stage === "returned"
                      ? "returning"
                      : "on_site";
            }
          }
        }
      }
      trucks.push({
        id: unit,
        unit,
        plantId: plant.id,
        driver,
        capacityM3: unit.endsWith("1") || unit.endsWith("5") ? 10 : 8,
        status,
        orderId,
        backAt,
        note: outNote ?? null,
      });
    }
  }

  return { date, clock, company: COMPANY, plants: PLANTS, trucks, orders };
}

/** Distinct mixes offered when scheduling a pour. */
export const MIX_OPTIONS: Mix[] = Array.from(
  new Map(Object.values(POUR_PROFILES).flatMap((p) => p.mixes).map((m) => [m.code, m])).values(),
).sort((a, b) => a.strengthMpa - b.strengthMpa || a.airPct - b.airPct);

export const POUR_TYPE_OPTIONS = Object.keys(POUR_PROFILES) as PourType[];

export interface NewOrderInput {
  plantId: PlantId;
  customer: string;
  siteAddress: string;
  pourType: PourType;
  mixCode: string;
  placement: Placement;
  volumeM3: number;
  scheduledStart: number;
  notes?: string;
}

/** A freshly booked pour: planned loads, no trucks yet. */
export function createOrder(input: NewOrderInput, sequence: number): Order {
  const id = `ord-new-${sequence}`;
  const mixChoice = MIX_OPTIONS.find((m) => m.code === input.mixCode) ?? MIX_OPTIONS[0];
  const spacingMin = spacingForPlacement(input.placement);
  const travelMin = 20;
  const count = Math.ceil(input.volumeM3 / LOAD_SIZE_M3);
  const loads: Load[] = Array.from({ length: count }, (_, i) => {
    const volume = i === count - 1 ? input.volumeM3 - LOAD_SIZE_M3 * (count - 1) : LOAD_SIZE_M3;
    const arrival = input.scheduledStart + i * spacingMin;
    return {
      id: `${id}-L${i + 1}`,
      index: i + 1,
      ticket: String(419000 + sequence * 20 + i),
      volumeM3: volume,
      truckId: null,
      plannedArrival: arrival,
      times: buildTimes(arrival, travelMin, arrival + (i === 0 ? 8 : 3), dischargeMinutes(input.placement, volume)),
      stage: "pending",
      delayMin: 0,
    };
  });
  return {
    id,
    number: `PRM-${24140 + sequence}`,
    plantId: input.plantId,
    customer: input.customer,
    siteAddress: input.siteAddress,
    mix: mixChoice,
    pourType: input.pourType,
    placement: input.placement,
    volumeM3: input.volumeM3,
    scheduledStart: input.scheduledStart,
    spacingMin,
    travelMin,
    status: "scheduled",
    loads,
    loadsTotal: count,
    loadsDelivered: 0,
    truckIds: [],
    delayMin: 0,
    notes: input.notes ?? "",
  };
}
