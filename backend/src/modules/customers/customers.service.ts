import type { AuthContext } from "../auth/auth.types";
import { invalidateDashboardCache } from "../dashboard/invalidateDashboardCache";
import { resolveListSalonIds } from "../../utils/salonScope";
import { customersRepository } from "./customers.repository";
import type {
  CreateCustomerInput,
  ListCustomersQuery,
  RedeemLoyaltyInput,
  UpdateCustomerInput,
} from "./customers.validators";

export class CustomersService {
  async list(auth: AuthContext, query: ListCustomersQuery) {
    const salonIds = await resolveListSalonIds(auth, query.salonId);
    return customersRepository.list(salonIds, query);
  }

  getById(auth: AuthContext, customerId: string) {
    return customersRepository.getById(auth.salonId, customerId);
  }

  lookupByPhone(auth: AuthContext, phone: string) {
    return customersRepository.lookupByPhone(auth.salonId, phone);
  }

  searchByPhone(auth: AuthContext, phone: string) {
    return customersRepository.searchByPhone(auth.salonId, phone);
  }

  async create(auth: AuthContext, input: CreateCustomerInput) {
    const result = await customersRepository.create(auth, input);
    invalidateDashboardCache(auth.salonId);
    return result;
  }

  update(auth: AuthContext, customerId: string, input: UpdateCustomerInput) {
    return customersRepository.update(auth, customerId, input);
  }

  delete(auth: AuthContext, customerId: string) {
    return customersRepository.softDelete(auth, customerId);
  }

  getVisits(auth: AuthContext, customerId: string) {
    return customersRepository.getVisits(auth.salonId, customerId);
  }

  getLoyalty(auth: AuthContext, customerId: string) {
    return customersRepository.getLoyaltyTransactions(auth.salonId, customerId);
  }

  redeemLoyalty(auth: AuthContext, customerId: string, input: RedeemLoyaltyInput) {
    return customersRepository.redeemLoyalty(auth, customerId, input);
  }
}

export const customersService = new CustomersService();
