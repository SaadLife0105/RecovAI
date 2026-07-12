const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function parseIso(iso: string) {
  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/);
  if (!match) return null;
  const [, year, month, day, hourStr, minute] = match;
  return { year, month, day, hourStr, minute };
}

/**
 * Formats an ISO timestamp (with its own offset, e.g. "...+04:00") into
 * "May 24, 2025, 10:15 AM" — reads the wall-clock fields straight out of
 * the string instead of `Date`'s local-timezone getters, so the display
 * always matches the stored Mauritius time regardless of the device's
 * own timezone (see CLAUDE.md's Mauritius-time convention).
 */
export function formatTimestamp(iso: string): string {
  const parts = parseIso(iso);
  if (!parts || parts.hourStr === undefined || parts.minute === undefined) return iso;
  return `${formatDateLabel(iso)}, ${formatTime(iso)}`;
}

/** "May 24, 2025" — accepts either a plain date ("2025-05-24") or a full timestamp. */
export function formatDateLabel(iso: string): string {
  const parts = parseIso(iso);
  if (!parts) return iso;
  return `${MONTHS[Number(parts.month) - 1]} ${Number(parts.day)}, ${parts.year}`;
}

/** "10:15 AM" from a full ISO timestamp. */
export function formatTime(iso: string): string {
  const parts = parseIso(iso);
  if (!parts || parts.hourStr === undefined || parts.minute === undefined) return iso;
  let hour = Number(parts.hourStr);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  hour = hour % 12 || 12;
  return `${hour}:${parts.minute} ${ampm}`;
}

/** "May 12 – May 18, 2025" — start date without a year, end date with one. */
export function formatDateRange(startIso: string, endIso: string): string {
  const start = parseIso(startIso);
  if (!start) return `${startIso} – ${formatDateLabel(endIso)}`;
  return `${MONTHS[Number(start.month) - 1]} ${Number(start.day)} – ${formatDateLabel(endIso)}`;
}
