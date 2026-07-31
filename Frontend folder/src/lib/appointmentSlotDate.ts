/** Returning customers may book past appointments within this many calendar days (inclusive of today). */
export const APPOINTMENT_PAST_DAYS_LIMIT = 7;

export type AppointmentSlotCustomerKind = "new" | "returning";

/** Local calendar date as YYYY-MM-DD. */
export function toLocalDateKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function addLocalDays(date: Date, days: number): Date {
  const next = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  next.setDate(next.getDate() + days);
  return next;
}

/**
 * Earliest selectable slot date.
 * - new: today only (no previous dates)
 * - returning: today minus 7 days
 * Future dates are always unrestricted.
 */
export function getAppointmentSlotMinDate(
  kind: AppointmentSlotCustomerKind = "returning",
  now: Date = new Date(),
): string {
  if (kind === "new") return toLocalDateKey(now);
  return toLocalDateKey(addLocalDays(now, -APPOINTMENT_PAST_DAYS_LIMIT));
}

export function isAppointmentSlotDateAllowed(
  dateKey: string,
  kind: AppointmentSlotCustomerKind = "returning",
  now: Date = new Date(),
): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return false;
  return dateKey >= getAppointmentSlotMinDate(kind, now);
}
