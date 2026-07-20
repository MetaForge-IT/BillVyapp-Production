import type { AuthContext } from "../auth/auth.types";
import { serviceProductLinksRepository } from "./service-product-links.repository";
import type { ReplaceServiceProductLinksInput } from "./service-product-links.validators";

export class ServiceProductLinksService {
  listGrouped(auth: AuthContext) {
    return serviceProductLinksRepository.listGrouped(auth.salonId);
  }

  listByServiceId(auth: AuthContext, serviceId: string) {
    return serviceProductLinksRepository.listByServiceId(auth.salonId, serviceId);
  }

  replaceForService(auth: AuthContext, serviceId: string, input: ReplaceServiceProductLinksInput) {
    return serviceProductLinksRepository.replaceForService(auth, serviceId, input);
  }
}

export const serviceProductLinksService = new ServiceProductLinksService();
