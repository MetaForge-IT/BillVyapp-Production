import type { AuthContext } from "../auth/auth.types";
import { productsRepository } from "./products.repository";
import type { CreateProductInput, UpdateProductInput } from "./products.validators";

export class ProductsService {
  list(
    auth: AuthContext,
    filters?: { categoryId?: string; status?: string; stockStatus?: string; search?: string },
  ) {
    return productsRepository.list(auth.salonId, filters);
  }

  getById(auth: AuthContext, productId: string) {
    return productsRepository.getById(auth.salonId, productId);
  }

  create(auth: AuthContext, input: CreateProductInput) {
    return productsRepository.create(auth, input);
  }

  update(auth: AuthContext, productId: string, input: UpdateProductInput) {
    return productsRepository.update(auth, productId, input);
  }

  delete(auth: AuthContext, productId: string) {
    return productsRepository.softDelete(auth, productId);
  }
}

export const productsService = new ProductsService();
