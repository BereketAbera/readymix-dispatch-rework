import {
  LOAD_SIZE_M3,
  formatClock,
  parseClock,
  spacingForPlacement,
  type Order,
  type Placement,
  type PlantId,
  type PourType,
} from "@/lib/dispatch";

/* One set of rules for every form: the Schedule pour dialog, the field test and the standard's examples. */

/**
 * "24", "24.5" or "24,5" as a number, or null. Number() alone would also take
 * "0x10", "1e2" and "Infinity", which nobody means in a volume or a slump.
 */
export function parseDecimal(raw: string, { allowNegative = false } = {}): number | null {
  const text = raw.trim().replace("−", "-");
  const pattern = allowNegative ? /^-?\d+(?:[.,]\d+)?$/ : /^\d+(?:[.,]\d+)?$/;
  if (!pattern.test(text)) return null;
  return Number(text.replace(",", "."));
}

/* ------------------------------------------------------------------ */
/* Schedule pour                                                       */
/* ------------------------------------------------------------------ */

export interface PourValues {
  customer: string;
  siteAddress: string;
  plantId: PlantId;
  pourType: PourType;
  mixCode: string;
  placement: Placement;
  volume: string;
  start: string;
}

export type PourField = "customer" | "siteAddress" | "volume" | "start";
export const POUR_FIELDS: PourField[] = ["customer", "siteAddress", "volume", "start"];

/** The plant needs this long to batch the first load. */
export const BATCH_LEAD_MIN = 30;
export const LAST_START = 18 * 60;
/** No load arrives on site after the plant closes. */
export const PLANT_CLOSES = 22 * 60;

/** When the last truck of a pour reaches the site, minutes after midnight. */
export function lastArrival(start: number, volumeM3: number, placement: Placement): number {
  const loads = Math.ceil(volumeM3 / LOAD_SIZE_M3);
  return start + (loads - 1) * spacingForPlacement(placement);
}

export function validatePour(name: PourField, v: PourValues, clock: number): string | null {
  switch (name) {
    case "customer":
      return v.customer.trim().length < 2 ? "Enter the customer’s name." : null;
    case "siteAddress":
      return v.siteAddress.trim().length < 5 ? "Enter the site address so the driver can find it." : null;
    case "volume": {
      if (!v.volume.trim()) return "Enter the volume in cubic metres.";
      const n = parseDecimal(v.volume);
      if (n === null) return "Use numbers only, for example 24 or 24.5.";
      if (n < 1 || n > 200) return "Enter a volume between 1 and 200 m³.";
      return null;
    }
    case "start": {
      if (!v.start.trim()) return "Enter a start time, for example 13:30.";
      const t = parseClock(v.start);
      if (t === null) return "Enter the time as 13:30 or 1330.";
      const earliest = clock + BATCH_LEAD_MIN;
      if (t < earliest) return `Pick ${formatClock(earliest)} or later: the plant needs 30 min to batch the first load.`;
      if (t > LAST_START) return "The last start of the day is 18:00.";
      const volume = parseDecimal(v.volume);
      if (volume !== null && volume >= 1 && volume <= 200) {
        const last = lastArrival(t, volume, v.placement);
        if (last > PLANT_CLOSES) {
          const when = last >= 24 * 60 ? `${formatClock(last)} the next day` : formatClock(last);
          return `This pour runs past 22:00 (last truck at ${when}). Start earlier or split it into two pours.`;
        }
      }
      return null;
    }
  }
}

/* ------------------------------------------------------------------ */
/* Field test                                                          */
/* ------------------------------------------------------------------ */

export type TestField = "slump" | "air" | "temp" | "cylinders";
export const TEST_FIELDS: TestField[] = ["slump", "air", "temp", "cylinders"];

export interface Spec {
  slump: [number, number];
  air: [number, number];
  temp: [number, number];
}

/** Acceptance ranges for one order's mix (sample project spec). */
export function specFor(order: Pick<Order, "mix">): Spec {
  const air = order.mix.airPct;
  return {
    slump: [50, 110],
    air: air ? [air - 1, air + 2] : [0, 3],
    temp: [10, 30],
  };
}

const LIMITS: Record<TestField, { min: number; max: number; unit: string; name: string; integer?: boolean; negative?: boolean }> = {
  slump: { min: 0, max: 300, unit: "mm", name: "slump" },
  air: { min: 0, max: 15, unit: "%", name: "air content" },
  temp: { min: -10, max: 50, unit: "°C", name: "concrete temperature", negative: true },
  cylinders: { min: 0, max: 12, unit: "", name: "number of cylinders", integer: true },
};

/** Errors block saving; out-of-spec values only warn, because bad news still has to be recorded. */
export function checkTestValue(
  field: TestField,
  raw: string,
  spec: Spec,
): { error: string | null; warning: string | null } {
  const limit = LIMITS[field];
  if (!raw.trim()) return { error: `Enter the ${limit.name}.`, warning: null };
  const n = parseDecimal(raw, { allowNegative: limit.negative });
  if (n === null) {
    return { error: limit.integer ? "Count whole cylinders, for example 3." : "Use numbers only, for example 80 or 6.5.", warning: null };
  }
  if (limit.integer && !Number.isInteger(n)) return { error: "Count whole cylinders, for example 3.", warning: null };
  if (n < limit.min || n > limit.max) {
    return {
      error: `That looks wrong: ${limit.name} should be between ${limit.min} and ${limit.max}${limit.unit ? ` ${limit.unit}` : ""}.`,
      warning: null,
    };
  }
  if (field !== "cylinders") {
    const [lo, hi] = spec[field];
    if (n < lo || n > hi) {
      return {
        error: null,
        warning: `Outside spec (${lo}–${hi} ${limit.unit}). Save it, then tell dispatch before the next load.`,
      };
    }
  }
  return { error: null, warning: null };
}
