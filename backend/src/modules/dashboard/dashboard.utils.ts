export function startOfLocalDay(date = new Date()): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function localDayRange(date: Date): { gte: Date; lt: Date } {
  const gte = startOfLocalDay(date);
  return { gte, lt: addDays(gte, 1) };
}

export function formatDateKey(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function localDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function startOfMonth(date = new Date()): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function startOfWeek(date = new Date()): Date {
  const start = startOfLocalDay(date);
  const day = start.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  return addDays(start, diff);
}

export function dayShortLabel(date: Date): string {
  return date.toLocaleDateString("en-US", { weekday: "short" });
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
  const pct = ((current - previous) / previous) * 100;
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

export function formatTime12h(date: Date): string {
  const hours = date.getUTCHours();
  const minutes = date.getUTCMinutes();
  const period = hours >= 12 ? "pm" : "am";
  const hour12 = hours % 12 || 12;
  return `${hour12}:${String(minutes).padStart(2, "0")} ${period}`;
}
