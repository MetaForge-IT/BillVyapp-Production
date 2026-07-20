import type { AuthContext } from "../auth/auth.types";
import { staffRepository } from "./staff.repository";

export class StaffService {
  listActive(auth: AuthContext) {
    return staffRepository.listActive(auth.salonId);
  }
}

export const staffService = new StaffService();
