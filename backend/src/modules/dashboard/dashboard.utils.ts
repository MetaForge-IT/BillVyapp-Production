import {
  addIstDays,
  formatDbDateKey,
  istDateKey,
  istDayRange,
  startOfIstDay,
} from "../../utils/ist";

/** @deprecated Prefer startOfIstDay — kept name for call-site compatibility. */
export function startOfLocalDay(date = new Date()): Date {
  return startOfIstDay(date);
}

export function localDayRange(date: Date): { gte: Date; lt: Date } {
  return istDayRange(date);
}

/** Serialize `@db.Date` (UTC midnight calendar day) to YYYY-MM-DD. */
export function formatDateKey(date: Date): string {
  return formatDbDateKey(date);
}

/** IST calendar YYYY-MM-DD for an instant (payments, “today”, trends). */
export function localDateKey(date: Date): string {
  return istDateKey(date);
}

export function addDays(date: Date, days: number): Date {
  return addIstDays(date, days);
}

export function startOfMonth(date = new Date()): Date {
  const key = istDateKey(date);
  const [y, m] = key.split("-").map(Number);
  const monthStartKey = `${y}-${String(m).padStart(2, "0")}-01`;
  return startOfIstDay(new Date(`${monthStartKey}T12:00:00+05:30`));
}

export function startOfWeek(date = new Date()): Date {
  const start = startOfIstDay(date);
  const label = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    weekday: "short",
  }).format(date);
  const map: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  const day = map[label] ?? 1;
  const diff = day === 0 ? -6 : 1 - day;
  return addDays(start, diff);
}

export function dayShortLabel(date: Date): string {
  return date.toLocaleDateString("en-US", {
    timeZone: "Asia/Kolkata",
    weekday: "short",
  });
}

export function formatInr(amount: number): string {
  return `₹${Math.round(amount).toLocaleString("en-IN")}`;
}

export function percentChange(current: number, previous: number): { text: string; positive: boolean } {
  if (previous <= 0) {
    return current > 0
      ? { text: "+100%", positive: true }
      : { text: "0%", positive: true };
  }
  const pct = ((current / previous) - 1) * 100;
  const rounded = Math.round(pct * 10) / 10;
  return {
    text: `${rounded >= 0 ? "+" : ""}${rounded}%`,
    positive: rounded >= 0,
  };
}

export function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

/** Appointment `@db.Time` values are stored as UTC time-of-day matching IST wall clock. */
export function formatTime12h(date: Date): string {
  const hours = date.getUTCHours();
  const minutes = date.getUTCMinutes();
  const period = hours >= 12 ? "pm" : "am";
  const hour12 = hours % 12 || 12;
  return `${hour12}:${String(minutes).padStart(2, "0")} ${period}`;
}
