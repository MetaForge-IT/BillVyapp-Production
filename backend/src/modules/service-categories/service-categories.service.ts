import type { AuthContext } from "../auth/auth.types";
import { serviceCategoriesRepository } from "./service-categories.repository";
import type {
  CreateServiceCategoryInput,
  UpdateServiceCategoryInput,
} from "./service-categories.validators";

export class ServiceCategoriesService {
  list(auth: AuthContext) {
    return serviceCategoriesRepository.list(auth.salonId);
  }

  getById(auth: AuthContext, categoryId: string) {
    return serviceCategoriesRepository.getById(auth.salonId, categoryId);
  }

  create(auth: AuthContext, input: CreateServiceCategoryInput) {
    return serviceCategoriesRepository.create(auth, input);
  }

  update(auth: AuthContext, categoryId: string, input: UpdateServiceCategoryInput) {
    return serviceCategoriesRepository.update(auth, categoryId, input);
  }

  delete(auth: AuthContext, categoryId: string) {
    return serviceCategoriesRepository.delete(auth, categoryId);
  }
}

export const serviceCategoriesService = new ServiceCategoriesService();
