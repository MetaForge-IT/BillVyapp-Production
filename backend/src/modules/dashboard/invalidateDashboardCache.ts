import { dashboardService } from "./dashboard.service";

/** Bust cache and optionally pre-warm dashboard snapshot in Redis. */
export function invalidateDashboardCache(salonId: string): void {
  void dashboardService
    .refreshSnapshot(salonId)
    .catch(() => {});
}
