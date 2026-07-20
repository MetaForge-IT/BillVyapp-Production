import { useState, useMemo, useEffect } from "react";
import { cn } from "../components/ui/utils";
import { useAppointments } from "../context/AppointmentContext";
import { useReceipts } from "../context/ReceiptsContext";
import { usePendingPayments } from "../context/PendingPaymentsContext";
import { useAdvances } from "../context/AdvancesContext";
import { useCoupons } from "../context/CouponsContext";
import { confirmOnlyCheckout, completeCheckout } from "../../api/billing";
import { fetchCustomers, type Customer } from "../../api/customers";
import { authService } from "../../services/authService";
import type { Appointment as ApiAppointment, ApptStatus } from "../../api/appointments";
import { fetchServiceCatalog } from "../../api/services";
import { getApiErrorMessage } from "../../lib/api";
import { useIncentives } from "../context/IncentivesContext";
import { useProducts } from "../context/ProductsContext";
import { parseInr, formatInr } from "../../lib/inventoryMappers";
import { ProductCorrectionModal } from "../components/shared/ProductCorrectionModal";
import {
  findCatalogService,
  resolveServicePrice,
  mapApiCatalog,
  type CatalogService,
} from "../../lib/serviceCatalog";
import { useNavigate, useSearchParams } from "react-router";
import { motion, AnimatePresence } from "framer-motion";
import { triggerConfetti } from "../components/ui/success-animation";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Input } from "../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "../components/ui/dropdown-menu";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import {
  Calendar as CalendarIcon, Clock, User, Search, Plus, Filter,
  ChevronLeft, ChevronRight, LayoutGrid, List, MessageSquare,
  Phone, Edit, Trash2, CheckCircle, XCircle, UserPlus, ListOrdered,
  CreditCard, Tag, Receipt, Bell, Send, X, Check, AlertCircle,
  Timer, MoreVertical, ArrowRight, PlayCircle, Info, ArrowLeft,
  PlusCircle, Scissors, Wallet, CheckCircle2, Star,
} from "lucide-react";
import { Pagination } from "../components/shared/Pagination";
import { PageStatCard } from "../components/shared/PageStatCard";
import { useTablePagination } from "../hooks/useTablePagination";
import { SEGMENTED_PILL_LIST, SEGMENTED_PILL_TRIGGER } from "../components/layout/segmented-nav";
import { toast } from "sonner";
import { BRAND, RECEIPT_FOOTER } from "../config/brand";
import { SalonReceiptBrandHeader, SalonReceiptPaper } from "../components/shared/SalonReceiptBrand";
import {
  PaymentMethodPicker,
  createPaymentMethodValue,
  paymentMethodLabel,
  paymentMethodReference,
  primaryPayMethod,
  isPaymentMethodValid,
  type PaymentMethodValue,
} from "../components/shared/PaymentMethodPicker";

