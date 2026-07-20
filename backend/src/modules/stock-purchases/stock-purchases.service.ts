import type { AuthContext } from "../auth/auth.types";
import { stockPurchasesRepository } from "./stock-purchases.repository";
import type { CreateStockPurchaseInput, UpdateStockPurchaseInput } from "./stock-purchases.validators";

export class StockPurchasesService {
  list(auth: AuthContext) {
    return stockPurchasesRepository.list(auth.salonId);
  }

  getById(auth: AuthContext, purchaseId: string) {
    return stockPurchasesRepository.getById(auth.salonId, purchaseId);
  }

  create(auth: AuthContext, input: CreateStockPurchaseInput) {
    return stockPurchasesRepository.create(auth, input);
  }

  update(auth: AuthContext, purchaseId: string, input: UpdateStockPurchaseInput) {
    return stockPurchasesRepository.update(auth, purchaseId, input);
  }

  delete(auth: AuthContext, purchaseId: string) {
    return stockPurchasesRepository.delete(auth, purchaseId);
  }
}

export const stockPurchasesService = new StockPurchasesService();
