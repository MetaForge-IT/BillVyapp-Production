import type { AuthContext } from "../auth/auth.types";
import { stockAdjustmentsRepository } from "./stock-adjustments.repository";
import type { CreateStockAdjustmentInput, UpdateStockAdjustmentInput } from "./stock-adjustments.validators";

export class StockAdjustmentsService {
  list(auth: AuthContext, productId?: string) {
    return stockAdjustmentsRepository.list(auth.salonId, productId);
  }

  getById(auth: AuthContext, adjustmentId: string) {
    return stockAdjustmentsRepository.getById(auth.salonId, adjustmentId);
  }

  create(auth: AuthContext, input: CreateStockAdjustmentInput) {
    return stockAdjustmentsRepository.create(auth, input);
  }

  update(auth: AuthContext, adjustmentId: string, input: UpdateStockAdjustmentInput) {
    return stockAdjustmentsRepository.update(auth, adjustmentId, input);
  }

  delete(auth: AuthContext, adjustmentId: string) {
    return stockAdjustmentsRepository.delete(auth, adjustmentId);
  }
}

export const stockAdjustmentsService = new StockAdjustmentsService();
