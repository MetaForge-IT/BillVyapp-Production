/**
 * Salon operations timezone: India Standard Time (UTC+05:30, no DST).
 * Production API may run on US EC2 — never use host-local calendar math for billing days.
 */
export const APP_TIMEZONE = "Asia/Kolkata";
export const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

/** YYYY-MM-DD in Asia/Kolkata (or another IANA zone). */
export function formatDateKeyInTimeZone(
  date: Date = new Date(),
  timeZone: string = APP_TIMEZONE,
): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** Today's calendar date in IST as YYYY-MM-DD. */
export function istDateKey(date: Date = new Date()): string {
  return formatDateKeyInTimeZone(date);
}

/**
 * Prisma `@db.Date` value for a calendar day: UTC midnight of that YYYY-MM-DD.
 * Keeps `toISOString().slice(0, 10)` and UTC getters stable.
 */
export function dateKeyToUtcDate(dateKey: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  if (!match) {
    throw new Error(`Invalid date key: ${dateKey}`);
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  return new Date(Date.UTC(year, month - 1, day));
}

/** IST calendar date of `date`, as a UTC-midnight Date for `@db.Date` columns. */
export function istCalendarDate(date: Date = new Date()): Date {
  return dateKeyToUtcDate(istDateKey(date));
}

/** Add N calendar days to a YYYY-MM-DD key. */
export function addDaysToDateKey(dateKey: string, days: number): string {
  const utc = dateKeyToUtcDate(dateKey);
  utc.setUTCDate(utc.getUTCDate() + days);
  return formatDateKeyInTimeZone(utc, "UTC");
}

/**
 * Absolute start of the IST calendar day containing `date`
 * (IST midnight as a UTC instant — for DateTime range filters like paidAt).
 */
export function startOfIstDay(date: Date = new Date()): Date {
  return new Date(dateKeyToUtcDate(istDateKey(date)).getTime() - IST_OFFSET_MS);
}

export function addIstDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 86_400_000);
}

export function istDayRange(date: Date = new Date()): { gte: Date; lt: Date } {
  const gte = startOfIstDay(date);
  return { gte, lt: addIstDays(gte, 1) };
}

/** Range for `@db.Date` columns stored as UTC midnight of YYYY-MM-DD. */
export function istCalendarDayRange(date: Date = new Date()): { gte: Date; lt: Date } {
  const key = istDateKey(date);
  return {
    gte: dateKeyToUtcDate(key),
    lt: dateKeyToUtcDate(addDaysToDateKey(key, 1)),
  };
}

/** HH:mm:ss wall clock in IST (for `@db.Time` stored as UTC time-of-day). */
export function formatTimeKeyInIst(date: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: APP_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "00";
  return `${get("hour")}:${get("minute")}:${get("second")}`;
}

/** Wall-clock IST time as `1970-01-01T HH:mm:ss Z` for Prisma `@db.Time`. */
export function istWallClockAsUtcTime(date: Date = new Date()): Date {
  return new Date(`1970-01-01T${formatTimeKeyInIst(date)}.000Z`);
}

/** Serialize a `@db.Date` (UTC midnight calendar day) to YYYY-MM-DD. */
export function formatDbDateKey(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Prefer an explicit YYYY-MM-DD; otherwise derive IST calendar day from an instant. */
export function resolveDateInput(value?: string | null, fallback: Date = new Date()): Date {
  if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return dateKeyToUtcDate(value);
  }
  return istCalendarDate(fallback);
}

export function ensureProcessTimezone(): void {
  // Prefer explicit APP_TIMEZONE; otherwise lock to IST so US EC2 host TZ cannot leak.
  process.env.TZ = process.env.APP_TIMEZONE?.trim() || APP_TIMEZONE;
}
