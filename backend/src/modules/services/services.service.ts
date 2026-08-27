import type { AuthContext } from "../auth/auth.types";
import { servicesRepository } from "./services.repository";
import type {
  CreateServiceInput,
  ListServicesQuery,
  UpdateServiceInput,
} from "./services.validators";

export class ServicesService {
  listCatalog(auth: AuthContext, salonId?: string) {
    return servicesRepository.listCatalog(auth, salonId);
  }

  list(auth: AuthContext, query: ListServicesQuery) {
    return servicesRepository.list(auth, query);
  }

  getById(auth: AuthContext, serviceId: string) {
    return servicesRepository.getById(auth, serviceId);
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
