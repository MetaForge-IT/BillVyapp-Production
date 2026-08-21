import fs from "fs";
import path from "path";

const srcPath = path.join(
  "D:/BillVyapp/BillVyapp/Frontend folder/src/app/pages/Appointments.tsx",
);
const boardDir = path.join(
  "D:/BillVyapp/BillVyapp/Frontend folder/src/app/pages/appointments/board",
);
const lines = fs.readFileSync(srcPath, "utf8").split(/\r?\n/);
const slice = (a, b) => lines.slice(a - 1, b).join("\n");

function unindent(block, spaces = 8) {
  return block
    .split("\n")
    .map((l) => {
      if (!l.trim()) return "";
      if (l.startsWith(" ".repeat(spaces))) return l.slice(spaces);
      return l;
    })
    .join("\n");
}

function write(name, content) {
  fs.writeFileSync(path.join(boardDir, name), content);
  console.log("wrote", name, content.split("\n").length, "lines");
}

const timelineJsx = unindent(slice(1606, 1978), 8);
const queueJsx = unindent(slice(1982, 2072), 8);
const calendarJsx = unindent(slice(2075, 2281), 8);
const editWalkinJsx = unindent(slice(2286, 2434), 6);
const notifyJsx = unindent(slice(2523, 2661), 6);
const editApptJsx = unindent(slice(2664, 2884), 6);
const billingJsx = unindent(slice(2964, 3811), 6);
const receiptJsx = unindent(slice(3815, 4099), 6);
const dialogsWalkin = unindent(slice(2436, 2520), 6);
const dialogsCustomer = unindent(slice(2886, 2961), 6);
const dialogsRest = unindent(slice(4100, 4228), 6);

write(
  "TimelineBoard.tsx",
  `import type { Dispatch, SetStateAction } from "react";
import { cn } from "../../../components/ui/utils";
import { Card, CardContent } from "../../../components/ui/card";
import { Clock, Phone, PlayCircle, Receipt, X, XCircle } from "lucide-react";
import { Pagination } from "../../../components/shared/Pagination";
import type { Appointment } from "./boardTypes";

export type TimelineBoardProps = {
  filteredAppts: Appointment[];
  paginatedAppts: Appointment[];
  focusAppointmentId: string | null;
  expandedServices: Set<string>;
  setExpandedServices: Dispatch<SetStateAction<Set<string>>>;
  setCustomerInfoAppt: (a: Appointment | null) => void;
  startAppointment: (id: string) => void;
  setDeleteConfirm: (id: string | null) => void;
  openBilling: (id: string, name: string, service: string) => void;
  setCorrectionAppt: (v: { id: string; service: string } | null) => void;
  apptsPagination: {
    page: number;
    pageSize: number;
    setPage: (page: number) => void;
    setPageSize: (size: number) => void;
  };
};

export function TimelineBoard({
  filteredAppts,
  paginatedAppts,
  focusAppointmentId,
  expandedServices,
  setExpandedServices,
  setCustomerInfoAppt,
  startAppointment,
  setDeleteConfirm,
  openBilling,
  setCorrectionAppt,
  apptsPagination,
}: TimelineBoardProps) {
  return (
${timelineJsx}
  );
}
`,
);

write(
  "QueueBoard.tsx",
  `import type { Dispatch, SetStateAction } from "react";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { Card, CardContent } from "../../../components/ui/card";
import { ArrowLeft, Bell, MessageSquare, X } from "lucide-react";
import { Pagination } from "../../../components/shared/Pagination";
import { statusColors, type QueueItem } from "./boardTypes";

export type QueueBoardProps = {
  setActiveTab: (tab: string) => void;
  setFilterTypeAndUrl: (type: "all" | "appointment" | "walk-in") => void;
  paginatedQueue: QueueItem[];
  queue: QueueItem[];
  setQueue: Dispatch<SetStateAction<QueueItem[]>>;
  openNotify: (name: string, phone: string) => void;
  queuePagination: {
    page: number;
    pageSize: number;
    setPage: (page: number) => void;
    setPageSize: (size: number) => void;
  };
};

/** Legacy queue tab — still mounted under TabsContent value="queue" (no trigger). */
export function QueueBoard({
  setActiveTab,
  setFilterTypeAndUrl,
  paginatedQueue,
  queue,
  setQueue,
  openNotify,
  queuePagination,
}: QueueBoardProps) {
  return (
${queueJsx}
  );
}
`,
);

