import type { AuthContext } from "../auth/auth.types";
import { prisma } from "../../config/prisma";
import { redisConfig } from "../../config/redis.config";
import { cacheDelete, cacheGet, cacheSet } from "../../services/cache.service";
import { logger } from "../../utils/logger";
import {
  resolveAuthFranchiseId,
  resolveKpiSalonIds,
  resolveListSalonIds,
} from "../../utils/salonScope";
import { dashboardRepository } from "./dashboard.repository";
import type { ListDashboardQuery } from "./dashboard.validators";

export type DashboardPayload = Awaited<ReturnType<typeof dashboardRepository.getDashboard>>;

function salonIdsEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const setB = new Set(b);
  return a.every((id) => setB.has(id));
}

export class DashboardService {
  private snapshotKey(salonId: string): string {
    return `dashboard:${salonId}`;
  }

  private franchiseSnapshotKey(franchiseId: string, querySalonId?: string): string {
    if (querySalonId) return `dashboard:franchise:${franchiseId}:shop:${querySalonId}`;
    return `dashboard:franchise:${franchiseId}`;
  }

  private async resolveCacheKey(
    auth: AuthContext,
    querySalonId?: string,
  ): Promise<string> {
    const franchiseId = await resolveAuthFranchiseId(auth);
    if (auth.role === "admin" && franchiseId) {
      return this.franchiseSnapshotKey(franchiseId, querySalonId);
    }
    return this.snapshotKey(auth.salonId);
  }

  async getDashboard(auth: AuthContext, query: ListDashboardQuery = {}): Promise<DashboardPayload> {
    const cacheKey = await this.resolveCacheKey(auth, query.salonId);
    const cached = await cacheGet<DashboardPayload>(cacheKey);
    if (cached) return cached;

    const franchiseId = await resolveAuthFranchiseId(auth);
    const isFranchiseAdmin = auth.role === "admin" && Boolean(franchiseId);

    const panelSalonIds = isFranchiseAdmin
      ? await resolveListSalonIds(auth, query.salonId)
      : [auth.salonId];

    let data = await dashboardRepository.getDashboard(panelSalonIds);

    // Franchise admin drilling into one shop: KPI cards stay combined across all shops.
    if (isFranchiseAdmin && query.salonId) {
      const kpiSalonIds = await resolveKpiSalonIds(auth);
      if (!salonIdsEqual(kpiSalonIds, panelSalonIds)) {
        const kpiData = await dashboardRepository.getDashboard(kpiSalonIds);
        data = {
          ...data,
          businessKpis: kpiData.businessKpis,
          kpiMetrics: kpiData.kpiMetrics,
        };
      }
    }

    await cacheSet(cacheKey, data, redisConfig.dashboardSnapshotTtlSeconds);
    return data;
  }

  async invalidateDashboard(salonId: string): Promise<void> {
    await cacheDelete(this.snapshotKey(salonId));

    const salon = await prisma.salon.findUnique({
      where: { id: salonId },
      select: { franchiseId: true },
    });
    if (salon?.franchiseId) {
      await cacheDelete(this.franchiseSnapshotKey(salon.franchiseId));
      const shops = await prisma.salon.findMany({
        where: { franchiseId: salon.franchiseId },
        select: { id: true },
      });
      await Promise.all(
        shops.map((shop) =>
          cacheDelete(this.franchiseSnapshotKey(salon.franchiseId!, shop.id)),
        ),
      );
    }
  }

  /** Precompute dashboard snapshot after writes (Phase 4). */
  async precomputeSnapshot(salonId: string): Promise<void> {
    if (!redisConfig.enabled || !redisConfig.dashboardPrecompute) return;

    try {
      const data = await dashboardRepository.getDashboard([salonId]);
      await cacheSet(this.snapshotKey(salonId), data, redisConfig.dashboardSnapshotTtlSeconds);
    } catch (error) {
      logger.warn("Dashboard snapshot precompute failed", {
        salonId,
        reason: error instanceof Error ? error.message : "unknown",
      });
    }
  }

  /** Invalidate then asynchronously rebuild snapshot for fast next load. */
  async refreshSnapshot(salonId: string): Promise<void> {
    await this.invalidateDashboard(salonId);
    await this.precomputeSnapshot(salonId);
  }
}

export const dashboardService = new DashboardService();
