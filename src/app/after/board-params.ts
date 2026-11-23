import { POUR_TYPE_OPTIONS, type OrderStatus, type Placement, type PlantFilter, type PourType, type SavedView } from "@/lib/dispatch";

/** Demo-only switch for showing the board's standard states. "normal" is the sample data. */
export type PreviewState = "normal" | "loading" | "empty" | "error" | "partial";

export interface BoardParams {
  plant: PlantFilter;
  view: SavedView;
  q: string;
  /** Orders with a load due on site in this hour (from the chart). */
  hour: number | null;
  status: OrderStatus[];
  pour: PourType[];
  place: Placement[];
  state: PreviewState;
  notes: boolean;
  /** Order number whose side sheet is open, e.g. "PRM-24115". */
  order: string | null;
}

export const DEFAULT_PARAMS: BoardParams = {
  plant: "all",
  view: "today",
  q: "",
  hour: null,
  status: [],
  pour: [],
  place: [],
  state: "normal",
  notes: false,
  order: null,
};

const PLANTS: PlantFilter[] = ["all", "rgn", "sas", "mjw"];
const VIEWS: SavedView[] = ["today", "at_risk", "unassigned", "on_hold"];
const STATES: PreviewState[] = ["loading", "empty", "error", "partial"];
export const STATUS_OPTIONS: OrderStatus[] = [
  "scheduled",
  "batching",
  "en_route",
  "on_site",
  "pouring",
  "complete",
  "on_hold",
  "cancelled",
];
export const PLACEMENT_OPTIONS: Placement[] = ["Pump", "Chute", "Buggy"];
export const QUERY_MAX = 80;

const slug = (text: string) => text.toLowerCase().replace(/[\s_]+/g, "-");

/** Cut by characters, not UTF-16 units, so an emoji is never split in half. */
export function clampQuery(q: string): string {
  return Array.from(q).slice(0, QUERY_MAX).join("");
}

function list<T extends string>(raw: string, options: readonly T[]): T[] {
  const wanted = new Set(raw.split(",").map((s) => s.trim()).filter(Boolean));
  return options.filter((o) => wanted.has(slug(o)));
}

type Raw = Record<string, string | string[] | undefined>;
type Source = Raw | { get(key: string): string | null };

function reader(source: Source): (key: string) => string {
  if (typeof (source as { get?: unknown }).get === "function") {
    const params = source as { get(key: string): string | null };
    return (key) => params.get(key) ?? "";
  }
  const raw = source as Raw;
  return (key) => {
    const v = raw[key];
    return (Array.isArray(v) ? v[0] : v) ?? "";
  };
}

export function parseBoardParams(source: Source): BoardParams {
  const get = reader(source);
  const plant = get("plant") as PlantFilter;
  const view = get("view").replace(/-/g, "_") as SavedView;
  const state = get("state") as PreviewState;
  const hourText = get("hour");
  const hour = /^\d{1,2}$/.test(hourText) && Number(hourText) <= 23 ? Number(hourText) : null;
  const order = get("order").trim().toUpperCase();
  return {
    plant: PLANTS.includes(plant) ? plant : "all",
    view: VIEWS.includes(view) ? view : "today",
    q: clampQuery(get("q")),
    hour,
    status: list(get("status"), STATUS_OPTIONS),
    pour: list(get("pour"), POUR_TYPE_OPTIONS),
    place: list(get("place"), PLACEMENT_OPTIONS),
    state: STATES.includes(state) ? state : "normal",
    notes: get("notes") === "1",
    order: /^PRM-\d{4,6}$/.test(order) ? order : null,
  };
}

/** Filter state lives in the URL so a view can be shared, bookmarked or refreshed. */
export function boardSearch(p: BoardParams): string {
  const s = new URLSearchParams();
  if (p.plant !== "all") s.set("plant", p.plant);
  if (p.view !== "today") s.set("view", slug(p.view));
  if (p.q) s.set("q", clampQuery(p.q));
  if (p.hour !== null) s.set("hour", String(p.hour));
  if (p.status.length) s.set("status", p.status.map(slug).join(","));
  if (p.pour.length) s.set("pour", p.pour.map(slug).join(","));
  if (p.place.length) s.set("place", p.place.map(slug).join(","));
  if (p.state !== "normal") s.set("state", p.state);
  if (p.notes) s.set("notes", "1");
  if (p.order) s.set("order", p.order);
  const text = s.toString().replace(/%2C/g, ",");
  return text ? `?${text}` : "";
}

/** True when anything narrows the list beyond the plant. */
export function hasFilters(p: Pick<BoardParams, "view" | "q" | "hour" | "status" | "pour" | "place">): boolean {
  return p.view !== "today" || p.q.trim() !== "" || p.hour !== null || p.status.length + p.pour.length + p.place.length > 0;
}
