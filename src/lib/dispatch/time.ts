export const TIME_ZONE = "America/Regina";

/** Today's date in America/Regina as YYYY-MM-DD. */
export function todayInRegina(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: TIME_ZONE,
  }).format(now);
}

/** "Mon, Nov 23" for a YYYY-MM-DD date. */
export function formatDayLabel(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  // Noon UTC keeps the calendar day stable in any time zone.
  const date = new Date(Date.UTC(y, m - 1, d, 12));
  return new Intl.DateTimeFormat("en-CA", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(date);
}

/** Minutes after midnight to 24-hour "HH:MM". */
export function formatClock(minutes: number): string {
  const total = ((Math.round(minutes) % 1440) + 1440) % 1440;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** "HH:MM" to minutes after midnight, or null if it is not a valid time. */
export function parseClock(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (h > 23 || m > 59) return null;
  return h * 60 + m;
}

/** "in 25 min", "in 2 h 5 min", "12 min ago". */
export function formatRelative(target: number, clock: number): string {
  const diff = Math.round(target - clock);
  const abs = Math.abs(diff);
  const text = abs < 60 ? `${abs} min` : `${Math.floor(abs / 60)} h${abs % 60 ? ` ${abs % 60} min` : ""}`;
  if (diff === 0) return "now";
  return diff > 0 ? `in ${text}` : `${text} ago`;
}
