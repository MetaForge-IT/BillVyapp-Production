import type {
  AppointmentCustomer,
  AppointmentPackage,
  AppointmentProduct,
  AppointmentService,
  AppointmentType,
  ServiceCategory,
} from "./appointmentData";
import { istDateKey } from "../../../lib/istDate";

export type SelectedService = AppointmentService & { qty: number };
export type SelectedPackage = AppointmentPackage & { qty: number };
export type SelectedProduct = AppointmentProduct & { qty: number };
export type ServiceTab = ServiceCategory | "Packages" | "Products";

export type ProductOverride = {
  sku: string;
  name: string;
  qty: number;
  unit: string;
  defaultQty: number;
};

export const SERVICES_PAGE_SIZE = 5;

export const NEW_APPOINTMENT_DRAFT_KEY = "new-appointment";
export const NEW_WALK_IN_DRAFT_KEY = "new-walk-in";

export type BookingMode = "appointment" | "walk-in";

export type NewAppointmentDraft = {
  customerSearch: string;
  selectedCustomer: AppointmentCustomer | null;
  visitType: AppointmentType;
  walkInName: string;
  walkInPhone: string;
  walkInGender: "Male" | "Female" | "Other" | "";
  walkInMode: "new" | "search";
  walkInSearch: string;
  apptNewMode: boolean;
  newCustName: string;
  newCustPhone: string;
  newCustGender: "Male" | "Female" | "Other" | "";
  date: string;
  time: string;
  duration: string;
  notes: string;
  serviceTab: ServiceTab;
  serviceSearch: string;
  selectedServices: SelectedService[];
  selectedPackages: SelectedPackage[];
  selectedProducts: SelectedProduct[];
  productOverrides: Record<string, ProductOverride[]>;
  expandedServiceId: string | null;
};

export function createDefaultAppointmentDraft(
  mode: BookingMode = "appointment",
): NewAppointmentDraft {
  return {
    customerSearch: "",
    selectedCustomer: null,
    visitType: mode === "walk-in" ? "Walk-in" : "Appointment",
    walkInName: "",
    walkInPhone: "",
    walkInGender: "",
    walkInMode: "search",
    walkInSearch: "",
    apptNewMode: false,
    newCustName: "",
    newCustPhone: "",
    newCustGender: "",
    date: istDateKey(),
    time: "10:30",
    duration: "1 hr, 30 min",
    notes: "",
    serviceTab: "Male",
    serviceSearch: "",
    selectedServices: [],
    selectedPackages: [],
    selectedProducts: [],
    productOverrides: {},
    expandedServiceId: null,
  };
}
