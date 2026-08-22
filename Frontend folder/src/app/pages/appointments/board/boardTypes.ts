import type { Appointment as ApiAppointment } from "../../../../api/appointments";

/** Optional bill adjustments — each one is revealed by its own toggle. */
export type DiscountTool = "coupon" | "loyalty" | "manual" | "advance";
export const NO_DISCOUNT_TOOLS: Record<DiscountTool, boolean> = {
  coupon: false,
  loyalty: false,
  manual: false,
  advance: false,
};

export const APPOINTMENTS: Appointment[] = [];
export const WALKINS: Walkin[] = [];
export const QUEUE: Array<{
  id: string;
  token: string;
  customer: string;
  phone: string;
  service: string;
  status: "waiting" | "called" | "in-service";
  waitMins: number;
  priority: "normal" | "vip";
  type: "appointment" | "walk-in";
}> = [];

export const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700 border-yellow-200",
  confirmed: "bg-green-100 text-green-700 border-green-200",
  "checked-in": "bg-cyan-100 text-cyan-700 border-cyan-200",
  "in-progress": "bg-blue-100 text-blue-700 border-blue-200",
  completed: "bg-gray-100 text-gray-700 border-gray-200",
  cancelled: "bg-red-100 text-red-700 border-red-200",
  "no-show": "bg-red-100 text-red-700 border-red-200",
  rescheduled: "bg-purple-100 text-purple-700 border-purple-200",
  waiting: "bg-orange-100 text-orange-700 border-orange-200",
  called: "bg-purple-100 text-purple-700 border-purple-200",
  "in-service": "bg-blue-100 text-blue-700 border-blue-200",
};

export type AppointmentStatus =
  | "pending"
  | "confirmed"
  | "checked-in"
  | "in-progress"
  | "completed"
  | "cancelled"
  | "no-show"
  | "rescheduled";

export interface Appointment {
  id: string;
  sortKey: number;
  time: string;
  duration: number;
  customer: string;
  phone: string;
  customerId?: string;
  service: string;
  /** All booked service names (multi-select). `service` stays a display/join string. */
  services?: string[];
  serviceLines?: ApiAppointment["serviceLines"];
  status: AppointmentStatus;
  type: "appointment" | "walk-in";

  chairNo?: string;
  roomNo?: string;

  serviceProgress?: number;

  arrivalStatus?: "not-arrived" | "arrived" | "late";

  source?: "online" | "walk-in" | "phone";

  extraServices?: {
    name: string;
    price: number;
  }[];

  date?: string;
  scheduledDate?: string;
  notes?: string;
}

export type WalkinStatus = "waiting" | "in-service" | "done";

export interface Walkin {
  id: string;
  sortKey: number;
  token: string;
  customer: string;
  phone: string;
  customerId?: string;
  service: string;
  services?: string[];
  status: WalkinStatus;
  waitMins: number;
  arrival: string;
  notes?: string;
}

export type BillingTarget = {
  name: string;
  phone: string;
  service: string;
  id: string;
  customerId?: string;
  type?: "appointment" | "walk-in";
  time?: string;
  token?: string;
  sourceKind: "appointment" | "walkin";
};

export type QueueItem = (typeof QUEUE)[number];

export type BillingItem = {
  type: "service" | "product";
  name: string;
  price: number;
  qty: number;
  serviceId?: string;
  productId?: string;
};

export type ReceiptData = {
  invoiceNo: string;
  customer: string;
  date: string;
  items: { name: string; qty: number; rate: number; total: number }[];
  subtotal: number;
  gst: number;
  roundOff: number;
  grandTotal: number;
  paymentMethod: string;
  loyaltyEarned: number;
  appointmentId?: string;
};

export type NotifyTarget = {
  name: string;
  phone: string;
  context?: "customer" | "staff";
};
