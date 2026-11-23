"use client";

import { ListFilter, X } from "lucide-react";
import { Popover as PopoverPrimitive } from "radix-ui";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { STATUS_META } from "@/components/dispatch/status";
import { POUR_TYPE_OPTIONS, type OrderStatus, type Placement, type PourType } from "@/lib/dispatch";
import { PLACEMENT_OPTIONS, STATUS_OPTIONS, type BoardParams } from "./board-params";

type FilterPatch = Partial<Pick<BoardParams, "status" | "pour" | "place" | "hour">>;

const chip =
  "h-8 rounded-full border border-input bg-card px-3 text-[13px] data-[state=on]:border-slate-900 data-[state=on]:bg-slate-900 data-[state=on]:text-white max-md:h-11";

function FilterGroup<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T[];
  onChange: (next: T[]) => void;
}) {
  return (
    <fieldset className="grid gap-1.5">
      <legend className="mb-1.5 text-xs font-semibold text-muted-foreground">{label}</legend>
      <ToggleGroup
        type="multiple"
        value={value}
        onValueChange={(next) => onChange(next as T[])}
        aria-label={label}
        spacing={1}
        className="flex w-full flex-wrap justify-start"
      >
        {options.map((o) => (
          <ToggleGroupItem key={o.value} value={o.value} className={chip}>
            {o.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </fieldset>
  );
}

/** Rarely used filters live behind one button (rule FL5); active ones show as chips beside the count. */
export function MoreFilters({
  params,
  onChange,
  disabled,
}: {
  params: Pick<BoardParams, "status" | "pour" | "place">;
  onChange: (patch: FilterPatch) => void;
  disabled?: boolean;
}) {
  const active = params.status.length + params.pour.length + params.place.length;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="h-9 bg-card max-md:h-11" disabled={disabled} data-testid="more-filters">
          <ListFilter aria-hidden />
          Filters
          {active > 0 && (
            <span className="rounded-full bg-slate-900 px-1.5 text-xs font-semibold text-white tabular">
              {active}
              <span className="sr-only"> active</span>
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(24rem,calc(100vw-2rem))] p-0">
        <div className="grid max-h-[60dvh] gap-4 overflow-y-auto p-3">
          <FilterGroup<OrderStatus>
            label="Status"
            options={STATUS_OPTIONS.map((s) => ({ value: s, label: STATUS_META[s].label }))}
            value={params.status}
            onChange={(status) => onChange({ status })}
          />
          <FilterGroup<PourType>
            label="Pour type"
            options={POUR_TYPE_OPTIONS.map((p) => ({ value: p, label: p }))}
            value={params.pour}
            onChange={(pour) => onChange({ pour })}
          />
          <FilterGroup<Placement>
            label="Placement"
            options={PLACEMENT_OPTIONS.map((p) => ({ value: p, label: p }))}
            value={params.place}
            onChange={(place) => onChange({ place })}
          />
        </div>
        <div className="flex items-center justify-between gap-2 border-t p-2">
          <Button
            variant="ghost"
            className="max-md:h-11"
            disabled={active === 0}
            onClick={() => onChange({ status: [], pour: [], place: [] })}
          >
            Clear filters
          </Button>
          <PopoverPrimitive.Close asChild>
            <Button className="max-md:h-11">Done</Button>
          </PopoverPrimitive.Close>
        </div>
      </PopoverContent>
    </Popover>
  );
}

const hh = (hour: number) => String(hour).padStart(2, "0");

/** One removable chip per active filter, so nothing narrows the list without saying so. */
export function ActiveFilters({
  params,
  onChange,
}: {
  params: Pick<BoardParams, "status" | "pour" | "place" | "hour">;
  onChange: (patch: FilterPatch) => void;
}) {
  const chips: { key: string; label: string; remove: () => void }[] = [];
  if (params.hour !== null) {
    chips.push({
      key: "hour",
      label: `Due ${hh(params.hour)}:00–${hh(params.hour + 1)}:00`,
      remove: () => onChange({ hour: null }),
    });
  }
  for (const s of params.status) {
    chips.push({ key: `s-${s}`, label: STATUS_META[s].label, remove: () => onChange({ status: params.status.filter((x) => x !== s) }) });
  }
  for (const p of params.pour) {
    chips.push({ key: `p-${p}`, label: p, remove: () => onChange({ pour: params.pour.filter((x) => x !== p) }) });
  }
  for (const p of params.place) {
    chips.push({ key: `l-${p}`, label: p, remove: () => onChange({ place: params.place.filter((x) => x !== p) }) });
  }
  if (chips.length === 0) return null;
  return (
    <ul className="flex flex-wrap items-center gap-1.5" aria-label="Active filters">
      {chips.map((c) => (
        <li key={c.key}>
          <button
            type="button"
            onClick={c.remove}
            className="inline-flex h-7 items-center gap-1 rounded-full border border-slate-300 bg-slate-100 pr-1.5 pl-2.5 text-xs font-medium text-slate-800 hover:bg-slate-200 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none max-md:h-11"
          >
            {c.label}
            <X className="size-3.5" aria-hidden />
            <span className="sr-only">: remove filter</span>
          </button>
        </li>
      ))}
    </ul>
  );
}
