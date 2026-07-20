import type { AuthContext } from "../auth/auth.types";
import { advancesRepository } from "./advances.repository";
import type { CreateAdvanceInput, DeductAdvanceInput, UpdateAdvanceInput } from "./advances.validators";

export class AdvancesService {
  list(auth: AuthContext) {
    return advancesRepository.list(auth.salonId);
  }

  getById(auth: AuthContext, advanceId: string) {
    return advancesRepository.getById(auth.salonId, advanceId);
  }

  create(auth: AuthContext, input: CreateAdvanceInput) {
    return advancesRepository.create(auth, input);
  }

  update(auth: AuthContext, advanceId: string, input: UpdateAdvanceInput) {
    return advancesRepository.update(auth, advanceId, input);
  }

  deduct(auth: AuthContext, advanceId: string, input: DeductAdvanceInput) {
    return advancesRepository.deduct(auth, advanceId, input);
  }

  delete(auth: AuthContext, advanceId: string) {
    return advancesRepository.delete(auth, advanceId);
  }
}

export const advancesService = new AdvancesService();
