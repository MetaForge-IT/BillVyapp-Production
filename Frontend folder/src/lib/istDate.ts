/**
 * Salon operations timezone: India Standard Time (UTC+05:30).
 * Always use this for billing/receipts/inventory “today” — never UTC via toISOString().slice(0, 10).
 */
export const APP_TIMEZONE = "Asia/Kolkata";

/** YYYY-MM-DD in Asia/Kolkata. */
export function istDateKey(date: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** Calendar parts in IST (`month` is 0-indexed like `Date#getMonth`). */
export function istDateParts(date: Date = new Date()): { year: number; month: number; day: number } {
  const [year, month, day] = istDateKey(date).split("-").map(Number);
  return { year, month: month - 1, day };
}

/** Add N calendar days to a YYYY-MM-DD key (timezone-safe). */
export function addDaysToDateKey(dateKey: string, days: number): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d));
  utc.setUTCDate(utc.getUTCDate() + days);
  const year = utc.getUTCFullYear();
  const month = String(utc.getUTCMonth() + 1).padStart(2, "0");
  const day = String(utc.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Format an ISO/instant string or Date as IST calendar YYYY-MM-DD. */
export function toIstDateKey(value: string | Date | null | undefined): string {
  if (!value) return istDateKey();
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return istDateKey();
  return istDateKey(date);
}
