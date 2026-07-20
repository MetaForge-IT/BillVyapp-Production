export const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

export const ROUND_OFF_MODES = ["none", "1", "5", "10"] as const;

export const SETTINGS_ERROR_CODES = {
  NOT_FOUND: "SETTINGS_NOT_FOUND",
} as const;

export function formatTimeValue(date: Date | null): string {
  if (!date) return "09:00";
  return date.toISOString().slice(11, 16);
}

export function parseTimeValue(time: string): Date {
  return new Date(`1970-01-01T${time}:00.000Z`);
}
