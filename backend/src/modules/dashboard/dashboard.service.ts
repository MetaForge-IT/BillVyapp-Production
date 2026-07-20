import type { AuthContext } from "../auth/auth.types";
import { redisConfig } from "../../config/redis.config";
import { cacheDelete, cacheGet, cacheSet } from "../../services/cache.service";
import { dashboardRepository } from "./dashboard.repository";

export class DashboardService {
  async getDashboard(auth: AuthContext) {
    const cacheKey = `dashboard:${auth.salonId}`;
    const cached = await cacheGet<Awaited<ReturnType<typeof dashboardRepository.getDashboard>>>(
      cacheKey,
    );
    if (cached) return cached;

    const data = await dashboardRepository.getDashboard(auth.salonId);
    await cacheSet(cacheKey, data, redisConfig.dashboardTtlSeconds);
    return data;
  }

  async invalidateDashboard(salonId: string): Promise<void> {
    await cacheDelete(`dashboard:${salonId}`);
  }
}

export const dashboardService = new DashboardService();
