import type { PlantFilter, SavedView } from "@/lib/dispatch";

export type PreviewState = "live" | "loading" | "empty" | "error" | "partial";

export interface BoardParams {
  plant: PlantFilter;
  view: SavedView;
  q: string;
  state: PreviewState;
  notes: boolean;
}

const PLANTS: PlantFilter[] = ["all", "rgn", "sas", "mjw"];
const VIEWS: SavedView[] = ["today", "at_risk", "unassigned", "on_hold"];
const STATES: PreviewState[] = ["live", "loading", "empty", "error", "partial"];

type Raw = Record<string, string | string[] | undefined>;

function one(raw: Raw, key: string): string {
  const v = raw[key];
  return (Array.isArray(v) ? v[0] : v) ?? "";
}

export function parseBoardParams(raw: Raw): BoardParams {
  const plant = one(raw, "plant") as PlantFilter;
  const view = one(raw, "view").replace("-", "_") as SavedView;
  const state = one(raw, "state") as PreviewState;
  return {
    plant: PLANTS.includes(plant) ? plant : "all",
    view: VIEWS.includes(view) ? view : "today",
    q: one(raw, "q").slice(0, 80),
    state: STATES.includes(state) ? state : "live",
    notes: one(raw, "notes") === "1",
  };
}

/** Filter state lives in the URL so a view can be shared, bookmarked or refreshed. */
export function boardSearch(p: BoardParams): string {
  const s = new URLSearchParams();
  if (p.plant !== "all") s.set("plant", p.plant);
  if (p.view !== "today") s.set("view", p.view.replace("_", "-"));
  if (p.q) s.set("q", p.q);
  if (p.state !== "live") s.set("state", p.state);
  if (p.notes) s.set("notes", "1");
  const text = s.toString();
  return text ? `?${text}` : "";
}
