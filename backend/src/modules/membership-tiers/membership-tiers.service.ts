import type { AuthContext } from "../auth/auth.types";
import { membershipTiersRepository } from "./membership-tiers.repository";

export class MembershipTiersService {
  listActive(auth: AuthContext) {
    return membershipTiersRepository.listActive(auth.salonId);
  }
}

export const membershipTiersService = new MembershipTiersService();