const APPOINTMENTS: Appointment[] = [];
const WALKINS: Walkin[] = [];
const QUEUE: Array<{
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


const statusColors: Record<string, string> = {
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

type AppointmentStatus =
  | "pending"
  | "confirmed"
  | "checked-in"
  | "in-progress"
  | "completed"
  | "cancelled"
  | "no-show"
  | "rescheduled";

interface Appointment {
  id: string;
  sortKey: number;
  time: string;
  duration: number;
  customer: string;
  phone: string;
  customerId?: string;
  service: string;
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

type WalkinStatus = "waiting" | "in-service" | "done";

function toApiStatus(status: AppointmentStatus | WalkinStatus): ApptStatus {
  if (status === "in-service") return "in-progress";
  if (status === "done") return "completed";
  if (status === "checked-in") return "confirmed";
  return status as ApptStatus;
}

interface Walkin {
  id: string;
  sortKey: number;
  token: string;
  customer: string;
  phone: string;
  customerId?: string;
  service: string;
  status: WalkinStatus;
  waitMins: number;
  arrival: string;
  notes?: string;
}

// ─── Timeline ordering ──────────────────────────────────────────────────────
// Most recently updated first — any status/edit bumps `updatedAt` / sortKey
// so the row moves to the top of the Timeline.
function sortAppointmentQueue(list: Appointment[]): Appointment[] {
  return [...list].sort((a, b) => {
    if (b.sortKey !== a.sortKey) return b.sortKey - a.sortKey;
    return a.time.localeCompare(b.time);
  });
}

function walkinQueueRank(status: WalkinStatus): number {
  if (status === "in-service") return 1;
  if (status === "done") return 2;
  return 0; // waiting
}

function sortWalkinQueue(list: Walkin[]): Walkin[] {
  return [...list].sort((a, b) => {
    const rankDiff = walkinQueueRank(a.status) - walkinQueueRank(b.status);
    return rankDiff !== 0 ? rankDiff : a.sortKey - b.sortKey;
  });
}

type BillingTarget = {
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
// Back button component used across sub-pages
function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <Button variant="outline" size="sm" onClick={onClick} className="flex items-center gap-1 rounded-xl border-[#d4af37]/40 hover:bg-amber-50">
      <ArrowLeft className="h-4 w-4" /> Back
    </Button>
  );
}

const NOTIFY_TEMPLATES = [
  {
    id: "confirm",
    label: "Confirmation",
    text: (name: string) =>
      `Dear ${name}, your appointment at BillVyapp is confirmed. We look forward to seeing you!`,
  },
  {
    id: "reminder",
    label: "Reminder",
    text: (name: string) =>
      `Hi ${name}, this is a friendly reminder about your upcoming appointment at BillVyapp. See you soon!`,
  },
  {
    id: "delay",
    label: "Running late",
    text: (name: string) =>
      `Hi ${name}, we're running slightly behind schedule at BillVyapp. Thank you for your patience — we'll see you shortly.`,
  },
  {
    id: "thanks",
    label: "Thank you",
    text: (name: string) =>
      `Thank you for visiting BillVyapp, ${name}! We hope you loved your experience. Book again anytime.`,
  },
] as const;

const DIRECT_BILL_TIER_BADGE: Record<string, string> = {
  Platinum: "bg-[#111118] text-[#D4AF37] border-transparent",
  Gold: "bg-[#D4AF37]/15 text-[#B8962E] border-[#D4AF37]/20",
  Silver: "bg-black/[0.06] text-[#6b6b6b] border-black/[0.08]",
  Basic: "bg-black/[0.04] text-[#9a9a9a] border-black/[0.05]",
};

function membershipTierLabel(tier: string): string {
  switch (tier.toLowerCase()) {
    case "platinum":
      return "Platinum";
    case "gold":
      return "Gold";
    case "silver":
      return "Silver";
    default:
      return "Basic";
  }
}

function buildAppointmentServicePayload(
  catalog: CatalogService[],
  serviceName: string,
  fallbackDuration = 30,
) {
  const match = findCatalogService(catalog, serviceName);
  return {
    serviceId: match?.id,
    itemName: serviceName,
    price: match?.price ?? resolveServicePrice(catalog, serviceName),
    durationMinutes: match?.duration ?? fallbackDuration,
  };
}

function customerInitials(name: string) {
  return name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
}

export function Appointments() {
  const [serviceCatalog, setServiceCatalog] = useState<CatalogService[]>([]);

  useEffect(() => {
    fetchServiceCatalog()
      .then((services) => setServiceCatalog(mapApiCatalog(services)))
      .catch((error) => toast.error(getApiErrorMessage(error, "Failed to load services")));
  }, []);

  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const {
    appointments: ctxAppointments,
    loading: apptLoading,
    updateStatus: apiUpdateStatus,
    updateAppointment: apiUpdateAppointment,
    deleteAppointment: apiDeleteAppointment,
    refresh: refreshAppointments,
  } = useAppointments();
  const { addReceipt, refresh: refreshReceipts } = useReceipts();
  const { addPendingPayment, refresh: refreshPending } = usePendingPayments();
  const { recordBillingIncentives } = useIncentives();
  const { deductBySku, products: retailProducts, refresh: refreshProducts } = useProducts();
  const { getActiveAdvancesForPhone, deductAdvance } = useAdvances();
  const { coupons } = useCoupons();
  const [loyaltyAvailable, setLoyaltyAvailable] = useState(0);
  const [billedByName, setBilledByName] = useState("");
  const [appointments, setAppointments] = useState<Appointment[]>(APPOINTMENTS);

  useEffect(() => {
    void authService.getCurrentUser().then((user) => {
      setBilledByName(user?.fullName ?? "");
    });
  }, []);

  const loadLoyaltyForPhone = async (phone: string) => {
    if (!phone) {
      setLoyaltyAvailable(0);
      return;
    }
    try {
      const customers = await fetchCustomers();
      const normalized = phone.replace(/\D/g, "").slice(-10);
      const match = customers.find(
        (c) => c.phone.replace(/\D/g, "").slice(-10) === normalized,
      );
      setLoyaltyAvailable(match?.loyaltyPoints ?? 0);
    } catch {
      setLoyaltyAvailable(0);
    }
  };

  useEffect(() => {
    const rows = ctxAppointments.map((a) => ({
      id: a.id,
      sortKey: a.sortKey || (a.updatedAt ? Date.parse(a.updatedAt) : Date.parse(a.createdAt)),
      time: a.time,
      duration: a.duration,
      customer: a.customer,
      phone: a.phone,
      customerId: a.customerId,
      service: a.service,
      status: a.status as AppointmentStatus,
      type: (a.type === "walk-in" ? "walk-in" : "appointment") as const,
      date: a.date,
      scheduledDate: a.scheduledDate,
      notes: a.notes,
    }));
    setAppointments(rows);
  }, [ctxAppointments]);

  useEffect(() => {
    const walkInRows = ctxAppointments
      .filter((a) => a.type === "walk-in")
      .map((a) => ({
        id: a.id,
        sortKey: a.sortKey,
        token: `W-${a.id.slice(-3).toUpperCase()}`,
        customer: a.customer,
        phone: a.phone,
        customerId: a.customerId,
        service: a.service,
        status: (a.status === "in-progress" ? "in-service" : a.status === "completed" ? "done" : "waiting") as WalkinStatus,
        waitMins: 0,
        arrival: a.time,
        notes: a.notes,
      }));
    setWalkins(walkInRows);
  }, [ctxAppointments]);
  const [walkins, setWalkins] = useState<Walkin[]>(WALKINS);
  const [queue, setQueue] = useState<any[]>(QUEUE);
  const [editAppt, setEditAppt] = useState<Appointment | null>(null);
  const [detailAppt, setDetailAppt] = useState<Appointment | null>(null);
  const [expandedServices, setExpandedServices] = useState<Set<string>>(new Set());
  const [customerInfoAppt, setCustomerInfoAppt] = useState<Appointment | null>(null);
  const [notifyOpen, setNotifyOpen] = useState(false);
  const [notifyTarget, setNotifyTarget] = useState<{ name: string; phone: string } | null>(null);
  const [notifyMsg, setNotifyMsg] = useState("");
  const [billingOpen, setBillingOpen] = useState(false);
  const [directBillCustomers, setDirectBillCustomers] = useState<Customer[]>([]);
  const [billingTarget, setBillingTarget] = useState<BillingTarget | null>(null);
  const [isDirectBill, setIsDirectBill] = useState(false);
  const [directCustomerSearch, setDirectCustomerSearch] = useState("");
  const [directCustomerMode, setDirectCustomerMode] = useState<"search" | "new">("search");
  const [directCustomerSelected, setDirectCustomerSelected] = useState(false);

  useEffect(() => {
    if (!billingOpen || !isDirectBill) return;
    let cancelled = false;
    fetchCustomers()
      .then((rows) => {
        if (!cancelled) setDirectBillCustomers(rows);
      })
      .catch(() => {
        if (!cancelled) setDirectBillCustomers([]);
      });
    return () => {
      cancelled = true;
    };
  }, [billingOpen, isDirectBill]);

  const [billingItems, setBillingItems] = useState<{
    type: "service" | "product";
    name: string;
    price: number;
    qty: number;
    serviceId?: string;
    productId?: string;
  }[]>([]);
  const [discount, setDiscount] = useState(0);
  const [advanceApplied, setAdvanceApplied] = useState(0);
  const [payMethod, setPayMethod] = useState<PaymentMethodValue>(createPaymentMethodValue());
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [receiptStep, setReceiptStep] = useState<"success" | "pending" | "receipt">("success");
  const [receiptData, setReceiptData] = useState<{
    invoiceNo: string; customer: string; date: string; items: { name: string; qty: number; rate: number; total: number }[];
    subtotal: number; gst: number; roundOff: number; grandTotal: number; paymentMethod: string; loyaltyEarned: number;
  } | null>(null);
  const [billingMenuTab, setBillingMenuTab] = useState<"services" | "products" | "combos">("services");
  const [billingGenderTab, setBillingGenderTab] = useState<"all" | "male" | "female">("all");
  const [billingServiceSearch, setBillingServiceSearch] = useState("");
  const [billingNotes, setBillingNotes] = useState("");
  const [billingReferral, setBillingReferral] = useState("");
  // â”€â”€ Billing extras â”€â”€
  const [gstEnabled, setGstEnabled] = useState(false);
  const [gstRate, setGstRate] = useState(5);
  const [customTaxMode, setCustomTaxMode] = useState(false);
  const [customTaxInput, setCustomTaxInput] = useState("");
  const [couponInput, setCouponInput] = useState("");
  const [couponApplied, setCouponApplied] = useState<{ code: string; value: number; type: "%" | "₹" } | null>(null);
  const [giftCardInput, setGiftCardInput] = useState("");
  const [giftCardApplied, setGiftCardApplied] = useState<{ code: string; amount: number } | null>(null);
  const [loyaltyRedeem, setLoyaltyRedeem] = useState(0);
  const [billingAppointmentType, setBillingAppointmentType] = useState<"appointment" | "walk-in">("appointment");
  const [walkinSearch, setWalkinSearch] = useState("");
  const [walkinStatusFilter, setWalkinStatusFilter] = useState<"all" | WalkinStatus>("all");
  const [editWalkin, setEditWalkin] = useState<Walkin | null>(null);
  const [customerInfoWalkin, setCustomerInfoWalkin] = useState<Walkin | null>(null);
  const [walkinDeleteConfirm, setWalkinDeleteConfirm] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [correctionAppt, setCorrectionAppt] = useState<{ id: string; service: string } | null>(null);
  const [selectedCalDate, setSelectedCalDate] = useState<number | null>(() => new Date().getDate());
  const [calMonth, setCalMonth] = useState(() => new Date().getMonth());
  const [calYear, setCalYear] = useState(() => new Date().getFullYear());
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  const dateParam = searchParams.get("date");
  const typeParam = searchParams.get("type");
  const focusAppointmentId = searchParams.get("appointment");
  const activeTab = tabParam === "calendar" ? "calendar" : "timeline";
  const setActiveTab = (tab: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (tab === "timeline") next.delete("tab");
      else next.set("tab", tab);
      return next;
    }, { replace: true });
  };

  const toDateKey = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  const setViewDate = (d: Date) => {
    setCurrentDate(d);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("date", toDateKey(d));
      next.delete("appointment");
      return next;
    }, { replace: true });
  };

  // Legacy ?tab=walkins → Timeline with Walk-ins type filter
  useEffect(() => {
    if (tabParam !== "walkins") return;
    setFilterType("walk-in");
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete("tab");
      next.set("type", "walk-in");
      return next;
    }, { replace: true });
  }, [tabParam, setSearchParams]);

  useEffect(() => {
    if (typeParam === "walk-in" || typeParam === "appointment") {
      setFilterType(typeParam);
    } else if (typeParam === "all" || typeParam === null) {
      // keep current unless explicitly all
      if (typeParam === "all") setFilterType("all");
    }
  }, [typeParam]);

  const setFilterTypeAndUrl = (value: string) => {
    setFilterType(value);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value === "all") next.delete("type");
      else next.set("type", value);
      return next;
    }, { replace: true });
  };

  useEffect(() => {
    if (!dateParam) return;
    const [year, month, day] = dateParam.split("-").map(Number);
    if (!year || !month || !day) return;
    setCurrentDate(new Date(year, month - 1, day));
  }, [dateParam]);

  // Deep-link from dashboard Upcoming Appointments → show that booking
  useEffect(() => {
    if (!focusAppointmentId) return;
    setFilterStatus("all");
    setFilterType("all");
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete("tab");
      return next;
    }, { replace: true });
  }, [focusAppointmentId, setSearchParams]);

  const clearDateFilter = () => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete("date");
      next.delete("appointment");
      return next;
    }, { replace: true });
  };

  const clearAppointmentFocus = () => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete("appointment");
      return next;
    }, { replace: true });
  };

  // Extra services modal (for in-progress appointments)
  const [extraServicesOpen, setExtraServicesOpen] = useState(false);
  const [extraServicesTarget, setExtraServicesTarget] = useState<Appointment | null>(null);
  const [extraServicePick, setExtraServicePick] = useState("");

  const navigate = useNavigate();

  const formatDate = (d: Date) => d.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  const filteredAppts = sortAppointmentQueue(appointments.filter(a => {
    const isFocused = Boolean(focusAppointmentId && a.id === focusAppointmentId);
    const matchSearch = isFocused || a.customer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.service.toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus = isFocused || (
      filterStatus === "all"
        ? !["completed", "cancelled", "no-show"].includes(a.status)
        : filterStatus === "waiting"
          ? ["pending", "confirmed", "checked-in"].includes(a.status)
          : a.status === filterStatus
    );
    const matchType = isFocused || filterType === "all" || a.type === filterType;
    const matchDate = isFocused || !dateParam || a.scheduledDate === dateParam;
    return matchSearch && matchStatus && matchType && matchDate;
  }));

  const apptsPagination = useTablePagination(filteredAppts.length, [searchQuery, filterStatus, filterType, dateParam, focusAppointmentId]);
  const paginatedAppts = useMemo(() => apptsPagination.paginate(filteredAppts), [filteredAppts, apptsPagination]);

  // Jump to the focused appointment's page and scroll it into view
  useEffect(() => {
    if (!focusAppointmentId) return;
    const idx = filteredAppts.findIndex((a) => a.id === focusAppointmentId);
    if (idx < 0) return;
    const targetPage = Math.floor(idx / apptsPagination.pageSize) + 1;
    if (apptsPagination.page !== targetPage) {
      apptsPagination.setPage(targetPage);
      return;
    }
    const timer = window.setTimeout(() => {
      document.getElementById(`appt-row-${focusAppointmentId}`)?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 80);
    return () => window.clearTimeout(timer);
  }, [focusAppointmentId, filteredAppts, apptsPagination.page, apptsPagination.pageSize, apptsPagination.setPage]);

  const filteredWalkins = useMemo(() => sortWalkinQueue(walkins.filter(w => {
    const q = walkinSearch.toLowerCase();
    const matchSearch =
      w.customer.toLowerCase().includes(q) ||
      w.service.toLowerCase().includes(q) ||
      w.token.toLowerCase().includes(q) ||
      w.phone.includes(walkinSearch);
    const matchStatus = walkinStatusFilter === "all" || w.status === walkinStatusFilter;
    return matchSearch && matchStatus;
  })), [walkins, walkinSearch, walkinStatusFilter]);

  const walkinsPagination = useTablePagination(filteredWalkins.length, [walkinSearch, walkinStatusFilter]);
  const paginatedWalkins = useMemo(() => walkinsPagination.paginate(filteredWalkins), [filteredWalkins, walkinsPagination]);
  const queuePagination = useTablePagination(queue.length);
  const paginatedQueue = useMemo(() => queuePagination.paginate(queue), [queue, queuePagination]);

  const persistStatus = async (
    id: string,
    status: AppointmentStatus | WalkinStatus,
    options?: { successMessage?: string; onSuccess?: () => void },
  ) => {
    try {
      await apiUpdateStatus(id, toApiStatus(status));
      options?.onSuccess?.();
      if (options?.successMessage) {
        toast.success(options.successMessage);
      }
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to update appointment status"));
    }
  };

  const persistAppointmentEdit = async (params: {
    id: string;
    customer: string;
    phone: string;
    service: string;
    status?: AppointmentStatus;
    duration?: number;
  }) => {
    await apiUpdateAppointment(params.id, {
      customerName: params.customer.trim(),
      customerPhone: params.phone.trim(),
      ...(params.status ? { status: toApiStatus(params.status) } : {}),
      services: [
        buildAppointmentServicePayload(
          serviceCatalog,
          params.service,
          params.duration ?? 30,
        ),
      ],
    });
    await refreshAppointments();
  };

  const startAppointment = (id: string) => {
    void persistStatus(id, "in-progress", { successMessage: "Appointment started" });
  };

  const checkInAppointment = (id: string) => {
    void persistStatus(id, "checked-in", { successMessage: "Customer checked in" });
  };

  const noShowAppointment = (id: string) => {
    void persistStatus(id, "no-show", { successMessage: "Marked as no-show" });
  };

  const completeAppointment = async (id: string) => {
    const appt = appointments.find((a) => a.id === id);
    try {
      await apiUpdateStatus(id, "completed");
      if (appt) {
        const used = getProductsForService(appt.service);
        await Promise.all(
          used.map((p) =>
            deductBySku(p.sku, p.qty, "Service Used", `APT-${id}`, `Used in: ${appt.service}`),
          ),
        );
      }
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to complete appointment"));
    }
  };

  const cancelAppointment = (id: string) => {
    void persistStatus(id, "cancelled", {
      successMessage: "Appointment cancelled",
      onSuccess: () => setDeleteConfirm(null),
    });
  };

  const confirmAppointment = (id: string) => {
    void persistStatus(id, "confirmed", { successMessage: "Appointment confirmed" });
  };

  const rebookAppointment = () => {
    navigate("/appointments/new");
  };

  const openNotify = (name: string, phone: string) => {
    setNotifyTarget({ name, phone });
    setNotifyMsg(NOTIFY_TEMPLATES[0].text(name));
    setNotifyOpen(true);
  };

  const openBilling = (id: string, name: string, service: string) => {
    const appt = appointments.find(a => a.id === id);
    setBillingTarget({
      id,
      name,
      phone: appt?.phone || "",
      service,
      type: appt?.type || "appointment",
      time: appt?.time,
      customerId: appt?.customerId,
      sourceKind: "appointment",
    });
    setBillingAppointmentType(appt?.type === "walk-in" ? "walk-in" : "appointment");

    const serviceNames: string[] = (appt as Appointment & { services?: string[] })?.services?.length
      ? (appt as Appointment & { services?: string[] }).services!
      : service.split(",").map((s: string) => s.trim()).filter(Boolean);

    const serviceLines = (appt as ApiAppointment | undefined)?.serviceLines;
    const baseItems = serviceLines?.length
      ? serviceLines.map((line) => ({
          type: "service" as const,
          name: line.itemName,
          price: line.price,
          qty: 1,
          serviceId: line.serviceId,
        }))
      : serviceNames.map((svcName) => {
          const match = findCatalogService(serviceCatalog, svcName);
          return {
            type: "service" as const,
            name: svcName,
            price: match?.price ?? resolveServicePrice(serviceCatalog, svcName),
            qty: 1,
            serviceId: match?.id,
          };
        });

    const extras = (appt?.extraServices || []).map(e => ({ type: "service" as const, name: e.name, price: e.price, qty: 1 }));
    setBillingItems([...baseItems, ...extras]);
    setDiscount(0);
    setAdvanceApplied(0);
    setPayMethod(createPaymentMethodValue());
    setIsDirectBill(false);
    void loadLoyaltyForPhone(appt?.phone || "");
    setBillingOpen(true);
  };

  const openWalkinBilling = (w: Walkin) => {
    setBillingTarget({
      id: w.id,
      name: w.customer,
      phone: w.phone,
      service: w.service,
      type: "walk-in",
      time: w.arrival,
      token: w.token,
      sourceKind: "walkin",
    });
    setBillingAppointmentType("walk-in");
    setBillingItems([{
      type: "service",
      name: w.service,
      price: findCatalogService(serviceCatalog, w.service)?.price ?? resolveServicePrice(serviceCatalog, w.service),
      qty: 1,
      serviceId: findCatalogService(serviceCatalog, w.service)?.id,
    }]);
    setDiscount(0);
    setAdvanceApplied(0);
    setPayMethod(createPaymentMethodValue());
    setIsDirectBill(false);
    void loadLoyaltyForPhone(w.phone);
    setBillingOpen(true);
  };

  const startWalkin = (id: string) => {
    void persistStatus(id, "in-service", {
      successMessage: "Service started",
    });
  };

  const completeWalkin = async (id: string) => {
    await persistStatus(id, "done");
  };

  const cancelWalkin = async (id: string) => {
    try {
      await apiDeleteAppointment(id);
      setWalkinDeleteConfirm(null);
      toast.success("Walk-in removed");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to remove walk-in"));
    }
  };

  const billSubtotal    = billingItems.reduce((s, i) => s + i.price * i.qty, 0);
  const billCouponDisc  = couponApplied
    ? couponApplied.type === "%" ? Math.round(billSubtotal * couponApplied.value / 100) : couponApplied.value
    : 0;
  const billGiftCard    = giftCardApplied ? Math.min(giftCardApplied.amount, billSubtotal - billCouponDisc) : 0;
  const billLoyalty     = Math.min(loyaltyRedeem * 0.5, billSubtotal - billCouponDisc - billGiftCard);
  const billAfterDiscs  = Math.max(0, billSubtotal - billCouponDisc - billGiftCard - billLoyalty - discount);
  const billGst         = gstEnabled ? Math.round(billAfterDiscs * gstRate / 100) : 0;
  const billTotal       = billSubtotal; // kept for legacy refs
  const billFinal       = billAfterDiscs + billGst;
  const billGrand        = Math.max(0, Math.round(billFinal)); // full bill value, pre-advance
  const matchedAdvances  = billingTarget?.phone ? getActiveAdvancesForPhone(billingTarget.phone) : [];
  const advanceAvailable = matchedAdvances.reduce((s, a) => s + a.balance, 0);
  const billDue           = Math.max(0, billGrand - advanceApplied); // what still needs collecting via cash/card/upi/etc.

  const addBillItem = (type: "service" | "product", name: string, price: number, serviceId?: string, productId?: string) => {
    setBillingItems(prev => {
      const existing = prev.find(i =>
        type === "product"
          ? i.productId === productId
          : i.name === name && i.type === type && i.serviceId === serviceId,
      );
      if (existing) {
        return prev.map(i =>
          (type === "product" ? i.productId === productId : i.name === name && i.type === type && i.serviceId === serviceId)
            ? { ...i, qty: i.qty + 1 }
            : i,
        );
      }
      return [...prev, { type, name, price, qty: 1, serviceId, productId }];
    });
  };

  const removeBillItem = (name: string) => {
    setBillingItems(prev => prev.filter(i => i.name !== name));
  };

  // Draws `amount` down across the customer's active advance records (oldest
  // first), reducing each balance in AdvancesContext. Called once the bill
  // this amount was applied to is actually confirmed as paid.
  const settleAppliedAdvance = (amount: number) => {
    let remaining = amount;
    for (const adv of matchedAdvances) {
      if (remaining <= 0) break;
      const draw = Math.min(adv.balance, remaining);
      if (draw > 0) {
        void deductAdvance(adv.id, draw);
        remaining -= draw;
      }
    }
  };

  const openExtraServices = (appt: Appointment) => {
    setExtraServicesTarget(appt);
    setExtraServicePick("");
    setExtraServicesOpen(true);
  };

  const addExtraService = () => {
    if (!extraServicePick || !extraServicesTarget) return;
    const svc = findCatalogService(serviceCatalog, extraServicePick);
    if (!svc) return;
    setAppointments(prev => prev.map(a => {
      if (a.id !== extraServicesTarget.id) return a;
      const current = a.extraServices || [];
      return { ...a, extraServices: [...current, { name: svc.name, price: svc.price }] };
    }));
    setExtraServicePick("");
    // Update target reference
    setExtraServicesTarget(prev => prev ? { ...prev, extraServices: [...(prev.extraServices || []), { name: svc.name, price: svc.price }] } : prev);
  };

  const removeExtraService = (apptId: number, serviceName: string) => {
    setAppointments(prev => prev.map(a => {
      if (a.id !== apptId) return a;
      return { ...a, extraServices: (a.extraServices || []).filter(e => e.name !== serviceName) };
    }));
    setExtraServicesTarget(prev => prev ? { ...prev, extraServices: (prev.extraServices || []).filter(e => e.name !== serviceName) } : prev);
  };

  const resetBillingForm = () => {
    setCouponApplied(null);
    setGiftCardApplied(null);
    setLoyaltyRedeem(0);
    setDiscount(0);
    setAdvanceApplied(0);
    setPayMethod(createPaymentMethodValue());
    setBillingNotes("");
  };

  const finalizeAppointmentAfterCheckout = async () => {
    if (!billingTarget) return;
    if (billingTarget.sourceKind === "walkin") {
      await completeWalkin(billingTarget.id);
    } else if (billingTarget.id) {
      await completeAppointment(billingTarget.id);
    }
  };

  const buildCheckoutPayload = (grand: number) => ({
    customerId: billingTarget?.customerId || undefined,
    customerName: billingTarget?.name || "Walk-in Customer",
    customerPhone: billingTarget?.phone || "",
    appointmentId: billingTarget?.id || undefined,
    source: (isDirectBill
      ? "pos"
      : billingTarget?.sourceKind === "walkin"
        ? "walk-in"
        : "appointment") as "walk-in" | "appointment" | "pos",
    items: billingItems.map((item) => ({
      lineType: item.type,
      serviceId: item.serviceId,
      productId: item.productId,
      itemName: item.name,
      quantity: item.qty,
      unitPrice: item.price,
    })),
    subtotal: billSubtotal,
    discountAmount: discount + billCouponDisc + billGiftCard + billLoyalty,
    couponDiscount: billCouponDisc,
    gstRate: gstEnabled ? gstRate : 0,
    gstAmount: billGst,
    totalAmount: grand,
    notes: billingNotes || undefined,
    dueDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
  });

  const buildReceiptSnapshot = (
    invoiceNo: string,
    grand: number,
    payLabel: string,
    roundOff: number,
    loyaltyEarned: number,
  ) => ({
    invoiceNo,
    customer: billingTarget?.name || "Walk-in Customer",
    date: new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
    items: billingItems.map((item) => ({
      name: item.name,
      qty: item.qty,
      rate: item.price,
      total: item.price * item.qty,
    })),
    subtotal: billSubtotal,
    gst: billGst,
    roundOff,
    grandTotal: grand,
    paymentMethod: payLabel,
    loyaltyEarned,
  });

  const handleConfirmOnly = async () => {
    if (!billingTarget || billingItems.length === 0) {
      toast.error("Add at least one service or product before confirming.");
      return;
    }

    const grand = Math.max(0, Math.round(billFinal));
    const roundOff = Math.round(billFinal) - billFinal;

    try {
      const invoice = await confirmOnlyCheckout(buildCheckoutPayload(grand));
      // Show success UI immediately — list refreshes must not block the receipt dialog
      // (under parallel E2E load those GETs can exceed Playwright's default 5s timeout).
      setReceiptData(buildReceiptSnapshot(
        invoice.receiptNumber,
        grand,
        "Pending",
        roundOff,
        0,
      ));
      setBillingOpen(false);
      resetBillingForm();
      setReceiptStep("pending");
      setReceiptOpen(true);
      toast.success("Appointment confirmed", {
        description: `Invoice ${invoice.receiptNumber} created with outstanding balance of ₹${grand.toLocaleString()}`,
      });
      void Promise.all([refreshReceipts(), refreshPending(), refreshAppointments(), refreshProducts()])
        .then(() => finalizeAppointmentAfterCheckout())
        .catch(() => {});
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to confirm appointment"));
    }
  };

  const handleCompletePayment = async () => {
    if (!billingTarget || billingItems.length === 0) {
      toast.error("Add at least one service or product before collecting payment.");
      return;
    }

    const grand = billGrand;   // full bill value — receipt total, loyalty basis
    const dueNow = billDue;    // amount actually collected via the selected payment method (bill minus any advance applied)
    const roundOff = Math.round(billFinal) - billFinal;
    const now = new Date();

    let payLabel = "";
    if (dueNow === 0) payLabel = "Fully covered by advance";
    else payLabel = paymentMethodLabel(payMethod, dueNow);
    if (advanceApplied > 0) payLabel = `Advance ₹${advanceApplied.toLocaleString()} applied${dueNow > 0 ? ` + ${payLabel}` : ""}`;

    const receiptPayMethod = primaryPayMethod(payMethod);

    const payments =
      dueNow === 0 && advanceApplied === 0
        ? [{ paymentMethod: receiptPayMethod, amount: grand }]
        : [
            ...(advanceApplied > 0
              ? [{ paymentMethod: "wallet" as const, amount: advanceApplied }]
              : []),
            ...(dueNow > 0
              ? payMethod.method === "split"
                ? payMethod.splitRows
                    .filter((r) => parseFloat(r.amount) > 0)
                    .map((r) => ({
                      paymentMethod: r.method,
                      amount: parseFloat(r.amount),
                      reference: r.ref || undefined,
                    }))
                : [{
                    paymentMethod: receiptPayMethod,
                    amount: dueNow,
                    reference: paymentMethodReference(payMethod),
                  }]
              : []),
          ];

    try {
      const invoice = await completeCheckout({
        ...buildCheckoutPayload(grand),
        payments,
        loyaltyPointsEarned: Math.floor(grand / 10),
      });

      recordBillingIncentives({
        customerName: billingTarget?.name || "",
        receiptRef: invoice.receiptNumber,
        items: billingItems
          .filter((i) => i.type === "service")
          .map((i) => ({ name: i.name, rate: i.price, qty: i.qty })),
      });

      if (advanceApplied > 0) settleAppliedAdvance(advanceApplied);

      await Promise.all([refreshReceipts(), refreshPending(), refreshAppointments(), refreshProducts()]);
      await finalizeAppointmentAfterCheckout();
      setReceiptData(buildReceiptSnapshot(
        invoice.receiptNumber,
        grand,
        payLabel,
        roundOff,
        Math.floor(grand / 10),
      ));
      setBillingOpen(false);
      resetBillingForm();
      setReceiptStep("success");
      triggerConfetti();
      setReceiptOpen(true);
      toast.success("Payment completed", {
        description: `Receipt ${invoice.receiptNumber} · ₹${grand.toLocaleString()}`,
      });
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to complete payment"));
    }
  };

  // Calendar helpers
  const monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(calYear, calMonth, 1).getDay();
  const calendarDays = Array.from({ length: 42 }, (_, i) => {
    const day = i - firstDayOfMonth + 1;
    return day;
  });
  const apptsByDay = useMemo(() => {
    const counts: Record<number, { total: number; appointments: number; walkIns: number }> = {};
    for (const a of appointments) {
      if (!a.scheduledDate) continue;
      const [y, m, d] = a.scheduledDate.split("-").map(Number);
      if (y !== calYear || m !== calMonth + 1 || d < 1) continue;
      const bucket = counts[d] ?? { total: 0, appointments: 0, walkIns: 0 };
      bucket.total += 1;
      if (a.type === "walk-in") bucket.walkIns += 1;
      else bucket.appointments += 1;
      counts[d] = bucket;
    }
    return counts;
  }, [appointments, calMonth, calYear]);

  const selectedDayAppts = useMemo(() => {
    if (!selectedCalDate) return [];
    const key = `${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(selectedCalDate).padStart(2, "0")}`;
    return sortAppointmentQueue(
      appointments.filter((a) => a.scheduledDate === key),
    );
  }, [appointments, selectedCalDate, calMonth, calYear]);

  const selectedDayStats = useMemo(() => {
    const appointmentsCount = selectedDayAppts.filter((a) => a.type === "appointment").length;
    const walkInsCount = selectedDayAppts.filter((a) => a.type === "walk-in").length;
    return { appointmentsCount, walkInsCount, total: selectedDayAppts.length };
  }, [selectedDayAppts]);

  // Keep calendar in sync with DB when the tab is opened
  useEffect(() => {
    if (activeTab !== "calendar") return;
    void refreshAppointments();
  }, [activeTab, refreshAppointments]);

  const prevMonth = () => {
    if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); }
    else setCalMonth(m => m - 1);
    setSelectedCalDate(null);
  };
  const nextMonth = () => {
    if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); }
    else setCalMonth(m => m + 1);
    setSelectedCalDate(null);
  };

  const selectedDayApptCount = selectedDayStats.total;
  const selectedDayLabel = selectedCalDate
    ? `${monthNames[calMonth]} ${selectedCalDate}, ${calYear}`
    : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-[#1a1a1a] to-[#d4af37] bg-clip-text text-transparent">
            Appointments
          </h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">Timeline · Calendar · Billing</p>
        </div>
        <div className="flex gap-2 flex-wrap shrink-0">
          <Button size="lg" className="rounded-xl shadow-lg flex-1 sm:flex-none" onClick={() => navigate("/appointments/new")}>
            <Plus className="h-5 w-5 mr-1" /> New Appointment
          </Button>
          <Button size="lg" variant="outline" className="rounded-xl shadow border-[#d4af37] text-[#9a7a1e] hover:bg-[#d4af37]/10 flex-1 sm:flex-none"
            onClick={() => {
              setBillingTarget({ id: "", name: "", phone: "", service: "", sourceKind: "appointment" });
              setBillingItems([]);
              setDiscount(0);
              setAdvanceApplied(0);
              setPayMethod(createPaymentMethodValue());
              setIsDirectBill(true);
              setDirectCustomerSearch("");
              setDirectCustomerMode("search");
              setDirectCustomerSelected(false);
              setBillingOpen(true);
            }}>
            <Receipt className="h-5 w-5 mr-1" /> Direct Bill
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
        <PageStatCard
          label="Today's Total"
          value={appointments.length}
          icon={CalendarIcon}
          index={0}
          onClick={() => { setFilterStatus("all"); setFilterTypeAndUrl("all"); setActiveTab("timeline"); }}
        />
        <PageStatCard
          label="Checked In"
          value={appointments.filter(a => a.status === "checked-in").length}
          icon={CheckCircle}
          index={1}
          onClick={() => { setActiveTab("timeline"); setFilterStatus("all"); }}
        />
        <PageStatCard
          label="In Progress"
          value={appointments.filter(a => a.status === "in-progress").length}
          icon={PlayCircle}
          index={2}
          onClick={() => setFilterStatus("in-progress")}
        />
        <PageStatCard
          label="No Shows"
          value={appointments.filter(a => a.status === "no-show").length}
          icon={XCircle}
          index={3}
          onClick={() => { setActiveTab("timeline"); setFilterStatus("all"); }}
        />
        <PageStatCard
          label="Pending"
          value={appointments.filter(a => a.status === "pending").length}
          icon={Clock}
          index={4}
          onClick={() => setFilterStatus("waiting")}
        />
        <PageStatCard
          label="Walk-ins"
          value={appointments.filter(a => a.type === "walk-in" && !["completed", "cancelled", "no-show"].includes(a.status)).length}
          icon={Timer}
          index={5}
          onClick={() => { setActiveTab("timeline"); setFilterTypeAndUrl("walk-in"); }}
        />
      </div>

      {/* Date nav + Search + Filters */}
      <div className="rounded-2xl bg-white border border-[#D4AF37]/15 shadow-[0_2px_12px_rgba(212,175,55,0.06)] overflow-hidden">
        {/* Top row: date nav */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-3 sm:px-5 sm:py-3.5 border-b border-gray-100">
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={() => setViewDate(new Date(currentDate.getTime() - 86400000))}
              className="h-8 w-8 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 flex items-center justify-center text-gray-500 hover:text-[#111118] transition-all">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-2 px-4 py-1.5 rounded-xl bg-[#111118]">
              <CalendarIcon className="h-3.5 w-3.5 text-[#D4AF37]" />
              <span className="text-[13px] font-bold text-white">
                {dateParam ? formatDate(currentDate) : "All dates"}
              </span>
            </div>
            <button onClick={() => setViewDate(new Date(currentDate.getTime() + 86400000))}
              className="h-8 w-8 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 flex items-center justify-center text-gray-500 hover:text-[#111118] transition-all">
              <ChevronRight className="h-4 w-4" />
            </button>
            <button onClick={() => setViewDate(new Date())}
              className="h-8 px-4 rounded-xl border border-[#D4AF37]/30 bg-[#D4AF37]/08 text-[12px] font-bold text-[#9a7d20] hover:bg-[#D4AF37]/15 transition-all">
              Today
            </button>
          </div>
        </div>

        {/* Bottom row: search + filters */}
        <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3 px-3 py-3 sm:px-5">
          {dateParam && (
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="inline-flex items-center gap-2 rounded-xl border border-[#D4AF37]/35 bg-[#FFFBEB] px-3 py-1.5 text-[12px] font-semibold text-[#9a7d20]">
                <CalendarIcon className="h-3.5 w-3.5" />
                Showing {new Date(`${dateParam}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                <button type="button" onClick={clearDateFilter} className="text-[#9a9a9a] hover:text-[#111118]">
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            </div>
          )}
          {focusAppointmentId && (
            <span className="inline-flex items-center gap-2 rounded-xl border border-[#111118]/15 bg-[#111118] px-3 py-1.5 text-[12px] font-semibold text-[#D4AF37]">
              Focused booking
              <button type="button" onClick={clearAppointmentFocus} className="text-white/50 hover:text-white" aria-label="Clear focus">
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          )}
          {/* Search */}
          <div className="relative w-full sm:w-auto sm:flex-1 sm:max-w-xs">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
            <input
              placeholder="Search appointments..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="h-9 w-full pl-9 pr-4 rounded-xl border border-gray-200 text-[13px] bg-gray-50 focus:bg-white focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/12 transition-all placeholder:text-gray-400"
            />
          </div>

          {/* Status filter — pill buttons */}
          <div className="flex gap-1 p-1 rounded-xl bg-gray-100 border border-gray-200 overflow-x-auto table-scroll">
            {([
              { v: "all",         label: "All Status"  },
              { v: "waiting",     label: "Waiting"     },
              { v: "in-progress", label: "In Progress" },
              { v: "completed",   label: "Completed"   },
            ] as const).map(({ v, label }) => (
              <button key={v} onClick={() => setFilterStatus(v)}
                className={cn("h-7 px-3 rounded-lg text-[11px] font-bold transition-all whitespace-nowrap",
                  filterStatus === v ? "bg-[#111118] text-[#D4AF37] shadow-sm" : "text-gray-500 hover:text-[#111118]")}>
                {label}
              </button>
            ))}
          </div>

          {/* Type filter */}
          <Select value={filterType} onValueChange={setFilterTypeAndUrl}>
            <SelectTrigger className="h-9 w-36 rounded-xl border-gray-200 bg-gray-50 text-[13px] font-medium focus:border-[#D4AF37] focus:ring-[#D4AF37]/12">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="appointment">Appointments</SelectItem>
              <SelectItem value="walk-in">Walk-ins</SelectItem>
            </SelectContent>
          </Select>

          {/* Result count */}
          <span className="text-[11px] text-gray-400 font-medium sm:ml-auto">{filteredAppts.length} result{filteredAppts.length !== 1 ? "s" : ""}</span>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className={SEGMENTED_PILL_LIST}>
          <TabsTrigger value="timeline" className={SEGMENTED_PILL_TRIGGER}>
            <List className="h-3.5 w-3.5" />
            Timeline
          </TabsTrigger>
          <TabsTrigger value="calendar" className={SEGMENTED_PILL_TRIGGER}>
            <CalendarIcon className="h-3.5 w-3.5" />
            Calendar
          </TabsTrigger>
        </TabsList>

        {/* â”€â”€ TIMELINE TAB â”€â”€ Default: Detailed Table */}
        <TabsContent value="timeline" className="space-y-4">

          {filteredAppts.length === 0 && (
            <Card><CardContent className="py-12 text-center text-muted-foreground">No appointments or walk-ins match your filters.</CardContent></Card>
          )}
          <Card className="shadow-lg">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-[#FAF8F2]">
                        <th className="text-left p-3 text-[11px] font-bold uppercase tracking-wider text-[#9a9a9a]">Time</th>
                        <th className="text-left p-3 text-[11px] font-bold uppercase tracking-wider text-[#9a9a9a]">Customer</th>
                        <th className="text-left p-3 text-[11px] font-bold uppercase tracking-wider text-[#9a9a9a]">Phone</th>
                        <th className="text-left p-3 text-[11px] font-bold uppercase tracking-wider text-[#9a9a9a]">Services</th>
                        <th className="text-left p-3 text-[11px] font-bold uppercase tracking-wider text-[#9a9a9a]">Duration</th>
                        <th className="text-left p-3 text-[11px] font-bold uppercase tracking-wider text-[#9a9a9a]">Type</th>
                        <th className="text-left p-3 text-[11px] font-bold uppercase tracking-wider text-[#9a9a9a]">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedAppts.map((a, idx) => {
                        // Build full services list: primary + extras
                        const allServices = [
                          a.service,
                          ...((a.extraServices ?? []).map(e => e.name)),
                        ].filter(Boolean);
                        const MAX_SHOW = 2;
                        const isExpanded = expandedServices.has(a.id);
                        const visibleServices = isExpanded ? allServices : allServices.slice(0, MAX_SHOW);
                        const hiddenCount = allServices.length - MAX_SHOW;

                        // Determine action state
                        const notStarted = ["pending", "confirmed", "checked-in"].includes(a.status);
                        const inProgress = a.status === "in-progress";
                        const isDone     = ["completed", "cancelled", "no-show"].includes(a.status);

                        return (
                          <tr
                            id={`appt-row-${a.id}`}
                            key={a.id}
                            className={`border-b transition-colors hover:bg-[#faf9f7] ${
                              focusAppointmentId === a.id
                                ? "bg-[#FFFBEB] ring-2 ring-inset ring-[#D4AF37]/50"
                                : idx % 2 === 0
                                  ? "bg-white"
                                  : "bg-[#FAFAFA]"
                            }`}
                          >

                            {/* Time */}
                            <td className="p-3 whitespace-nowrap">
                              <span className="font-mono bg-[#1a1a1a] text-white text-[11px] px-2 py-1 rounded-md">{a.time}</span>
                            </td>

                            {/* Customer — clickable to show info */}
                            <td className="p-3">
                              <button
                                type="button"
                                onClick={() => setCustomerInfoAppt(a)}
                                className="group flex items-center gap-2 text-left hover:no-underline"
                              >
                                <div className="h-7 w-7 rounded-full bg-gradient-to-br from-[#d4af37] to-[#c9a227] flex items-center justify-center text-[#111] text-[9px] font-black shrink-0">
                                  {a.customer.split(" ").map(n => n[0]).join("").slice(0,2)}
                                </div>
                                <span className="font-semibold text-[#1a1a1a] text-[13px] group-hover:text-[#d4af37] group-hover:underline transition-colors">
                                  {a.customer}
                                </span>
                              </button>
                            </td>

                            {/* Phone */}
                            <td className="p-3 text-[12px] text-[#6b6b6b] whitespace-nowrap">{a.phone}</td>

                            {/* Services — truncated text + popover on click */}
                            <td className="p-3" style={{ maxWidth: 220, minWidth: 140 }}>
                              {allServices.length === 0 ? (
                                <span className="text-[12px] text-[#9a9a9a]">—</span>
                              ) : (
                                <div className="relative">
                                  {/* Collapsed view */}
                                  {!isExpanded ? (
                                    <button
                                      type="button"
                                      onClick={() => setExpandedServices(prev => { const s = new Set(prev); s.add(a.id); return s; })}
                                      className="flex items-center gap-1 text-left w-full group"
                                      title={allServices.join(", ")}
                                    >
                                      <span className="text-[12px] font-medium text-[#3d3d3d] truncate max-w-[140px]">
                                        {allServices[0]}
                                      </span>
                                      {allServices.length > 1 && (
                                        <span className="shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-[#111] text-[#d4af37] group-hover:bg-[#333] transition-colors whitespace-nowrap">
                                          +{allServices.length - 1}
                                        </span>
                                      )}
                                    </button>
                                  ) : (
                                    /* Expanded popover-style overlay */
                                    <div className="relative z-10">
                                      <div className="absolute top-0 left-0 min-w-[200px] max-w-[280px] bg-white rounded-xl border border-gray-200 shadow-xl p-3 space-y-1.5" style={{ zIndex: 999 }}>
                                        <div className="flex items-center justify-between mb-1">
                                          <p className="text-[10px] font-bold uppercase tracking-wider text-[#9a9a9a]">All Services</p>
                                          <button
                                            type="button"
                                            onClick={() => setExpandedServices(prev => { const s = new Set(prev); s.delete(a.id); return s; })}
                                            className="h-4 w-4 flex items-center justify-center text-gray-400 hover:text-gray-700"
                                          >
                                            <X className="h-3 w-3" />
                                          </button>
                                        </div>
                                        {allServices.map((svc, i) => (
                                          <div key={i} className="flex items-center gap-2 text-[12px] text-[#3d3d3d] font-medium">
                                            <span className="h-1.5 w-1.5 rounded-full bg-[#d4af37] shrink-0" />
                                            {svc}
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </td>

                            {/* Duration */}
                            <td className="p-3 text-[12px] text-[#6b6b6b] whitespace-nowrap">{a.duration} min</td>

                            {/* Type */}
                            <td className="p-3">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border capitalize whitespace-nowrap ${
                                a.type === "walk-in"
                                  ? "bg-[#f4f2ed] border-[#d4af37]/30 text-[#9a7a1e]"
                                  : "bg-white border-gray-200 text-[#6b6b6b]"
                              }`}>
                                {a.type}
                              </span>
                            </td>

                            {/* Action — inline, state-driven */}
                            <td className="p-3 whitespace-nowrap">
                              {notStarted && (
                                <div className="flex items-center gap-2">
                                  <span className="text-[11px] font-semibold text-[#9a9a9a] mr-1">Waiting</span>
                                  <button
                                    type="button"
                                    onClick={() => startAppointment(a.id)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#111] text-[#d4af37] text-[11px] font-bold hover:bg-[#2a2a2a] transition-colors"
                                  >
                                    <PlayCircle className="h-3.5 w-3.5" /> Start
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setDeleteConfirm(a.id)}
                                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-gray-200 text-[11px] font-semibold text-[#9a9a9a] hover:border-gray-400 hover:text-[#111] transition-colors"
                                  >
                                    <XCircle className="h-3.5 w-3.5" /> Cancel
                                  </button>
                                </div>
                              )}
                              {inProgress && (
                                <div className="flex items-center gap-2">
                                  <span className="flex items-center gap-1 text-[11px] font-bold text-[#d4af37]">
                                    <span className="inline-block h-2 w-2 rounded-full bg-[#d4af37] animate-pulse" />
                                    In Progress
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => openBilling(a.id, a.customer, a.service)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#d4af37] to-[#c9a227] text-[#111] text-[11px] font-bold hover:from-[#c9a227] hover:to-[#b8922e] transition-all shadow-sm"
                                  >
                                    <Receipt className="h-3.5 w-3.5" /> Bill
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setDeleteConfirm(a.id)}
                                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-gray-200 text-[11px] font-semibold text-[#9a9a9a] hover:border-gray-400 hover:text-[#111] transition-colors"
                                  >
                                    <XCircle className="h-3.5 w-3.5" /> Cancel
                                  </button>
                                </div>
                              )}
                              {isDone && (
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border capitalize ${
                                    a.status === "completed"  ? "bg-[#f4f2ed] border-[#d4af37]/30 text-[#9a7a1e]" :
                                    a.status === "cancelled"  ? "bg-gray-50 border-gray-200 text-gray-400" :
                                    "bg-gray-50 border-gray-200 text-gray-400"
                                  }`}>
                                    {a.status}
                                  </span>
                                  {a.status === "completed" && (
                                    <button type="button"
                                      onClick={() => setCorrectionAppt({ id: a.id, service: a.service })}
                                      title="Correct product usage"
                                      className="flex items-center gap-1 px-2 py-1.5 rounded-lg border border-[#d4af37]/30 text-[10px] font-bold text-[#b8962e] hover:bg-[#d4af37]/10 transition-colors">
                                      ✂ Correct
                                    </button>
                                  )}
                                </div>
                              )}
                            </td>

                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <Pagination
                  page={apptsPagination.page}
                  pageSize={apptsPagination.pageSize}
                  totalRecords={filteredAppts.length}
                  onPageChange={apptsPagination.setPage}
                  onPageSizeChange={apptsPagination.setPageSize}
                />
              </CardContent>
            </Card>
        </TabsContent>


        {/* â”€â”€ QUEUE TAB â”€â”€ Tabular by default */}
        <TabsContent value="queue" className="space-y-4">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" className="rounded-xl border-[#d4af37]/40 hover:bg-amber-50" onClick={() => { setActiveTab("timeline"); setFilterTypeAndUrl("walk-in"); }}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            <div className="flex-1 flex justify-between items-center">
              <h2 className="text-lg font-semibold">Booking Queue</h2>
              <div className="flex gap-2">
                <Badge className="bg-purple-100 text-purple-700">VIP Priority</Badge>
                <Badge className="bg-orange-100 text-orange-700">Walk-ins</Badge>
              </div>
            </div>
          </div>
          {/* Queue table */}
          <Card className="shadow-lg">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-[#FAF8F2]">
                      <th className="text-left p-3 font-semibold text-[#3d3d3d]">#</th>
                      <th className="text-left p-3 font-semibold text-[#3d3d3d]">Token</th>
                      <th className="text-left p-3 font-semibold text-[#3d3d3d]">Customer</th>
                      <th className="text-left p-3 font-semibold text-[#3d3d3d]">Phone</th>
                      <th className="text-left p-3 font-semibold text-[#3d3d3d]">Service</th>
                      <th className="text-left p-3 font-semibold text-[#3d3d3d]">Type</th>
                      <th className="text-left p-3 font-semibold text-[#3d3d3d]">Priority</th>
                      <th className="text-left p-3 font-semibold text-[#3d3d3d]">Wait</th>
                      <th className="text-left p-3 font-semibold text-[#3d3d3d]">Status</th>
                      <th className="text-left p-3 font-semibold text-[#3d3d3d]">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedQueue.map((q, idx) => (
                      <tr key={q.id} className={`border-b transition-colors hover:bg-amber-50/50 ${idx % 2 === 0 ? "bg-white" : "bg-[#FAFAFA]"}`}>
                        <td className="p-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#1a1a1a] to-[#2d2d2d] text-white font-bold text-sm">
                            {idx + 1}
                          </div>
                        </td>
                        <td className="p-3">
                          <span className="font-mono bg-[#1a1a1a] text-white text-xs px-2 py-0.5 rounded-md">{q.token}</span>
                        </td>
                        <td className="p-3 font-semibold text-[#1a1a1a]">{q.customer}</td>
                        <td className="p-3 text-muted-foreground text-xs">{q.phone}</td>
                        <td className="p-3 font-medium">{q.service}</td>
                        <td className="p-3"><Badge variant="outline" className="text-xs capitalize">{q.type}</Badge></td>
                        <td className="p-3">
                          {q.priority === "vip"
                            ? <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-xs">VIP</Badge>
                            : <Badge variant="outline" className="text-xs">Normal</Badge>}
                        </td>
                        <td className="p-3">
                          {q.waitMins > 0 ? <span className="text-orange-600 font-semibold">{q.waitMins}m</span> : <span className="text-green-600">—</span>}
                        </td>
                        <td className="p-3">
                          <Badge className={`${statusColors[q.status]} border text-xs`}>{q.status}</Badge>
                        </td>
                        <td className="p-3">
                          <div className="flex gap-1">
                            {q.status === "waiting" && (
                              <Button size="sm" className="h-7 text-xs rounded-lg bg-purple-600 hover:bg-purple-700" onClick={() => setQueue(prev => prev.map(x => x.id === q.id ? { ...x, status: "called" as const } : x))}>
                                <Bell className="h-3 w-3 mr-0.5" />Call
                              </Button>
                            )}
                            {q.status === "called" && (
                              <Button size="sm" className="h-7 text-xs rounded-lg bg-blue-600 hover:bg-blue-700" onClick={() => setQueue(prev => prev.map(x => x.id === q.id ? { ...x, status: "in-service" as const, waitMins: 0 } : x))}>
                                Seat
                              </Button>
                            )}
                            <Button size="sm" variant="outline" className="h-7 w-7 p-0 rounded-lg" onClick={() => openNotify(q.customer, q.phone)}><MessageSquare className="h-3 w-3" /></Button>
                            <Button size="sm" variant="outline" className="h-7 w-7 p-0 rounded-lg text-red-500 hover:bg-red-50" onClick={() => setQueue(prev => prev.filter(x => x.id !== q.id))}><X className="h-3 w-3" /></Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination
                page={queuePagination.page}
                pageSize={queuePagination.pageSize}
                totalRecords={queue.length}
                onPageChange={queuePagination.setPage}
                onPageSizeChange={queuePagination.setPageSize}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* â”€â”€ CALENDAR TAB â”€â”€ */}
        <TabsContent value="calendar" className="space-y-4">
          {/* Section header */}
          <div className="relative overflow-hidden rounded-2xl border border-black/[0.06] bg-white shadow-[0_2px_12px_rgba(17,17,24,0.04)]">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#D4AF37]/60 to-transparent" />
            <div className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#D4AF37]/20 bg-[#D4AF37]/10">
                  <CalendarIcon className="h-4 w-4 text-[#D4AF37]" />
                </div>
                <div>
                  <h2 className="text-[17px] font-bold text-[#111118]">Calendar</h2>
                  <p className="text-[12px] text-[#9a9a9a]">Live appointments &amp; walk-ins by date</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={prevMonth}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-black/[0.08] bg-white text-[#6b6b6b] transition-all hover:border-[#D4AF37]/30 hover:text-[#111118]"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <div className="flex items-center gap-2 rounded-xl bg-[#111118] px-4 py-2">
                  <CalendarIcon className="h-3.5 w-3.5 text-[#D4AF37]" />
                  <span className="min-w-[130px] text-center text-[13px] font-bold text-white">
                    {monthNames[calMonth]} {calYear}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={nextMonth}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-black/[0.08] bg-white text-[#6b6b6b] transition-all hover:border-[#D4AF37]/30 hover:text-[#111118]"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
                <Button
                  size="sm"
                  variant="outline"
                  className="ml-1 h-9 rounded-xl border-[#D4AF37]/30 text-[12px] font-semibold text-[#B8962E] hover:bg-[#D4AF37]/10"
                  onClick={() => {
                    setCalMonth(new Date().getMonth());
                    setCalYear(new Date().getFullYear());
                    setSelectedCalDate(new Date().getDate());
                  }}
                >
                  Today
                </Button>
              </div>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
            {/* Calendar grid */}
            <Card className="overflow-hidden rounded-2xl border border-black/[0.06] shadow-[0_2px_12px_rgba(17,17,24,0.04)]">
              <CardContent className="p-4 sm:p-5">
                <div className="mb-2 grid grid-cols-7 gap-1.5">
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
                    <div key={d} className="py-2 text-center text-[10px] font-bold uppercase tracking-[0.12em] text-[#9a9a9a]">
                      {d}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1.5">
                  {calendarDays.map((day, i) => {
                    const isToday = day === new Date().getDate() && calMonth === new Date().getMonth() && calYear === new Date().getFullYear();
                    const isSelected = day === selectedCalDate;
                    const dayStats = apptsByDay[day];
                    const count = dayStats?.total ?? 0;
                    const valid = day >= 1 && day <= daysInMonth;
                    return (
                      <button
                        key={i}
                        type="button"
                        disabled={!valid}
                        onClick={() => valid && setSelectedCalDate(day)}
                        className={cn(
                          "min-h-[88px] rounded-xl border p-2 text-left transition-all",
                          !valid && "pointer-events-none border-transparent bg-transparent opacity-0",
                          valid && !isSelected && !isToday && "border-black/[0.06] bg-white hover:border-[#D4AF37]/30 hover:bg-[#FFFBEB]",
                          isToday && !isSelected && "border-[#D4AF37]/40 bg-[#FFFBEB]",
                          isSelected && "border-[#D4AF37] bg-[#FFFBEB] shadow-[0_4px_16px_rgba(212,175,55,0.15)] ring-2 ring-[#D4AF37]/20",
                        )}
                      >
                        {valid && (
                          <>
                            <div className="mb-1.5 flex items-center justify-between">
                              <span className={cn(
                                "flex h-7 w-7 items-center justify-center text-[12px] font-bold",
                                isToday || isSelected
                                  ? "rounded-full bg-[#111118] text-[#D4AF37]"
                                  : "text-[#111118]",
                              )}>
                                {day}
                              </span>
                              {count > 0 && (
                                <span className="rounded-full bg-[#111118] px-1.5 py-0.5 text-[9px] font-bold text-[#D4AF37]">
                                  {count}
                                </span>
                              )}
                            </div>
                            {count > 0 ? (
                              <div className="space-y-1">
                                <div className="flex gap-0.5">
                                  {Array.from({ length: Math.min(count, 4) }).map((_, j) => (
                                    <div
                                      key={j}
                                      className={cn(
                                        "h-1 flex-1 rounded-full",
                                        j < (dayStats?.appointments ?? 0) ? "bg-[#111118]" : "bg-[#D4AF37]/70",
                                      )}
                                    />
                                  ))}
                                </div>
                                <p className="text-[9px] font-medium text-[#9a9a9a]">
                                  {(dayStats?.appointments ?? 0) > 0 && `${dayStats!.appointments} appt`}
                                  {(dayStats?.appointments ?? 0) > 0 && (dayStats?.walkIns ?? 0) > 0 && " · "}
                                  {(dayStats?.walkIns ?? 0) > 0 && `${dayStats!.walkIns} walk-in`}
                                </p>
                              </div>
                            ) : (
                              <p className="text-[9px] text-[#d0d0d0]">—</p>
                            )}
                          </>
                        )}
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Selected day panel */}
            <Card className="overflow-hidden rounded-2xl border border-black/[0.06] shadow-[0_2px_12px_rgba(17,17,24,0.04)]">
              <CardHeader className="border-b border-black/[0.06] bg-[#faf9f7] px-5 py-4">
                <CardTitle className="text-[13px] font-bold text-[#111118]">
                  {selectedDayLabel ? selectedDayLabel : "Select a day"}
                </CardTitle>
                {selectedCalDate && (
                  <p className="text-[11px] text-[#9a9a9a]">
                    {selectedDayApptCount > 0
                      ? `${selectedDayStats.appointmentsCount} appointment${selectedDayStats.appointmentsCount !== 1 ? "s" : ""} · ${selectedDayStats.walkInsCount} walk-in${selectedDayStats.walkInsCount !== 1 ? "s" : ""}`
                      : "No bookings on this day"}
                  </p>
                )}
              </CardHeader>
              <CardContent className="p-0">
                {!selectedCalDate ? (
                  <div className="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-dashed border-black/[0.1] bg-[#faf9f7]">
                      <CalendarIcon className="h-6 w-6 text-[#D4AF37]/40" />
                    </div>
                    <p className="text-[13px] font-medium text-[#9a9a9a]">Click a date to view bookings</p>
                  </div>
                ) : selectedDayApptCount === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-black/[0.06] bg-[#faf9f7]">
                      <CalendarIcon className="h-6 w-6 text-[#9a9a9a]/40" />
                    </div>
                    <p className="text-[13px] font-medium text-[#9a9a9a]">No appointments or walk-ins this day</p>
                    <Button
                      size="sm"
                      className="mt-1 h-9 rounded-xl bg-[#111118] text-[12px] font-semibold text-[#D4AF37] hover:bg-[#1e1e1e]"
                      onClick={() => navigate("/appointments/new")}
                    >
                      <Plus className="mr-1.5 h-3.5 w-3.5" /> New Appointment
                    </Button>
                  </div>
                ) : (
                  <div className="divide-y divide-black/[0.04] max-h-[520px] overflow-y-auto">
                    {selectedDayAppts.map(a => (
                      <div
                        key={a.id}
                        className="flex items-start gap-3 px-4 py-3.5 transition-colors hover:bg-[#faf9f7] cursor-pointer"
                        onClick={() => {
                          setActiveTab("timeline");
                          setViewDate(new Date(calYear, calMonth, selectedCalDate!));
                          setSearchParams((prev) => {
                            const next = new URLSearchParams(prev);
                            next.set("appointment", a.id);
                            next.delete("tab");
                            return next;
                          }, { replace: true });
                        }}
                      >
                        <span className="shrink-0 rounded-md bg-[#111118] px-2 py-1 font-mono text-[10px] text-[#D4AF37]">{a.time}</span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13px] font-semibold text-[#111118]">{a.customer}</p>
                          <p className="mt-0.5 truncate text-[11px] text-[#9a9a9a]">{a.service}</p>
                          <div className="mt-1.5 flex items-center gap-1.5">
                            <Badge className={cn("border text-[9px] capitalize", statusColors[a.status])}>{a.status}</Badge>
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border capitalize ${
                              a.type === "walk-in"
                                ? "bg-[#f4f2ed] border-[#d4af37]/30 text-[#9a7a1e]"
                                : "bg-white border-gray-200 text-[#6b6b6b]"
                            }`}>
                              {a.type === "walk-in" ? "Walk-in" : "Appointment"}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* â”€â”€ NEW APPOINTMENT MODAL â”€â”€ */}
      {/* â”€â”€ EDIT WALK-IN MODAL â”€â”€ */}
      <Dialog open={!!editWalkin} onOpenChange={open => !open && setEditWalkin(null)}>
        <DialogContent className="gap-0 overflow-hidden rounded-2xl border-black/[0.08] p-0 sm:max-w-lg">
          <div className="relative border-b border-black/[0.06] bg-[#111118] px-6 py-5">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#D4AF37]/70 to-transparent" />
            <DialogHeader className="space-y-1 text-left">
              <DialogTitle className="flex items-center gap-2.5 text-[16px] font-bold text-white">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#D4AF37]/25 bg-[#D4AF37]/15">
                  <Edit className="h-4 w-4 text-[#D4AF37]" />
                </div>
                Edit Walk-In
              </DialogTitle>
              <p className="text-[12px] text-white/50">Update details for this walk-in visit</p>
            </DialogHeader>
          </div>
          {editWalkin && (
            <div className="space-y-4 bg-[#f4f2ed] p-6">
              {/* Recipient summary card */}
              <div className="flex items-center gap-3 rounded-xl border border-[#D4AF37]/25 bg-[#FFFBEB] p-3.5 shadow-[0_2px_12px_rgba(212,175,55,0.08)]">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#C9A227] text-[12px] font-bold text-[#111118]">
                  {customerInitials(editWalkin.customer || "?")}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-bold text-[#111118]">{editWalkin.customer || "Unnamed walk-in"}</p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-[#9a9a9a]">
                    <Phone className="h-3 w-3 shrink-0 text-[#D4AF37]" />
                    {editWalkin.phone || "No phone number on file"}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <Badge className="border border-black/[0.08] bg-black/[0.06] text-[9px] font-bold text-[#6b6b6b]">
                    {editWalkin.token}
                  </Badge>
                  <Badge className={cn("border text-[9px] font-bold capitalize", statusColors[editWalkin.status])}>
                    {editWalkin.status}
                  </Badge>
                </div>
              </div>

              {/* Contact fields */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#9a9a9a]">Customer Name</Label>
                  <div className="relative mt-1.5">
                    <User className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#9a9a9a]" />
                    <Input
                      value={editWalkin.customer}
                      onChange={e => setEditWalkin(w => w ? { ...w, customer: e.target.value } : w)}
                      className="h-10 rounded-xl border-black/[0.08] bg-white pl-9 focus:border-[#D4AF37]/40 focus:ring-[#D4AF37]/10"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#9a9a9a]">Phone</Label>
                  <div className="relative mt-1.5">
                    <Phone className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#9a9a9a]" />
                    <Input
                      value={editWalkin.phone}
                      onChange={e => setEditWalkin(w => w ? { ...w, phone: e.target.value } : w)}
                      className="h-10 rounded-xl border-black/[0.08] bg-white pl-9 focus:border-[#D4AF37]/40 focus:ring-[#D4AF37]/10"
                    />
                  </div>
                </div>
              </div>

              {/* Service assignment */}
              <div className="rounded-xl border border-black/[0.06] bg-white p-3.5 space-y-3">
                <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[#9a9a9a]">
                  <Scissors className="h-3 w-3 text-[#D4AF37]" /> Service
                </p>
                <div>
                  <Label className="text-[10px] font-semibold text-[#9a9a9a]">Service</Label>
                  <Select value={editWalkin.service} onValueChange={v => setEditWalkin(w => w ? { ...w, service: v } : w)}>
                    <SelectTrigger className="mt-1.5 h-10 rounded-xl border-black/[0.08] bg-[#faf9f7] focus:border-[#D4AF37]/40"><SelectValue /></SelectTrigger>
                    <SelectContent>{serviceCatalog.map(s => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="border-t border-black/[0.06] bg-white px-6 py-4 gap-2">
            <Button variant="outline" className="rounded-xl" onClick={() => setEditWalkin(null)}>Cancel</Button>
            <Button
              className="rounded-xl bg-[#111118] text-[#D4AF37] hover:bg-[#1a1a1a]"
              onClick={() => {
                if (!editWalkin) return;
                void (async () => {
                  try {
                    await persistAppointmentEdit({
                      id: editWalkin.id,
                      customer: editWalkin.customer,
                      phone: editWalkin.phone,
                      service: editWalkin.service,
                    });
                    setEditWalkin(null);
                    toast.success("Walk-in updated");
                  } catch (error) {
                    toast.error(getApiErrorMessage(error, "Failed to save walk-in"));
                  }
                })();
              }}
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* â”€â”€ WALK-IN CUSTOMER INFO â”€â”€ */}
      <Dialog open={!!customerInfoWalkin} onOpenChange={() => setCustomerInfoWalkin(null)}>
        <DialogContent className="sm:max-w-sm p-0 rounded-2xl overflow-hidden border-0 shadow-2xl [&>button:last-of-type]:hidden">
          {customerInfoWalkin && (
            <div className="flex flex-col">
              <div className="bg-[#111] px-6 pt-6 pb-8 relative">
                <button onClick={() => setCustomerInfoWalkin(null)} className="absolute top-4 right-4 h-7 w-7 rounded-full border border-white/10 flex items-center justify-center text-white/40 hover:text-white transition-colors">
                  <X className="h-3.5 w-3.5" />
                </button>
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-[#d4af37] to-[#c9a227] flex items-center justify-center text-[#111] text-[18px] font-black shrink-0 shadow-lg">
                    {customerInitials(customerInfoWalkin.customer)}
                  </div>
                  <div>
                    <p className="text-[17px] font-bold text-white">{customerInfoWalkin.customer}</p>
                    <p className="text-[12px] text-white/50 mt-0.5">{customerInfoWalkin.phone}</p>
                    <span className="mt-1.5 inline-block text-[10px] font-bold px-2 py-0.5 rounded-full border bg-[#d4af37]/15 border-[#d4af37]/30 text-[#d4af37]">
                      Walk-in · {customerInfoWalkin.token}
                    </span>
                  </div>
                </div>
              </div>
              <div className="px-6 py-5 space-y-3 bg-white">
                {[
                  { label: "Arrival Time", value: customerInfoWalkin.arrival },
                  { label: "Status", value: customerInfoWalkin.status === "done" ? "Completed" : customerInfoWalkin.status },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <span className="text-[11px] font-semibold text-[#9a9a9a] uppercase tracking-wider">{label}</span>
                    <span className="text-[13px] font-semibold text-[#111] capitalize">{value}</span>
                  </div>
                ))}
                <div className="pt-1">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[#9a9a9a] mb-2">Service</p>
                  <span className="px-2.5 py-1 rounded-full bg-[#f4f2ed] border border-[#e8e4d8] text-[11px] font-medium text-[#3d3d3d]">{customerInfoWalkin.service}</span>
                </div>
                {customerInfoWalkin.notes && (
                  <div className="pt-1">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-[#9a9a9a] mb-1">Notes</p>
                    <p className="text-[12px] text-[#3d3d3d] bg-[#faf9f7] rounded-lg px-3 py-2 border border-gray-100">{customerInfoWalkin.notes}</p>
                  </div>
                )}
              </div>
              <div className="px-6 pb-5 pt-2 bg-white border-t border-gray-100 flex gap-2">
                <button onClick={() => { setCustomerInfoWalkin(null); openNotify(customerInfoWalkin.customer, customerInfoWalkin.phone); }}
                  className="flex-1 py-2.5 rounded-xl border-2 border-gray-200 text-[12px] font-bold text-[#3d3d3d] hover:border-[#d4af37]/40 transition-colors">
                  Notify
                </button>
                <button onClick={() => { setCustomerInfoWalkin(null); setEditWalkin(customerInfoWalkin); }}
                  className="flex-1 py-2.5 rounded-xl border-2 border-gray-200 text-[12px] font-bold text-[#3d3d3d] hover:border-[#d4af37]/40 transition-colors">
                  Edit
                </button>
                {customerInfoWalkin.status === "in-service" && (
                  <button onClick={() => { setCustomerInfoWalkin(null); openWalkinBilling(customerInfoWalkin); }}
                    className="flex-1 py-2.5 rounded-xl bg-[#111] text-[#d4af37] text-[12px] font-bold hover:bg-[#2a2a2a] transition-colors">
                    Bill
                  </button>
                )}
                {customerInfoWalkin.status === "waiting" && (
                  <button onClick={() => { startWalkin(customerInfoWalkin.id); setCustomerInfoWalkin(null); }}
                    className="flex-1 py-2.5 rounded-xl bg-[#111] text-[#d4af37] text-[12px] font-bold hover:bg-[#2a2a2a] transition-colors">
                    Start
                  </button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* â”€â”€ WALK-IN DELETE CONFIRM â”€â”€ */}
      <Dialog open={walkinDeleteConfirm !== null} onOpenChange={open => !open && setWalkinDeleteConfirm(null)}>
        <DialogContent className="sm:max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-[#111118]">Remove walk-in?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-[#6b6b6b]">This will remove the walk-in from today&apos;s queue. This action cannot be undone.</p>
          <DialogFooter className="gap-2">
            <Button variant="outline" className="rounded-xl" onClick={() => setWalkinDeleteConfirm(null)}>Keep</Button>
            <Button className="rounded-xl bg-red-600 hover:bg-red-700 text-white" onClick={() => walkinDeleteConfirm !== null && void cancelWalkin(walkinDeleteConfirm)}>
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* â”€â”€ NOTIFY / SMS+WHATSAPP MODAL â”€â”€ */}
      <Dialog open={notifyOpen} onOpenChange={setNotifyOpen}>
        <DialogContent className="gap-0 overflow-hidden rounded-2xl border-black/[0.08] p-0 sm:max-w-md">
          <div className="relative border-b border-black/[0.06] bg-[#111118] px-6 py-5">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#D4AF37]/70 to-transparent" />
            <DialogHeader className="space-y-1 text-left">
              <DialogTitle className="flex items-center gap-2.5 text-[16px] font-bold text-white">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#D4AF37]/25 bg-[#D4AF37]/15">
                  <MessageSquare className="h-4 w-4 text-[#D4AF37]" />
                </div>
                {notifyTarget?.context === "staff" ? "Notify Staff" : "Notify Customer"}
              </DialogTitle>
              <p className="text-[12px] text-white/50">
                Send a WhatsApp or SMS message via BillVyapp
              </p>
            </DialogHeader>
          </div>

          {notifyTarget && (
            <div className="space-y-4 bg-[#f4f2ed] p-6">
              {/* Recipient card */}
              <div className="flex items-center gap-3 rounded-xl border border-[#D4AF37]/25 bg-[#FFFBEB] p-3.5 shadow-[0_2px_12px_rgba(212,175,55,0.08)]">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#C9A227] text-[12px] font-bold text-[#111118]">
                  {customerInitials(notifyTarget.name)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-bold text-[#111118]">{notifyTarget.name}</p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-[#9a9a9a]">
                    <Phone className="h-3 w-3 shrink-0 text-[#D4AF37]" />
                    {notifyTarget.phone || "No phone number on file"}
                  </p>
                </div>
                <Badge className={cn(
                  "shrink-0 border text-[9px] font-bold",
                  notifyTarget.context === "staff"
                    ? "border-black/[0.08] bg-black/[0.06] text-[#6b6b6b]"
                    : "border-[#D4AF37]/25 bg-[#D4AF37]/10 text-[#B8962E]",
                )}>
                  {notifyTarget.context === "staff" ? "Staff" : "Customer"}
                </Badge>
              </div>

              {/* Quick templates */}
              {notifyTarget.context === "customer" && (
                <div>
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.12em] text-[#9a9a9a]">Quick templates</p>
                  <div className="flex flex-wrap gap-1.5">
                    {NOTIFY_TEMPLATES.map(t => {
                      const active = notifyMsg === t.text(notifyTarget.name);
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setNotifyMsg(t.text(notifyTarget.name))}
                          className={cn(
                            "rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition-all",
                            active
                              ? "border-[#D4AF37]/50 bg-[#111118] text-[#D4AF37] shadow-sm"
                              : "border-black/[0.08] bg-white text-[#6b6b6b] hover:border-[#D4AF37]/35 hover:bg-[#FFFBEB] hover:text-[#111118]",
                          )}
                        >
                          {t.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Message */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <Label className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#9a9a9a]">Message</Label>
                  <span className={cn(
                    "text-[10px] tabular-nums font-semibold",
                    notifyMsg.length > 280 ? "text-[#E07A5F]" : "text-[#c0c0c0]",
                  )}>
                    {notifyMsg.length}/320
                  </span>
                </div>
                <Textarea
                  rows={4}
                  maxLength={320}
                  value={notifyMsg}
                  onChange={e => setNotifyMsg(e.target.value)}
                  placeholder="Write your message…"
                  className="resize-none rounded-xl border-black/[0.08] bg-white text-[13px] leading-relaxed text-[#111118] placeholder:text-[#c0c0c0] focus:border-[#D4AF37]/40 focus:ring-[#D4AF37]/10"
                />
              </div>

              {/* Live preview — chat-style bubble */}
              {notifyMsg.trim() && (
                <div>
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.12em] text-[#9a9a9a]">Preview</p>
                  <div className="rounded-xl bg-[#e9f8ef] p-3">
                    <div className="ml-auto max-w-[85%] rounded-2xl rounded-tr-sm bg-white px-3.5 py-2.5 shadow-sm">
                      <p className="whitespace-pre-wrap text-[12.5px] leading-relaxed text-[#111118]">{notifyMsg}</p>
                      <p className="mt-1 text-right text-[9px] text-[#9a9a9a]">Now</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Send actions */}
              <div className="grid grid-cols-2 gap-2.5 pt-1">
                <Button
                  disabled={!notifyMsg.trim() || !notifyTarget.phone}
                  className="h-11 rounded-xl bg-[#111118] text-[13px] font-bold text-[#D4AF37] hover:bg-[#1e1e1e] disabled:opacity-40"
                  onClick={() => {
                    toast.success("WhatsApp sent", { description: `Message delivered to ${notifyTarget.name}` });
                    setNotifyOpen(false);
                  }}
                >
                  <Send className="mr-2 h-4 w-4" />
                  WhatsApp
                </Button>
                <Button
                  variant="outline"
                  disabled={!notifyMsg.trim() || !notifyTarget.phone}
                  className="h-11 rounded-xl border-black/[0.1] bg-white text-[13px] font-semibold text-[#111118] hover:border-[#D4AF37]/35 hover:bg-[#FFFBEB] disabled:opacity-40"
                  onClick={() => {
                    toast.success("SMS sent", { description: `Message delivered to ${notifyTarget.name}` });
                    setNotifyOpen(false);
                  }}
                >
                  <Phone className="mr-2 h-4 w-4 text-[#D4AF37]" />
                  Send SMS
                </Button>
              </div>

              {!notifyTarget.phone && (
                <p className="flex items-center gap-1.5 text-center text-[11px] text-[#9a9a9a]">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0 text-[#D4AF37]" />
                  Add a phone number to send notifications
                </p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* â”€â”€ EDIT APPOINTMENT MODAL â”€â”€ */}
      <Dialog open={!!editAppt} onOpenChange={open => !open && setEditAppt(null)}>
        <DialogContent className="gap-0 overflow-hidden rounded-2xl border-black/[0.08] p-0 sm:max-w-lg [&>button:last-of-type]:absolute [&>button:last-of-type]:right-4 [&>button:last-of-type]:top-4 [&>button:last-of-type]:text-white/50 [&>button:last-of-type]:hover:text-white">
          <div className="relative border-b border-black/[0.06] bg-[#111118] px-6 py-5">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#D4AF37]/70 to-transparent" />
            <DialogHeader className="space-y-1 text-left">
              <DialogTitle className="flex items-center gap-2.5 text-[16px] font-bold text-white">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#D4AF37]/25 bg-[#D4AF37]/15">
                  <Edit className="h-4 w-4 text-[#D4AF37]" />
                </div>
                Edit Appointment
              </DialogTitle>
              <p className="text-[12px] text-white/50">Update booking details or status</p>
            </DialogHeader>
          </div>

          {editAppt && (
            <div className="space-y-4 bg-[#f4f2ed] p-6">
              {/* Customer summary */}
              <div className="flex items-center gap-3 rounded-xl border border-[#D4AF37]/25 bg-[#FFFBEB] p-3.5 shadow-[0_2px_12px_rgba(212,175,55,0.08)]">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#C9A227] text-[12px] font-bold text-[#111118]">
                  {customerInitials(editAppt.customer || "?")}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-bold text-[#111118]">{editAppt.customer || "Unnamed customer"}</p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-[#9a9a9a]">
                    <Phone className="h-3 w-3 shrink-0 text-[#D4AF37]" />
                    {editAppt.phone || "No phone number on file"}
                  </p>
                </div>
                <Badge className={cn("shrink-0 border text-[9px] font-bold capitalize", statusColors[editAppt.status])}>
                  {editAppt.status}
                </Badge>
              </div>

              {/* Schedule snapshot */}
              <div className="grid grid-cols-3 gap-2.5">
                {[
                  { icon: CalendarIcon, label: "Date", value: editAppt.date ?? "Today" },
                  { icon: Clock, label: "Time", value: editAppt.time },
                  { icon: Timer, label: "Duration", value: `${editAppt.duration} min` },
                ].map(({ icon: Icon, label, value }) => (
                  <div
                    key={label}
                    className="rounded-xl border border-black/[0.06] bg-white px-3 py-2.5 text-center shadow-sm"
                  >
                    <Icon className="mx-auto mb-1 h-3.5 w-3.5 text-[#D4AF37]" />
                    <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-[#9a9a9a]">{label}</p>
                    <p className="mt-0.5 truncate text-[12px] font-semibold text-[#111118]">{value}</p>
                  </div>
                ))}
              </div>

              {/* Contact */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <Label className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#9a9a9a]">Customer Name</Label>
                  <div className="relative mt-1.5">
                    <User className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#9a9a9a]" />
                    <Input
                      value={editAppt.customer}
                      onChange={e => setEditAppt(a => a ? { ...a, customer: e.target.value } : a)}
                      className="h-10 rounded-xl border-black/[0.08] bg-white pl-9 focus:border-[#D4AF37]/40 focus:ring-[#D4AF37]/10"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#9a9a9a]">Phone</Label>
                  <div className="relative mt-1.5">
                    <Phone className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#9a9a9a]" />
                    <Input
                      value={editAppt.phone}
                      onChange={e => setEditAppt(a => a ? { ...a, phone: e.target.value } : a)}
                      className="h-10 rounded-xl border-black/[0.08] bg-white pl-9 focus:border-[#D4AF37]/40 focus:ring-[#D4AF37]/10"
                    />
                  </div>
                </div>
              </div>

              {/* Service */}
              <div className="space-y-3 rounded-xl border border-black/[0.06] bg-white p-3.5">
                <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[#9a9a9a]">
                  <Scissors className="h-3 w-3 text-[#D4AF37]" />
                  Service
                </p>
                <div>
                  <Label className="text-[10px] font-semibold text-[#9a9a9a]">Service</Label>
                  <Select value={editAppt.service} onValueChange={v => setEditAppt(a => a ? { ...a, service: v } : a)}>
                    <SelectTrigger className="mt-1.5 h-10 rounded-xl border-black/[0.08] bg-[#faf9f7] focus:border-[#D4AF37]/40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {serviceCatalog.map(s => (
                        <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Status */}
              <div className="rounded-xl border border-black/[0.06] bg-white p-3.5">
                <p className="mb-2.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[#9a9a9a]">Appointment Status</p>
                <div className="flex flex-wrap gap-2">
                  {(
                    [
                      { value: "pending", label: "Pending" },
                      { value: "confirmed", label: "Confirmed" },
                      { value: "in-progress", label: "In Progress" },
                      { value: "completed", label: "Completed" },
                      { value: "cancelled", label: "Cancelled" },
                    ] as const
                  ).map(({ value, label }) => {
                    const active = editAppt.status === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setEditAppt(a => a ? { ...a, status: value } : a)}
                        className={cn(
                          "rounded-lg border px-3 py-1.5 text-[11px] font-semibold capitalize transition-all",
                          active
                            ? "border-[#D4AF37]/40 bg-[#FFFBEB] text-[#9a7a1e] shadow-sm ring-1 ring-[#D4AF37]/20"
                            : "border-black/[0.08] bg-[#faf9f7] text-[#6b6b6b] hover:border-[#D4AF37]/25 hover:bg-white",
                        )}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 border-t border-black/[0.06] bg-white px-6 py-4">
            <Button
              variant="outline"
              className="h-10 flex-1 rounded-xl border-black/[0.1] text-[13px] font-semibold sm:flex-none"
              onClick={() => setEditAppt(null)}
            >
              Cancel
            </Button>
            <Button
              className="h-10 flex-1 rounded-xl bg-[#111118] text-[13px] font-semibold text-[#D4AF37] hover:bg-[#1a1a1a] sm:flex-none"
              onClick={() => {
                if (!editAppt) return;
                void (async () => {
                  try {
                    await persistAppointmentEdit({
                      id: editAppt.id,
                      customer: editAppt.customer,
                      phone: editAppt.phone,
                      service: editAppt.service,
                      status: editAppt.status,
                      duration: editAppt.duration,
                    });
                    setEditAppt(null);
                    toast.success("Appointment updated", {
                      description: `${editAppt.customer} · ${editAppt.time}`,
                    });
                  } catch (error) {
                    toast.error(getApiErrorMessage(error, "Failed to save appointment"));
                  }
                })();
              }}
            >
              <CheckCircle className="mr-1.5 h-3.5 w-3.5" />
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* â”€â”€ CUSTOMER INFO MODAL â”€â”€ */}
      <Dialog open={!!customerInfoAppt} onOpenChange={() => setCustomerInfoAppt(null)}>
        <DialogContent className="sm:max-w-sm p-0 rounded-2xl overflow-hidden border-0 shadow-2xl [&>button:last-of-type]:hidden">
          {customerInfoAppt && (
            <div className="flex flex-col">
              {/* Header */}
              <div className="bg-[#111] px-6 pt-6 pb-8 relative">
                <button onClick={() => setCustomerInfoAppt(null)} className="absolute top-4 right-4 h-7 w-7 rounded-full border border-white/10 flex items-center justify-center text-white/40 hover:text-white transition-colors">
                  <X className="h-3.5 w-3.5" />
                </button>
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-[#d4af37] to-[#c9a227] flex items-center justify-center text-[#111] text-[18px] font-black shrink-0 shadow-lg">
                    {customerInfoAppt.customer.split(" ").map(n => n[0]).join("").slice(0,2)}
                  </div>
                  <div>
                    <p className="text-[17px] font-bold text-white">{customerInfoAppt.customer}</p>
                    <p className="text-[12px] text-white/50 mt-0.5">{customerInfoAppt.phone}</p>
                    <span className={`mt-1.5 inline-block text-[10px] font-bold px-2 py-0.5 rounded-full border capitalize ${
                      customerInfoAppt.type === "walk-in"
                        ? "bg-[#d4af37]/15 border-[#d4af37]/30 text-[#d4af37]"
                        : "bg-white/8 border-white/15 text-white/50"
                    }`}>{customerInfoAppt.type}</span>
                  </div>
                </div>
              </div>

              {/* Details */}
              <div className="px-6 py-5 space-y-3 bg-white">
                {[
                  { label: "Appointment Date", value: customerInfoAppt.date },
                  { label: "Time Slot",         value: customerInfoAppt.time },
                  { label: "Duration",          value: `${customerInfoAppt.duration} min` },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <span className="text-[11px] font-semibold text-[#9a9a9a] uppercase tracking-wider">{label}</span>
                    <span className="text-[13px] font-semibold text-[#111]">{value}</span>
                  </div>
                ))}

                {/* Services */}
                <div className="pt-1">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[#9a9a9a] mb-2">Services</p>
                  <div className="flex flex-wrap gap-1.5">
                    {[customerInfoAppt.service, ...((customerInfoAppt.extraServices ?? []).map(e => e.name))].filter(Boolean).map((svc, i) => (
                      <span key={i} className="px-2.5 py-1 rounded-full bg-[#f4f2ed] border border-[#e8e4d8] text-[11px] font-medium text-[#3d3d3d]">{svc}</span>
                    ))}
                  </div>
                </div>

                {customerInfoAppt.notes && (
                  <div className="pt-1">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-[#9a9a9a] mb-1">Notes</p>
                    <p className="text-[12px] text-[#3d3d3d] bg-[#faf9f7] rounded-lg px-3 py-2 border border-gray-100">{customerInfoAppt.notes}</p>
                  </div>
                )}
              </div>

              {/* Footer actions */}
              <div className="px-6 pb-5 pt-2 bg-white border-t border-gray-100 flex gap-2">
                <button onClick={() => { setCustomerInfoAppt(null); openNotify(customerInfoAppt.customer, customerInfoAppt.phone); }}
                  className="flex-1 py-2.5 rounded-xl border-2 border-gray-200 text-[12px] font-bold text-[#3d3d3d] hover:border-[#d4af37]/40 transition-colors">
                  Notify
                </button>
                <button onClick={() => { setCustomerInfoAppt(null); setEditAppt(customerInfoAppt); }}
                  className="flex-1 py-2.5 rounded-xl border-2 border-gray-200 text-[12px] font-bold text-[#3d3d3d] hover:border-[#d4af37]/40 transition-colors">
                  Edit
                </button>
                <button onClick={() => { setCustomerInfoAppt(null); openBilling(customerInfoAppt.id, customerInfoAppt.customer, customerInfoAppt.service); }}
                  className="flex-1 py-2.5 rounded-xl bg-[#111] text-[#d4af37] text-[12px] font-bold hover:bg-[#2a2a2a] transition-colors">
                  Bill
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* â”€â”€ BILLING MODAL (3-Panel Salon Booking System) â”€â”€ */}
      <Dialog open={billingOpen} onOpenChange={setBillingOpen}>
        <DialogContent className="max-sm:dialog-mobile-sheet flex flex-col sm:max-w-7xl sm:h-[min(92dvh,860px)] max-h-[95dvh] overflow-hidden p-0 rounded-2xl shadow-2xl border-0 [&>button:last-of-type]:hidden">
          <div className="flex min-h-0 flex-1 flex-col bg-[#f4f2ed]">

            {/* â”€â”€ HEADER â”€â”€ */}
            <div className="relative flex items-center justify-between border-b border-black/[0.06] bg-[#111118] px-5 py-4">
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#D4AF37]/60 to-transparent" />
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#D4AF37]/25 bg-[#D4AF37]/12 shadow-[0_0_20px_rgba(212,175,55,0.12)]">
                  <Receipt className="h-4 w-4 text-[#D4AF37]" />
                </div>
                <div>
                  <p className="text-[14px] font-bold text-white">
                    {isDirectBill ? "Direct Billing" : billingTarget?.sourceKind === "walkin" ? "Walk-in Checkout" : "Appointment Checkout"}
                  </p>
                  <p className="text-[11px] text-white/45">
                    {isDirectBill
                      ? `Quick bill · ${BRAND.appName}`
                      : billingTarget?.sourceKind === "walkin" && billingTarget.token
                        ? `Token ${billingTarget.token} · ${BRAND.appName}`
                        : `${BRAND.appName} · ${BRAND.tagline}`}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setBillingOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-white/40 transition-all hover:border-white/20 hover:bg-white/5 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>



            {/* â”€â”€ BODY â”€â”€ */}
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">

              {/* LEFT — Order / Service Items */}
              <div className="flex w-full min-h-0 flex-col overflow-hidden border-b border-black/[0.06] lg:w-[380px] lg:shrink-0 lg:border-b-0 lg:border-r max-h-[42dvh] lg:max-h-none">

                {/* Customer identity bar */}
                {isDirectBill ? (
                  <div className="relative shrink-0 border-b border-black/[0.06] bg-white px-4 py-4">
                    <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#D4AF37]/50 to-transparent" />

                    <div className="mb-3 flex items-center gap-2.5">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-[#D4AF37]/20 bg-[#D4AF37]/12">
                        <Receipt className="h-3.5 w-3.5 text-[#D4AF37]" />
                      </div>
                      <div>
                        <p className="text-[12px] font-bold text-[#111118]">Customer</p>
                        <p className="text-[10px] text-[#9a9a9a]">Search existing or add new</p>
                      </div>
                    </div>

                    {/* Mode toggle */}
                    <div className="mb-3 grid grid-cols-2 gap-1.5 rounded-xl border border-black/[0.07] bg-[#f4f2ed] p-1">
                      {(["search", "new"] as const).map(m => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => {
                            setDirectCustomerMode(m);
                            setDirectCustomerSearch("");
                            setDirectCustomerSelected(false);
                            setBillingTarget(t => ({ ...t!, name: "", phone: "" }));
                          }}
                          className={cn(
                            "flex items-center justify-center gap-1.5 rounded-lg py-2 text-[11px] font-semibold transition-all",
                            directCustomerMode === m
                              ? "bg-[#111118] text-[#D4AF37] shadow-sm"
                              : "text-[#9a9a9a] hover:text-[#111118]",
                          )}
                        >
                          {m === "search" ? (
                            <><Search className="h-3 w-3" /> Find Customer</>
                          ) : (
                            <><UserPlus className="h-3 w-3" /> New Customer</>
                          )}
                        </button>
                      ))}
                    </div>

                    {directCustomerMode === "search" ? (
                      <div className="space-y-2">
                        <div className="relative">
                          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#9a9a9a]" />
                          <Input
                            value={directCustomerSearch}
                            onChange={e => {
                              setDirectCustomerSearch(e.target.value);
                              setDirectCustomerSelected(false);
                            }}
                            placeholder="Search by name or phone…"
                            className="h-10 rounded-xl border-black/[0.08] bg-white pl-9 pr-9 text-[12.5px] focus:border-[#D4AF37]/40"
                          />
                          {directCustomerSearch && (
                            <button
                              type="button"
                              onClick={() => {
                                setDirectCustomerSearch("");
                                setDirectCustomerSelected(false);
                                setBillingTarget(t => ({ ...t!, name: "", phone: "" }));
                              }}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#9a9a9a] hover:text-[#111118]"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>

                        {/* Results */}
                        {directCustomerSearch.length >= 1 && !directCustomerSelected && (() => {
                          const q = directCustomerSearch.toLowerCase();
                          const results = directBillCustomers.filter(
                            c =>
                              c.name.toLowerCase().includes(q) ||
                              c.phone.replace(/\D/g, "").includes(q.replace(/\D/g, "")),
                          );
                          return results.length > 0 ? (
                            <div className="max-h-48 overflow-y-auto rounded-xl border border-black/[0.08] bg-white shadow-[0_8px_24px_rgba(17,17,24,0.08)] divide-y divide-black/[0.04]">
                              {results.map(c => {
                                const tier = membershipTierLabel(c.membershipTier);
                                return (
                                <button
                                  key={c.id}
                                  type="button"
                                  onMouseDown={e => e.preventDefault()}
                                  onClick={() => {
                                    setBillingTarget(t => ({ ...t!, name: c.name, phone: c.phone, customerId: c.id }));
                                    setDirectCustomerSearch(c.name);
                                    setDirectCustomerSelected(true);
                                    void loadLoyaltyForPhone(c.phone);
                                  }}
                                  className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-[#FFFBEB]"
                                >
                                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#C9A227] text-[10px] font-bold text-[#111118]">
                                    {customerInitials(c.name)}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate text-[12px] font-semibold text-[#111118]">{c.name}</p>
                                    <p className="text-[10px] text-[#9a9a9a]">
                                      {c.phone} · {c.totalVisits} visits · ₹{c.totalSpend.toLocaleString("en-IN")}
                                    </p>
                                  </div>
                                  <Badge className={cn("shrink-0 border text-[9px] font-bold", DIRECT_BILL_TIER_BADGE[tier] ?? DIRECT_BILL_TIER_BADGE.Basic)}>
                                    {tier}
                                  </Badge>
                                </button>
                              );
                              })}
                            </div>
                          ) : (
                            <div className="rounded-xl border border-black/[0.06] bg-[#faf9f7] px-3 py-3 text-center text-[11px] text-[#9a9a9a]">
                              No customer found — try a different search or add new
                            </div>
                          );
                        })()}

                        {/* Selected customer */}
                        {directCustomerSelected && billingTarget?.name && (() => {
                          const c = directBillCustomers.find(
                            x => x.name === billingTarget.name || x.phone === billingTarget.phone,
                          );
                          const tier = c ? membershipTierLabel(c.membershipTier) : null;
                          return (
                            <div className="flex items-center gap-3 rounded-xl border border-[#D4AF37]/30 bg-[#FFFBEB] p-3 shadow-[0_2px_12px_rgba(212,175,55,0.08)]">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#C9A227] text-[11px] font-bold text-[#111118]">
                                {customerInitials(billingTarget.name)}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <p className="truncate text-[13px] font-bold text-[#111118]">{billingTarget.name}</p>
                                  {tier && (
                                    <Badge className={cn("border text-[9px] font-bold", DIRECT_BILL_TIER_BADGE[tier] ?? DIRECT_BILL_TIER_BADGE.Basic)}>
                                      {tier}
                                    </Badge>
                                  )}
                                </div>
                                <p className="mt-0.5 truncate text-[10.5px] text-[#9a9a9a]">
                                  {billingTarget.phone}
                                  {c ? ` · ${c.favoriteService} · Last: ${c.lastVisit}` : ""}
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setDirectCustomerSearch("");
                                  setDirectCustomerSelected(false);
                                  setBillingTarget(t => ({ ...t!, name: "", phone: "" }));
                                }}
                                className="shrink-0 rounded-lg p-1 text-[#9a9a9a] transition-colors hover:bg-white hover:text-[#111118]"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          );
                        })()}
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        <div className="relative">
                          <User className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#9a9a9a]" />
                          <Input
                            value={billingTarget?.name || ""}
                            onChange={e => setBillingTarget(t => ({ ...t!, name: e.target.value }))}
                            placeholder="Customer name *"
                            className="h-10 rounded-xl border-black/[0.08] bg-white pl-9 text-[12.5px] focus:border-[#D4AF37]/40"
                          />
                        </div>
                        <div className="flex gap-2">
                          <span className="inline-flex shrink-0 items-center rounded-xl border border-black/[0.08] bg-[#faf9f7] px-2.5 text-[12px] text-[#6b6b6b]">
                            +91
                          </span>
                          <Input
                            value={(billingTarget?.phone || "").replace(/^\+91\s?/, "")}
                            onChange={e => setBillingTarget(t => ({ ...t!, phone: "+91 " + e.target.value }))}
                            placeholder="98765 00000"
                            className="h-10 flex-1 rounded-xl border-black/[0.08] bg-white text-[12.5px] focus:border-[#D4AF37]/40"
                          />
                        </div>
                        {billingTarget?.name.trim() && (
                          <div className="flex items-center gap-2 rounded-xl border border-black/[0.06] bg-[#faf9f7] px-3 py-2">
                            <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-[#D4AF37]" />
                            <p className="text-[11px] text-[#6b6b6b]">New customer — details will be saved with this bill</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                <div className="relative shrink-0 border-b border-[#D4AF37]/20 bg-gradient-to-r from-[#111118] via-[#14141c] to-[#111118] px-5 py-4">
                  <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#D4AF37]/40 to-transparent" />
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#C9A227] text-[12px] font-bold text-[#111118] shadow-lg shadow-[#D4AF37]/20">
                      {customerInitials(billingTarget?.name || "?")}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[15px] font-bold text-white">{billingTarget?.name || "Unknown"}</p>
                      <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-white/50">
                        <span className="inline-flex items-center gap-1">
                          <Phone className="h-3 w-3 text-[#D4AF37]/80" />
                          {billingTarget?.phone}
                        </span>
                        <span className="text-white/25">·</span>
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3 w-3 text-[#D4AF37]/80" />
                          {billingTarget?.time}
                        </span>
                      </p>
                      {billingTarget?.service && (
                        <p className="mt-1 truncate text-[10px] font-medium text-[#D4AF37]/70">
                          {billingTarget.service}
                        </p>
                      )}
                    </div>
                    <span className={cn(
                      "shrink-0 rounded-full border px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider",
                      billingTarget?.type === "walk-in"
                        ? "border-white/15 bg-white/8 text-white/60"
                        : "border-[#D4AF37]/30 bg-[#D4AF37]/15 text-[#D4AF37]",
                    )}>
                      {billingTarget?.type === "walk-in" ? "Walk-in" : "Appt"}
                    </span>
                  </div>
                </div>
                )}

                {/* Service search */}
                <div className="border-b border-black/[0.06] bg-white px-4 pb-0 pt-3">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9a9a9a]" />
                    <input
                      type="text"
                      placeholder="Search service or product to add…"
                      value={billingServiceSearch}
                      onChange={e => setBillingServiceSearch(e.target.value)}
                      className="h-10 w-full rounded-xl border border-black/[0.08] bg-white pl-10 pr-9 text-[12px] font-medium outline-none transition-colors placeholder:font-normal placeholder:text-[#9a9a9a] focus:border-[#D4AF37]/50 focus:ring-2 focus:ring-[#D4AF37]/10"
                    />
                    {billingServiceSearch && (
                      <button
                        type="button"
                        onClick={() => setBillingServiceSearch("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Results — inline, not absolute, so overflow-hidden never clips them */}
                  {billingServiceSearch.trim().length > 0 && (() => {
                    const results = [
                      ...serviceCatalog.filter(s => s.name.toLowerCase().includes(billingServiceSearch.toLowerCase()))
                        .map(s => ({ type: "service" as const, name: s.name, price: s.price, meta: s.duration ? `${s.duration} min` : "", serviceId: s.id })),
                      ...retailProducts
                        .filter(p => p.activeStatus !== "inactive")
                        .filter(p => p.name.toLowerCase().includes(billingServiceSearch.toLowerCase()))
                        .map(p => ({
                          type: "product" as const,
                          name: p.name,
                          price: parseInr(p.price),
                          meta: `${p.stock} in stock`,
                          productId: p.id,
                        })),
                    ];
                    return (
                      <div className="mt-2 mb-1 rounded-xl border border-gray-200 bg-white shadow-sm max-h-52 overflow-y-auto divide-y divide-gray-50">
                        {results.length === 0 ? (
                          <p className="px-4 py-4 text-[12px] text-gray-400 text-center">
                            No results for &ldquo;{billingServiceSearch}&rdquo;
                          </p>
                        ) : results.map(item => (
                          <button key={`${item.type}-${"serviceId" in item ? item.serviceId : item.productId}`} type="button"
                            onMouseDown={e => {
                              e.preventDefault();
                              addBillItem(
                                item.type,
                                item.name,
                                item.price,
                                "serviceId" in item ? item.serviceId : undefined,
                                "productId" in item ? item.productId : undefined,
                              );
                              setBillingServiceSearch("");
                            }}
                            className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-amber-50 text-left transition-colors group">
                            <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold shrink-0 ${item.type === "service" ? "bg-[#d4af37]/15 text-[#9a7a1e]" : "bg-gray-100 text-gray-600"}`}>
                              {item.type === "service" ? "SVC" : "PRD"}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="text-[12px] font-semibold text-[#111] truncate">{item.name}</p>
                              <p className="text-[10px] text-gray-400">{item.meta}</p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-[12px] font-bold text-[#111]">&#x20b9;{item.price.toLocaleString()}</span>
                              <div className="h-6 w-6 rounded-full bg-[#d4af37] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <Plus className="h-3.5 w-3.5 text-white" />
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    );
                  })()}
                  <div className="pb-3" />
                </div>

                {/* Order items */}
                <div className="flex-1 overflow-y-auto bg-[#faf9f7]">
                  {billingItems.length === 0 ? (
                    <div className="flex h-full min-h-[200px] flex-col items-center justify-center gap-3 px-8 text-center">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-dashed border-[#D4AF37]/25 bg-[#FFFBEB]">
                        <Receipt className="h-6 w-6 text-[#D4AF37]/50" />
                      </div>
                      <div>
                        <p className="text-[13px] font-semibold text-[#6b6b6b]">No items in cart</p>
                        <p className="mt-0.5 text-[11px] text-[#9a9a9a]">Search above to add services or products</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2 px-4 py-3">
                      <div className="flex items-center px-3 pb-1">
                        <span className="flex-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[#9a9a9a]">Item</span>
                        <span className="w-24 text-center text-[10px] font-bold uppercase tracking-[0.14em] text-[#9a9a9a]">Qty</span>
                        <span className="w-20 text-right text-[10px] font-bold uppercase tracking-[0.14em] text-[#9a9a9a]">Total</span>
                        <span className="w-8" />
                      </div>

                      {billingItems.map((item, idx) => (
                        <div
                          key={item.name}
                          className="flex items-center gap-2 rounded-xl border border-black/[0.06] bg-white px-3 py-3 shadow-sm transition-all hover:border-[#D4AF37]/25 hover:shadow-md"
                        >
                          <span className="w-5 shrink-0 text-center text-[10px] font-black text-[#D4AF37]/60">{idx + 1}</span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <p className="truncate text-[12px] font-semibold text-[#111118]">{item.name}</p>
                              <span className={cn(
                                "shrink-0 rounded px-1 py-0.5 text-[8px] font-bold uppercase",
                                item.type === "service" ? "bg-[#D4AF37]/12 text-[#9a7a1e]" : "bg-black/[0.06] text-[#6b6b6b]",
                              )}>
                                {item.type === "service" ? "Svc" : "Prd"}
                              </span>
                            </div>
                            <p className="mt-0.5 text-[10px] text-[#9a9a9a]">&#x20b9;{item.price.toLocaleString()} / unit</p>
                          </div>
                          <div className="flex w-24 items-center justify-center gap-1">
                            <button
                              onClick={() => setBillingItems(prev => prev.map(i => i.name === item.name ? { ...i, qty: Math.max(1, i.qty - 1) } : i))}
                              className="flex h-7 w-7 items-center justify-center rounded-lg border border-black/[0.08] bg-[#faf9f7] text-[#6b6b6b] transition-all hover:border-[#111118] hover:bg-[#111118] hover:text-white"
                            >
                              −
                            </button>
                            <span className="w-5 text-center text-[13px] font-bold tabular-nums text-[#111118]">{item.qty}</span>
                            <button
                              onClick={() => setBillingItems(prev => prev.map(i => i.name === item.name ? { ...i, qty: i.qty + 1 } : i))}
                              className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#D4AF37]/30 bg-[#FFFBEB] text-[#9a7a1e] transition-all hover:border-[#D4AF37] hover:bg-[#D4AF37] hover:text-[#111118]"
                            >
                              +
                            </button>
                          </div>
                          <span className="w-20 text-right text-[13px] font-black tabular-nums text-[#111118]">
                            &#x20b9;{(item.price * item.qty).toLocaleString()}
                          </span>
                          <button
                            onClick={() => removeBillItem(item.name)}
                            className="flex h-7 w-8 shrink-0 items-center justify-center rounded-lg text-[#9a9a9a] transition-colors hover:bg-red-50 hover:text-red-500"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Subtotal bar */}
                <div className="flex items-center gap-3 border-t border-[#D4AF37]/15 bg-[#111118] px-5 py-3.5">
                  <span className="text-[11px] font-medium text-white/45">
                    {billingItems.length === 0 ? "No items" : `${billingItems.reduce((s, i) => s + i.qty, 0)} item${billingItems.reduce((s, i) => s + i.qty, 0) !== 1 ? "s" : ""}`}
                  </span>
                  <span className="text-white/20">·</span>
                  <span className="text-[11px] font-medium text-white/45">Subtotal</span>
                  <span className="text-[18px] font-black tabular-nums text-[#D4AF37]">&#x20b9;{billSubtotal.toLocaleString()}</span>
                </div>
              </div>

              {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
                  RIGHT — Billing & Payment
                  flex-1 — gets all remaining space
                  â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
              <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-white">

                {/* Scrollable billing area */}
                <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5 sm:py-5 space-y-4">

                  {/* â”€â”€ GST â”€â”€ */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-[11px] font-bold uppercase tracking-[0.12em] text-gray-500">Tax</h4>
                      <button onClick={() => setGstEnabled(v => !v)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-full border font-bold text-[11px] transition-all ${gstEnabled ? "bg-[#d4af37]/10 border-[#d4af37]/40 text-[#9a7a1e]" : "bg-white border-gray-200 text-gray-400"}`}>
                        <div className={`w-7 h-3.5 rounded-full relative transition-colors ${gstEnabled ? "bg-[#d4af37]" : "bg-gray-300"}`}>
                          <div className={`w-3 h-3 rounded-full bg-white absolute top-0.25 shadow transition-all ${gstEnabled ? "right-0.5" : "left-0.5"}`} />
                        </div>
                        GST {gstEnabled ? "Enabled" : "Disabled"}
                      </button>
                    </div>
                    {gstEnabled && (
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          {[5, 12, 18].map(r => (
                            <button key={r} onClick={() => { setGstRate(r); setCustomTaxMode(false); setCustomTaxInput(""); }}
                              className={`flex-1 py-2.5 rounded-xl text-[12px] font-bold border-2 transition-all ${!customTaxMode && gstRate === r ? "bg-[#111] text-[#d4af37] border-[#111] shadow-sm" : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"}`}>
                              {r}%
                            </button>
                          ))}
                          <button onClick={() => { setCustomTaxMode(true); setCustomTaxInput(String(gstRate)); }}
                            className={`flex-1 py-2.5 rounded-xl text-[12px] font-bold border-2 transition-all ${customTaxMode ? "bg-[#111] text-[#d4af37] border-[#111] shadow-sm" : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"}`}>
                            Custom
                          </button>
                        </div>
                        {customTaxMode && (
                          <div className="relative">
                            <input
                              type="number"
                              min={0}
                              max={100}
                              value={customTaxInput}
                              onChange={e => {
                                const v = e.target.value;
                                setCustomTaxInput(v);
                                const n = parseFloat(v);
                                if (!isNaN(n) && n >= 0 && n <= 100) setGstRate(n);
                              }}
                              placeholder="Enter tax %"
                              className="w-full h-10 pl-4 pr-10 rounded-xl border-2 border-[#d4af37] text-[13px] font-bold text-[#111] outline-none bg-amber-50/50 placeholder:text-gray-400 placeholder:font-normal"
                              autoFocus
                            />
                            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[13px] font-bold text-gray-400">%</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="h-px bg-gray-200" />

                  {/* â”€â”€ Discounts â”€â”€ */}
                  <div>
                    <h4 className="text-[11px] font-bold uppercase tracking-[0.12em] text-gray-500 mb-3">Discounts & Offers</h4>
                    <div className="space-y-3">

                      {/* Coupon */}
                      <div className="bg-white rounded-xl border border-gray-200 p-4">
                        <div className="flex items-center gap-2 mb-2.5">
                          <Tag className="h-3.5 w-3.5 text-[#d4af37] shrink-0" />
                          <span className="text-[12px] font-semibold text-[#111]">Coupon Code</span>
                          {couponApplied && <span className="ml-auto text-[10px] font-black text-[#9a7a1e] bg-[#d4af37]/10 px-2 py-0.5 rounded-full">-&#x20b9;{billCouponDisc.toLocaleString()}</span>}
                        </div>
                        {couponApplied ? (
                          <div className="flex items-center justify-between bg-[#d4af37]/06 border border-[#d4af37]/20 rounded-lg px-3 py-2">
                            <div className="flex items-center gap-2">
                              <span className="text-[13px] font-black text-[#9a7a1e] tracking-wider">{couponApplied.code}</span>
                              <span className="text-[10px] text-gray-400">applied</span>
                            </div>
                            <button onClick={() => setCouponApplied(null)} className="text-gray-400 hover:text-gray-700 transition-colors">
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <input value={couponInput} onChange={e => setCouponInput(e.target.value.toUpperCase())}
                              placeholder="Enter coupon code"
                              className="flex-1 h-9 px-3 rounded-lg border border-gray-200 text-[12px] font-medium outline-none focus:border-[#d4af37] uppercase placeholder:normal-case placeholder:text-gray-400 placeholder:font-normal bg-white transition-colors" />
                            <button onClick={() => {
                              const code = couponInput.trim().toUpperCase();
                              const match = coupons.find((c) => c.code.toUpperCase() === code && c.status === "active");
                              if (match) {
                                setCouponApplied({
                                  code: match.code,
                                  value: match.value,
                                  type: match.type === "percentage" ? "%" : "₹",
                                });
                                setCouponInput("");
                              } else {
                                toast.error("Coupon not found or inactive");
                              }
                            }}
                              className="px-4 h-9 rounded-lg bg-[#111] text-[#d4af37] text-[11px] font-bold hover:bg-[#2a2a2a] transition-colors shrink-0">
                              Apply
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Gift Card */}
                      <div className="bg-white rounded-xl border border-gray-200 p-4">
                        <div className="flex items-center gap-2 mb-2.5">
                          <CreditCard className="h-3.5 w-3.5 text-[#d4af37] shrink-0" />
                          <span className="text-[12px] font-semibold text-[#111]">Gift Card</span>
                          {giftCardApplied && <span className="ml-auto text-[10px] font-black text-[#9a7a1e] bg-[#d4af37]/10 px-2 py-0.5 rounded-full">-&#x20b9;{billGiftCard.toLocaleString()}</span>}
                        </div>
                        {giftCardApplied ? (
                          <div className="flex items-center justify-between bg-[#d4af37]/06 border border-[#d4af37]/20 rounded-lg px-3 py-2">
                            <div className="flex items-center gap-2">
                              <span className="text-[13px] font-black text-[#9a7a1e] tracking-wider">{giftCardApplied.code}</span>
                              <span className="text-[10px] text-gray-400">applied</span>
                            </div>
                            <button onClick={() => setGiftCardApplied(null)} className="text-gray-400 hover:text-gray-700 transition-colors">
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <input value={giftCardInput} onChange={e => setGiftCardInput(e.target.value.toUpperCase())}
                              placeholder="GC-XXXX-XXXX"
                              className="flex-1 h-9 px-3 rounded-lg border border-gray-200 text-[12px] font-medium outline-none focus:border-[#d4af37] uppercase placeholder:normal-case placeholder:text-gray-400 placeholder:font-normal bg-white transition-colors" />
                            <button onClick={() => toast.info("Gift cards are not configured yet")}
                              className="px-4 h-9 rounded-lg bg-[#111] text-[#d4af37] text-[11px] font-bold hover:bg-[#2a2a2a] transition-colors shrink-0">
                              Redeem
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Advance Payment — only shown if this customer has an active advance balance */}
                      {advanceAvailable > 0 && (
                        <div className="bg-white rounded-xl border border-[#d4af37]/30 p-4">
                          <div className="flex items-center gap-2 mb-2.5">
                            <Wallet className="h-3.5 w-3.5 text-[#d4af37] shrink-0" />
                            <span className="text-[12px] font-semibold text-[#111]">Advance Payment</span>
                            <span className="ml-auto text-[10px] font-black text-[#9a7a1e] bg-[#d4af37]/10 px-2 py-0.5 rounded-full">
                              ₹{advanceAvailable.toLocaleString()} available
                            </span>
                          </div>
                          {advanceApplied > 0 ? (
                            <div className="flex items-center justify-between bg-[#d4af37]/06 border border-[#d4af37]/20 rounded-lg px-3 py-2">
                              <div className="flex items-center gap-2">
                                <span className="text-[13px] font-black text-[#9a7a1e]">₹{advanceApplied.toLocaleString()} applied</span>
                              </div>
                              <button onClick={() => setAdvanceApplied(0)} className="text-gray-400 hover:text-gray-700 transition-colors">
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex gap-2">
                              <button
                                onClick={() => setAdvanceApplied(Math.min(advanceAvailable, billGrand))}
                                className="flex-1 h-9 rounded-lg bg-[#111] text-[#d4af37] text-[11px] font-bold hover:bg-[#2a2a2a] transition-colors">
                                Apply full advance (₹{Math.min(advanceAvailable, billGrand).toLocaleString()})
                              </button>
                            </div>
                          )}
                          <p className="mt-2 text-[10.5px] text-gray-400">
                            Deposit collected earlier for {matchedAdvances[0]?.service ?? "a prior booking"} — applying it reduces what's due now, and deducts it from their advance balance permanently.
                          </p>
                        </div>
                      )}

                      {/* Loyalty + Discount side by side */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-white rounded-xl border border-gray-200 p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-1.5">
                              <Bell className="h-3.5 w-3.5 text-[#d4af37]" />
                              <span className="text-[12px] font-semibold text-[#111]">Loyalty</span>
                            </div>
                            <span className="text-[10px] text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded-md">{loyaltyAvailable} pts</span>
                          </div>
                          <input type="number" min={0} max={Math.min(loyaltyAvailable, Math.floor(billAfterDiscs / 0.5))}
                            value={loyaltyRedeem || ""}
                            onChange={e => setLoyaltyRedeem(Math.min(Math.min(loyaltyAvailable, Math.floor(billAfterDiscs / 0.5)), Math.max(0, Number(e.target.value))))}
                            placeholder="0"
                            className="w-full h-9 px-3 rounded-lg border border-gray-200 text-[12px] font-medium outline-none focus:border-[#d4af37] bg-white transition-colors text-right tabular-nums" />
                          {loyaltyRedeem > 0 && (
                            <p className="mt-1.5 text-right text-[10px] font-semibold text-[#9a7a1e]">= &#x20b9;{Math.round(loyaltyRedeem * 0.5).toLocaleString()} off</p>
                          )}
                        </div>
                        <div className="bg-white rounded-xl border border-gray-200 p-4">
                          <div className="flex items-center gap-1.5 mb-2">
                            <span className="text-[12px] font-semibold text-[#111]">Manual Disc.</span>
                            <span className="text-[10px] text-gray-400">(₹)</span>
                          </div>
                          <input type="number" min={0} max={billSubtotal} value={discount || ""}
                            onChange={e => setDiscount(Math.min(Number(e.target.value), billSubtotal))}
                            placeholder="0"
                            className="w-full h-9 px-3 rounded-lg border border-gray-200 text-[12px] font-medium outline-none focus:border-[#d4af37] bg-white transition-colors text-right tabular-nums" />
                          {discount > 0 && (
                            <p className="text-[10px] text-[#9a7a1e] font-semibold mt-1.5 text-right">-&#x20b9;{discount.toLocaleString()}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="h-px bg-gray-200" />

                  {/* â”€â”€ Bill Summary â”€â”€ */}
                  <div>
                    <h4 className="mb-3 text-[10px] font-bold uppercase tracking-[0.14em] text-[#9a9a9a]">Bill Summary</h4>
                    <div className="overflow-hidden rounded-xl border border-black/[0.08] bg-white shadow-sm">
                      <div className="space-y-2.5 px-5 py-4">
                        <div className="flex justify-between items-center text-[13px]">
                          <span className="text-gray-500">Subtotal</span>
                          <span className="font-semibold text-[#111] tabular-nums">&#x20b9;{billSubtotal.toLocaleString()}</span>
                        </div>
                        {billCouponDisc > 0 && (
                          <div className="flex justify-between items-center text-[13px]">
                            <span className="text-gray-500">Coupon <span className="text-[11px] font-medium text-[#9a7a1e]">({couponApplied?.code})</span></span>
                            <span className="font-semibold text-[#9a7a1e] tabular-nums">- {formatInr(billCouponDisc)}</span>
                          </div>
                        )}
                        {billGiftCard > 0 && (
                          <div className="flex justify-between items-center text-[13px]">
                            <span className="text-gray-500">Gift Card</span>
                            <span className="font-semibold text-[#9a7a1e] tabular-nums">- {formatInr(billGiftCard)}</span>
                          </div>
                        )}
                        {billLoyalty > 0 && (
                          <div className="flex justify-between items-center text-[13px]">
                            <span className="text-gray-500">Loyalty <span className="text-[11px] font-medium text-[#9a7a1e]">({loyaltyRedeem} pts)</span></span>
                            <span className="font-semibold text-[#9a7a1e] tabular-nums">- {formatInr(billLoyalty)}</span>
                          </div>
                        )}
                        {discount > 0 && (
                          <div className="flex justify-between items-center text-[13px]">
                            <span className="text-gray-500">Manual Discount</span>
                            <span className="font-semibold text-[#9a7a1e] tabular-nums">- {formatInr(discount)}</span>
                          </div>
                        )}
                        {gstEnabled && billGst > 0 && (
                          <div className="flex justify-between items-center text-[13px]">
                            <span className="text-gray-500">GST ({gstRate}%)</span>
                            <span className="font-semibold text-[#111] tabular-nums">+ &#x20b9;{billGst.toLocaleString()}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center justify-between bg-[#111118] px-5 py-4">
                        <span className="text-[12px] font-bold uppercase tracking-wider text-white/50">Grand Total</span>
                        <span className="text-[24px] font-black tabular-nums text-[#D4AF37]">&#x20b9;{billGrand.toLocaleString()}</span>
                      </div>
                      {advanceApplied > 0 && (
                        <>
                          <div className="flex justify-between items-center text-[13px] px-5 pt-3">
                            <span className="text-gray-500">Advance Applied</span>
                            <span className="font-semibold text-[#9a7a1e] tabular-nums">- {formatInr(advanceApplied)}</span>
                          </div>
                          <div className="flex items-center justify-between bg-[#0d0d14] px-5 py-3.5 mt-1">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-[#D4AF37]/70">Balance Due Now</span>
                            <span className="text-[20px] font-black tabular-nums text-white">&#x20b9;{billDue.toLocaleString()}</span>
                          </div>
                        </>
                      )}
                      {(billCouponDisc + billGiftCard + billLoyalty + discount) > 0 && (
                        <div className="border-t border-[#D4AF37]/15 bg-[#FFFBEB] px-5 py-2.5 text-center">
                          <span className="text-[11px] font-bold text-[#9a7a1e]">
                            You saved &#x20b9;{Math.round(billCouponDisc + billGiftCard + billLoyalty + discount).toLocaleString()} on this bill
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="h-px bg-gray-200" />

                  {/* Payment Method (under Bill Summary) */}
                  <PaymentMethodPicker
                    amountDue={billDue}
                    value={payMethod}
                    onChange={setPayMethod}
                    upiNote={`${BRAND.appName} bill${billingTarget?.name ? ` — ${billingTarget.name}` : ""}`}
                  />

                  {/* Notes — compact */}
                  <div>
                    <h4 className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[#9a9a9a]">Notes</h4>
                    <textarea
                      placeholder="Add a note for this transaction…"
                      value={billingNotes} onChange={e => setBillingNotes(e.target.value)}
                      className="h-12 w-full resize-none rounded-xl border border-black/[0.08] bg-[#faf9f7] px-3 py-2 text-[12px] text-[#111118] outline-none transition-colors placeholder:text-[#9a9a9a] focus:border-[#D4AF37]/40" />
                  </div>
                </div>

                {/* Checkout actions */}
                <div className="shrink-0 flex flex-col gap-2.5 border-t border-black/[0.06] bg-[#faf9f7] px-4 py-3 sm:flex-row sm:gap-3 sm:px-5">
                  <button
                    type="button"
                    onClick={handleConfirmOnly}
                    disabled={billingItems.length === 0}
                    className="h-11 flex-1 rounded-xl border border-[#D4AF37]/35 bg-white text-[12px] font-bold text-[#9a7a1e] transition-all hover:border-[#D4AF37] hover:bg-[#FFFBEB] disabled:cursor-not-allowed disabled:opacity-40 sm:max-w-[180px]"
                  >
                    Confirm Only
                  </button>
                  <button
                    type="button"
                    disabled={billingItems.length === 0 || (billDue > 0 && !isPaymentMethodValid(payMethod, billDue))}
                    onClick={handleCompletePayment}
                    className="flex h-11 flex-[2] items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#C9A227] text-[13px] font-black text-[#111118] shadow-lg shadow-[#D4AF37]/20 transition-all hover:from-[#C9A227] hover:to-[#B8922E] disabled:cursor-not-allowed disabled:opacity-40">
                    <CheckCircle2 className="h-4 w-4" />
                    {billDue === 0 ? "Complete Payment — Covered by Advance" : `Complete Payment — ₹${billDue.toLocaleString()}`}
                  </button>
                </div>
              </div>

            </div>

          </div>
        </DialogContent>
      </Dialog>


      {/* __ RECEIPT MODAL __ */}
      <Dialog open={receiptOpen} onOpenChange={v => { if (!v) setReceiptOpen(false); }}>
        <DialogContent className="sm:max-w-[400px] p-0 border-0 shadow-2xl overflow-hidden rounded-2xl bg-white">
          <AnimatePresence mode="wait">

            {receiptStep === "pending" && receiptData && (
              <motion.div
                key="pending"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.25 }}
                className="relative overflow-hidden bg-gradient-to-br from-[#FFFBEB] via-white to-[#faf9f7] px-6 py-8 flex flex-col items-center gap-4"
              >
                <div className="relative h-20 w-20 rounded-full bg-[#D4AF37]/15 border-2 border-[#D4AF37]/35 flex items-center justify-center">
                  <Clock className="h-9 w-9 text-[#B8962E]" />
                </div>
                <div className="text-center">
                  <h2 className="text-xl font-black text-[#111118]">Appointment Confirmed</h2>
                  <p className="text-sm text-[#6b6b6b] mt-1">Invoice generated with outstanding balance</p>
                </div>
                <div className="w-full rounded-2xl bg-gradient-to-br from-[#111118] to-[#1e1e2a] p-5 shadow-2xl">
                  <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full border border-[#D4AF37]/30 bg-[#D4AF37]/10">
                        <img src={BRAND.clientLogo} alt="" className="h-5 w-5 object-contain" />
                      </div>
                      <span className="text-[14px] font-black text-[#d4af37]">{BRAND.clientName}</span>
                    </div>
                    <span className="text-[11px] font-mono text-[#d4af37]/70">{receiptData.invoiceNo}</span>
                  </div>
                  <div className="space-y-2 text-[13px]">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Customer</span>
                      <span className="font-semibold text-white">{receiptData.customer}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Payment Status</span>
                      <span className="font-semibold text-amber-300">Pending</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Paid Amount</span>
                      <span className="font-semibold text-white">₹0</span>
                    </div>
                    <div className="flex justify-between items-center border-t border-white/10 pt-3 mt-1">
                      <span className="text-gray-300 font-bold text-[14px]">Balance Due</span>
                      <span className="text-2xl font-black text-[#d4af37]">₹{receiptData.grandTotal.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
                <p className="text-[12px] text-center text-[#6b6b6b]">
                  Added to Pending Payments. Collect the balance anytime from Finance → Pending Payments.
                </p>
                <button
                  type="button"
                  onClick={() => setReceiptOpen(false)}
                  className="w-full h-11 rounded-xl bg-[#111118] text-[#D4AF37] text-[13px] font-bold hover:bg-[#1a1a1a] transition-colors"
                >
                  Done
                </button>
              </motion.div>
            )}

            {/* ── STEP 1: Payment Success ── */}
            {receiptStep === "success" && receiptData && (
              <motion.div key="success"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.25 }}
                className="relative overflow-hidden bg-gradient-to-br from-gray-50 via-white to-gray-100 px-6 py-8 flex flex-col items-center gap-4">

                {/* bg blobs */}
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ duration: 1.2 }}
                  className="pointer-events-none absolute -top-20 -left-20 h-64 w-64 rounded-full bg-green-200/40 blur-3xl" />
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ duration: 1.2, delay: 0.1 }}
                  className="pointer-events-none absolute -bottom-20 -right-20 h-64 w-64 rounded-full bg-[#d4af37]/20 blur-3xl" />

                {/* Icon */}
                <motion.div className="relative"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 380, damping: 16, delay: 0.05 }}>
                  <motion.div className="absolute inset-0 rounded-full bg-green-400/35"
                    animate={{ scale: [1, 1.75, 1], opacity: [0.6, 0, 0.6] }}
                    transition={{ duration: 2, repeat: Infinity }} />
                  <motion.div className="absolute inset-0 rounded-full bg-green-300/25"
                    animate={{ scale: [1, 2.3, 1], opacity: [0.4, 0, 0.4] }}
                    transition={{ duration: 2, repeat: Infinity, delay: 0.3 }} />
                  <div className="relative h-24 w-24 rounded-full bg-gradient-to-br from-green-400 to-green-600 shadow-2xl shadow-green-400/50 flex items-center justify-center">
                    <motion.div
                      initial={{ scale: 0, rotate: -30 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: "spring", stiffness: 500, damping: 20, delay: 0.2 }}>
                      <CheckCircle2 className="h-12 w-12 text-white drop-shadow-lg" />
                    </motion.div>
                  </div>
                </motion.div>

                {/* Heading */}
                <motion.div className="text-center relative z-10"
                  initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.22 }}>
                  <h2 className="text-2xl font-black text-green-600">Payment Successful!</h2>
                  <p className="text-sm text-gray-400 mt-1">Transaction completed successfully</p>
                </motion.div>

                {/* Dark invoice card */}
                <motion.div className="w-full rounded-2xl bg-gradient-to-br from-[#111118] to-[#1e1e2a] p-5 shadow-2xl shadow-black/25 relative z-10"
                  initial={{ opacity: 0, y: 20, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.4, delay: 0.32 }}>
                  <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full border border-[#D4AF37]/30 bg-[#D4AF37]/10">
                        <img src={BRAND.clientLogo} alt="" className="h-5 w-5 object-contain" />
                      </div>
                      <span className="text-[15px] font-black text-[#d4af37] tracking-wide">{BRAND.clientName}</span>
                    </div>
                    <span className="text-[11px] font-mono text-[#d4af37]/70">{receiptData?.invoiceNo}</span>
                  </div>
                  <div className="space-y-2 text-[13px]">
                    {[
                      ["Customer", receiptData?.customer ?? ""],
                      ["Items", `${receiptData?.items.length ?? 0} item${(receiptData?.items.length ?? 0) !== 1 ? "s" : ""}`],
                      ["Payment via", receiptData?.paymentMethod ?? ""],
                    ].map(([label, value], i) => (
                      <motion.div key={label}
                        initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.28, delay: 0.42 + i * 0.07 }}
                        className="flex justify-between">
                        <span className="text-gray-400">{label}</span>
                        <span className="font-semibold text-white capitalize">{value}</span>
                      </motion.div>
                    ))}
                    <motion.div className="flex justify-between items-center border-t border-white/10 pt-3 mt-1"
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.68 }}>
                      <span className="text-gray-300 font-bold text-[14px]">Amount Paid</span>
                      <motion.span className="text-2xl font-black text-[#d4af37]"
                        initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: "spring", stiffness: 300, damping: 18, delay: 0.74 }}>
                        {formatInr(receiptData?.grandTotal ?? 0)}
                      </motion.span>
                    </motion.div>
                  </div>
                </motion.div>

                {/* Loyalty */}
                <motion.div className="w-full flex items-center gap-3 rounded-xl bg-green-50 border border-green-200 px-4 py-3 relative z-10"
                  initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.35, delay: 0.78 }}>
                  <motion.div className="h-8 w-8 rounded-lg bg-green-100 flex items-center justify-center shrink-0"
                    animate={{ rotate: [0, -15, 15, -10, 10, 0] }} transition={{ duration: 0.6, delay: 1.1 }}>
                    <Star className="h-4 w-4 text-green-600 fill-green-500" />
                  </motion.div>
                  <p className="text-[13px] font-semibold text-green-700">
                    +{receiptData?.loyaltyEarned} loyalty points earned for {receiptData?.customer}!
                  </p>
                </motion.div>

                {/* Action buttons */}
                <motion.div className="w-full space-y-2.5 relative z-10"
                  initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: 0.88 }}>
                  {/* Send row */}
                  <p className="text-center text-[10px] font-bold uppercase tracking-widest text-gray-400">Send Receipt to Customer</p>
                  <div className="grid grid-cols-2 gap-2.5">
                    <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }}
                      onClick={() => {
                        const msg = encodeURIComponent(`Dear ${receiptData?.customer}, ${formatInr(receiptData?.grandTotal ?? 0)} received at ${BRAND.clientName}. Invoice: ${receiptData?.invoiceNo}. Thank you!`);
                        window.open(`sms:?body=${msg}`, "_blank");
                      }}
                      className="flex items-center justify-center gap-2 h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-[13px] font-bold transition-colors shadow-lg shadow-blue-200">
                      <Phone className="h-4 w-4" /> Send via SMS
                    </motion.button>
                    <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }}
                      onClick={() => {
                        const msg = encodeURIComponent(`Hi ${receiptData?.customer} 👋\n\nYour payment of *${formatInr(receiptData?.grandTotal ?? 0)}* at *${BRAND.clientName}* has been received.\n\n🧾 Invoice: ${receiptData?.invoiceNo}\n\nThank you for visiting us! ✨`);
                        window.open(`https://wa.me/?text=${msg}`, "_blank");
                      }}
                      className="flex items-center justify-center gap-2 h-11 rounded-xl text-white text-[13px] font-bold transition-colors shadow-lg shadow-green-200"
                      style={{ background: "linear-gradient(135deg, #25D366, #128C7E)" }}>
                      <Send className="h-4 w-4" /> WhatsApp
                    </motion.button>
                  </div>

                  {/* Done */}
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                    onClick={() => setReceiptOpen(false)}
                    className="w-full flex items-center justify-center gap-2 h-11 rounded-xl bg-gradient-to-r from-[#1a1a1a] to-[#2d2d2d] text-[13px] font-bold text-white hover:shadow-xl transition-all">
                    Done
                  </motion.button>
                </motion.div>
              </motion.div>
            )}

            {/* â”€â”€ STEP 2: Thermal Receipt â”€â”€ */}
            {receiptStep === "receipt" && (
              <motion.div key="receipt"
                initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                className="overflow-hidden bg-white">
                <div className="relative flex items-center justify-between border-b border-black/[0.06] bg-[#111118] px-4 py-3.5">
                  <button
                    type="button"
                    onClick={() => setReceiptStep("success")}
                    className="relative z-10 flex items-center gap-1.5 text-[11px] font-bold text-white/60 transition-colors hover:text-[#D4AF37]"
                  >
                    ← Back
                  </button>
                  <span className="relative z-10 font-mono text-[11px] font-semibold text-[#D4AF37]">{receiptData?.invoiceNo}</span>
                </div>
                <div className="max-h-[62vh] overflow-y-auto bg-[#faf9f7] p-4">
                  <SalonReceiptPaper>
                  <SalonReceiptBrandHeader />
                  <div className="border-b border-dashed border-[#D4AF37]/25 pb-3 mb-3 space-y-0.5">
                    {([["Invoice No.", receiptData?.invoiceNo], ["Date", receiptData?.date], ["Customer", receiptData?.customer], ["Billed By", billedByName || "—"], ["Payment", receiptData?.paymentMethod?.toUpperCase()]] as [string, string][]).map(([k, v]) => (
                      <div key={k} className="flex justify-between gap-3 text-[11px]"><span className="text-[#9a9a9a]">{k}</span><span className="font-bold text-right">{v}</span></div>
                    ))}
                  </div>
                  <div className="border-b border-dashed border-[#D4AF37]/25 pb-3 mb-3">
                    <div className="flex text-[10px] font-bold uppercase tracking-wider text-[#9a9a9a] border-b border-black/[0.08] pb-1 mb-1">
                      <span className="flex-1">Description</span>
                      <span className="w-6 text-center">Qt</span>
                      <span className="w-14 text-right">Rate</span>
                      <span className="w-16 text-right">Amt</span>
                    </div>
                    {receiptData?.items.map((item, idx) => (
                      <div key={idx} className="py-0.5">
                        <div className="flex text-[11px]">
                          <span className="flex-1 uppercase font-semibold truncate pr-1">{item.name}</span>
                          <span className="w-6 text-center">{item.qty}</span>
                          <span className="w-14 text-right">&#x20b9;{item.rate.toLocaleString()}</span>
                          <span className="w-16 text-right font-bold">&#x20b9;{item.total.toLocaleString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="border-b border-dashed border-[#D4AF37]/25 pb-3 mb-3 space-y-0.5">
                    <div className="flex justify-between text-[11px]"><span className="text-[#9a9a9a]">Subtotal</span><span>&#x20b9;{receiptData?.subtotal.toLocaleString()}</span></div>
                    {receiptData && receiptData.gst > 0 && <div className="flex justify-between text-[11px]"><span className="text-[#9a9a9a]">GST ({gstRate}%)</span><span>+&#x20b9;{receiptData.gst.toLocaleString()}</span></div>}
                    {receiptData && Math.abs(receiptData.roundOff) > 0 && <div className="flex justify-between text-[11px]"><span className="text-[#9a9a9a]">Round Off</span><span>&#x20b9;{receiptData.roundOff.toFixed(2)}</span></div>}
                    <div className="flex justify-between text-[13px] font-black border-t border-[#D4AF37]/30 pt-1.5 mt-1"><span>GRAND TOTAL</span><span className="text-[#9a7d20]">&#x20b9;{receiptData?.grandTotal.toLocaleString()}</span></div>
                    <div className="flex justify-between text-[11px] font-semibold"><span className="text-[#9a9a9a]">Paid ({receiptData?.paymentMethod})</span><span>&#x20b9;{receiptData?.grandTotal.toLocaleString()}</span></div>
                    <div className="flex justify-between text-[11px]"><span className="text-[#9a9a9a]">Balance Due</span><span className="font-bold">&#x20b9;0.00</span></div>
                  </div>
                  <div className="border-b border-dashed border-[#D4AF37]/25 pb-3 mb-3">
                    <div className="flex justify-between text-[11px]"><span className="text-[#9a9a9a]">Loyalty Points Earned</span><span className="font-bold text-[#9a7d20]">+{receiptData?.loyaltyEarned} pts</span></div>
                    <div className="flex justify-between text-[9px] text-[#9a9a9a]"><span>Redeem on next visit</span><span>1 pt = &#x20b9;0.50</span></div>
                  </div>
                  <div className="text-center space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#D4AF37]">{RECEIPT_FOOTER.thankYou}</p>
                    <p className="text-[9px] text-[#9a9a9a]">{RECEIPT_FOOTER.revisit}</p>
                    <div className="mx-auto mt-2 h-px w-16 bg-gradient-to-r from-transparent via-[#D4AF37]/40 to-transparent" />
                  </div>
                  </SalonReceiptPaper>
                </div>
                <div className="grid grid-cols-3 border-t border-black/[0.06] bg-white">
                  <button type="button" onClick={() => window.print()} className="flex flex-col items-center gap-1 border-r border-black/[0.06] py-3 text-[11px] font-semibold text-[#6b6b6b] transition-colors hover:bg-[#faf9f7] hover:text-[#9a7d20]"><Receipt className="h-4 w-4 text-[#D4AF37]" /> Print</button>
                  <button type="button" onClick={() => { const msg = encodeURIComponent(`Hi ${receiptData?.customer} 👋\n\nYour payment of *${formatInr(receiptData?.grandTotal ?? 0)}* at *${BRAND.clientName}* has been received.\n\n🧾 Invoice: ${receiptData?.invoiceNo}\n\nThank you! ✨`); window.open(`https://wa.me/?text=${msg}`, "_blank"); }} className="flex flex-col items-center gap-1 border-r border-black/[0.06] py-3 text-[11px] font-semibold text-[#6b6b6b] transition-colors hover:bg-[#faf9f7] hover:text-[#9a7d20]"><Send className="h-4 w-4 text-[#D4AF37]" /> WhatsApp</button>
                  <button type="button" onClick={() => { const msg = encodeURIComponent(`Dear ${receiptData?.customer}, ${formatInr(receiptData?.grandTotal ?? 0)} received at ${BRAND.clientName}. Invoice: ${receiptData?.invoiceNo}. Thank you!`); window.open(`sms:?body=${msg}`, "_blank"); }} className="flex flex-col items-center gap-1 py-3 text-[11px] font-semibold text-[#6b6b6b] transition-colors hover:bg-[#faf9f7] hover:text-[#9a7d20]"><Phone className="h-4 w-4 text-[#D4AF37]" /> SMS</button>
                </div>
                <div className="border-t border-black/[0.06] bg-white px-4 py-3">
                  <button type="button" onClick={() => setReceiptOpen(false)} className="h-10 w-full rounded-xl bg-[#111118] text-[12px] font-bold text-[#D4AF37] transition-colors hover:bg-[#1a1a1a]">Close</button>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </DialogContent>
      </Dialog>
      {/* â”€â”€ DELETE CONFIRM â”€â”€ */}

      <Dialog open={deleteConfirm !== null} onOpenChange={open => !open && setDeleteConfirm(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle className="flex items-center gap-2 text-red-600"><AlertCircle className="h-5 w-5" />Cancel Appointment?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">This will mark the appointment as cancelled. The customer will not be notified automatically.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Keep</Button>
            <Button variant="destructive" onClick={() => deleteConfirm && cancelAppointment(deleteConfirm)}>Cancel Appointment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* â”€â”€ APPOINTMENT DETAIL MODAL â”€â”€ */}
      <Dialog open={!!detailAppt} onOpenChange={open => !open && setDetailAppt(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Info className="h-5 w-5 text-[#d4af37]" />Appointment Details
            </DialogTitle>
          </DialogHeader>
          {detailAppt && (
            <div className="space-y-4">
              <div className="rounded-xl bg-gradient-to-br from-[#1a1a1a] to-[#2d2d2d] p-4 text-white">
                <p className="text-[#d4af37] text-xs font-semibold uppercase tracking-widest mb-1">Customer</p>
                <p className="text-xl font-bold">{detailAppt.customer}</p>
                <p className="text-sm text-gray-400">{detailAppt.phone}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Service", val: detailAppt.service },
                  { label: "Time", val: detailAppt.time },
                  { label: "Duration", val: `${detailAppt.duration} min` },
                  { label: "Type", val: detailAppt.type },
                  { label: "Status", val: detailAppt.status },
                ].map(item => (
                  <div key={item.label} className="rounded-lg bg-[#FAF8F2] p-3">
                    <p className="text-xs text-muted-foreground mb-0.5">{item.label}</p>
                    <p className="font-semibold text-sm capitalize">{item.val}</p>
                  </div>
                ))}
              </div>
              {detailAppt.extraServices && detailAppt.extraServices.length > 0 && (
                <div className="rounded-xl border border-[#d4af37]/30 p-3">
                  <p className="text-xs font-semibold text-[#d4af37] uppercase tracking-widest mb-2">Extra Services Added</p>
                  <div className="space-y-1">
                    {detailAppt.extraServices.map(e => (
                      <div key={e.name} className="flex justify-between text-sm">
                        <span>{e.name}</span>
                        <span className="font-semibold">{formatInr(e.price)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex gap-2">
                <Button className="flex-1" onClick={() => { setDetailAppt(null); openNotify(detailAppt.customer, detailAppt.phone); }}><MessageSquare className="h-4 w-4 mr-1" />Notify</Button>
                <Button variant="outline" className="flex-1" onClick={() => { setEditAppt(detailAppt); setDetailAppt(null); }}><Edit className="h-4 w-4 mr-1" />Edit</Button>
                {detailAppt.status === "in-progress" && (
                  <Button className="flex-1 bg-purple-600 hover:bg-purple-700" onClick={() => { openExtraServices(detailAppt); setDetailAppt(null); }}><PlusCircle className="h-4 w-4 mr-1" />Add Service</Button>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailAppt(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* â”€â”€ EXTRA SERVICES MODAL (for in-progress) â”€â”€ */}
      <Dialog open={extraServicesOpen} onOpenChange={open => { if (!open) setExtraServicesOpen(false); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Scissors className="h-5 w-5 text-[#d4af37]" />Add Extra Services
              {extraServicesTarget && <span className="text-sm font-normal text-muted-foreground ml-1">— {extraServicesTarget.customer}</span>}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Add additional services while the appointment is in progress. They will be included automatically in the final bill.</p>
            <div className="flex gap-2">
              <Select value={extraServicePick} onValueChange={setExtraServicePick}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select a service to add..." />
                </SelectTrigger>
                <SelectContent>
                  {serviceCatalog.filter(s => s.name !== extraServicesTarget?.service).map(s => (
                    <SelectItem key={s.id} value={s.name}>{s.name} — ₹{s.price}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={addExtraService} disabled={!extraServicePick} className="bg-[#d4af37] hover:bg-amber-600 text-white">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {/* Current extra services list */}
            {extraServicesTarget?.extraServices && extraServicesTarget.extraServices.length > 0 ? (
              <div className="rounded-xl border divide-y">
                <div className="px-3 py-2 bg-[#FAF8F2]">
                  <p className="text-xs font-semibold text-[#3d3d3d] uppercase tracking-widest">Added Services</p>
                </div>
                {extraServicesTarget.extraServices.map(e => (
                  <div key={e.name} className="flex items-center justify-between p-3">
                    <div>
                      <p className="font-medium text-sm">{e.name}</p>
                      <p className="text-xs text-muted-foreground">{formatInr(e.price)}</p>
                    </div>
                    <Button size="sm" variant="outline" className="h-7 w-7 p-0 text-red-500 hover:bg-red-50" onClick={() => removeExtraService(extraServicesTarget.id, e.name)}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
                <div className="px-3 py-2 flex justify-between items-center bg-amber-50">
                  <p className="text-sm font-semibold">Extra Total</p>
                  <p className="text-base font-bold text-[#d4af37]">{formatInr(extraServicesTarget.extraServices.reduce((s, e) => s + e.price, 0))}</p>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                No extra services added yet.
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExtraServicesOpen(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {correctionAppt && (
        <ProductCorrectionModal
          open={!!correctionAppt}
          onClose={() => setCorrectionAppt(null)}
          appointmentId={correctionAppt.id}
          serviceName={correctionAppt.service}
        />
      )}
    </div>
  );
}
