import type { CatalogService as ApiCatalogService } from "../api/services";
import type { AppointmentService, ServiceCategory } from "../app/pages/appointments/appointmentData";

export interface CatalogService {
  id: string;
  name: string;
  price: number;
  memberPrice: number;
  duration?: number;
  category?: string;
  tag?: "Male" | "Female";
}

const CATEGORY_TONES: Record<ServiceCategory, string> = {
  Male: "from-slate-700 to-slate-900",
  Female: "from-rose-400 to-pink-600",
  Others: "from-amber-400 to-orange-500",
};

function toServiceCategory(tag?: "Male" | "Female", category?: string): ServiceCategory {
  if (tag === "Male") return "Male";
  if (tag === "Female") return "Female";
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
      price: service.price,
      memberPrice: service.memberPrice,
      duration: service.duration,
      category: service.category,
      tag: service.tag,
    }));
}

export function mapToAppointmentService(service: CatalogService): AppointmentService {
  const category = toServiceCategory(service.tag, service.category);
  return {
    id: service.id,
    name: service.name,
    price: service.price,
    memberPrice: service.memberPrice,
    duration: service.duration ?? 30,
    category,
    tone: CATEGORY_TONES[category],
  };
}

export function resolveServicePrice(catalog: CatalogService[], name: string): number {
  const exact = catalog.find((service) => service.name === name);
  if (exact) return exact.price;
  const lower = name.toLowerCase();
  const partial = catalog.find(
    (service) =>
      lower.includes(service.name.toLowerCase()) ||
      service.name.toLowerCase().includes(lower),
  );
  return partial?.price ?? 0;
}

export function findCatalogService(
  catalog: CatalogService[],
  name: string,
): CatalogService | undefined {
  const exact = catalog.find((service) => service.name === name);
  if (exact) return exact;
  const lower = name.toLowerCase();
  return catalog.find(
    (service) =>
      lower.includes(service.name.toLowerCase()) ||
      service.name.toLowerCase().includes(lower),
  );
}
