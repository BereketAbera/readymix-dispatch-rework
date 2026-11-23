/** "Tue, Jun 9" for a YYYY-MM-DD date. */
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

/**
 * Reads a time the way people type it and returns minutes after midnight, or
 * null. A phone's number pad has no colon, so "1330" and "930" must work as
 * well as "13:30", "13.30", "13 30", "13h30", "9", "1:30 pm" and "1pm".
 */
export function parseClock(value: string): number | null {
  const text = value.trim().toLowerCase().replace(/\s+/g, " ");
  const match = /^(\d{1,2})(?:[:.h ]?(\d{2}))? ?([ap])?\.?m?\.?$/.exec(text);
  if (!match) return null;
  let h = Number(match[1]);
  const m = match[2] === undefined ? 0 : Number(match[2]);
  const meridiem = match[3];
  if (m > 59) return null;
  if (meridiem) {
    if (h < 1 || h > 12) return null;
    if (meridiem === "a" && h === 12) h = 0;
    if (meridiem === "p" && h < 12) h += 12;
  }
  if (h > 23) return null;
  return h * 60 + m;
}

/** "1330" becomes "13:30"; text that is not a time is returned unchanged. */
export function normalizeClock(value: string): string {
  const minutes = parseClock(value);
  return minutes === null ? value : formatClock(minutes);
}

/** "in 25 min", "in 2 h 5 min", "12 min ago". */
export function formatRelative(target: number, clock: number): string {
  const diff = Math.round(target - clock);
  const abs = Math.abs(diff);
  const text = abs < 60 ? `${abs} min` : `${Math.floor(abs / 60)} h${abs % 60 ? ` ${abs % 60} min` : ""}`;
  if (diff === 0) return "now";
  return diff > 0 ? `in ${text}` : `${text} ago`;
}
