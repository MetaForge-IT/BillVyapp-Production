import type { AuthContext } from "../auth/auth.types";
import { vendorsRepository } from "./vendors.repository";
import type { CreateVendorInput, UpdateVendorInput } from "./vendors.validators";

export class VendorsService {
  list(auth: AuthContext) {
    return vendorsRepository.list(auth.salonId);
  }

  getById(auth: AuthContext, vendorId: string) {
    return vendorsRepository.getById(auth.salonId, vendorId);
  }

  create(auth: AuthContext, input: CreateVendorInput) {
    return vendorsRepository.create(auth, input);
  }

  update(auth: AuthContext, vendorId: string, input: UpdateVendorInput) {
    return vendorsRepository.update(auth, vendorId, input);
  }

  delete(auth: AuthContext, vendorId: string) {
    return vendorsRepository.softDelete(auth, vendorId);
  }
}

export const vendorsService = new VendorsService();