write(
  "CalendarBoard.tsx",
  `import type { Dispatch, SetStateAction } from "react";
import { cn } from "../../../components/ui/utils";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { Badge } from "../../../components/ui/badge";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { statusColors, type Appointment } from "./boardTypes";

export type CalendarBoardProps = {
  monthNames: string[];
  calMonth: number;
  calYear: number;
  daysInMonth: number;
  calendarDays: number[];
  selectedCalDate: number | null;
  setSelectedCalDate: (day: number | null) => void;
  setCalMonth: Dispatch<SetStateAction<number>>;
  setCalYear: Dispatch<SetStateAction<number>>;
  prevMonth: () => void;
  nextMonth: () => void;
  apptsByDay: Record<number, { total: number; appointments: number; walkIns: number }>;
  selectedDayLabel: string | null;
  selectedDayApptCount: number;
  selectedDayStats: { appointmentsCount: number; walkInsCount: number; total: number };
  selectedDayAppts: Appointment[];
  setActiveTab: (tab: string) => void;
  setViewDate: (d: Date) => void;
  setSearchParams: (
    next: URLSearchParams | ((prev: URLSearchParams) => URLSearchParams),
    opts?: { replace?: boolean },
  ) => void;
  navigate: (path: string) => void;
};

export function CalendarBoard({
  monthNames,
  calMonth,
  calYear,
  daysInMonth,
  calendarDays,
  selectedCalDate,
  setSelectedCalDate,
  setCalMonth,
  setCalYear,
  prevMonth,
  nextMonth,
  apptsByDay,
  selectedDayLabel,
  selectedDayApptCount,
  selectedDayStats,
  selectedDayAppts,
  setActiveTab,
  setViewDate,
  setSearchParams,
  navigate,
}: CalendarBoardProps) {
  return (
${calendarJsx}
  );
}
`,
);

write(
  "EditWalkinDialog.tsx",
  `import type { Dispatch, SetStateAction } from "react";
import { cn } from "../../../components/ui/utils";
import { Button } from "../../../components/ui/button";
import { Badge } from "../../../components/ui/badge";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../../components/ui/dialog";
import { Check, Edit, Phone, Plus, Scissors, User } from "lucide-react";
import { formatInr } from "../../../../lib/inventoryMappers";
import { getApiErrorMessage } from "../../../../lib/api";
import { toast } from "../../../components/ui/hot-toast";
import type { CatalogService } from "../../../../lib/serviceCatalog";
import { statusColors, type Walkin } from "./boardTypes";
import { appointmentServiceNames, customerInitials } from "./appointmentHelpers";

export type EditWalkinDialogProps = {
  editWalkin: Walkin | null;
  setEditWalkin: Dispatch<SetStateAction<Walkin | null>>;
  serviceCatalog: CatalogService[];
  persistAppointmentEdit: (params: {
    id: string;
    customer: string;
    phone: string;
    services: string[];
  }) => Promise<void>;
};

export function EditWalkinDialog({
  editWalkin,
  setEditWalkin,
  serviceCatalog,
  persistAppointmentEdit,
}: EditWalkinDialogProps) {
  return (
${editWalkinJsx}
  );
}
`,
);

write(
  "NotifyCustomerDialog.tsx",
  `import type { Dispatch, SetStateAction } from "react";
import { cn } from "../../../components/ui/utils";
import { Button } from "../../../components/ui/button";
import { Badge } from "../../../components/ui/badge";
import { Label } from "../../../components/ui/label";
import { Textarea } from "../../../components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../../components/ui/dialog";
import { AlertCircle, MessageSquare, Phone, Send } from "lucide-react";
import { toast } from "../../../components/ui/hot-toast";
import type { NotifyTarget } from "./boardTypes";
import { customerInitials } from "./appointmentHelpers";
import { NOTIFY_TEMPLATES } from "./notifyTemplates";

export type NotifyCustomerDialogProps = {
  notifyOpen: boolean;
  setNotifyOpen: Dispatch<SetStateAction<boolean>>;
  notifyTarget: NotifyTarget | null;
  notifyMsg: string;
  setNotifyMsg: Dispatch<SetStateAction<string>>;
};

export function NotifyCustomerDialog({
  notifyOpen,
  setNotifyOpen,
  notifyTarget,
  notifyMsg,
  setNotifyMsg,
}: NotifyCustomerDialogProps) {
  return (
${notifyJsx}
  );
}
`,
);

