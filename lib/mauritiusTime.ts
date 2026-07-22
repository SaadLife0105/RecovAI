/** Mauritius is UTC+4 year-round (no DST) — one utility, reused everywhere "today" matters (check-in uniqueness, streaks, missed-check-in detection). */
export function getMauritiusDateString(date: Date = new Date()): string {
  const mauritiusMs = date.getTime() + 4 * 60 * 60 * 1000;
  const mauritius = new Date(mauritiusMs);
  const year = mauritius.getUTCFullYear();
  const month = String(mauritius.getUTCMonth() + 1).padStart(2, '0');
  const day = String(mauritius.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Real UTC instant corresponding to midnight Mauritius time on the given date's Mauritius day — the correct lower bound for "today" range queries against UTC-stamped data. */
export function getMauritiusStartOfDayIso(date: Date = new Date()): string {
  const mauritiusMidnightUtcMs = Date.parse(`${getMauritiusDateString(date)}T00:00:00Z`) - 4 * 60 * 60 * 1000;
  return new Date(mauritiusMidnightUtcMs).toISOString();
}

/** Days between two "YYYY-MM-DD" Mauritius date strings (b - a), via UTC-midnight Date objects to avoid DST/local-timezone drift entirely. */
export function daysBetween(dateA: string, dateB: string): number {
  const a = Date.parse(`${dateA}T00:00:00Z`);
  const b = Date.parse(`${dateB}T00:00:00Z`);
  return Math.round((b - a) / 86400000);
}

/** Shifts a "YYYY-MM-DD" Mauritius date string by whole days, via UTC-midnight arithmetic (same reasoning as daysBetween — never local-timezone date math). */
export function addDaysToDateString(dateString: string, days: number): string {
  return new Date(Date.parse(`${dateString}T00:00:00Z`) + days * 86400000).toISOString().slice(0, 10);
}

/** "YYYY-MM-DD" of the Monday starting the Mauritius week the given instant falls in — the same week boundary generate-weekly-reports uses for week_start. */
export function getMauritiusWeekStart(date: Date = new Date()): string {
  const today = getMauritiusDateString(date);
  const daysSinceMonday = (new Date(`${today}T00:00:00Z`).getUTCDay() + 6) % 7;
  return addDaysToDateString(today, -daysSinceMonday);
}

/** Single-letter weekday abbreviation (M T W T F S S) for a "YYYY-MM-DD" date, read off the UTC-midnight Date object so the device's timezone can never shift it a day. */
export function dayAbbreviation(dateString: string): string {
  return ['S', 'M', 'T', 'W', 'T', 'F', 'S'][new Date(`${dateString}T00:00:00Z`).getUTCDay()];
}

/**
 * Converts a real UTC timestamp (e.g. Postgres's `created_at`) into a
 * string whose wall-clock digits are Mauritius local time — safe to feed
 * into formatDate.ts's formatTimestamp/formatTime, which read digits
 * directly out of the string without doing any timezone math themselves
 * (that convention assumes mock-authored strings were already
 * Mauritius-local; real DB timestamps are genuine UTC and need this
 * conversion first, or the displayed time is off by 4 hours).
 */
export function toMauritiusIsoString(utcIso: string): string {
  const mauritiusMs = Date.parse(utcIso) + 4 * 60 * 60 * 1000;
  return new Date(mauritiusMs).toISOString();
}
