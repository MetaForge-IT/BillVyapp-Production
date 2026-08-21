import type { AuthContext } from "../auth/auth.types";
import { customersRepository } from "./customers.repository";
import type {
  CreateCustomerInput,
  ListCustomersQuery,
  RedeemLoyaltyInput,
  UpdateCustomerInput,
} from "./customers.validators";

export class CustomersService {
  list(auth: AuthContext, query: ListCustomersQuery) {
    return customersRepository.list(auth.salonId, query);
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

  create(auth: AuthContext, input: CreateCustomerInput) {
    return customersRepository.create(auth, input);
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