write(
  "EditAppointmentDialog.tsx",
  `import type { Dispatch, SetStateAction } from "react";
import { cn } from "../../../components/ui/utils";
import { Button } from "../../../components/ui/button";
import { Badge } from "../../../components/ui/badge";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../../components/ui/dialog";
import {
  Calendar as CalendarIcon,
  Check,
  CheckCircle,
  Clock,
  Edit,
  Phone,
  Plus,
  Scissors,
  Timer,
  User,
} from "lucide-react";
import { formatInr } from "../../../../lib/inventoryMappers";
import { getApiErrorMessage } from "../../../../lib/api";
import { toast } from "../../../components/ui/hot-toast";
import type { CatalogService } from "../../../../lib/serviceCatalog";
import { statusColors, type Appointment, type AppointmentStatus } from "./boardTypes";
import {
  appointmentServiceNames,
  customerInitials,
  totalDurationForServices,
} from "./appointmentHelpers";

export type EditAppointmentDialogProps = {
  editAppt: Appointment | null;
  setEditAppt: Dispatch<SetStateAction<Appointment | null>>;
  serviceCatalog: CatalogService[];
  persistAppointmentEdit: (params: {
    id: string;
    customer: string;
    phone: string;
    services: string[];
    status?: AppointmentStatus;
  }) => Promise<void>;
};

export function EditAppointmentDialog({
  editAppt,
  setEditAppt,
  serviceCatalog,
  persistAppointmentEdit,
}: EditAppointmentDialogProps) {
  return (
${editApptJsx}
  );
}
`,
);

write(
  "ReceiptResultDialog.tsx",
  `import type { Dispatch, SetStateAction } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "../../../components/ui/dialog";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Clock, Star } from "lucide-react";
import { formatInr } from "../../../../lib/inventoryMappers";
import { BRAND, RECEIPT_FOOTER } from "../../../config/brand";
import { SalonReceiptBrandHeader, SalonReceiptPaper } from "../../../components/shared/SalonReceiptBrand";
import type { ReceiptData } from "./boardTypes";

export type ReceiptResultDialogProps = {
  receiptOpen: boolean;
  setReceiptOpen: Dispatch<SetStateAction<boolean>>;
  receiptStep: "success" | "pending" | "receipt";
  setReceiptStep: Dispatch<SetStateAction<"success" | "pending" | "receipt">>;
  receiptData: ReceiptData | null;
  feedbackRating: number;
  setFeedbackRating: Dispatch<SetStateAction<number>>;
  feedbackHover: number;
  setFeedbackHover: Dispatch<SetStateAction<number>>;
  feedbackSubmitting: boolean;
  submitReceiptFeedbackAndGoDashboard: () => void | Promise<void>;
};

export function ReceiptResultDialog({
  receiptOpen,
  setReceiptOpen,
  receiptStep,
  setReceiptStep,
  receiptData,
  feedbackRating,
  setFeedbackRating,
  feedbackHover,
  setFeedbackHover,
  feedbackSubmitting,
  submitReceiptFeedbackAndGoDashboard,
}: ReceiptResultDialogProps) {
  return (
${receiptJsx}
  );
}
`,
);

