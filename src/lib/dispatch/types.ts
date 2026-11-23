export type PlantId = "rgn" | "sas" | "mjw";

export interface Plant {
  id: PlantId;
  name: string;
  code: string;
  city: string;
}

export type OrderStatus =
  | "scheduled"
  | "batching"
  | "en_route"
  | "on_site"
  | "pouring"
  | "complete"
  | "on_hold"
  | "cancelled";

export type PourType =
  | "Footing"
  | "Wall"
  | "Basement floor"
  | "Slab on grade"
  | "Suspended slab"
  | "Grade beam"
  | "Pile"
  | "Sidewalk"
  | "Driveway"
  | "Curb and gutter";

export type Placement = "Pump" | "Chute" | "Buggy";

export interface Mix {
  code: string;
  strengthMpa: number;
  aggregateMm: number;
  airPct: number;
  label: string;
}

/** Stages a single truck load moves through, in order. */
export type LoadStage =
  | "batched"
  | "loaded"
  | "en_route"
  | "on_site"
  | "pouring"
  | "returned";

export interface Load {
  id: string;
  index: number;
  ticket: string;
  volumeM3: number;
  truckId: string | null;
  /** Planned arrival on site, minutes after midnight. */
  plannedArrival: number;
  /** Expected (or actual) time of every stage, minutes after midnight. */
  times: Record<LoadStage, number>;
  /** Stage reached at the board clock, or "pending" if batching has not started. */
  stage: LoadStage | "pending";
  /** Minutes this load runs behind its plan. */
  delayMin: number;
}

export interface Order {
  id: string;
  number: string;
  plantId: PlantId;
  customer: string;
  siteAddress: string;
  mix: Mix;
  pourType: PourType;
  placement: Placement;
  volumeM3: number;
  /** Scheduled start (first truck on site), minutes after midnight. */
  scheduledStart: number;
  spacingMin: number;
  travelMin: number;
  status: OrderStatus;
  loads: Load[];
  loadsTotal: number;
  loadsDelivered: number;
  truckIds: string[];
  /** Minutes the next undelivered load runs behind plan (0 when on time). */
  delayMin: number;
  notes: string;
}

export type TruckStatus =
  | "available"
  | "loading"
  | "en_route"
  | "on_site"
  | "returning"
  | "out_of_service";

export interface Truck {
  id: string;
  unit: string;
  plantId: PlantId;
  driver: string;
  capacityM3: number;
  status: TruckStatus;
  orderId: string | null;
  note: string | null;
}

export interface DispatchDay {
  /** ISO date (YYYY-MM-DD) in America/Regina. */
  date: string;
  /** Board clock, minutes after midnight. */
  clock: number;
  company: string;
  plants: Plant[];
  trucks: Truck[];
  orders: Order[];
}

export type SavedView = "today" | "at_risk" | "unassigned" | "on_hold";

export type PlantFilter = PlantId | "all";

export interface Risk {
  level: "late" | "at_risk";
  minutes: number;
  reason: string;
}
