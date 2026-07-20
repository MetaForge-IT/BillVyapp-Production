import type { ServiceIncentiveSettings } from "../types/serviceIncentive";
import { DEFAULT_SERVICE_INCENTIVE } from "../types/serviceIncentive";

export function normalizeServiceKey(name: string): string {
  return name.trim().toLowerCase();
}

export function buildInitialIncentiveSettings(
  serviceNames: string[] = [],
): Record<string, ServiceIncentiveSettings> {
  const settings: Record<string, ServiceIncentiveSettings> = {};
  for (const name of serviceNames) {
    settings[normalizeServiceKey(name)] = { ...DEFAULT_SERVICE_INCENTIVE };
  }
  return settings;
}
