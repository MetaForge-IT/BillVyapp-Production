import type { CatalogService as ApiCatalogService } from "../api/services";
import type { AppointmentService, ServiceCategory } from "../app/pages/appointments/appointmentData";

export interface CatalogService {
  id: string;
  name: string;
  displayName?: string;
  serviceGroup?: string | null;
  price: number;
  memberPrice: number;
  duration?: number;
  category?: string;
  gender?: "MALE" | "FEMALE" | "UNISEX";
  tag?: "Male" | "Female";
}

const CATEGORY_TONES: Record<ServiceCategory, string> = {
  Male: "from-slate-700 to-slate-900",
  Female: "from-rose-400 to-pink-600",
  Others: "from-amber-400 to-orange-500",
};

function toServiceCategory(
  gender?: "MALE" | "FEMALE" | "UNISEX",
  tag?: "Male" | "Female",
  category?: string,
): ServiceCategory {
  if (gender === "MALE" || tag === "Male") return "Male";
  if (gender === "FEMALE" || tag === "Female") return "Female";
  const lower = (category ?? "").toLowerCase();
  if (lower.includes("men") || lower.includes("male")) return "Male";
  if (lower.includes("women") || lower.includes("female") || lower.includes("bridal")) return "Female";
  return "Others";
}

export function mapApiCatalog(services: ApiCatalogService[]): CatalogService[] {
  return services
    .filter((service) => service.id)
    .map((service) => ({
      id: service.id,
      name: service.name,
      displayName: service.displayName ?? service.name,
      serviceGroup: service.serviceGroup,
      price: service.price,
      memberPrice: service.memberPrice,
      duration: service.duration,
      category: service.category,
      gender: service.gender,
      tag: service.tag,
    }));
}

export function mapToAppointmentService(service: CatalogService): AppointmentService {
  const category = toServiceCategory(service.gender, service.tag, service.category);
  return {
    id: service.id,
    name: service.name,
    displayName: service.displayName ?? service.name,
    serviceGroup: service.serviceGroup ?? service.category ?? "General",
    categoryLabel: service.category,
    price: service.price,
    memberPrice: service.memberPrice,
    duration: service.duration ?? 30,
    category,
    tone: CATEGORY_TONES[category],
  };
}

export function resolveServicePrice(catalog: CatalogService[], name: string): number {
  const exact = catalog.find(
    (service) => service.name === name || service.displayName === name,
  );
  if (exact) return exact.price;
  const lower = name.toLowerCase();
  const partial = catalog.find(
    (service) =>
      lower.includes(service.name.toLowerCase()) ||
      service.name.toLowerCase().includes(lower) ||
      (service.displayName ?? "").toLowerCase().includes(lower),
  );
  return partial?.price ?? 0;
}

export function findCatalogService(
  catalog: CatalogService[],
  name: string,
): CatalogService | undefined {
  const exact = catalog.find(
    (service) => service.name === name || service.displayName === name,
  );
  if (exact) return exact;
  const lower = name.toLowerCase();
  return catalog.find(
    (service) =>
      lower.includes(service.name.toLowerCase()) ||
      service.name.toLowerCase().includes(lower) ||
      (service.displayName ?? "").toLowerCase().includes(lower),
  );
}

/** Group catalog services by category → serviceGroup for accordion UI. */
export function groupCatalogServices(services: CatalogService[]) {
  const byCategory = new Map<string, Map<string, CatalogService[]>>();
  for (const service of services) {
    const category = service.category || "General";
    const group = service.serviceGroup || category;
    if (!byCategory.has(category)) byCategory.set(category, new Map());
    const groups = byCategory.get(category)!;
    if (!groups.has(group)) groups.set(group, []);
    groups.get(group)!.push(service);
  }
  return byCategory;
}
