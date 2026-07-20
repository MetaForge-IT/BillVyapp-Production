export function optionalEnv(key: string, fallback = ""): string {
  return process.env[key] ?? fallback;
}

export function requireEnvWhen(enabled: boolean, key: string): string {
  if (!enabled) {
    return "";
  }

  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }

  return value;
}

export function parsePositiveInt(value: string, key: string): number {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    throw new Error(`Environment variable ${key} must be a positive integer`);
  }
  return parsed;
}

export function parseBoolean(value: string, key: string): boolean {
  const normalized = value.trim().toLowerCase();
  if (normalized === "true" || normalized === "1") {
    return true;
  }
  if (normalized === "false" || normalized === "0") {
    return false;
  }
  throw new Error(`Environment variable ${key} must be "true" or "false"`);
}

export function parseBooleanEnv(key: string, fallback: boolean): boolean {
  const value = process.env[key];
  if (value === undefined) {
    return fallback;
  }
  return parseBoolean(value, key);
}

export function parseCsvEnv(key: string, fallback: string[]): string[] {
  const value = process.env[key];
  if (!value?.trim()) {
    return fallback;
  }

  return value
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}
