import { AppError } from "../../utils/errors";
import { resolveListSalonIds } from "../../utils/salonScope";
import type { AuthContext } from "../auth/auth.types";
import { couponsRepository } from "./coupons.repository";
import type { CreateCouponInput, UpdateCouponInput } from "./coupons.validators";

export class CouponsService {
  async list(auth: AuthContext, status?: string, querySalonId?: string) {
    const salonIds = await resolveListSalonIds(auth, querySalonId);
    return couponsRepository.list(salonIds, status);
  }

  async getById(auth: AuthContext, couponId: string, querySalonId?: string) {
    const salonIds = await resolveListSalonIds(auth, querySalonId);
    return couponsRepository.getById(salonIds, couponId);
  }

  async create(auth: AuthContext, input: CreateCouponInput) {
    const salonIds = await resolveListSalonIds(auth, input.salonId);
    const salonId = input.salonId ?? salonIds[0]!;
    if (!salonIds.includes(salonId)) {
      throw new AppError(403, "Shop not in your franchise");
    }
    return couponsRepository.create(auth, salonId, input);
  }

  async update(auth: AuthContext, couponId: string, input: UpdateCouponInput, querySalonId?: string) {
    const salonIds = await resolveListSalonIds(auth, querySalonId);
    return couponsRepository.update(auth, salonIds, couponId, input);
  }

  async delete(auth: AuthContext, couponId: string, querySalonId?: string) {
    const salonIds = await resolveListSalonIds(auth, querySalonId);
    await couponsRepository.softDelete(auth, salonIds, couponId);
  }
}

export const couponsService = new CouponsService();