// BillingCheckoutDialog — large props bag; destructure so JSX identifiers match originals
write(
  "BillingCheckoutDialog.tsx",
  `import type { Dispatch, SetStateAction } from "react";
import { cn } from "../../../components/ui/utils";
import { Badge } from "../../../components/ui/badge";
import { Input } from "../../../components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "../../../components/ui/dialog";
import {
  ArrowLeft,
  Bell,
  CheckCircle2,
  Clock,
  Phone,
  Plus,
  Receipt,
  Search,
  Tag,
  User,
  UserPlus,
  Wallet,
  X,
} from "lucide-react";
import { parseInr } from "../../../../lib/inventoryMappers";
import { formatDisplayPhone } from "../../../../lib/phone";
import type { CatalogService } from "../../../../lib/serviceCatalog";
import type { Customer } from "../../../../api/customers";
import { BRAND } from "../../../config/brand";
import {
  BILL_PAY_METHODS,
  PaymentMethodPicker,
  isPaymentMethodValid,
  type PaymentMethodValue,
} from "../../../components/shared/PaymentMethodPicker";
import {
  DIRECT_BILL_TIER_BADGE,
  customerInitials,
  membershipTierLabel,
} from "./appointmentHelpers";
import type { BillingItem, BillingTarget, DiscountTool } from "./boardTypes";

export type BillingCheckoutDialogProps = {
  billingOpen: boolean;
  setBillingOpen: Dispatch<SetStateAction<boolean>>;
  dismissBilling: () => void;
  isDirectBill: boolean;
  billingTarget: BillingTarget | null;
  setBillingTarget: Dispatch<SetStateAction<BillingTarget | null>>;
  scanToPayFocus: boolean;
  directCustomerMode: "search" | "new";
  setDirectCustomerMode: Dispatch<SetStateAction<"search" | "new">>;
  directCustomerSearch: string;
  setDirectCustomerSearch: Dispatch<SetStateAction<string>>;
  directCustomerSelected: boolean;
  setDirectCustomerSelected: Dispatch<SetStateAction<boolean>>;
  directBillCustomers: Customer[];
  loadLoyaltyForPhone: (phone: string) => void | Promise<void>;
  billingServiceSearch: string;
  setBillingServiceSearch: Dispatch<SetStateAction<string>>;
  serviceCatalog: CatalogService[];
  retailProducts: Array<{
    id: string;
    name: string;
    price: string;
    stock: number;
    activeStatus?: string;
  }>;
  addBillItem: (
    type: "service" | "product",
    name: string,
    price: number,
    serviceId?: string,
    productId?: string,
  ) => void;
  billingItems: BillingItem[];
  setBillingItems: Dispatch<SetStateAction<BillingItem[]>>;
  removeBillItem: (name: string) => void;
  billSubtotal: number;
  billCouponDisc: number;
  billLoyalty: number;
  discount: number;
  gstEnabled: boolean;
  setGstEnabled: Dispatch<SetStateAction<boolean>>;
  billGst: number;
  gstRate: number;
  setGstRate: Dispatch<SetStateAction<number>>;
  advanceApplied: number;
  setAdvanceApplied: Dispatch<SetStateAction<number>>;
  billDue: number;
  billGrand: number;
  setScanFocus: Dispatch<SetStateAction<boolean>>;
  discountTools: Record<DiscountTool, boolean>;
  setDiscountToolEnabled: (tool: DiscountTool, enabled: boolean) => void;
  advanceAvailable: number;
  customTaxMode: boolean;
  setCustomTaxMode: Dispatch<SetStateAction<boolean>>;
  customTaxInput: string;
  setCustomTaxInput: Dispatch<SetStateAction<string>>;
  couponApplied: { code: string; value: number; type: "%" | "₹" } | null;
  setCouponApplied: Dispatch<
    SetStateAction<{ code: string; value: number; type: "%" | "₹" } | null>
  >;
  couponInput: string;
  setCouponInput: Dispatch<SetStateAction<string>>;
  applyCouponCode: () => void;
  matchedAdvances: Array<{ service?: string; balance: number }>;
  loyaltyRedeem: number;
  setLoyaltyRedeem: Dispatch<SetStateAction<number>>;
  loyaltyAvailable: number;
  billAfterDiscs: number;
  discountMode: "pct" | "flat";
  setDiscountMode: Dispatch<SetStateAction<"pct" | "flat">>;
  discountPct: number;
  setDiscountPct: Dispatch<SetStateAction<number>>;
  discountFlat: number;
  setDiscountFlat: Dispatch<SetStateAction<number>>;
  discountReason: string;
  setDiscountReason: Dispatch<SetStateAction<string>>;
  payMethod: PaymentMethodValue;
  setPayMethod: Dispatch<SetStateAction<PaymentMethodValue>>;
  handleConfirmOnly: () => void | Promise<void>;
  handleCompletePayment: () => void | Promise<void>;
};

export function BillingCheckoutDialog(props: BillingCheckoutDialogProps) {
  const {
    billingOpen,
    setBillingOpen,
    dismissBilling,
    isDirectBill,
    billingTarget,
    setBillingTarget,
    scanToPayFocus,
    directCustomerMode,
    setDirectCustomerMode,
    directCustomerSearch,
    setDirectCustomerSearch,
    directCustomerSelected,
    setDirectCustomerSelected,
    directBillCustomers,
    loadLoyaltyForPhone,
    billingServiceSearch,
    setBillingServiceSearch,
    serviceCatalog,
    retailProducts,
    addBillItem,
    billingItems,
    setBillingItems,
    removeBillItem,
    billSubtotal,
    billCouponDisc,
    billLoyalty,
    discount,
    gstEnabled,
    setGstEnabled,
    billGst,
    gstRate,
    setGstRate,
    advanceApplied,
    setAdvanceApplied,
    billDue,
    billGrand,
    setScanFocus,
    discountTools,
    setDiscountToolEnabled,
    advanceAvailable,
    customTaxMode,
    setCustomTaxMode,
    customTaxInput,
    setCustomTaxInput,
    couponApplied,
    setCouponApplied,
    couponInput,
    setCouponInput,
    applyCouponCode,
    matchedAdvances,
    loyaltyRedeem,
    setLoyaltyRedeem,
    loyaltyAvailable,
    billAfterDiscs,
    discountMode,
    setDiscountMode,
    discountPct,
    setDiscountPct,
    discountFlat,
    setDiscountFlat,
    discountReason,
    setDiscountReason,
    payMethod,
    setPayMethod,
    handleConfirmOnly,
    handleCompletePayment,
  } = props;

  return (
${billingJsx}
  );
}
`,
);

