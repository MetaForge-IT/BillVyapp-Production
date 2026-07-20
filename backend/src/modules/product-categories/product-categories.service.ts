import type { AuthContext } from "../auth/auth.types";
import { productCategoriesRepository } from "./product-categories.repository";
import type {
  CreateProductCategoryInput,
  UpdateProductCategoryInput,
} from "./product-categories.validators";

export class ProductCategoriesService {
  list(auth: AuthContext) {
    return productCategoriesRepository.list(auth.salonId);
  }

  getById(auth: AuthContext, categoryId: string) {
    return productCategoriesRepository.getById(auth.salonId, categoryId);
  }

  create(auth: AuthContext, input: CreateProductCategoryInput) {
    return productCategoriesRepository.create(auth, input);
  }

  update(auth: AuthContext, categoryId: string, input: UpdateProductCategoryInput) {
    return productCategoriesRepository.update(auth, categoryId, input);
  }

  delete(auth: AuthContext, categoryId: string) {
    return productCategoriesRepository.delete(auth, categoryId);
  }
}

export const productCategoriesService = new ProductCategoriesService();
