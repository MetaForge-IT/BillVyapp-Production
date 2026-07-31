export type ServiceCategory = "Male" | "Female" | "Others";

export type AppointmentType = "Appointment" | "Walk-in";

export interface ServiceProductUsage {
  sku: string;
  name: string;
  qty: number;
  unit: string; // "ml" | "g" | "piece" | "application"
}

export interface AppointmentService {
  id: string;
  name: string;
  displayName?: string;
  serviceGroup?: string;
  categoryLabel?: string;
  price: number;
  memberPrice: number;
  duration: number;
  category: ServiceCategory;
  tone: string;
  gender?: "MALE" | "FEMALE" | "UNISEX";
  productsUsed?: ServiceProductUsage[];
}

export interface AppointmentCustomer {
  id: string;
  name: string;
  phone: string;
  email: string;
  tier: "VIP" | "Gold" | "Silver" | "Regular";
  gender?: "Male" | "Female" | "Other";
}

export interface AppointmentStaff {
  id: string;
  name: string;
  role: string;
  initials: string;
}

export const appointmentCustomers: AppointmentCustomer[] = [];

export const STAFF_DEFAULT_VISIBLE = 4;

/** Staff list — populated when an employees API is available */
export const appointmentStaff: AppointmentStaff[] = [];

export const serviceCategories: ServiceCategory[] = ["Male", "Female", "Others"];

export const paymentModes = ["Cash", "Card", "UPI", "Wallet", "Online", "Split Payment"] as const;

export const appointmentSteps = ["Customer", "Services", "Billing", "Confirm"] as const;

/** Booking-only flow (no billing step) */
export const bookingAppointmentSteps = ["Customer", "Services", "Confirm"] as const;

export interface AppointmentPackage {
  id: string;
  name: string;
  price: number;
  memberPrice: number;
  duration: number;
  includes: string[];
  gender: "Male" | "Female" | "All";
  tone: string;
}

export interface AppointmentProduct {
  id: string;
  name: string;
  price: number;
  category: string;
  usedIn: string;
  stock: number;
  gender: "Male" | "Female" | "All";
}

export const appointmentPackages: AppointmentPackage[] = [];

/**
 * Product usage is managed via ServiceProductsContext links.
 */
export function getProductsForService(_serviceName: string): ServiceProductUsage[] {
  return [];
}
