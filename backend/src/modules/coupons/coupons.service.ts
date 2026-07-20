import type { AuthContext } from "../auth/auth.types";
import { couponsRepository } from "./coupons.repository";
import type { CreateCouponInput, UpdateCouponInput } from "./coupons.validators";

export class CouponsService {
  list(auth: AuthContext, status?: string) {
    return couponsRepository.list(auth.salonId, status);
  }

  getById(auth: AuthContext, couponId: string) {
    return couponsRepository.getById(auth.salonId, couponId);
  }

  create(auth: AuthContext, input: CreateCouponInput) {
    return couponsRepository.create(auth, input);
  }

  update(auth: AuthContext, couponId: string, input: UpdateCouponInput) {
    return couponsRepository.update(auth, couponId, input);
  }

  delete(auth: AuthContext, couponId: string) {
    return couponsRepository.softDelete(auth, couponId);
  }
}

export const couponsService = new CouponsService();
