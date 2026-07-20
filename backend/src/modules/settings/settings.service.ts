import type { AuthContext } from "../auth/auth.types";
import { settingsRepository } from "./settings.repository";
import type { UpdateSettingsInput } from "./settings.validators";

export class SettingsService {
  get(auth: AuthContext) {
    return settingsRepository.get(auth.salonId);
  }

  update(auth: AuthContext, input: UpdateSettingsInput) {
    return settingsRepository.update(auth.salonId, input);
  }
}

export const settingsService = new SettingsService();
