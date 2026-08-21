import { addDaysToDateKey, istDateKey } from "./istDate";

/** Returning customers may book past appointments within this many calendar days (inclusive of today). */
export const APPOINTMENT_PAST_DAYS_LIMIT = 7;

export type AppointmentSlotCustomerKind = "new" | "returning";

/** IST calendar date as YYYY-MM-DD (salon timezone — not browser/host local). */
export function toLocalDateKey(date: Date = new Date()): string {
  return istDateKey(date);
}

export function addLocalDays(date: Date, days: number): Date {
  const key = addDaysToDateKey(istDateKey(date), days);
  return new Date(`${key}T12:00:00+05:30`);
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
  return addDaysToDateKey(toLocalDateKey(now), -APPOINTMENT_PAST_DAYS_LIMIT);
}

export function isAppointmentSlotDateAllowed(
  dateKey: string,
  kind: AppointmentSlotCustomerKind = "returning",
  now: Date = new Date(),
): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return false;
  return dateKey >= getAppointmentSlotMinDate(kind, now);
}