write(
  "AppointmentDialogs.tsx",
  `import type { Dispatch, SetStateAction } from "react";
import { Button } from "../../../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../../components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../components/ui/select";
import {
  AlertCircle,
  Edit,
  Info,
  MessageSquare,
  Plus,
  PlusCircle,
  Scissors,
  X,
} from "lucide-react";
import { formatInr } from "../../../../lib/inventoryMappers";
import type { CatalogService } from "../../../../lib/serviceCatalog";
import type { Appointment, Walkin } from "./boardTypes";
import { customerInitials } from "./appointmentHelpers";

export type AppointmentDialogsProps = {
  customerInfoWalkin: Walkin | null;
  setCustomerInfoWalkin: Dispatch<SetStateAction<Walkin | null>>;
  openNotify: (name: string, phone: string) => void;
  setEditWalkin: Dispatch<SetStateAction<Walkin | null>>;
  openWalkinBilling: (w: Walkin) => void;
  startWalkin: (id: string) => void;
  walkinDeleteConfirm: string | null;
  setWalkinDeleteConfirm: Dispatch<SetStateAction<string | null>>;
  cancelWalkin: (id: string) => void | Promise<void>;
  customerInfoAppt: Appointment | null;
  setCustomerInfoAppt: Dispatch<SetStateAction<Appointment | null>>;
  setEditAppt: Dispatch<SetStateAction<Appointment | null>>;
  openBilling: (id: string, name: string, service: string) => void;
  deleteConfirm: string | null;
  setDeleteConfirm: Dispatch<SetStateAction<string | null>>;
  cancelAppointment: (id: string) => void | Promise<void>;
  detailAppt: Appointment | null;
  setDetailAppt: Dispatch<SetStateAction<Appointment | null>>;
  openExtraServices: (appt: Appointment) => void;
  extraServicesOpen: boolean;
  setExtraServicesOpen: Dispatch<SetStateAction<boolean>>;
  extraServicesTarget: Appointment | null;
  extraServicePick: string;
  setExtraServicePick: Dispatch<SetStateAction<string>>;
  serviceCatalog: CatalogService[];
  addExtraService: () => void | Promise<void>;
  removeExtraService: (id: string, name: string) => void | Promise<void>;
};

export function AppointmentDialogs({
  customerInfoWalkin,
  setCustomerInfoWalkin,
  openNotify,
  setEditWalkin,
  openWalkinBilling,
  startWalkin,
  walkinDeleteConfirm,
  setWalkinDeleteConfirm,
  cancelWalkin,
  customerInfoAppt,
  setCustomerInfoAppt,
  setEditAppt,
  openBilling,
  deleteConfirm,
  setDeleteConfirm,
  cancelAppointment,
  detailAppt,
  setDetailAppt,
  openExtraServices,
  extraServicesOpen,
  setExtraServicesOpen,
  extraServicesTarget,
  extraServicePick,
  setExtraServicePick,
  serviceCatalog,
  addExtraService,
  removeExtraService,
}: AppointmentDialogsProps) {
  return (
    <>
${dialogsWalkin}

${dialogsCustomer}

${dialogsRest}
    </>
  );
}
`,
);

console.log("All board modules extracted.");
