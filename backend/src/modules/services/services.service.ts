import type { AuthContext } from "../auth/auth.types";
import { servicesRepository } from "./services.repository";
import type { CreateServiceInput, UpdateServiceInput } from "./services.validators";

export class ServicesService {
  listCatalog(auth: AuthContext) {
    return servicesRepository.listCatalog(auth.salonId);
  }

  list(auth: AuthContext) {
    return servicesRepository.list(auth.salonId);
  }

  getById(auth: AuthContext, serviceId: string) {
    return servicesRepository.getById(auth.salonId, serviceId);
  }

  create(auth: AuthContext, input: CreateServiceInput) {
    return servicesRepository.create(auth, input);
  }

  update(auth: AuthContext, serviceId: string, input: UpdateServiceInput) {
    return servicesRepository.update(auth, serviceId, input);
  }

  delete(auth: AuthContext, serviceId: string) {
    return servicesRepository.softDelete(auth, serviceId);
  }
}

export const servicesService = new ServicesService();
