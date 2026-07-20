import type { AuthContext } from "../auth/auth.types";
import { plansRepository } from "./plans.repository";
import type { CreatePlanInput, EnrollCustomerInput, UpdatePlanInput } from "./plans.validators";

export class PlansService {
  listServices(auth: AuthContext) {
    return plansRepository.listServices(auth.salonId);
  }

  listCustomers(auth: AuthContext) {
    return plansRepository.listCustomers(auth.salonId);
  }

  listPlans(auth: AuthContext) {
    return plansRepository.listPlans(auth.salonId);
  }

  createPlan(auth: AuthContext, input: CreatePlanInput) {
    return plansRepository.createPlan(auth, input);
  }

  updatePlan(auth: AuthContext, planId: string, input: UpdatePlanInput) {
    return plansRepository.updatePlan(auth, planId, input);
  }

  listEnrollments(auth: AuthContext) {
    return plansRepository.listEnrollments(auth.salonId);
  }

  enrollCustomer(auth: AuthContext, input: EnrollCustomerInput) {
    return plansRepository.enrollCustomer(auth, input);
  }
}

export const plansService = new PlansService();
