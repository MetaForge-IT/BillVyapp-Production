import type { AuthContext } from "../auth/auth.types";
import { inventoryStatsRepository } from "./inventory-stats.repository";

export class InventoryStatsService {
  getStats(auth: AuthContext) {
    return inventoryStatsRepository.getStats(auth.salonId);
  }
}

export const inventoryStatsService = new InventoryStatsService();
