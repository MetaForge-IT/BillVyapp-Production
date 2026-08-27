import { useState, useMemo, useEffect, useRef, useLayoutEffect, startTransition } from "react";
import { cn } from "../components/ui/utils";
import { useAppointments } from "../context/AppointmentContext";
import { useReceipts } from "../context/ReceiptsContext";
import { usePendingPayments } from "../context/PendingPaymentsContext";
import { useAdvances } from "../context/AdvancesContext";
import { useCoupons } from "../context/CouponsContext";
import { confirmOnlyCheckout, completeCheckout } from "../../api/billing";
import { createFeedback } from "../../api/feedback";
import type { Customer } from "../../api/customers";
import { authService } from "../../services/authService";
import type { Appointment as ApiAppointment, ApptStatus } from "../../api/appointments";
import { fetchServiceCatalog } from "../../api/services";
import { getApiErrorMessage } from "../../lib/api";
import { addDaysToDateKey, istDateKey, istDateParts } from "../../lib/istDate";
import { useIncentives } from "../context/IncentivesContext";
import { useProducts } from "../context/ProductsContext";
import { useServiceProducts } from "../context/ServiceProductsContext";
import { useCustomersQuery } from "../hooks/useCustomersQuery";
import { parseInr, formatInr } from "../../lib/inventoryMappers";
import { formatDisplayPhone } from "../../lib/phone";
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
import { Switch } from "../components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "../components/ui/dropdown-menu";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import {
  Calendar as CalendarIcon, Clock, User, Search, Plus, Filter,
  ChevronLeft, ChevronRight, LayoutGrid, List, MessageSquare,
  Phone, Edit, Trash2, CheckCircle, XCircle, UserPlus, ListOrdered,
  Tag, Receipt, Bell, Send, X, Check, AlertCircle,
  Timer, MoreVertical, ArrowRight, PlayCircle, Info, ArrowLeft,
  PlusCircle, Scissors, Wallet, CheckCircle2, Star,
} from "lucide-react";
import { Pagination } from "../components/shared/Pagination";
import { PageStatCard } from "../components/shared/PageStatCard";
import { useTablePagination } from "../hooks/useTablePagination";
import { SEGMENTED_PILL_LIST, SEGMENTED_PILL_TRIGGER } from "../components/layout/segmented-nav";
import { toast } from "../components/ui/hot-toast";
import { BRAND, RECEIPT_FOOTER } from "../config/brand";
import { SalonReceiptBrandHeader, SalonReceiptPaper } from "../components/shared/SalonReceiptBrand";
import {
  BILL_PAY_METHODS,
  PaymentMethodPicker,
  createPaymentMethodValue,
  paymentMethodLabel,
  paymentMethodReference,
  primaryPayMethod,
  isPaymentMethodValid,
  type PaymentMethodValue,
} from "../components/shared/PaymentMethodPicker";
import {
  APPOINTMENTS,
  WALKINS,
  QUEUE,
  NO_DISCOUNT_TOOLS,
  type DiscountTool,
  type Appointment,
  type AppointmentStatus,
  type Walkin,
  type WalkinStatus,
  type BillingTarget,
  type NotifyTarget,
  statusColors,
} from "./appointments/board/boardTypes";
import { sortAppointmentQueue, sortWalkinQueue } from "./appointments/board/queueSort";
import {
  createDefaultBillPayment,
  toApiStatus,
  buildAppointmentServicePayload,
  appointmentServiceNames,
  customerInitials,
  DIRECT_BILL_TIER_BADGE,
  membershipTierLabel,
} from "./appointments/board/appointmentHelpers";
import { NOTIFY_TEMPLATES } from "./appointments/board/notifyTemplates";
import { EditWalkinDialog } from "./appointments/board/EditWalkinDialog";
import { EditAppointmentDialog } from "./appointments/board/EditAppointmentDialog";
import { NotifyCustomerDialog } from "./appointments/board/NotifyCustomerDialog";
import { QueueBoard } from "./appointments/board/QueueBoard";

export function Appointments() {
  const [serviceCatalog, setServiceCatalog] = useState<CatalogService[]>([]);

  useEffect(() => {
    fetchServiceCatalog()
      .then((services) => setServiceCatalog(mapApiCatalog(services)))
      .catch((error) => toast.error(getApiErrorMessage(error, "Failed to load services")));
  }, []);

  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchFilters, setShowSearchFilters] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType, setFilterType] = useState(() => {
    if (typeof window === "undefined") return "all";
    const t = new URLSearchParams(window.location.search).get("type");
    return t === "walk-in" || t === "appointment" ? t : "all";
  });
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
  const { addPendingPayment, refresh: refreshPending, pendingPayments } = usePendingPayments();
  const { customers: cachedCustomers, reloadCustomers } = useCustomersQuery();
  const { recordBillingIncentives } = useIncentives();
  const { deductBySku, products: retailProducts, refresh: refreshProducts } = useProducts();
  const { getLinks: getServiceProductLinks } = useServiceProducts();
  const { getActiveAdvancesForPhone, deductAdvance } = useAdvances();
  const { coupons } = useCoupons();
  const [loyaltyAvailable, setLoyaltyAvailable] = useState(0);
  const [billedByName, setBilledByName] = useState("");
  const [appointments, setAppointments] = useState<Appointment[]>(APPOINTMENTS);

  useEffect(() => {
    void refreshPending();
  }, [refreshPending]);

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
      const customers = cachedCustomers.length > 0 ? cachedCustomers : await reloadCustomers();
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
    const pendingIds = new Set(
      pendingPayments.map((p) => p.appointmentId).filter((id): id is string => Boolean(id)),
    );
    const rows = ctxAppointments.map((a) => {
      const services =
        a.services && a.services.length > 0
          ? a.services
          : a.service
            ? a.service.split(",").map((s) => s.trim()).filter(Boolean)
            : [];
      return {
        id: a.id,
        sortKey: a.sortKey || (a.updatedAt ? Date.parse(a.updatedAt) : Date.parse(a.createdAt)),
        time: a.time,
        duration: a.duration,
        customer: a.customer,
        phone: a.phone,
        customerId: a.customerId,
        service: services.length > 0 ? services.join(", ") : a.service,
        services,
        serviceLines: a.serviceLines,
        // Confirm-only unpaid visits are completed for floor purposes
        status: (pendingIds.has(a.id) ? "completed" : a.status) as AppointmentStatus,
        type: (a.type === "walk-in" ? "walk-in" : "appointment") as const,
        date: a.date,
        scheduledDate: a.scheduledDate,
        notes: a.notes,
      };
    });
    setAppointments(rows);
  }, [ctxAppointments, pendingPayments]);

  useEffect(() => {
    const pendingIds = new Set(
      pendingPayments.map((p) => p.appointmentId).filter((id): id is string => Boolean(id)),
    );
    const walkInRows = ctxAppointments
      .filter((a) => a.type === "walk-in")
      // Confirm-only bills are collected from Pending Payments — keep them off the floor queue
      .filter((a) => a.status !== "completed" && !pendingIds.has(a.id))
      .map((a) => {
        const services =
          a.services && a.services.length > 0
            ? a.services
            : a.service
              ? a.service.split(",").map((s) => s.trim()).filter(Boolean)
              : [];
        return {
          id: a.id,
          sortKey: a.sortKey,
          token: `W-${a.id.slice(-3).toUpperCase()}`,
          customer: a.customer,
          phone: a.phone,
          customerId: a.customerId,
          service: services.length > 0 ? services.join(", ") : a.service,
          services,
          status: (a.status === "in-progress" ? "in-service" : a.status === "completed" ? "done" : "waiting") as WalkinStatus,
          waitMins: 0,
          arrival: a.time,
          notes: a.notes,
        };
      });
    setWalkins(walkInRows);
  }, [ctxAppointments, pendingPayments]);
  const [walkins, setWalkins] = useState<Walkin[]>(WALKINS);
  const [queue, setQueue] = useState<any[]>(QUEUE);
  const [editAppt, setEditAppt] = useState<Appointment | null>(null);
  const [detailAppt, setDetailAppt] = useState<Appointment | null>(null);
  const [expandedServices, setExpandedServices] = useState<Set<string>>(new Set());
  const [customerInfoAppt, setCustomerInfoAppt] = useState<Appointment | null>(null);
  const [notifyOpen, setNotifyOpen] = useState(false);
  const [notifyTarget, setNotifyTarget] = useState<NotifyTarget | null>(null);
  const [notifyMsg, setNotifyMsg] = useState("");
  const [billingOpen, setBillingOpen] = useState(false);
  const billAutoOpenedRef = useRef<string | null>(null);
  const billRefreshTriedRef = useRef(false);
  const directBillCustomers = cachedCustomers;
  const [billingTarget, setBillingTarget] = useState<BillingTarget | null>(null);
  const [isDirectBill, setIsDirectBill] = useState(false);
  const [directCustomerSearch, setDirectCustomerSearch] = useState("");
  const [directCustomerMode, setDirectCustomerMode] = useState<"search" | "new">("search");
  const [directCustomerSelected, setDirectCustomerSelected] = useState(false);

  const [billingItems, setBillingItems] = useState<{
    type: "service" | "product";
    name: string;
    price: number;
    qty: number;
    serviceId?: string;
    productId?: string;
  }[]>([]);
  const [discountPct, setDiscountPct] = useState(0);
  const [discountFlat, setDiscountFlat] = useState(0);
  const [discountMode, setDiscountMode] = useState<"pct" | "flat">("pct");
  const [discountReason, setDiscountReason] = useState("");
  const [advanceApplied, setAdvanceApplied] = useState(0);
  const [payMethod, setPayMethod] = useState<PaymentMethodValue>(createDefaultBillPayment());
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [receiptStep, setReceiptStep] = useState<"success" | "pending" | "receipt">("success");
  const [receiptData, setReceiptData] = useState<{
    invoiceNo: string; customer: string; date: string; items: { name: string; qty: number; rate: number; total: number }[];
    subtotal: number; gst: number; roundOff: number; grandTotal: number; paymentMethod: string; loyaltyEarned: number;
    appointmentId?: string;
  } | null>(null);
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackHover, setFeedbackHover] = useState(0);
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const [billingMenuTab, setBillingMenuTab] = useState<"services" | "products" | "combos">("services");
  const [billingGenderTab, setBillingGenderTab] = useState<"all" | "male" | "female">("all");
  const [billingServiceSearch, setBillingServiceSearch] = useState("");
  const [billingReferral, setBillingReferral] = useState("");
  // â”€â”€ Billing extras â”€â”€
  const [gstEnabled, setGstEnabled] = useState(false);
  const [gstRate, setGstRate] = useState(5);
  const [customTaxMode, setCustomTaxMode] = useState(false);
  const [customTaxInput, setCustomTaxInput] = useState("");
  const [couponInput, setCouponInput] = useState("");
  const [couponApplied, setCouponApplied] = useState<{ code: string; value: number; type: "%" | "₹" } | null>(null);
  const [loyaltyRedeem, setLoyaltyRedeem] = useState(0);
  const [scanFocus, setScanFocus] = useState(false);
  const [discountTools, setDiscountTools] = useState<Record<DiscountTool, boolean>>(NO_DISCOUNT_TOOLS);
  const setDiscountToolEnabled = (tool: DiscountTool, enabled: boolean) => {
    setDiscountTools((prev) => ({ ...prev, [tool]: enabled }));
    if (enabled) return;

    // Turning a switch off must also remove its value from the bill.
    if (tool === "coupon") {
      setCouponApplied(null);
      setCouponInput("");
    } else if (tool === "loyalty") {
      setLoyaltyRedeem(0);
    } else if (tool === "manual") {
      setDiscountPct(0);
      setDiscountFlat(0);
      setDiscountReason("");
    } else if (tool === "advance") {
      setAdvanceApplied(0);
    }
  };
  const [billingAppointmentType, setBillingAppointmentType] = useState<"appointment" | "walk-in">("appointment");
  const [walkinSearch, setWalkinSearch] = useState("");
  const [walkinStatusFilter, setWalkinStatusFilter] = useState<"all" | WalkinStatus>("all");
  const [editWalkin, setEditWalkin] = useState<Walkin | null>(null);
  const [customerInfoWalkin, setCustomerInfoWalkin] = useState<Walkin | null>(null);
  const [walkinDeleteConfirm, setWalkinDeleteConfirm] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [correctionAppt, setCorrectionAppt] = useState<{ id: string; service: string } | null>(null);
  const [selectedCalDate, setSelectedCalDate] = useState<number | null>(() => istDateParts().day);
  const [calMonth, setCalMonth] = useState(() => istDateParts().month);
  const [calYear, setCalYear] = useState(() => istDateParts().year);
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  const dateParam = searchParams.get("date");
  const typeParam = searchParams.get("type");
  const focusAppointmentId = searchParams.get("appointment");
  const billAppointmentId = searchParams.get("bill");
  const activeTab = tabParam === "calendar" ? "calendar" : "timeline";
  const setActiveTab = (tab: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (tab === "timeline") next.delete("tab");
      else next.set("tab", tab);
      return next;
    }, { replace: true });
  };

  const toDateKey = (d: Date) => istDateKey(d);

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

  const clearSearchFilters = () => {
    setSearchQuery("");
    setFilterStatus("all");
    setFilterTypeAndUrl("all");
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

  const pendingAppointmentIds = useMemo(() => {
    const ids = new Set<string>();
    for (const p of pendingPayments) {
      if (p.appointmentId) ids.add(p.appointmentId);
    }
    return ids;
  }, [pendingPayments]);

  const normalizedAppointmentSearch = searchQuery.trim().toLowerCase();
  const appointmentSearchDigits = searchQuery.replace(/\D/g, "");
  const filteredAppts = sortAppointmentQueue(appointments.filter(a => {
    // Confirm-only / unpaid invoices belong in Pending Payments — not the floor board
    if (pendingAppointmentIds.has(a.id)) return false;
    const isFocused = Boolean(focusAppointmentId && a.id === focusAppointmentId);
    const normalizedPhone = a.phone.replace(/\D/g, "");
    const matchSearch =
      isFocused ||
      normalizedAppointmentSearch.length === 0 ||
      a.customer.toLowerCase().includes(normalizedAppointmentSearch) ||
      a.service.toLowerCase().includes(normalizedAppointmentSearch) ||
      a.phone.toLowerCase().includes(normalizedAppointmentSearch) ||
      (appointmentSearchDigits.length > 0 && normalizedPhone.includes(appointmentSearchDigits));
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
    if (!focusAppointmentId || billAppointmentId) return;
    const idx = filteredAppts.findIndex((a) => a.id === focusAppointmentId);
    if (idx < 0) return;
    const targetPage = Math.floor(idx / apptsPagination.pageSize) + 1;
    if (apptsPagination.page !== targetPage) {
      apptsPagination.setPage(targetPage);
      return;
    }
    const timer = window.setTimeout(() => {
      const layout = window.innerWidth < 1024 ? "card" : "row";
      document.getElementById(`appt-${layout}-${focusAppointmentId}`)?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 80);
    return () => window.clearTimeout(timer);
  }, [focusAppointmentId, billAppointmentId, filteredAppts, apptsPagination.page, apptsPagination.pageSize, apptsPagination.setPage]);

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
    services: string[];
    status?: AppointmentStatus;
  }) => {
    const names = params.services.map((s) => s.trim()).filter(Boolean);
    if (names.length === 0) {
      throw new Error("Select at least one service");
    }
    await apiUpdateAppointment(params.id, {
      customerName: params.customer.trim(),
      customerPhone: params.phone.trim(),
      ...(params.status ? { status: toApiStatus(params.status) } : {}),
      services: names.map((name) =>
        buildAppointmentServicePayload(serviceCatalog, name, 30),
      ),
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

  const deductAppointmentServiceProducts = async (id: string) => {
    const appt = appointments.find((a) => a.id === id);
    if (!appt) return;

    const serviceRefs = appt.serviceLines?.length
      ? appt.serviceLines.map((line) => ({
          id: line.serviceId,
          name: line.itemName,
        }))
      : (appt.services?.length ? appt.services : [appt.service]).map((name) => ({
          id: findCatalogService(serviceCatalog, name)?.id,
          name,
        }));

    const usageBySku = new Map<string, { qty: number; services: Set<string> }>();
    for (const service of serviceRefs) {
      if (!service.id) continue;
      for (const link of getServiceProductLinks(service.id)) {
        const current = usageBySku.get(link.sku) ?? { qty: 0, services: new Set<string>() };
        current.qty += link.defaultQty;
        current.services.add(service.name);
        usageBySku.set(link.sku, current);
      }
    }

    await Promise.all(
      Array.from(usageBySku.entries()).map(([sku, usage]) =>
        deductBySku(
          sku,
          usage.qty,
          "Service Used",
          `APT-${id}`,
          `Used in: ${Array.from(usage.services).join(", ")}`,
        ),
      ),
    );
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
    const local = appointments.find((a) => a.id === id);
    const ctx = ctxAppointments.find((a) => a.id === id);
    const status = local?.status || ctx?.status;
    if (status === "completed") {
      toast.info("This appointment has already been checked out.");
      return;
    }
    if (status === "cancelled" || status === "no-show") {
      toast.error("This appointment is not eligible for checkout.");
      return;
    }
    const phone = local?.phone || ctx?.phone || "";
    const type = (local?.type || ctx?.type || "appointment") === "walk-in" ? "walk-in" : "appointment";
    const time = local?.time || ctx?.time;
    const customerId = local?.customerId || ctx?.customerId;
    const serviceLines = local?.serviceLines || ctx?.serviceLines;
    const servicesList =
      (local?.services && local.services.length > 0
        ? local.services
        : ctx?.services && ctx.services.length > 0
          ? ctx.services
          : null) ??
      service.split(",").map((s: string) => s.trim()).filter(Boolean);
    const extras = local?.extraServices || [];

    setBillingTarget({
      id,
      name,
      phone,
      service,
      type,
      time,
      customerId,
      sourceKind: "appointment",
    });
    setBillingAppointmentType(type);

    const baseItems = serviceLines?.length
      ? serviceLines.map((line) => ({
          type: "service" as const,
          name: line.itemName,
          price: line.price,
          qty: 1,
          serviceId: line.serviceId,
        }))
      : servicesList.map((svcName) => {
          const match = findCatalogService(serviceCatalog, svcName);
          return {
            type: "service" as const,
            name: svcName,
            price: match?.price ?? resolveServicePrice(serviceCatalog, svcName),
            qty: 1,
            serviceId: match?.id,
          };
        });

    setBillingItems([
      ...baseItems,
      ...extras.map((e) => ({ type: "service" as const, name: e.name, price: e.price, qty: 1 })),
    ]);
    setDiscountPct(0);
    setDiscountFlat(0);
    setDiscountTools(NO_DISCOUNT_TOOLS);
    setAdvanceApplied(0);
    setPayMethod(createDefaultBillPayment());
    setScanFocus(false);
    setIsDirectBill(false);
    // Defer loyalty fetch until the open animation has settled, otherwise the
    // loyalty row pops in mid-transition and reads as a flicker.
    startTransition(() => {
      window.setTimeout(() => {
        void loadLoyaltyForPhone(phone);
      }, 400);
    });
    setBillingOpen(true);
  };

  // Let the calm backdrop settle before the checkout animates in; opening both in
  // the same frame reads as a flash even when nothing actually moves.
  const [billBackdropSettled, setBillBackdropSettled] = useState(false);
  useEffect(() => {
    if (!billAppointmentId) {
      setBillBackdropSettled(false);
      return;
    }
    const timer = window.setTimeout(() => setBillBackdropSettled(true), 260);
    return () => window.clearTimeout(timer);
  }, [billAppointmentId]);

  // Walk-in Bill → open Appointment Checkout once the backdrop is in place.
  useLayoutEffect(() => {
    if (!billAppointmentId || billingOpen) return;
    if (billAutoOpenedRef.current === billAppointmentId) return;

    const fromCtx = ctxAppointments.find((a) => a.id === billAppointmentId);
    const fromLocal = appointments.find((a) => a.id === billAppointmentId);
    if (!fromCtx && !fromLocal) {
      if (!apptLoading && !billRefreshTriedRef.current) {
        billRefreshTriedRef.current = true;
        void refreshAppointments();
      }
      return;
    }
    if (!billBackdropSettled) return;

    const customer = fromLocal?.customer ?? fromCtx!.customer;
    const service =
      fromLocal?.service ??
      (fromCtx!.services && fromCtx!.services.length > 0
        ? fromCtx!.services.join(", ")
        : fromCtx!.service);

    billAutoOpenedRef.current = billAppointmentId;
    openBilling(billAppointmentId, customer, service);
  }, [
    billAppointmentId,
    billBackdropSettled,
    appointments,
    ctxAppointments,
    billingOpen,
    apptLoading,
    refreshAppointments,
  ]);

  // Stays true for the whole Walk-in → Bill handoff so the backdrop never changes
  // underneath the checkout dialog while it animates in.
  const billHandoffActive = Boolean(billAppointmentId);
  const billHandoffPending = billHandoffActive && !billingOpen;

  // Never strand the user on the loader if the booking can't be resolved.
  useEffect(() => {
    if (!billHandoffPending) return;
    const timer = window.setTimeout(() => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.delete("bill");
        return next;
      }, { replace: true });
      toast.error("Couldn't open checkout — please pick the booking from the list");
    }, 6000);
    return () => window.clearTimeout(timer);
  }, [billHandoffPending, setSearchParams]);

  const resetBillingForm = () => {
    setCouponApplied(null);
    setCouponInput("");
    setLoyaltyRedeem(0);
    setDiscountPct(0);
    setDiscountFlat(0);
    setDiscountMode("pct");
    setDiscountTools(NO_DISCOUNT_TOOLS);
    setDiscountReason("");
    setAdvanceApplied(0);
    setPayMethod(createDefaultBillPayment());
    setScanFocus(false);
  };

  const clearBillingSelections = () => {
    setBillingItems([]);
    setBillingServiceSearch("");
    setBillingReferral("");
    setDirectCustomerSearch("");
    setDirectCustomerSelected(false);
    setDirectCustomerMode("search");
    resetBillingForm();
  };

  const dismissBilling = () => {
    setBillingOpen(false);
    setScanFocus(false);
    clearBillingSelections();

    if (!billAppointmentId) return;

    billAutoOpenedRef.current = null;
    billRefreshTriedRef.current = false;
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete("bill");
      return next;
    }, { replace: true });
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
    setDiscountPct(0);
    setDiscountFlat(0);
    setDiscountTools(NO_DISCOUNT_TOOLS);
    setAdvanceApplied(0);
    setPayMethod(createDefaultBillPayment());
    setScanFocus(false);
    setIsDirectBill(false);
    void loadLoyaltyForPhone(w.phone);
    setBillingOpen(true);
  };

  const startWalkin = (id: string) => {
    void persistStatus(id, "in-service", {
      successMessage: "Service started",
    });
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
  // Manual discount is entered either as a percentage of the subtotal or as a
  // flat rupee amount; the bill and the invoice always carry the rupee value.
  const discount        = discountMode === "pct"
    ? Math.round(billSubtotal * discountPct / 100)
    : Math.min(Math.round(discountFlat), billSubtotal);
  const billCouponDisc  = couponApplied
    ? couponApplied.type === "%" ? Math.round(billSubtotal * couponApplied.value / 100) : couponApplied.value
    : 0;
  const billLoyalty     = Math.min(loyaltyRedeem * 0.5, billSubtotal - billCouponDisc);
  const billAfterDiscs  = Math.max(0, billSubtotal - billCouponDisc - billLoyalty - discount);
  const billGst         = gstEnabled ? Math.round(billAfterDiscs * gstRate / 100) : 0;
  const billTotal       = billSubtotal; // kept for legacy refs
  const billFinal       = billAfterDiscs + billGst;
  const billGrand        = Math.max(0, Math.round(billFinal)); // full bill value, pre-advance
  const matchedAdvances  = billingTarget?.phone ? getActiveAdvancesForPhone(billingTarget.phone) : [];
  const advanceAvailable = matchedAdvances.reduce((s, a) => s + a.balance, 0);
  const billDue           = Math.max(0, billGrand - advanceApplied); // what still needs collecting via cash/card/upi/etc.
  // Opt-in scan screen: hides the bill controls so the QR can fill the panel.
  const scanToPayFocus    = payMethod.method === "upi" && scanFocus;

  const applyCouponCode = () => {
    const code = couponInput.trim().toUpperCase();
    if (!code) return;
    const match = coupons.find((c) => c.code.toUpperCase() === code && c.status === "active");
    if (!match) {
      toast.error("Coupon not found or inactive");
      return;
    }
    setCouponApplied({
      code: match.code,
      value: match.value,
      type: match.type === "percentage" ? "%" : "₹",
    });
    setCouponInput("");
  };

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

  const finalizeAppointmentAfterCheckout = async () => {
    if (!billingTarget) return;
    if (billingTarget.id) {
      await deductAppointmentServiceProducts(billingTarget.id);
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
    discountAmount: billLoyalty,
    couponDiscount: billCouponDisc,
    couponCode: billCouponDisc > 0 ? couponApplied?.code : undefined,
    manualDiscountAmount: discount,
    manualDiscountReason: discount > 0 ? discountReason.trim() : undefined,
    gstRate: gstEnabled ? gstRate : 0,
    gstAmount: billGst,
    totalAmount: grand,
    dueDate: addDaysToDateKey(istDateKey(), 7),
  });

  const buildReceiptSnapshot = (
    invoiceNo: string,
    grand: number,
    payLabel: string,
    roundOff: number,
    loyaltyEarned: number,
    appointmentId?: string,
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
    appointmentId: appointmentId || billingTarget?.id || undefined,
  });

  const submitReceiptFeedbackAndGoDashboard = async () => {
    if (!receiptData) return;
    if (!feedbackRating || feedbackRating < 1 || feedbackRating > 5) {
      toast.error("Please select a rating from 1 to 5 stars");
      return;
    }
    if (!receiptData.appointmentId) {
      toast.error("Unable to save feedback — appointment not found");
      return;
    }

    setFeedbackSubmitting(true);
    try {
      await createFeedback({
        appointmentId: receiptData.appointmentId,
        rating: feedbackRating,
        source: "app",
      });
      toast.success("Thanks for the feedback!");
      setReceiptOpen(false);
      setFeedbackRating(0);
      setFeedbackHover(0);
      navigate("/dashboard");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to save feedback"));
    } finally {
      setFeedbackSubmitting(false);
    }
  };

  const handleConfirmOnly = async () => {
    if (!billingTarget || billingItems.length === 0) {
      toast.error("Add at least one service or product before confirming.");
      return;
    }
    if (discount > 0 && discountReason.trim().length < 3) {
      toast.error("Enter a reason for the manual discount (at least 3 characters).");
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
    if (discount > 0 && discountReason.trim().length < 3) {
      toast.error("Enter a reason for the manual discount (at least 3 characters).");
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
        invoice.appointmentId || billingTarget.id,
      ));
      setBillingOpen(false);
      resetBillingForm();
      setFeedbackRating(0);
      setFeedbackHover(0);
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
    <>
      {/* Walk-in → Bill: hold a still backdrop for the whole handoff so the
          checkout dialog fades in over something that never moves. */}
      {billHandoffActive && (
        <div className="animate-in fade-in-0 slide-in-from-bottom-1 duration-300 ease-out flex min-h-[60vh] flex-col items-center justify-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[#D4AF37]/30 bg-[#D4AF37]/10">
            <Receipt className={cn("h-6 w-6 text-[#D4AF37]", billHandoffPending && "animate-pulse")} />
          </div>
          <p className="text-[14px] font-bold text-[#111118]">Opening checkout…</p>
          <p className="text-[12px] text-[#52525b]">Preparing walk-in bill</p>
        </div>
      )}

      <div
        className={cn(
          "appointments-shell transition-opacity duration-300 ease-out",
          billHandoffActive
            ? "h-0 overflow-hidden opacity-0 pointer-events-none"
            : "opacity-100 delay-100",
        )}
      >
      <div className="min-w-0 shrink-0 space-y-3 sm:space-y-4">
      {/* Header */}
      <div className="flex min-w-0 items-center justify-between gap-2 sm:gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-bold bg-gradient-to-r from-[#1a1a1a] to-[#d4af37] bg-clip-text text-transparent sm:text-3xl">
            Appointments
          </h1>
          <p className="text-muted-foreground mt-0.5 text-xs sm:mt-1 sm:text-base">Timeline · Calendar</p>
        </div>
        <Button
          size="lg"
          className="h-9 shrink-0 rounded-xl px-3 shadow-lg sm:h-11 sm:px-4"
          onClick={() => navigate("/appointments/new")}
        >
          <Plus className="h-4 w-4 sm:mr-1 sm:h-5 sm:w-5" />
          <span className="sm:hidden text-[12px] font-bold">New</span>
          <span className="hidden sm:inline">Create Appointment</span>
        </Button>
      </div>

      {/* Laptop/desktop only — tablets and phones prioritize working space. */}
      <div className="hidden shrink-0 gap-3 lg:grid lg:grid-cols-3 2xl:grid-cols-6">
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
      <div className="min-w-0 shrink-0 overflow-hidden rounded-2xl border border-[#D4AF37]/15 bg-white shadow-[0_2px_12px_rgba(212,175,55,0.06)]">
        {/* Top row: date nav */}
        <div className="flex min-w-0 items-center justify-between gap-2 border-b border-gray-100 px-2.5 py-2.5 sm:px-5 sm:py-3.5">
          <div className="flex min-w-0 flex-1 items-center gap-1.5 sm:gap-2">
            <button type="button" onClick={() => setViewDate(new Date(currentDate.getTime() - 86400000))}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 transition-all hover:bg-gray-50 hover:text-[#111118]">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#111118] px-2.5 py-1.5 sm:flex-none sm:gap-2 sm:px-4">
              <CalendarIcon className="h-3.5 w-3.5 shrink-0 text-[#D4AF37]" />
              <span className="truncate text-[12px] font-bold text-white sm:text-[13px]">
                {dateParam ? formatDate(currentDate) : "All dates"}
              </span>
            </div>
            <button type="button" onClick={() => setViewDate(new Date(currentDate.getTime() + 86400000))}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 transition-all hover:bg-gray-50 hover:text-[#111118]">
              <ChevronRight className="h-4 w-4" />
            </button>
            <button type="button" onClick={() => setViewDate(new Date())}
              className="h-8 shrink-0 rounded-xl border border-[#D4AF37]/30 bg-[#D4AF37]/08 px-2.5 text-[11px] font-bold text-[#9a7d20] transition-all hover:bg-[#D4AF37]/15 sm:px-4 sm:text-[12px]">
              Today
            </button>
          </div>
        </div>

        {/* Bottom: search + filters (toggle on phones) */}
        <div className="min-w-0 px-2.5 py-2.5 sm:px-5 sm:py-3">
          {(dateParam || focusAppointmentId) && (
            <div className="mb-2.5 flex min-w-0 flex-wrap items-center gap-2">
              {dateParam && (
                <span className="inline-flex max-w-full min-w-0 items-center gap-2 truncate rounded-xl border border-[#D4AF37]/35 bg-[#FFFBEB] px-3 py-1.5 text-[12px] font-semibold text-[#9a7d20]">
                  <CalendarIcon className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">Showing {new Date(`${dateParam}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
                  <button type="button" onClick={clearDateFilter} className="shrink-0 text-[#52525b] hover:text-[#111118]">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </span>
              )}
              {focusAppointmentId && (
                <span className="inline-flex items-center gap-2 rounded-xl border border-[#111118]/15 bg-[#111118] px-3 py-1.5 text-[12px] font-semibold text-[#D4AF37]">
                  Focused booking
                  <button type="button" onClick={clearAppointmentFocus} className="text-white/50 hover:text-white" aria-label="Clear focus">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </span>
              )}
            </div>
          )}

          <div className="flex items-center justify-between gap-3 md:hidden">
            <div className="flex min-w-0 items-center gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#D4AF37]/25 bg-[#D4AF37]/10">
                <Filter className="h-4 w-4 text-[#D4AF37]" />
              </div>
              <div className="min-w-0">
                <p className="text-[13px] font-bold text-[#111118]">Search &amp; filters</p>
                <p className="text-[11px] text-[#52525b]">
                  {showSearchFilters ? "Turn off to hide and reset" : "Turn on to search or filter"}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span className={`text-[11px] font-semibold ${showSearchFilters ? "text-[#9a7d20]" : "text-[#52525b]"}`}>
                {showSearchFilters ? "On" : "Off"}
              </span>
              <Switch
                checked={showSearchFilters}
                onCheckedChange={(checked) => {
                  setShowSearchFilters(checked);
                  if (!checked) clearSearchFilters();
                }}
                className="data-[state=checked]:bg-[#D4AF37] data-[state=unchecked]:bg-[#e0dbd0]"
                aria-label="Toggle search and filters"
              />
            </div>
          </div>

          <div
            className={cn(
              "min-w-0 flex-col items-stretch gap-2.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3",
              showSearchFilters ? "mt-3 flex md:mt-0" : "hidden md:flex",
            )}
          >
            {/* Search */}
            <div className="relative w-full min-w-0 sm:w-auto sm:max-w-xs sm:flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
              <input
                placeholder="Search name or phone"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="h-9 w-full rounded-xl border border-gray-200 bg-gray-50 pl-9 pr-4 text-[13px] transition-all placeholder:text-gray-400 focus:border-[#D4AF37] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/12"
              />
            </div>

            {/* Status filter — wrap on phones, no sideways scroll */}
            <div className="grid w-full min-w-0 grid-cols-2 gap-1 rounded-xl border border-gray-200 bg-gray-100 p-1 sm:flex sm:w-auto sm:overflow-visible">
              {([
                { v: "all",         label: "All", short: "All" },
                { v: "waiting",     label: "Waiting", short: "Waiting" },
                { v: "in-progress", label: "In Progress", short: "Active" },
                { v: "completed",   label: "Completed", short: "Done" },
              ] as const).map(({ v, label, short }) => (
                <button key={v} type="button" onClick={() => setFilterStatus(v)}
                  className={cn("h-8 rounded-lg px-2 text-[11px] font-bold transition-all sm:h-7 sm:px-3 sm:whitespace-nowrap",
                    filterStatus === v ? "bg-[#111118] text-[#D4AF37] shadow-sm" : "text-gray-500 hover:text-[#111118]")}>
                  <span className="sm:hidden">{short}</span>
                  <span className="hidden sm:inline">{label}</span>
                </button>
              ))}
            </div>

            {/* Type filter */}
            <Select value={filterType} onValueChange={setFilterTypeAndUrl}>
              <SelectTrigger className="h-9 w-full rounded-xl border-gray-200 bg-gray-50 text-[13px] font-medium focus:border-[#D4AF37] focus:ring-[#D4AF37]/12 sm:w-36">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="appointment">Appointments</SelectItem>
                <SelectItem value="walk-in">Walk-ins</SelectItem>
              </SelectContent>
            </Select>

            {/* Result count */}
            <span className="text-[11px] font-medium text-gray-400 sm:ml-auto">{filteredAppts.length} result{filteredAppts.length !== 1 ? "s" : ""}</span>
          </div>
        </div>
      </div>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex min-h-0 min-w-0 max-w-full flex-1 flex-col gap-2.5 overflow-hidden sm:gap-3">
        <TabsList className={cn(SEGMENTED_PILL_LIST, "shrink-0")}>
          <TabsTrigger value="timeline" className={SEGMENTED_PILL_TRIGGER}>
            <List className="h-3.5 w-3.5" />
            Timeline
          </TabsTrigger>
          <TabsTrigger value="calendar" className={SEGMENTED_PILL_TRIGGER}>
            <CalendarIcon className="h-3.5 w-3.5" />
            Calendar
          </TabsTrigger>
        </TabsList>

        {/* Timeline tab — list scrolls, pagination pinned */}
        <TabsContent value="timeline" className="mt-0 flex min-h-0 min-w-0 max-w-full flex-1 flex-col overflow-hidden data-[state=inactive]:hidden">

          {filteredAppts.length === 0 && (
            <Card className="min-w-0 shrink-0"><CardContent className="py-12 text-center text-muted-foreground">No appointments or walk-ins match your filters.</CardContent></Card>
          )}
          <Card className="flex min-h-0 min-w-0 max-w-full flex-1 flex-col overflow-hidden shadow-lg">
              <CardContent className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden p-0">
                <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain">
                {/* Tablet/phone: cards expose every field and action without a
                    horizontally scrolling seven-column table. */}
                <div className="divide-y divide-black/[0.06] lg:hidden">
                  {paginatedAppts.map((appointment, index) => {
                    const services = [
                      appointment.service,
                      ...((appointment.extraServices ?? []).map((extra) => extra.name)),
                    ].filter(Boolean);
                    const notStarted = ["pending", "confirmed", "checked-in"].includes(appointment.status);
                    const inProgress = appointment.status === "in-progress";
                    const isDone = ["completed", "cancelled", "no-show"].includes(appointment.status);

                    return (
                      <article
                        id={`appt-card-${appointment.id}`}
                        key={appointment.id}
                        className={cn(
                          "min-w-0 max-w-full space-y-2.5 p-3 sm:space-y-3 sm:p-5",
                          focusAppointmentId === appointment.id
                            ? "bg-[#FFFBEB] ring-2 ring-inset ring-[#D4AF37]/50"
                            : index % 2 === 0
                              ? "bg-white"
                              : "bg-[#FAFAFA]",
                        )}
                      >
                        <div className="flex min-w-0 items-start justify-between gap-2 sm:gap-3">
                          <button
                            type="button"
                            onClick={() => setCustomerInfoAppt(appointment)}
                            className="group flex min-w-0 flex-1 items-center gap-2.5 text-left sm:gap-3"
                          >
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#d4af37] to-[#c9a227] text-[11px] font-black text-[#111] sm:h-10 sm:w-10 sm:text-[12px]">
                              {appointment.customer.split(" ").map((name) => name[0]).join("").slice(0, 2)}
                            </div>
                            <div className="min-w-0 flex-1 overflow-hidden">
                              <p className="truncate text-[14px] font-bold text-[#1a1a1a] group-hover:text-[#b8962e] sm:text-[15px]">
                                {appointment.customer}
                              </p>
                              <p className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[11px] text-[#3f3f46] sm:text-[12px]">
                                <Phone className="h-3.5 w-3.5 shrink-0 text-[#D4AF37]" />
                                <span className="truncate">{appointment.phone}</span>
                              </p>
                            </div>
                          </button>
                          <div className="flex shrink-0 flex-col items-end gap-1">
                            <span className="rounded-lg bg-[#111118] px-2 py-1 font-mono text-[11px] font-bold text-white sm:px-2.5 sm:text-[12px]">
                              {appointment.time}
                            </span>
                            <span className={cn(
                              "rounded-full border px-2 py-0.5 text-[10px] font-bold capitalize",
                              appointment.type === "walk-in"
                                ? "border-[#d4af37]/30 bg-[#f4f2ed] text-[#9a7a1e]"
                                : "border-gray-200 bg-white text-[#3f3f46]",
                            )}>
                              {appointment.type === "walk-in" ? "Walk-in" : "Appt"}
                            </span>
                          </div>
                        </div>

                        <div className="min-w-0 overflow-hidden rounded-xl border border-black/[0.06] bg-white/80 p-2.5 sm:p-3">
                          <div className="mb-2 flex min-w-0 items-center justify-between gap-2">
                            <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#52525b]">Services</span>
                            <span className="flex shrink-0 items-center gap-1 text-[11px] font-semibold text-[#3f3f46]">
                              <Clock className="h-3.5 w-3.5 text-[#D4AF37]" />
                              {appointment.duration} min
                            </span>
                          </div>
                          <div className="flex min-w-0 flex-wrap gap-1.5">
                            {services.length > 0 ? services.map((service, serviceIndex) => (
                              <span
                                key={`${service}-${serviceIndex}`}
                                className="max-w-full truncate rounded-lg border border-[#D4AF37]/20 bg-[#FFFBEB] px-2 py-1 text-[11px] font-semibold text-[#6f5815]"
                              >
                                {service}
                              </span>
                            )) : (
                              <span className="text-[12px] text-[#52525b]">No services</span>
                            )}
                          </div>
                        </div>

                        <div className="flex min-w-0 flex-wrap items-center gap-2">
                          {notStarted && (
                            <>
                              <span className="mr-auto text-[12px] font-semibold text-[#52525b]">Waiting</span>
                              <button
                                type="button"
                                onClick={() => startAppointment(appointment.id)}
                                className="flex h-10 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#111] px-3 text-[12px] font-bold text-[#d4af37] sm:flex-none sm:px-4"
                              >
                                <PlayCircle className="h-4 w-4" /> Start
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteConfirm(appointment.id)}
                                className="flex h-10 items-center gap-1.5 rounded-xl border border-gray-200 px-3 text-[12px] font-semibold text-[#3f3f46]"
                              >
                                <XCircle className="h-4 w-4" />
                                <span className="hidden min-[380px]:inline">Cancel</span>
                              </button>
                            </>
                          )}
                          {inProgress && (
                            <>
                              <span className="mr-auto flex items-center gap-1.5 text-[12px] font-bold text-[#b8962e]">
                                <span className="h-2 w-2 animate-pulse rounded-full bg-[#d4af37]" />
                                <span className="hidden min-[360px]:inline">In Progress</span>
                                <span className="min-[360px]:hidden">Active</span>
                              </span>
                              <button
                                type="button"
                                onClick={() => openBilling(appointment.id, appointment.customer, appointment.service)}
                                className="flex h-10 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-[#d4af37] to-[#c9a227] px-3 text-[12px] font-bold text-[#111] sm:flex-none sm:px-4"
                              >
                                <Receipt className="h-4 w-4" /> Bill
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteConfirm(appointment.id)}
                                className="flex h-10 items-center gap-1.5 rounded-xl border border-gray-200 px-3 text-[12px] font-semibold text-[#3f3f46]"
                              >
                                <XCircle className="h-4 w-4" />
                                <span className="hidden min-[380px]:inline">Cancel</span>
                              </button>
                            </>
                          )}
                          {isDone && (
                            <>
                              <span className={cn(
                                "mr-auto rounded-lg border px-3 py-1.5 text-[12px] font-bold capitalize",
                                appointment.status === "completed"
                                  ? "border-[#d4af37]/30 bg-[#f4f2ed] text-[#9a7a1e]"
                                  : "border-gray-200 bg-gray-50 text-gray-400",
                              )}>
                                {appointment.status}
                              </span>
                              {appointment.status === "completed" && (
                                <button
                                  type="button"
                                  onClick={() => setCorrectionAppt({ id: appointment.id, service: appointment.service })}
                                  className="flex h-10 items-center gap-1 rounded-xl border border-[#d4af37]/30 px-3 text-[11px] font-bold text-[#b8962e]"
                                >
                                  ✂ Correct
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>

                {/* Laptop/desktop: retain the dense operational table. */}
                <div className="hidden overflow-x-auto lg:block">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-[#FAF8F2]">
                        <th className="text-left p-3 text-[11px] font-bold uppercase tracking-wider text-[#52525b]">Time</th>
                        <th className="text-left p-3 text-[11px] font-bold uppercase tracking-wider text-[#52525b]">Customer</th>
                        <th className="text-left p-3 text-[11px] font-bold uppercase tracking-wider text-[#52525b]">Phone</th>
                        <th className="text-left p-3 text-[11px] font-bold uppercase tracking-wider text-[#52525b]">Services</th>
                        <th className="text-left p-3 text-[11px] font-bold uppercase tracking-wider text-[#52525b]">Duration</th>
                        <th className="text-left p-3 text-[11px] font-bold uppercase tracking-wider text-[#52525b]">Type</th>
                        <th className="text-left p-3 text-[11px] font-bold uppercase tracking-wider text-[#52525b]">Action</th>
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
                            <td className="p-3 text-[12px] text-[#3f3f46] whitespace-nowrap">{a.phone}</td>

                            {/* Services — truncated text + popover on click */}
                            <td className="p-3" style={{ maxWidth: 220, minWidth: 140 }}>
                              {allServices.length === 0 ? (
                                <span className="text-[12px] text-[#52525b]">—</span>
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
                                          <p className="text-[10px] font-bold uppercase tracking-wider text-[#52525b]">All Services</p>
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
                            <td className="p-3 text-[12px] text-[#3f3f46] whitespace-nowrap">{a.duration} min</td>

                            {/* Type */}
                            <td className="p-3">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border capitalize whitespace-nowrap ${
                                a.type === "walk-in"
                                  ? "bg-[#f4f2ed] border-[#d4af37]/30 text-[#9a7a1e]"
                                  : "bg-white border-gray-200 text-[#3f3f46]"
                              }`}>
                                {a.type}
                              </span>
                            </td>

                            {/* Action — inline, state-driven */}
                            <td className="p-3 whitespace-nowrap">
                              {notStarted && (
                                <div className="flex items-center gap-2">
                                  <span className="text-[11px] font-semibold text-[#52525b] mr-1">Waiting</span>
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
                                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-gray-200 text-[11px] font-semibold text-[#52525b] hover:border-gray-400 hover:text-[#111] transition-colors"
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
                                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-gray-200 text-[11px] font-semibold text-[#52525b] hover:border-gray-400 hover:text-[#111] transition-colors"
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
                </div>
                <div className="shrink-0 border-t border-black/[0.06] bg-white">
                <Pagination
                  page={apptsPagination.page}
                  pageSize={apptsPagination.pageSize}
                  totalRecords={filteredAppts.length}
                  onPageChange={apptsPagination.setPage}
                  onPageSizeChange={apptsPagination.setPageSize}
                />
                </div>
              </CardContent>
            </Card>
        </TabsContent>


        <QueueBoard
          paginatedQueue={paginatedQueue}
          queuePagination={queuePagination}
          queue={queue}
          setActiveTab={setActiveTab}
          setFilterTypeAndUrl={setFilterTypeAndUrl}
          setQueue={setQueue}
          openNotify={openNotify}
        />

        {/* Calendar tab */}
        <TabsContent value="calendar" className="mt-0 min-h-0 min-w-0 max-w-full flex-1 overflow-x-hidden overflow-y-auto overscroll-contain data-[state=inactive]:hidden">
          {/* Section header */}
          <div className="relative mb-3 min-w-0 max-w-full overflow-hidden rounded-2xl border border-black/[0.06] bg-white shadow-[0_2px_12px_rgba(17,17,24,0.04)] sm:mb-4">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#D4AF37]/60 to-transparent" />
            <div className="flex min-w-0 flex-col gap-3 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-5 sm:py-4">
              <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#D4AF37]/20 bg-[#D4AF37]/10 sm:h-10 sm:w-10">
                  <CalendarIcon className="h-4 w-4 text-[#D4AF37]" />
                </div>
                <div className="min-w-0">
                  <h2 className="truncate text-[15px] font-bold text-[#111118] sm:text-[17px]">Calendar</h2>
                  <p className="truncate text-[11px] text-[#52525b] sm:text-[12px]">Live appointments &amp; walk-ins by date</p>
                </div>
              </div>
              <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
                <button
                  type="button"
                  onClick={prevMonth}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-black/[0.08] bg-white text-[#3f3f46] transition-all hover:border-[#D4AF37]/30 hover:text-[#111118]"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <div className="flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#111118] px-2.5 py-2 sm:flex-none sm:gap-2 sm:px-4">
                  <CalendarIcon className="h-3.5 w-3.5 shrink-0 text-[#D4AF37]" />
                  <span className="truncate text-center text-[12px] font-bold text-white sm:min-w-[130px] sm:text-[13px]">
                    {monthNames[calMonth]} {calYear}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={nextMonth}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-black/[0.08] bg-white text-[#3f3f46] transition-all hover:border-[#D4AF37]/30 hover:text-[#111118]"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
                <Button
                  size="sm"
                  variant="outline"
                  className="ml-0.5 h-9 shrink-0 rounded-xl border-[#D4AF37]/30 px-2.5 text-[11px] font-semibold text-[#B8962E] hover:bg-[#D4AF37]/10 sm:ml-1 sm:px-3 sm:text-[12px]"
                  onClick={() => {
                    const today = istDateParts();
                    setCalMonth(today.month);
                    setCalYear(today.year);
                    setSelectedCalDate(today.day);
                  }}
                >
                  Today
                </Button>
              </div>
            </div>
          </div>

          <div className="grid min-w-0 max-w-full gap-3 sm:gap-4 lg:grid-cols-[1fr_320px]">
            {/* Calendar grid */}
            <Card className="min-w-0 max-w-full overflow-hidden rounded-2xl border border-black/[0.06] shadow-[0_2px_12px_rgba(17,17,24,0.04)]">
              <CardContent className="min-w-0 p-2.5 sm:p-5">
                <div className="mb-1.5 grid grid-cols-7 gap-0.5 sm:mb-2 sm:gap-1.5">
                  {(["S", "M", "T", "W", "T", "F", "S"] as const).map((d, i) => (
                    <div key={`${d}-${i}`} className="appointments-cal-weekday py-1.5 text-center font-bold uppercase text-[#52525b] sm:py-2">
                      <span className="sm:hidden">{d}</span>
                      <span className="hidden sm:inline">{["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][i]}</span>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-0.5 sm:gap-1.5">
                  {calendarDays.map((day, i) => {
                    const today = istDateParts();
                    const isToday = day === today.day && calMonth === today.month && calYear === today.year;
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
                          "appointments-cal-cell text-left transition-all",
                          "rounded-lg border sm:rounded-xl",
                          !valid && "pointer-events-none border-transparent bg-transparent opacity-0",
                          valid && !isSelected && !isToday && "border-black/[0.06] bg-white hover:border-[#D4AF37]/30 hover:bg-[#FFFBEB]",
                          isToday && !isSelected && "border-[#D4AF37]/40 bg-[#FFFBEB]",
                          isSelected && "border-[#D4AF37] bg-[#FFFBEB] shadow-[0_4px_16px_rgba(212,175,55,0.15)] ring-2 ring-[#D4AF37]/20",
                        )}
                      >
                        {valid && (
                          <>
                            <div className="mb-0.5 flex min-w-0 items-center justify-between gap-0.5 sm:mb-1.5">
                              <span className={cn(
                                "flex h-6 w-6 shrink-0 items-center justify-center text-[11px] font-bold sm:h-7 sm:w-7 sm:text-[12px]",
                                isToday || isSelected
                                  ? "rounded-full bg-[#111118] text-[#D4AF37]"
                                  : "text-[#111118]",
                              )}>
                                {day}
                              </span>
                              {count > 0 && (
                                <span className="max-w-full truncate rounded-full bg-[#111118] px-1 py-0.5 text-[8px] font-bold tabular-nums text-[#D4AF37] sm:px-1.5 sm:text-[9px]">
                                  {count}
                                </span>
                              )}
                            </div>
                            <div className="appointments-cal-cell-detail">
                              {count > 0 ? (
                                <div className="min-w-0 space-y-1">
                                  <div className="flex gap-0.5">
                                    {Array.from({ length: Math.min(count, 4) }).map((_, j) => (
                                      <div
                                        key={j}
                                        className={cn(
                                          "h-1 min-w-0 flex-1 rounded-full",
                                          j < (dayStats?.appointments ?? 0) ? "bg-[#111118]" : "bg-[#D4AF37]/70",
                                        )}
                                      />
                                    ))}
                                  </div>
                                  <p className="truncate text-[9px] font-medium text-[#52525b]">
                                    {(dayStats?.appointments ?? 0) > 0 && `${dayStats!.appointments} appt`}
                                    {(dayStats?.appointments ?? 0) > 0 && (dayStats?.walkIns ?? 0) > 0 && " · "}
                                    {(dayStats?.walkIns ?? 0) > 0 && `${dayStats!.walkIns} walk-in`}
                                  </p>
                                </div>
                              ) : (
                                <p className="text-[9px] text-[#d0d0d0]">—</p>
                              )}
                            </div>
                            {/* Phone: tiny occupancy dots only */}
                            {count > 0 && (
                              <div className="mt-0.5 flex gap-0.5 sm:hidden">
                                {Array.from({ length: Math.min(count, 3) }).map((_, j) => (
                                  <div
                                    key={j}
                                    className={cn(
                                      "h-1 min-w-0 flex-1 rounded-full",
                                      j < (dayStats?.appointments ?? 0) ? "bg-[#111118]" : "bg-[#D4AF37]/70",
                                    )}
                                  />
                                ))}
                              </div>
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
            <Card className="min-w-0 max-w-full overflow-hidden rounded-2xl border border-black/[0.06] shadow-[0_2px_12px_rgba(17,17,24,0.04)]">
              <CardHeader className="border-b border-black/[0.06] bg-[#faf9f7] px-3 py-3 sm:px-5 sm:py-4">
                <CardTitle className="truncate text-[13px] font-bold text-[#111118]">
                  {selectedDayLabel ? selectedDayLabel : "Select a day"}
                </CardTitle>
                {selectedCalDate && (
                  <p className="truncate text-[11px] text-[#52525b]">
                    {selectedDayApptCount > 0
                      ? `${selectedDayStats.appointmentsCount} appointment${selectedDayStats.appointmentsCount !== 1 ? "s" : ""} · ${selectedDayStats.walkInsCount} walk-in${selectedDayStats.walkInsCount !== 1 ? "s" : ""}`
                      : "No bookings on this day"}
                  </p>
                )}
              </CardHeader>
              <CardContent className="min-w-0 p-0">
                {!selectedCalDate ? (
                  <div className="flex flex-col items-center justify-center gap-3 px-4 py-10 text-center sm:px-6 sm:py-12">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-dashed border-black/[0.1] bg-[#faf9f7]">
                      <CalendarIcon className="h-6 w-6 text-[#D4AF37]/40" />
                    </div>
                    <p className="text-[13px] font-medium text-[#52525b]">Tap a date to view bookings</p>
                  </div>
                ) : selectedDayApptCount === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-3 px-4 py-10 text-center sm:px-6 sm:py-12">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-black/[0.06] bg-[#faf9f7]">
                      <CalendarIcon className="h-6 w-6 text-[#52525b]/40" />
                    </div>
                    <p className="text-[13px] font-medium text-[#52525b]">No appointments or walk-ins this day</p>
                    <Button
                      size="sm"
                      className="mt-1 h-9 rounded-xl bg-[#111118] text-[12px] font-semibold text-[#D4AF37] hover:bg-[#1e1e1e]"
                      onClick={() => navigate("/appointments/new")}
                    >
                      <Plus className="mr-1.5 h-3.5 w-3.5" /> Create Appointment
                    </Button>
                  </div>
                ) : (
                  <div className="max-h-[min(420px,50dvh)] divide-y divide-black/[0.04] overflow-y-auto sm:max-h-[520px]">
                    {selectedDayAppts.map(a => (
                      <div
                        key={a.id}
                        className="flex min-w-0 cursor-pointer items-start gap-2.5 px-3 py-3 transition-colors hover:bg-[#faf9f7] sm:gap-3 sm:px-4 sm:py-3.5"
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
                        <div className="min-w-0 flex-1 overflow-hidden">
                          <p className="truncate text-[13px] font-semibold text-[#111118]">{a.customer}</p>
                          <p className="mt-0.5 truncate text-[11px] text-[#52525b]">{a.service}</p>
                          <div className="mt-1.5 flex min-w-0 flex-wrap items-center gap-1.5">
                            <Badge className={cn("border text-[9px] capitalize", statusColors[a.status])}>{a.status}</Badge>
                            <span className={`rounded-full border px-1.5 py-0.5 text-[9px] font-bold capitalize ${
                              a.type === "walk-in"
                                ? "border-[#d4af37]/30 bg-[#f4f2ed] text-[#9a7a1e]"
                                : "border-gray-200 bg-white text-[#3f3f46]"
                            }`}>
                              {a.type === "walk-in" ? "Walk-in" : "Appt"}
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
      <EditWalkinDialog
        editWalkin={editWalkin}
        setEditWalkin={setEditWalkin}
        serviceCatalog={serviceCatalog}
        persistAppointmentEdit={persistAppointmentEdit}
      />

      {/* â”€â”€ WALK-IN CUSTOMER INFO â”€â”€ */}
      <Dialog open={!!customerInfoWalkin} onOpenChange={() => setCustomerInfoWalkin(null)}>
        <DialogContent aria-describedby={undefined} className="sm:max-w-sm p-0 rounded-2xl overflow-hidden border-0 shadow-2xl [&>button:last-of-type]:hidden">
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
                    <span className="text-[11px] font-semibold text-[#52525b] uppercase tracking-wider">{label}</span>
                    <span className="text-[13px] font-semibold text-[#111] capitalize">{value}</span>
                  </div>
                ))}
                <div className="pt-1">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[#52525b] mb-2">Service</p>
                  <span className="px-2.5 py-1 rounded-full bg-[#f4f2ed] border border-[#e8e4d8] text-[11px] font-medium text-[#3d3d3d]">{customerInfoWalkin.service}</span>
                </div>
                {customerInfoWalkin.notes && (
                  <div className="pt-1">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-[#52525b] mb-1">Notes</p>
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
        <DialogContent aria-describedby={undefined} className="sm:max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-[#111118]">Remove walk-in?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-[#3f3f46]">This will remove the walk-in from today&apos;s queue. This action cannot be undone.</p>
          <DialogFooter className="gap-2">
            <Button variant="outline" className="rounded-xl" onClick={() => setWalkinDeleteConfirm(null)}>Keep</Button>
            <Button className="rounded-xl bg-red-600 hover:bg-red-700 text-white" onClick={() => walkinDeleteConfirm !== null && void cancelWalkin(walkinDeleteConfirm)}>
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <NotifyCustomerDialog
        notifyOpen={notifyOpen}
        setNotifyOpen={setNotifyOpen}
        notifyTarget={notifyTarget}
        notifyMsg={notifyMsg}
        setNotifyMsg={setNotifyMsg}
      />

      <EditAppointmentDialog
        editAppt={editAppt}
        setEditAppt={setEditAppt}
        serviceCatalog={serviceCatalog}
        persistAppointmentEdit={persistAppointmentEdit}
      />

      {/* â”€â”€ CUSTOMER INFO MODAL â”€â”€ */}
      <Dialog open={!!customerInfoAppt} onOpenChange={() => setCustomerInfoAppt(null)}>
        <DialogContent aria-describedby={undefined} className="sm:max-w-sm p-0 rounded-2xl overflow-hidden border-0 shadow-2xl [&>button:last-of-type]:hidden">
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
                    <span className="text-[11px] font-semibold text-[#52525b] uppercase tracking-wider">{label}</span>
                    <span className="text-[13px] font-semibold text-[#111]">{value}</span>
                  </div>
                ))}

                {/* Services */}
                <div className="pt-1">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[#52525b] mb-2">Services</p>
                  <div className="flex flex-wrap gap-1.5">
                    {[customerInfoAppt.service, ...((customerInfoAppt.extraServices ?? []).map(e => e.name))].filter(Boolean).map((svc, i) => (
                      <span key={i} className="px-2.5 py-1 rounded-full bg-[#f4f2ed] border border-[#e8e4d8] text-[11px] font-medium text-[#3d3d3d]">{svc}</span>
                    ))}
                  </div>
                </div>

                {customerInfoAppt.notes && (
                  <div className="pt-1">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-[#52525b] mb-1">Notes</p>
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
      <Dialog
        open={billingOpen}
        onOpenChange={(open) => {
          if (open) setBillingOpen(true);
          else dismissBilling();
        }}
      >
        <DialogContent className="dialog-tablet-sheet flex flex-col lg:max-w-7xl lg:h-[min(92dvh,860px)] lg:max-h-[95dvh] overflow-hidden p-0 rounded-2xl shadow-2xl border-0 [&>button:last-of-type]:hidden data-[state=open]:zoom-in-100 data-[state=closed]:zoom-out-100 data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 data-[state=open]:duration-300 data-[state=closed]:duration-200 ease-out">
          <DialogTitle className="sr-only">
            {isDirectBill
              ? "Direct billing checkout"
              : billingTarget?.sourceKind === "walkin"
                ? "Walk-in checkout"
                : "Appointment checkout"}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Review bill items, apply adjustments, select a payment method, and complete checkout.
          </DialogDescription>
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
                type="button"
                onClick={dismissBilling}
                aria-label="Close checkout"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-white/40 transition-all hover:border-white/20 hover:bg-white/5 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>



            {/* â”€â”€ BODY â”€â”€ */}
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">

              {/* LEFT — Order / Service Items */}
              <div className={cn(
                "flex w-full min-h-0 flex-col overflow-hidden border-b border-black/[0.06] lg:w-[380px] lg:shrink-0 lg:border-b-0 lg:border-r max-h-[42dvh] lg:max-h-none",
                scanToPayFocus && "hidden",
              )}>

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
                        <p className="text-[10px] text-[#52525b]">Search existing or add new</p>
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
                              : "text-[#52525b] hover:text-[#111118]",
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
                          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#52525b]" />
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
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#52525b] hover:text-[#111118]"
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
                                    <p className="text-[10px] text-[#52525b]">
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
                            <div className="rounded-xl border border-black/[0.06] bg-[#faf9f7] px-3 py-3 text-center text-[11px] text-[#52525b]">
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
                                <p className="mt-0.5 truncate text-[12.5px] font-semibold tabular-nums tracking-wide text-[#3d3d3d]">
                                  {formatDisplayPhone(billingTarget.phone)}
                                  {c ? (
                                    <span className="font-medium text-[#52525b]">
                                      {` · ${c.favoriteService} · Last: ${c.lastVisit}`}
                                    </span>
                                  ) : null}
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setDirectCustomerSearch("");
                                  setDirectCustomerSelected(false);
                                  setBillingTarget(t => ({ ...t!, name: "", phone: "" }));
                                }}
                                className="shrink-0 rounded-lg p-1 text-[#52525b] transition-colors hover:bg-white hover:text-[#111118]"
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
                          <User className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#52525b]" />
                          <Input
                            value={billingTarget?.name || ""}
                            onChange={e => setBillingTarget(t => ({ ...t!, name: e.target.value }))}
                            placeholder="Customer name *"
                            className="h-10 rounded-xl border-black/[0.08] bg-white pl-9 text-[12.5px] focus:border-[#D4AF37]/40"
                          />
                        </div>
                        <div className="flex gap-2">
                          <span className="inline-flex shrink-0 items-center rounded-xl border border-black/[0.08] bg-[#faf9f7] px-2.5 text-[12px] text-[#3f3f46]">
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
                            <p className="text-[11px] text-[#3f3f46]">New customer — details will be saved with this bill</p>
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
                      <p className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1">
                        <span className="inline-flex items-center gap-1.5 rounded-md bg-white/10 px-2 py-0.5 text-[13px] font-semibold tabular-nums tracking-wide text-white">
                          <Phone className="h-3.5 w-3.5 shrink-0 text-[#D4AF37]" />
                          {formatDisplayPhone(billingTarget?.phone)}
                        </span>
                        {billingTarget?.time && (
                          <span className="inline-flex items-center gap-1 text-[12px] font-medium text-white/70">
                            <Clock className="h-3.5 w-3.5 shrink-0 text-[#D4AF37]/80" />
                            {billingTarget.time}
                          </span>
                        )}
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
                    <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#52525b]" />
                    <input
                      type="text"
                      placeholder="Search service or product to add…"
                      value={billingServiceSearch}
                      onChange={e => setBillingServiceSearch(e.target.value)}
                      className="h-10 w-full rounded-xl border border-black/[0.08] bg-white pl-10 pr-9 text-[12px] font-medium outline-none transition-colors placeholder:font-normal placeholder:text-[#52525b] focus:border-[#D4AF37]/50 focus:ring-2 focus:ring-[#D4AF37]/10"
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
                        <p className="text-[13px] font-semibold text-[#3f3f46]">No items in cart</p>
                        <p className="mt-0.5 text-[11px] text-[#52525b]">Search above to add services or products</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2 px-4 py-3">
                      <div className="flex items-center px-3 pb-1">
                        <span className="flex-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[#52525b]">Item</span>
                        <span className="w-24 text-center text-[10px] font-bold uppercase tracking-[0.14em] text-[#52525b]">Qty</span>
                        <span className="w-20 text-right text-[10px] font-bold uppercase tracking-[0.14em] text-[#52525b]">Total</span>
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
                                item.type === "service" ? "bg-[#D4AF37]/12 text-[#9a7a1e]" : "bg-black/[0.06] text-[#3f3f46]",
                              )}>
                                {item.type === "service" ? "Svc" : "Prd"}
                              </span>
                            </div>
                            <p className="mt-0.5 text-[10px] text-[#52525b]">&#x20b9;{item.price.toLocaleString()} / unit</p>
                          </div>
                          <div className="flex w-24 items-center justify-center gap-1">
                            <button
                              onClick={() => setBillingItems(prev => prev.map(i => i.name === item.name ? { ...i, qty: Math.max(1, i.qty - 1) } : i))}
                              className="flex h-7 w-7 items-center justify-center rounded-lg border border-black/[0.08] bg-[#faf9f7] text-[#3f3f46] transition-all hover:border-[#111118] hover:bg-[#111118] hover:text-white"
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
                            className="flex h-7 w-8 shrink-0 items-center justify-center rounded-lg text-[#52525b] transition-colors hover:bg-red-50 hover:text-red-500"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Totals bar — the only running summary of the bill */}
                <div className="border-t border-[#D4AF37]/15 bg-[#111118] px-5 py-3">
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] font-medium text-white/45">
                      {billingItems.length === 0 ? "No items" : `${billingItems.reduce((s, i) => s + i.qty, 0)} item${billingItems.reduce((s, i) => s + i.qty, 0) !== 1 ? "s" : ""}`}
                    </span>
                    <span className="text-white/20">·</span>
                    <span className="text-[11px] font-medium text-white/45">Subtotal</span>
                    <span className="text-[15px] font-bold tabular-nums text-white/80">&#x20b9;{billSubtotal.toLocaleString()}</span>
                  </div>
                  {(billCouponDisc + billLoyalty + discount) > 0 && (
                    <div className="mt-1.5 flex items-center justify-between text-[11.5px]">
                      <span className="font-medium text-white/45">Discounts</span>
                      <span className="font-bold tabular-nums text-[#D4AF37]/80">
                        - &#x20b9;{Math.round(billCouponDisc + billLoyalty + discount).toLocaleString()}
                      </span>
                    </div>
                  )}
                  {gstEnabled && billGst > 0 && (
                    <div className="mt-1.5 flex items-center justify-between text-[11.5px]">
                      <span className="font-medium text-white/45">GST ({gstRate}%)</span>
                      <span className="font-bold tabular-nums text-white/80">+ &#x20b9;{billGst.toLocaleString()}</span>
                    </div>
                  )}
                  {advanceApplied > 0 && (
                    <div className="mt-1.5 flex items-center justify-between text-[11.5px]">
                      <span className="font-medium text-white/45">Advance applied</span>
                      <span className="font-bold tabular-nums text-[#D4AF37]/80">- &#x20b9;{advanceApplied.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="mt-2 flex items-baseline justify-between border-t border-white/[0.08] pt-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-white/45">
                      {advanceApplied > 0 ? "Due now" : "Grand total"}
                    </span>
                    <span className="text-[22px] font-black tabular-nums text-[#D4AF37]">&#x20b9;{billDue.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
                  RIGHT — Billing & Payment
                  flex-1 — gets all remaining space
                  â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
              <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-white">

                {/* Billing area — phones scroll; tablet and up lay out as a column
                    so the QR can claim whatever height the bill controls leave. */}
                <div
                  className={cn(
                    "min-h-0 flex-1 overflow-y-auto px-4 py-4 space-y-4 sm:px-5 md:flex md:flex-col md:gap-3 md:space-y-0",
                    scanToPayFocus ? "md:overflow-hidden" : "md:overflow-y-auto",
                  )}
                >

                  {/* While the customer scans, the QR owns the panel — the bill is already set up by then. */}
                  {scanToPayFocus ? (
                    <div className="flex shrink-0 items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => setScanFocus(false)}
                        className="flex h-9 items-center gap-1.5 rounded-lg border border-black/[0.08] bg-white px-3 text-[12px] font-bold text-[#111118] transition-colors hover:border-[#D4AF37]/40 hover:bg-[#FFFBEB]"
                      >
                        <ArrowLeft className="h-4 w-4" />
                        Back to bill
                      </button>
                      <span className="text-[11px] font-semibold text-[#52525b]">
                        Grand total <span className="font-black text-[#111118] tabular-nums">&#x20b9;{billGrand.toLocaleString()}</span>
                      </span>
                    </div>
                  ) : (
                  <>

                  {/* â”€â”€ Discounts â”€â”€ */}
                  <div className="md:shrink-0">
                    <h4 className="text-[11px] font-bold uppercase tracking-[0.12em] text-gray-500 mb-2">Discounts & Offers</h4>

                    {/* Each tool stays out of the way until the manager asks for it */}
                    <div className="mb-2 flex flex-wrap gap-1.5">
                      {([
                        { id: "coupon" as const, label: "Coupon", show: true },
                        { id: "loyalty" as const, label: "Loyalty", show: true },
                        { id: "advance" as const, label: "Advance", show: advanceAvailable > 0 },
                        { id: "manual" as const, label: "Manual discount", show: true },
                      ]).filter(t => t.show).map(tool => {
                        const enabled = discountTools[tool.id];
                        return (
                          <button
                            key={tool.id}
                            type="button"
                            onClick={() => setDiscountToolEnabled(tool.id, !enabled)}
                            aria-pressed={enabled}
                            className={cn(
                              "flex h-9 items-center gap-2 rounded-full border px-3.5 text-[12px] font-bold transition-all",
                              enabled
                                ? "border-[#d4af37] bg-[#111] text-[#d4af37]"
                                : "border-gray-200 bg-white text-gray-500 hover:border-[#d4af37]/40 hover:text-[#111]",
                            )}
                          >
                            <span className={cn(
                              "relative h-3.5 w-7 rounded-full transition-colors",
                              enabled ? "bg-[#d4af37]" : "bg-gray-300",
                            )}>
                              <span className={cn(
                                "absolute top-0.5 h-2.5 w-2.5 rounded-full bg-white shadow transition-all",
                                enabled ? "right-0.5" : "left-0.5",
                              )} />
                            </span>
                            {tool.label}
                          </button>
                        );
                      })}
                      <button
                        type="button"
                        onClick={() => setGstEnabled((enabled) => !enabled)}
                        aria-pressed={gstEnabled}
                        className={cn(
                          "flex h-9 items-center gap-2 rounded-full border px-3.5 text-[12px] font-bold transition-all",
                          gstEnabled
                            ? "border-[#d4af37] bg-[#111] text-[#d4af37]"
                            : "border-gray-200 bg-white text-gray-500 hover:border-[#d4af37]/40 hover:text-[#111]",
                        )}
                      >
                        <span className={cn(
                          "relative h-3.5 w-7 rounded-full transition-colors",
                          gstEnabled ? "bg-[#d4af37]" : "bg-gray-300",
                        )}>
                          <span className={cn(
                            "absolute top-0.5 h-2.5 w-2.5 rounded-full bg-white shadow transition-all",
                            gstEnabled ? "right-0.5" : "left-0.5",
                          )} />
                        </span>
                        GST
                      </button>
                    </div>

                    <div className="space-y-2">
                      {gstEnabled && (
                        <div className="space-y-2 rounded-xl border border-[#d4af37]/25 bg-[#FFFBEB] p-2">
                          <div className="flex gap-1.5">
                            {[5, 12, 18].map((rate) => (
                              <button
                                key={rate}
                                type="button"
                                onClick={() => {
                                  setGstRate(rate);
                                  setCustomTaxMode(false);
                                  setCustomTaxInput("");
                                }}
                                className={cn(
                                  "h-9 flex-1 rounded-lg border text-[12px] font-bold transition-all",
                                  !customTaxMode && gstRate === rate
                                    ? "border-[#111] bg-[#111] text-[#d4af37]"
                                    : "border-gray-200 bg-white text-gray-500 hover:border-gray-300",
                                )}
                              >
                                {rate}%
                              </button>
                            ))}
                            <button
                              type="button"
                              onClick={() => {
                                setCustomTaxMode(true);
                                setCustomTaxInput(String(gstRate));
                              }}
                              className={cn(
                                "h-9 flex-1 rounded-lg border text-[12px] font-bold transition-all",
                                customTaxMode
                                  ? "border-[#111] bg-[#111] text-[#d4af37]"
                                  : "border-gray-200 bg-white text-gray-500 hover:border-gray-300",
                              )}
                            >
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
                                onChange={(event) => {
                                  const value = event.target.value;
                                  setCustomTaxInput(value);
                                  const rate = parseFloat(value);
                                  if (!Number.isNaN(rate) && rate >= 0 && rate <= 100) setGstRate(rate);
                                }}
                                placeholder="Enter tax %"
                                className="h-9 w-full rounded-lg border border-[#d4af37] bg-white pl-3 pr-8 text-[13px] font-bold text-[#111] outline-none"
                                autoFocus
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[12px] font-bold text-gray-400">%</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Coupon code — single row */}
                      {couponApplied ? (
                        <div className="flex h-10 items-center justify-between gap-2 rounded-xl border border-[#d4af37]/30 bg-[#FFFBEB] px-3">
                          <div className="flex min-w-0 items-center gap-2">
                            <Tag className="h-3.5 w-3.5 shrink-0 text-[#d4af37]" />
                            <span className="truncate text-[12px] font-black tracking-wider text-[#9a7a1e]">{couponApplied.code}</span>
                            <span className="shrink-0 text-[10px] text-gray-400">applied</span>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            <span className="text-[11px] font-black text-[#9a7a1e] tabular-nums">-&#x20b9;{billCouponDisc.toLocaleString()}</span>
                            <button onClick={() => setCouponApplied(null)} className="text-gray-400 transition-colors hover:text-gray-700">
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      ) : discountTools.coupon && (
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <Tag className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#d4af37]" />
                            <input value={couponInput}
                              onChange={e => setCouponInput(e.target.value.toUpperCase())}
                              onKeyDown={e => { if (e.key === "Enter") applyCouponCode(); }}
                              placeholder="Coupon code"
                              autoFocus
                              className="h-10 w-full rounded-xl border border-gray-200 bg-white pl-9 pr-3 text-[12px] font-medium uppercase outline-none transition-colors focus:border-[#d4af37] placeholder:font-normal placeholder:normal-case placeholder:text-gray-400" />
                          </div>
                          <button onClick={applyCouponCode}
                            className="h-10 shrink-0 rounded-xl bg-[#111] px-4 text-[11px] font-bold text-[#d4af37] transition-colors hover:bg-[#2a2a2a]">
                            Apply
                          </button>
                        </div>
                      )}

                      {/* Advance Payment — only shown if this customer has an active advance balance */}
                      {advanceAvailable > 0 && (discountTools.advance || advanceApplied > 0) && (
                        advanceApplied > 0 ? (
                          <div className="flex h-10 items-center justify-between gap-2 rounded-xl border border-[#d4af37]/30 bg-[#FFFBEB] px-3">
                            <div className="flex min-w-0 items-center gap-2">
                              <Wallet className="h-3.5 w-3.5 shrink-0 text-[#d4af37]" />
                              <span className="truncate text-[12px] font-black text-[#9a7a1e]">₹{advanceApplied.toLocaleString()} advance applied</span>
                            </div>
                            <button onClick={() => setAdvanceApplied(0)} className="shrink-0 text-gray-400 transition-colors hover:text-gray-700">
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setAdvanceApplied(Math.min(advanceAvailable, billGrand))}
                            title={`Deposit collected earlier for ${matchedAdvances[0]?.service ?? "a prior booking"} — applying it deducts from their advance balance permanently.`}
                            className="flex h-10 w-full items-center justify-between gap-2 rounded-xl border border-[#d4af37]/30 bg-white px-3 transition-colors hover:bg-[#FFFBEB]">
                            <span className="flex items-center gap-2 text-[12px] font-semibold text-[#111]">
                              <Wallet className="h-3.5 w-3.5 text-[#d4af37]" />
                              Use advance
                            </span>
                            <span className="text-[11px] font-black text-[#9a7a1e] tabular-nums">₹{Math.min(advanceAvailable, billGrand).toLocaleString()}</span>
                          </button>
                        )
                      )}

                      {/* Loyalty + Manual discount side by side */}
                      {(discountTools.loyalty || loyaltyRedeem > 0 || discountTools.manual || discount > 0) && (
                      <div className="grid gap-2 sm:grid-cols-2">
                        {(discountTools.loyalty || loyaltyRedeem > 0) && (
                        <div className="rounded-xl border border-gray-200 bg-white px-3 py-2">
                          <div className="mb-1 flex items-center justify-between gap-1">
                            <span className="flex items-center gap-1.5 text-[11px] font-semibold text-[#111]">
                              <Bell className="h-3 w-3 text-[#d4af37]" />
                              Loyalty
                            </span>
                            <span className="shrink-0 text-[10px] text-gray-400">{loyaltyAvailable} pts</span>
                          </div>
                          <input type="number" min={0} max={Math.min(loyaltyAvailable, Math.floor(billAfterDiscs / 0.5))}
                            value={loyaltyRedeem || ""}
                            onChange={e => setLoyaltyRedeem(Math.min(Math.min(loyaltyAvailable, Math.floor(billAfterDiscs / 0.5)), Math.max(0, Number(e.target.value))))}
                            placeholder="0"
                            aria-label="Loyalty points to redeem"
                            className="h-9 w-full rounded-lg border border-gray-200 px-2.5 text-right text-[13px] font-medium tabular-nums outline-none transition-colors focus:border-[#d4af37]" />
                          {loyaltyRedeem > 0 && (
                            <p className="mt-1 text-right text-[10px] font-semibold text-[#9a7a1e]">= &#x20b9;{Math.round(loyaltyRedeem * 0.5).toLocaleString()} off</p>
                          )}
                        </div>
                        )}
                        {(discountTools.manual || discount > 0) && (
                        <div className="rounded-xl border border-gray-200 bg-white px-3 py-2">
                          <div className="mb-1 flex items-center justify-between gap-1">
                            <span className="text-[11px] font-semibold text-[#111]">Manual discount</span>
                            {/* Percent or flat rupees — whichever the manager was quoted */}
                            <div className="flex shrink-0 overflow-hidden rounded-md border border-gray-200">
                              {(["pct", "flat"] as const).map(mode => (
                                <button
                                  key={mode}
                                  type="button"
                                  onClick={() => setDiscountMode(mode)}
                                  className={cn(
                                    "h-6 w-7 text-[11px] font-bold transition-colors",
                                    discountMode === mode ? "bg-[#111] text-[#d4af37]" : "bg-white text-gray-400 hover:text-[#111]",
                                  )}
                                >
                                  {mode === "pct" ? "%" : "₹"}
                                </button>
                              ))}
                            </div>
                          </div>
                          <div className="relative">
                            {discountMode === "pct" ? (
                              <input type="number" min={0} max={100} step={0.5} value={discountPct || ""}
                                onChange={e => {
                                  const next = Math.min(100, Math.max(0, Number(e.target.value) || 0));
                                  setDiscountPct(next);
                                  if (next <= 0) setDiscountReason("");
                                }}
                                placeholder="0"
                                aria-label="Manual discount percent"
                                className="h-9 w-full rounded-lg border border-gray-200 pl-2.5 pr-7 text-right text-[13px] font-medium tabular-nums outline-none transition-colors focus:border-[#d4af37]" />
                            ) : (
                              <input type="number" min={0} max={billSubtotal} step={10} value={discountFlat || ""}
                                onChange={e => {
                                  const next = Math.min(billSubtotal, Math.max(0, Number(e.target.value) || 0));
                                  setDiscountFlat(next);
                                  if (next <= 0) setDiscountReason("");
                                }}
                                placeholder="0"
                                aria-label="Manual discount amount"
                                className="h-9 w-full rounded-lg border border-gray-200 pl-2.5 pr-7 text-right text-[13px] font-medium tabular-nums outline-none transition-colors focus:border-[#d4af37]" />
                            )}
                            <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-gray-400">
                              {discountMode === "pct" ? "%" : "₹"}
                            </span>
                          </div>
                          {discount > 0 && (
                            <p className="mt-1 text-right text-[10px] font-semibold text-[#9a7a1e]">
                              -&#x20b9;{discount.toLocaleString()}
                              {discountMode === "flat" && billSubtotal > 0
                                ? ` (${Math.round((discount / billSubtotal) * 100)}%)`
                                : ""}
                            </p>
                          )}
                        </div>
                        )}
                      </div>
                      )}

                      {discount > 0 && (
                        <input
                          value={discountReason}
                          onChange={e => setDiscountReason(e.target.value)}
                          placeholder="Reason for the manual discount (required, saved for audit)"
                          className="h-10 w-full rounded-xl border border-[#d4af37]/40 bg-[#FFFBEB] px-3 text-[12px] outline-none transition-colors placeholder:text-gray-400 focus:border-[#d4af37]"
                        />
                      )}
                    </div>
                  </div>

                  <div className="h-px shrink-0 bg-gray-200" />

                  </>
                  )}

                  {/* Payment Method */}
                  <PaymentMethodPicker
                    amountDue={billDue}
                    value={payMethod}
                    onChange={(next) => {
                      if (next.method !== payMethod.method) setScanFocus(false);
                      setPayMethod(next);
                    }}
                    methods={BILL_PAY_METHODS}
                    showHeader={!scanToPayFocus}
                    hideMethodTabs={scanToPayFocus}
                    qrOnly={scanToPayFocus}
                    onOpenQr={() => setScanFocus(true)}
                    fluid={scanToPayFocus}
                    className="md:min-h-0 md:flex-1"
                    upiNote={`${BRAND.appName} bill${billingTarget?.name ? ` — ${billingTarget.name}` : ""}`}
                  />
                </div>

                {/* Checkout actions */}
                <div className="shrink-0 flex flex-col gap-2.5 border-t border-black/[0.06] bg-[#faf9f7] px-4 py-3 sm:px-5">
                  <div className="flex flex-col gap-2.5 sm:flex-row sm:gap-3">
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
                    className="flex min-h-11 flex-[2] items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#C9A227] px-3 py-2 text-[13px] font-black text-[#111118] shadow-lg shadow-[#D4AF37]/20 transition-all hover:from-[#C9A227] hover:to-[#B8922E] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    <span className="flex min-w-0 flex-col items-start leading-tight text-left">
                      <span>Complete Payment</span>
                      <span className="text-[10px] font-semibold tracking-wide text-[#111118]/70">
                        {billDue === 0 ? "Covered by advance" : `₹${billDue.toLocaleString()} due`}
                      </span>
                    </span>
                  </button>
                  </div>
                  <button
                    type="button"
                    onClick={clearBillingSelections}
                    className="h-10 w-full rounded-xl border border-black/[0.1] bg-white text-[13px] font-medium text-[#52525b] transition-colors hover:border-[#D4AF37]/30 hover:bg-[#FFFBEB] hover:text-[#9a7a1e]"
                  >
                    Cancel
                  </button>
                </div>
              </div>

            </div>

          </div>
        </DialogContent>
      </Dialog>


      {/* __ RECEIPT MODAL __ */}
      <Dialog open={receiptOpen} onOpenChange={v => { if (!v) setReceiptOpen(false); }}>
        <DialogContent className="overflow-hidden rounded-2xl border-0 bg-white p-0 shadow-2xl sm:max-w-[380px] [&>button:last-of-type]:z-20">
          <DialogTitle className="sr-only">
            {receiptStep === "pending"
              ? "Appointment confirmed"
              : receiptStep === "receipt"
                ? "Payment receipt"
                : "Payment successful"}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {receiptStep === "pending"
              ? "The invoice was created with an outstanding balance."
              : "Checkout completed and the invoice receipt is ready."}
          </DialogDescription>
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
                  <p className="text-sm text-[#3f3f46] mt-1">Invoice generated with outstanding balance</p>
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
                <p className="text-[12px] text-center text-[#3f3f46]">
                  Added to Pending Payments. Collect anytime from Pending Payments (sidebar).
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
                className="relative flex flex-col items-center gap-2.5 overflow-hidden bg-gradient-to-br from-gray-50 via-white to-gray-100 px-5 py-5">

                <div className="pointer-events-none absolute -top-16 -left-16 h-40 w-40 rounded-full bg-green-200/35 blur-3xl" />
                <div className="pointer-events-none absolute -bottom-16 -right-16 h-40 w-40 rounded-full bg-[#d4af37]/15 blur-3xl" />

                <motion.div className="relative"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 380, damping: 16, delay: 0.05 }}>
                  <div className="relative flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-green-400 to-green-600 shadow-lg shadow-green-400/40">
                    <CheckCircle2 className="h-7 w-7 text-white" />
                  </div>
                </motion.div>

                <div className="relative z-10 text-center">
                  <h2 className="text-lg font-black text-green-600">Payment Successful!</h2>
                </div>

                <motion.div className="relative z-10 w-full rounded-xl bg-gradient-to-br from-[#111118] to-[#1e1e2a] p-3.5 shadow-xl"
                  initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.2 }}>
                  <div className="mb-2 flex items-center justify-between border-b border-white/10 pb-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#D4AF37]/30 bg-[#D4AF37]/10">
                        <img src={BRAND.clientLogo} alt="" className="h-4 w-4 object-contain" />
                      </div>
                      <span className="truncate text-[13px] font-black text-[#d4af37]">{BRAND.clientName}</span>
                    </div>
                    <span className="shrink-0 font-mono text-[10px] text-[#d4af37]/70">{receiptData?.invoiceNo}</span>
                  </div>
                  <div className="space-y-1.5 text-[12px]">
                    {[
                      ["Customer", receiptData?.customer ?? ""],
                      ["Payment", receiptData?.paymentMethod ?? ""],
                    ].map(([label, value]) => (
                      <div key={label} className="flex justify-between gap-2">
                        <span className="shrink-0 text-gray-400">{label}</span>
                        <span className="truncate font-semibold capitalize text-white">{value}</span>
                      </div>
                    ))}
                    <div className="flex items-center justify-between border-t border-white/10 pt-2">
                      <span className="font-bold text-gray-300">Paid</span>
                      <span className="text-xl font-black text-[#d4af37]">{formatInr(receiptData?.grandTotal ?? 0)}</span>
                    </div>
                  </div>
                </motion.div>

                {(receiptData?.loyaltyEarned ?? 0) > 0 && (
                  <div className="relative z-10 flex w-full items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2">
                    <Star className="h-3.5 w-3.5 shrink-0 fill-green-500 text-green-600" />
                    <p className="truncate text-[11px] font-semibold text-green-700">
                      +{receiptData?.loyaltyEarned} loyalty pts for {receiptData?.customer}
                    </p>
                  </div>
                )}

                <div className="relative z-10 w-full rounded-xl border border-[#D4AF37]/25 bg-[#fffdf7] px-3 py-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[11px] font-semibold text-[#111118]">
                      Rate visit <span className="font-medium text-[#52525b]">(optional)</span>
                    </p>
                    <p className="min-w-[2.5rem] text-right text-[11px] font-medium text-[#9a7d20]">
                      {feedbackRating > 0 ? `${feedbackRating}/5` : ""}
                    </p>
                  </div>
                  <div
                    className="mt-1.5 flex items-center justify-center gap-1"
                    onMouseLeave={() => setFeedbackHover(0)}
                  >
                    {[1, 2, 3, 4, 5].map((star) => {
                      const active = star <= (feedbackHover || feedbackRating);
                      return (
                        <button
                          key={star}
                          type="button"
                          aria-label={`${star} star${star === 1 ? "" : "s"}`}
                          disabled={feedbackSubmitting}
                          onMouseEnter={() => setFeedbackHover(star)}
                          onClick={() => setFeedbackRating(star)}
                          className="rounded-md p-0.5 transition-transform hover:scale-110 disabled:opacity-60"
                        >
                          <Star
                            className={cn(
                              "h-7 w-7 transition-colors",
                              active
                                ? "fill-[#D4AF37] text-[#D4AF37]"
                                : "fill-none text-gray-300",
                            )}
                          />
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="relative z-10 w-full space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const msg = encodeURIComponent(`Dear ${receiptData?.customer}, ${formatInr(receiptData?.grandTotal ?? 0)} received at ${BRAND.clientName}. Invoice: ${receiptData?.invoiceNo}. Thank you!`);
                        window.open(`sms:?body=${msg}`, "_blank");
                      }}
                      className="flex h-9 items-center justify-center gap-1.5 rounded-xl bg-blue-600 text-[12px] font-bold text-white transition-colors hover:bg-blue-700"
                    >
                      <Phone className="h-3.5 w-3.5" /> SMS
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const msg = encodeURIComponent(`Hi ${receiptData?.customer} 👋\n\nYour payment of *${formatInr(receiptData?.grandTotal ?? 0)}* at *${BRAND.clientName}* has been received.\n\n🧾 Invoice: ${receiptData?.invoiceNo}\n\nThank you for visiting us! ✨`);
                        window.open(`https://wa.me/?text=${msg}`, "_blank");
                      }}
                      className="flex h-9 items-center justify-center gap-1.5 rounded-xl text-[12px] font-bold text-white"
                      style={{ background: "linear-gradient(135deg, #25D366, #128C7E)" }}
                    >
                      <Send className="h-3.5 w-3.5" /> WhatsApp
                    </button>
                  </div>
                  <button
                    type="button"
                    disabled={feedbackSubmitting}
                    onClick={() => void submitReceiptFeedbackAndGoDashboard()}
                    className="flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#1a1a1a] to-[#2d2d2d] text-[13px] font-bold text-white transition-all hover:shadow-lg disabled:opacity-60"
                  >
                    {feedbackSubmitting ? "Saving feedback…" : "Done"}
                  </button>
                </div>
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
                      <div key={k} className="flex justify-between gap-3 text-[11px]"><span className="text-[#52525b]">{k}</span><span className="font-bold text-right">{v}</span></div>
                    ))}
                  </div>
                  <div className="border-b border-dashed border-[#D4AF37]/25 pb-3 mb-3">
                    <div className="flex text-[10px] font-bold uppercase tracking-wider text-[#52525b] border-b border-black/[0.08] pb-1 mb-1">
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
                    <div className="flex justify-between text-[11px]"><span className="text-[#52525b]">Subtotal</span><span>&#x20b9;{receiptData?.subtotal.toLocaleString()}</span></div>
                    {receiptData && receiptData.gst > 0 && <div className="flex justify-between text-[11px]"><span className="text-[#52525b]">GST ({gstRate}%)</span><span>+&#x20b9;{receiptData.gst.toLocaleString()}</span></div>}
                    {receiptData && Math.abs(receiptData.roundOff) > 0 && <div className="flex justify-between text-[11px]"><span className="text-[#52525b]">Round Off</span><span>&#x20b9;{receiptData.roundOff.toFixed(2)}</span></div>}
                    <div className="flex justify-between text-[13px] font-black border-t border-[#D4AF37]/30 pt-1.5 mt-1"><span>GRAND TOTAL</span><span className="text-[#9a7d20]">&#x20b9;{receiptData?.grandTotal.toLocaleString()}</span></div>
                    <div className="flex justify-between text-[11px] font-semibold"><span className="text-[#52525b]">Paid ({receiptData?.paymentMethod})</span><span>&#x20b9;{receiptData?.grandTotal.toLocaleString()}</span></div>
                    <div className="flex justify-between text-[11px]"><span className="text-[#52525b]">Balance Due</span><span className="font-bold">&#x20b9;0.00</span></div>
                  </div>
                  <div className="border-b border-dashed border-[#D4AF37]/25 pb-3 mb-3">
                    <div className="flex justify-between text-[11px]"><span className="text-[#52525b]">Loyalty Points Earned</span><span className="font-bold text-[#9a7d20]">+{receiptData?.loyaltyEarned} pts</span></div>
                    <div className="flex justify-between text-[9px] text-[#52525b]"><span>Redeem on next visit</span><span>1 pt = &#x20b9;0.50</span></div>
                  </div>
                  <div className="text-center space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#D4AF37]">{RECEIPT_FOOTER.thankYou}</p>
                    <p className="text-[9px] text-[#52525b]">{RECEIPT_FOOTER.revisit}</p>
                    <div className="mx-auto mt-2 h-px w-16 bg-gradient-to-r from-transparent via-[#D4AF37]/40 to-transparent" />
                  </div>
                  </SalonReceiptPaper>
                </div>
                <div className="grid grid-cols-3 border-t border-black/[0.06] bg-white">
                  <button type="button" onClick={() => window.print()} className="flex flex-col items-center gap-1 border-r border-black/[0.06] py-3 text-[11px] font-semibold text-[#3f3f46] transition-colors hover:bg-[#faf9f7] hover:text-[#9a7d20]"><Receipt className="h-4 w-4 text-[#D4AF37]" /> Print</button>
                  <button type="button" onClick={() => { const msg = encodeURIComponent(`Hi ${receiptData?.customer} 👋\n\nYour payment of *${formatInr(receiptData?.grandTotal ?? 0)}* at *${BRAND.clientName}* has been received.\n\n🧾 Invoice: ${receiptData?.invoiceNo}\n\nThank you! ✨`); window.open(`https://wa.me/?text=${msg}`, "_blank"); }} className="flex flex-col items-center gap-1 border-r border-black/[0.06] py-3 text-[11px] font-semibold text-[#3f3f46] transition-colors hover:bg-[#faf9f7] hover:text-[#9a7d20]"><Send className="h-4 w-4 text-[#D4AF37]" /> WhatsApp</button>
                  <button type="button" onClick={() => { const msg = encodeURIComponent(`Dear ${receiptData?.customer}, ${formatInr(receiptData?.grandTotal ?? 0)} received at ${BRAND.clientName}. Invoice: ${receiptData?.invoiceNo}. Thank you!`); window.open(`sms:?body=${msg}`, "_blank"); }} className="flex flex-col items-center gap-1 py-3 text-[11px] font-semibold text-[#3f3f46] transition-colors hover:bg-[#faf9f7] hover:text-[#9a7d20]"><Phone className="h-4 w-4 text-[#D4AF37]" /> SMS</button>
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
        <DialogContent aria-describedby={undefined} className="sm:max-w-sm">
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
        <DialogContent aria-describedby={undefined} className="sm:max-w-md">
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
        <DialogContent aria-describedby={undefined} className="sm:max-w-md">
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
    </>
  );
}
