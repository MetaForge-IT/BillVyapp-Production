import { useMemo, useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { toast } from "../components/ui/hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Plus, Check, Scissors,
  User, Calendar, ClipboardCheck, Clock,
  Sparkles, CalendarCheck2, Phone, Mail,
  UserPlus, Zap, StickyNote, Package, AlertTriangle, ChevronDown,
  ChevronLeft, ChevronRight, Receipt,
} from "lucide-react";
import { AppointmentStepper } from "./appointments/AppointmentStepper";
import { bookingAppointmentSteps } from "./appointments/appointmentData";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { cn } from "../components/ui/utils";
import { useAppointments } from "../context/AppointmentContext";
import { useServiceProducts } from "../context/ServiceProductsContext";
import { useProducts } from "../context/ProductsContext";
import { fetchCustomers } from "../../api/customers";
import { fetchServiceCatalog } from "../../api/services";
import { fetchSalonPlans } from "../../api/plans";
import { getApiErrorMessage } from "../../lib/api";
import { clearFormDraft, readFormDraft, writeFormDraft } from "../../lib/formDraft";
import { useBreakpoint } from "../hooks/useBreakpoint";
import { mapApiCatalog, mapToAppointmentService } from "../../lib/serviceCatalog";
import { parseInr } from "../../lib/inventoryMappers";
import {
  APPOINTMENT_PAST_DAYS_LIMIT,
  getAppointmentSlotMinDate,
  isAppointmentSlotDateAllowed,
} from "../../lib/appointmentSlotDate";
import {
  serviceCategories,
  type AppointmentCustomer,
  type AppointmentService,
  type AppointmentType,
  type ServiceCategory,
  type AppointmentPackage,
  type AppointmentProduct,
} from "./appointments/appointmentData";

type SelectedService = AppointmentService & { qty: number };
type SelectedPackage = AppointmentPackage & { qty: number };
type SelectedProduct = AppointmentProduct & { qty: number };
type ServiceTab = ServiceCategory | "Packages" | "Products";

const SERVICES_PAGE_SIZE = 5;

type ProductOverride = { sku: string; name: string; qty: number; unit: string; defaultQty: number };

const NEW_APPOINTMENT_DRAFT_KEY = "new-appointment";
const NEW_WALK_IN_DRAFT_KEY = "new-walk-in";

type BookingMode = "appointment" | "walk-in";

type NewAppointmentDraft = {
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

function createDefaultAppointmentDraft(mode: BookingMode = "appointment"): NewAppointmentDraft {
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
    date: new Date().toISOString().split("T")[0],
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

const tierBadge: Record<AppointmentCustomer["tier"], string> = {
  VIP:     "bg-[#111118] text-[#D4AF37] border-transparent",
  Gold:    "bg-[#D4AF37]/15 text-[#B8962E] border-[#D4AF37]/20",
  Silver:  "bg-black/[0.06] text-[#6b6b6b] border-black/[0.08]",
  Regular: "bg-black/[0.04] text-[#9a9a9a] border-black/[0.05]",
};

const initials = (name: string) =>
  name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();

function ColHeader({ num, icon: Icon, title, desc }: {
  num: string; icon: React.ElementType; title: string; desc: string;
}) {
  return (
    <div className="shrink-0 px-6 py-4 border-b border-black/[0.06] bg-white/70 backdrop-blur-sm">
      <div className="flex items-center gap-2.5">
        <div className="h-8 w-8 rounded-xl bg-[#111118] text-[#D4AF37] font-bold text-[11px] flex items-center justify-center shrink-0">
          {num}
        </div>
        <Icon className="h-4 w-4 text-[#9a9a9a]" />
        <div>
          <p className="text-[13px] font-bold text-[#111118] leading-tight">{title}</p>
          <p className="text-[10.5px] text-[#9a9a9a] mt-0.5">{desc}</p>
        </div>
      </div>
    </div>
  );
}

function Label({ children, required }: { children: string; required?: boolean }) {
  return (
    <p className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[#9a9a9a] mb-2">
      {children}
      {required && <span className="text-[#D4AF37] ml-0.5">*</span>}
    </p>
  );
}

function mapCustomerTier(tier: string): AppointmentCustomer["tier"] {
  if (tier === "platinum") return "VIP";
  if (tier === "gold") return "Gold";
  if (tier === "silver") return "Silver";
  return "Regular";
}

export function NewAppointment({ mode = "appointment" }: { mode?: BookingMode }) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { addAppointment } = useAppointments();
  const [saved, setSaved] = useState(false);
  const [savedAppointmentId, setSavedAppointmentId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const isWalkInPage = mode === "walk-in";
  const draftKey = isWalkInPage ? NEW_WALK_IN_DRAFT_KEY : NEW_APPOINTMENT_DRAFT_KEY;
  const prefillsFromCrm = searchParams.has("customerId") || searchParams.has("name");
  // Appointment page is appointment-only; walk-in lives at /walk-in.
  const openAsWalkIn = isWalkInPage;
  const [draft] = useState(() => {
    const base = prefillsFromCrm
      ? createDefaultAppointmentDraft(isWalkInPage ? "walk-in" : "appointment")
      : readFormDraft(draftKey, createDefaultAppointmentDraft(isWalkInPage ? "walk-in" : "appointment"));
    return openAsWalkIn ? { ...base, visitType: "Walk-in" as const } : { ...base, visitType: "Appointment" as const };
  });
  const [appointmentCustomers, setAppointmentCustomers] = useState<AppointmentCustomer[]>([]);
  const [catalogServices, setCatalogServices] = useState<AppointmentService[]>([]);
  const [loadedPackages, setLoadedPackages] = useState<AppointmentPackage[]>([]);

  useEffect(() => {
    fetchSalonPlans()
      .then((plans) =>
        setLoadedPackages(
          plans
            .filter((plan) => plan.planType === "package" && plan.isActive)
            .map((plan) => ({
              id: plan.id,
              name: plan.name,
              price: plan.price,
              memberPrice: plan.price,
              duration: plan.includedServices.reduce((sum, item) => sum + 60 * item.quantity, 0) || 60,
              includes: plan.includedServices.map((item) => item.serviceName),
              gender: "All" as const,
              tone: "from-amber-400 to-orange-500",
            })),
        ),
      )
      .catch((err) => {
        setLoadedPackages([]);
        toast.error(getApiErrorMessage(err, "Failed to load packages"));
      });
  }, []);

  useEffect(() => {
    fetchServiceCatalog()
      .then((services) => setCatalogServices(mapApiCatalog(services).map(mapToAppointmentService)))
      .catch((err) => toast.error(getApiErrorMessage(err, "Failed to load services")));
  }, []);

  useEffect(() => {
    fetchCustomers()
      .then((rows) =>
        setAppointmentCustomers(
          rows.map((c) => ({
            id: c.id,
            name: c.name,
            phone: c.phone,
            email: c.email,
            tier: mapCustomerTier(c.membershipTier),
            gender:
              c.gender === "male" ? "Male" as const
              : c.gender === "female" ? "Female" as const
              : c.gender === "other" ? "Other" as const
              : undefined,
          })),
        ),
      )
      .catch((err) => toast.error(getApiErrorMessage(err, "Failed to load customers")));
  }, []);

  // Prefill from Customers → Book (new = walk-in, returning = appointment)
  const crmPrefillApplied = useRef(false);
  useEffect(() => {
    if (crmPrefillApplied.current) return;
    const customerId = searchParams.get("customerId");
    const name = searchParams.get("name");
    const phone = searchParams.get("phone");
    if (!customerId && !name) return;

    // Wait for CRM list when we have an id so we attach the real customer record
    if (customerId && appointmentCustomers.length === 0) return;

    // Locked pages: walk-in page always walk-in; create-appointment page never walk-in
    const isWalkIn = isWalkInPage;
    const matched =
      (customerId
        ? appointmentCustomers.find((c) => c.id === customerId)
        : undefined) ??
      (phone
        ? appointmentCustomers.find((c) =>
            c.phone.replace(/\D/g, "").endsWith(phone.replace(/\D/g, "").slice(-10)),
          )
        : undefined) ??
      (name
        ? appointmentCustomers.find((c) => c.name.toLowerCase() === name.toLowerCase())
        : undefined);

    const prefilled: AppointmentCustomer = matched ?? {
      id: customerId || `prefill-${Date.now()}`,
      name: name || "Customer",
      phone: phone || "",
      email: "",
      tier: "Regular",
    };

    crmPrefillApplied.current = true;
    setVisitType(isWalkIn ? "Walk-in" : "Appointment");
    setSelectedCustomer(prefilled);
    setCustomerSearch(prefilled.name);
    setApptNewMode(false);
    if (isWalkIn) {
      setWalkInMode("search");
      setWalkInSearch("");
      setWalkInName("");
      setWalkInPhone("");
    }
    clearFormDraft(draftKey);
    setSearchParams({}, { replace: true });
  }, [appointmentCustomers, draftKey, isWalkInPage, searchParams, setSearchParams]);

  // Customer state
  const [customerSearch, setCustomerSearch]     = useState(draft.customerSearch);
  const [selectedCustomer, setSelectedCustomer] = useState<AppointmentCustomer | null>(draft.selectedCustomer);
  const [visitType, setVisitType]               = useState<AppointmentType>(
    isWalkInPage ? "Walk-in" : "Appointment",
  );
  const [walkInName, setWalkInName]             = useState(draft.walkInName);
  const [walkInPhone, setWalkInPhone]           = useState(draft.walkInPhone);
  const [walkInGender, setWalkInGender]         = useState<"Male" | "Female" | "Other" | "">(draft.walkInGender);
  // Walk-in: toggle between new-entry and fetch-existing
  const [walkInMode, setWalkInMode]             = useState<"new" | "search">(draft.walkInMode);
  const [walkInSearch, setWalkInSearch]         = useState(draft.walkInSearch);
  // Appointment: allow creating a brand-new customer inline
  const [apptNewMode, setApptNewMode]           = useState(draft.apptNewMode);
  const [newCustName, setNewCustName]           = useState(draft.newCustName);
  const [newCustPhone, setNewCustPhone]         = useState(draft.newCustPhone);
  const [newCustGender, setNewCustGender]       = useState<"Male" | "Female" | "Other" | "">(draft.newCustGender);
  const [date, setDate]                         = useState(draft.date);
  const [time, setTime]                         = useState(draft.time);
  const [duration, setDuration]                 = useState(draft.duration);
  const [notes, setNotes]                       = useState(draft.notes);

  /** Returning: past 7 days + future. New: today + future only. */
  const isReturningCustomer =
    visitType === "Walk-in"
      ? walkInMode === "search"
      : !apptNewMode;
  const slotCustomerKind = isReturningCustomer ? "returning" : "new";
  const slotMinDate = getAppointmentSlotMinDate(slotCustomerKind);

  useEffect(() => {
    if (date && !isAppointmentSlotDateAllowed(date, slotCustomerKind)) {
      setDate(slotMinDate);
    }
  }, [slotCustomerKind, date, slotMinDate]);

  // Services state
  const [serviceListPage, setServiceListPage]   = useState(1);
  const [serviceTab, setServiceTab]             = useState<ServiceTab>(draft.serviceTab);
  const [serviceSearch, setServiceSearch]       = useState(draft.serviceSearch);
  const [serviceSearchInput, setServiceSearchInput] = useState(draft.serviceSearch);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  // 300ms debounce for service catalog search
  useEffect(() => {
    const timer = window.setTimeout(() => setServiceSearch(serviceSearchInput), 300);
    return () => window.clearTimeout(timer);
  }, [serviceSearchInput]);
  const [selectedServices, setSelectedServices] = useState<SelectedService[]>(draft.selectedServices);
  const [selectedPackages, setSelectedPackages] = useState<SelectedPackage[]>(draft.selectedPackages);
  const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>(draft.selectedProducts);

  // Product override state: serviceId → { sku, qty }[]
  const { getLinks } = useServiceProducts();
  const { products: inventoryProducts } = useProducts();
  const [productOverrides, setProductOverrides] = useState<Record<string, ProductOverride[]>>(draft.productOverrides);
  const [expandedServiceId, setExpandedServiceId] = useState<string | null>(draft.expandedServiceId);

  useEffect(() => {
    writeFormDraft(draftKey, {
      customerSearch,
      selectedCustomer,
      visitType,
      walkInName,
      walkInPhone,
      walkInGender,
      walkInMode,
      walkInSearch,
      apptNewMode,
      newCustName,
      newCustPhone,
      newCustGender,
      date,
      time,
      duration,
      notes,
      serviceTab,
      serviceSearch,
      selectedServices,
      selectedPackages,
      selectedProducts,
      productOverrides,
      expandedServiceId,
    });
  }, [
    customerSearch,
    selectedCustomer,
    visitType,
    walkInName,
    walkInPhone,
    walkInGender,
    walkInMode,
    walkInSearch,
    apptNewMode,
    newCustName,
    newCustPhone,
    newCustGender,
    date,
    time,
    duration,
    notes,
    serviceTab,
    serviceSearch,
    selectedServices,
    selectedPackages,
    selectedProducts,
    productOverrides,
    expandedServiceId,
  ]);

  function initOverridesForService(service: AppointmentService) {
    const links = getLinks(service.id);
    if (links.length === 0) return;
    setProductOverrides(prev => ({
      ...prev,
      [service.id]: links.map(l => ({ sku: l.sku, name: l.name, qty: l.defaultQty, unit: l.unit, defaultQty: l.defaultQty })),
    }));
  }

  function updateOverrideQty(serviceId: string, sku: string, qty: number) {
    setProductOverrides(prev => ({
      ...prev,
      [serviceId]: (prev[serviceId] ?? []).map(o => o.sku === sku ? { ...o, qty } : o),
    }));
  }

  function stockStatus(sku: string) {
    return inventoryProducts.find(p => p.sku === sku)?.status ?? "ok";
  }

  function stockOf(sku: string) {
    return inventoryProducts.find(p => p.sku === sku)?.stock ?? 0;
  }

  function renderProductOverrides(serviceId: string) {
    const overrides = productOverrides[serviceId];
    if (!overrides?.length) return null;
    return (
      <div className="mt-1 overflow-hidden rounded-xl border border-[#D4AF37]/25 bg-[#D4AF37]/04">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setExpandedServiceId(expandedServiceId === serviceId ? null : serviceId);
          }}
          className="flex w-full items-center gap-2 px-3 py-2 text-left"
        >
          <Package className="h-3 w-3 shrink-0 text-[#d4af37]" />
          <span className="flex-1 text-[10.5px] font-semibold text-[#b8962e]">
            {overrides.length} product{overrides.length > 1 ? "s" : ""} linked
            {overrides.some((o) => stockOf(o.sku) < o.qty) && (
              <span className="ml-1.5 text-orange-500">· ⚠ low stock</span>
            )}
          </span>
          <ChevronDown
            className={`h-3 w-3 text-[#d4af37] transition-transform ${
              expandedServiceId === serviceId ? "rotate-180" : ""
            }`}
          />
        </button>
        {expandedServiceId === serviceId && (
          <div className="space-y-2 border-t border-[#D4AF37]/15 px-3 py-2">
            {overrides.map((override) => {
              const stock = stockOf(override.sku);
              const status = stockStatus(override.sku);
              const isLow = status === "low" || status === "critical" || status === "out";
              const insufficient = stock < override.qty;
              return (
                <div key={override.sku} className="flex items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[11px] font-semibold text-[#1a1a1a]">{override.name}</p>
                    <p className={`text-[10px] ${insufficient ? "font-bold text-orange-500" : "text-gray-400"}`}>
                      {stock} in stock {isLow ? "⚠" : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        updateOverrideQty(serviceId, override.sku, Math.max(0, override.qty - 1));
                      }}
                      className="flex h-6 w-6 items-center justify-center rounded-lg border border-gray-200 bg-white text-[11px] font-bold text-gray-500 hover:bg-gray-50"
                    >
                      −
                    </button>
                    <span
                      className={`w-8 text-center text-[12px] font-bold ${
                        override.qty !== override.defaultQty ? "text-[#d4af37]" : "text-[#1a1a1a]"
                      }`}
                    >
                      {override.qty}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        updateOverrideQty(serviceId, override.sku, override.qty + 1);
                      }}
                      className="flex h-6 w-6 items-center justify-center rounded-lg border border-gray-200 bg-white text-[11px] font-bold text-gray-500 hover:bg-gray-50"
                    >
                      +
                    </button>
                    <span className="w-16 text-[10px] text-gray-400">{override.unit}</span>
                    {override.qty !== override.defaultQty && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          updateOverrideQty(serviceId, override.sku, override.defaultQty);
                        }}
                        className="text-[9px] text-gray-400 underline hover:text-[#d4af37]"
                      >
                        reset
                      </button>
                    )}
                  </div>
                  {insufficient && <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-orange-500" />}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // backward compat alias
  const serviceCategory = serviceTab as ServiceCategory;
  const setServiceCategory = (c: ServiceCategory) => setServiceTab(c);

  const filteredCustomers = useMemo(() =>
    appointmentCustomers.filter(c =>
      c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
      c.phone.includes(customerSearch)
    ), [customerSearch]);

  /** Customer gender used to restrict Male/Female/Others service tabs. */
  const customerGenderForServices: "Male" | "Female" | "Other" | "" =
    visitType === "Walk-in"
      ? (walkInMode === "new" ? walkInGender : (selectedCustomer?.gender ?? ""))
      : (apptNewMode ? newCustGender : (selectedCustomer?.gender ?? ""));

  const visibleServiceTabs = useMemo((): ServiceTab[] => {
    const extras: ServiceTab[] = ["Packages", "Products"];
    if (customerGenderForServices === "Male") return ["Male", "Others", ...extras];
    if (customerGenderForServices === "Female") return ["Female", "Others", ...extras];
    if (customerGenderForServices === "Other") return ["Others", ...extras];
    return ["Male", "Female", "Others", ...extras];
  }, [customerGenderForServices]);

  // Keep the active tab valid when gender filters hide Male/Female.
  useEffect(() => {
    if (!visibleServiceTabs.includes(serviceTab)) {
      setServiceTab(visibleServiceTabs[0] ?? "Others");
      setServiceListPage(1);
    }
  }, [visibleServiceTabs, serviceTab]);

  // Drop cart lines that no longer match the selected gender.
  useEffect(() => {
    if (!customerGenderForServices) return;
    setSelectedServices((prev) =>
      prev.filter((s) => {
        if (customerGenderForServices === "Male") return s.category === "Male" || s.category === "Others";
        if (customerGenderForServices === "Female") return s.category === "Female" || s.category === "Others";
        if (customerGenderForServices === "Other") return s.category === "Others";
        return true;
      }),
    );
  }, [customerGenderForServices]);

  const filteredServices = useMemo(() => {
    const q = serviceSearch.toLowerCase().trim();
    if (serviceTab === "Packages" || serviceTab === "Products") return [];
    return catalogServices.filter((s) => {
      if (s.category !== serviceTab) return false;
      if (customerGenderForServices === "Male" && s.category === "Female") return false;
      if (customerGenderForServices === "Female" && s.category === "Male") return false;
      if (customerGenderForServices === "Other" && s.category !== "Others") return false;
      if (!q) return true;
      return (
        s.name.toLowerCase().includes(q) ||
        (s.displayName ?? "").toLowerCase().includes(q) ||
        (s.serviceGroup ?? "").toLowerCase().includes(q) ||
        (s.categoryLabel ?? "").toLowerCase().includes(q)
      );
    });
  }, [serviceTab, serviceSearch, catalogServices, customerGenderForServices]);

  /** Category → Group → services for accordion listing (when not searching). */
  const groupedServices = useMemo(() => {
    const map = new Map<string, Map<string, AppointmentService[]>>();
    for (const service of filteredServices) {
      const category = service.categoryLabel || service.category;
      const group = service.serviceGroup || category;
      if (!map.has(category)) map.set(category, new Map());
      const groups = map.get(category)!;
      if (!groups.has(group)) groups.set(group, []);
      groups.get(group)!.push(service);
    }
    return map;
  }, [filteredServices]);

  /** Flat list of subcategory (group) accordion rows — paginated 5 at a time. */
  const groupSections = useMemo(() => {
    const sections: Array<{
      categoryName: string;
      groupName: string;
      services: AppointmentService[];
    }> = [];
    for (const [categoryName, groups] of groupedServices.entries()) {
      for (const [groupName, services] of groups.entries()) {
        sections.push({ categoryName, groupName, services });
      }
    }
    return sections;
  }, [groupedServices]);

  const useGroupedServiceList = serviceSearch.trim().length === 0;

  const filteredPackages = useMemo(() => {
    const q = serviceSearch.toLowerCase();
    if (serviceTab !== "Packages") return [];
    return loadedPackages.filter((p) => {
      if (customerGenderForServices === "Male" && p.gender === "Female") return false;
      if (customerGenderForServices === "Female" && p.gender === "Male") return false;
      if (customerGenderForServices === "Other" && p.gender !== "All") return false;
      return q === "" || p.name.toLowerCase().includes(q) || p.includes.some((i) => i.toLowerCase().includes(q));
    });
  }, [serviceTab, serviceSearch, loadedPackages, customerGenderForServices]);

  const filteredProducts = useMemo(() => {
    const q = serviceSearch.toLowerCase();
    if (serviceTab !== "Products") return [];
    return inventoryProducts
      .filter((product) => product.activeStatus !== "inactive")
      .filter((product) => q === "" || product.name.toLowerCase().includes(q) || product.category.toLowerCase().includes(q))
      .map((product): AppointmentProduct => ({
        id: product.id,
        name: product.name,
        price: parseInr(product.price),
        category: product.category,
        usedIn: "",
        stock: product.stock,
        gender: "All",
      }));
  }, [serviceTab, serviceSearch, inventoryProducts]);

  const catalogListTotal =
    serviceTab === "Packages"
      ? filteredPackages.length
      : serviceTab === "Products"
        ? filteredProducts.length
        : useGroupedServiceList
          ? groupSections.length
          : filteredServices.length;

  useEffect(() => {
    setServiceListPage(1);
  }, [serviceTab, serviceSearch]);

  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(catalogListTotal / SERVICES_PAGE_SIZE) || 1);
    if (serviceListPage > maxPage) setServiceListPage(maxPage);
  }, [catalogListTotal, serviceListPage]);

  const paginatedGroupSections = useMemo(() => {
    const offset = (serviceListPage - 1) * SERVICES_PAGE_SIZE;
    return groupSections.slice(offset, offset + SERVICES_PAGE_SIZE);
  }, [groupSections, serviceListPage]);

  const paginatedServices = useMemo(() => {
    const offset = (serviceListPage - 1) * SERVICES_PAGE_SIZE;
    return filteredServices.slice(offset, offset + SERVICES_PAGE_SIZE);
  }, [filteredServices, serviceListPage]);

  const paginatedPackages = useMemo(() => {
    const offset = (serviceListPage - 1) * SERVICES_PAGE_SIZE;
    return filteredPackages.slice(offset, offset + SERVICES_PAGE_SIZE);
  }, [filteredPackages, serviceListPage]);

  const paginatedProducts = useMemo(() => {
    const offset = (serviceListPage - 1) * SERVICES_PAGE_SIZE;
    return filteredProducts.slice(offset, offset + SERVICES_PAGE_SIZE);
  }, [filteredProducts, serviceListPage]);

  const catalogPageStart = catalogListTotal === 0 ? 0 : (serviceListPage - 1) * SERVICES_PAGE_SIZE + 1;
  const catalogPageEnd = Math.min(serviceListPage * SERVICES_PAGE_SIZE, catalogListTotal);
  const catalogPrevDisabled = serviceListPage === 1;
  const catalogNextDisabled = serviceListPage * SERVICES_PAGE_SIZE >= catalogListTotal;

  // Global search across ALL tabs
  const globalSearchResults = useMemo(() => {
    const q = serviceSearch.toLowerCase();
    if (q === "" || ["Male","Female","Others","Packages","Products"].includes(serviceTab)) return null;
    return null; // not used currently — search is per-tab
  }, [serviceSearch, serviceTab]);

  // Resolve effective name/phone for walk-in (new vs. fetched) and appointment (existing vs. new-inline)
  const effectiveWalkInName  = walkInMode === "new" ? walkInName : (selectedCustomer?.name ?? "");
  const effectiveWalkInPhone = walkInMode === "new" ? walkInPhone : (selectedCustomer?.phone ?? "");
  const effectiveApptName    = apptNewMode ? newCustName : (selectedCustomer?.name ?? "");
  const effectiveApptPhone   = apptNewMode ? newCustPhone : (selectedCustomer?.phone ?? "");

  const displayName  = visitType === "Walk-in" ? effectiveWalkInName  : effectiveApptName;
  const displayPhone = visitType === "Walk-in" ? effectiveWalkInPhone : effectiveApptPhone;

  const totalSelectedCount = selectedServices.length + selectedPackages.length + selectedProducts.length;
  const estimatedDuration = selectedServices.reduce((sum, s) => sum + s.duration * s.qty, 0)
    + selectedPackages.reduce((sum, p) => sum + p.duration * p.qty, 0);
  const dateFormatted     = date
    ? new Date(date).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" })
    : "";

  const customerValid = visitType === "Walk-in"
    ? effectiveWalkInName.trim().length > 0
    : apptNewMode ? newCustName.trim().length > 0 : !!selectedCustomer;
  const servicesValid = totalSelectedCount > 0;
  const canSave = customerValid && servicesValid;

  const stepValid = [customerValid, servicesValid, canSave];
  const currentStep = !customerValid ? 0 : !servicesValid ? 1 : 2;

  // Tablet/phone show one step at a time — three columns don't fit, and the shop
  // runs on tablets. Desktop keeps all three side by side.
  const { isDesktop } = useBreakpoint();
  const [wizardStep, setWizardStep] = useState(0);
  // Never sit on a step whose prerequisites are no longer met.
  const furthestStep = !customerValid ? 0 : !servicesValid ? 1 : 2;
  const activeStep = Math.min(wizardStep, furthestStep);
  const showStep = (index: number) => isDesktop || activeStep === index;

  useEffect(() => {
    setWizardStep((prev) => Math.min(prev, furthestStep));
  }, [furthestStep]);

  // Walk-in search results
  const filteredWalkIn = useMemo(() =>
    walkInSearch.trim().length > 0
      ? appointmentCustomers.filter(c =>
          c.name.toLowerCase().includes(walkInSearch.toLowerCase()) ||
          c.phone.includes(walkInSearch))
      : [], [walkInSearch]);

  async function persistBooking(): Promise<{ id: string; customerId?: string } | null> {
    if (!canSave || selectedServices.length === 0) {
      if (selectedServices.length === 0) {
        toast.error("Select at least one service from the catalog");
      }
      return null;
    }
    if (!date || !isAppointmentSlotDateAllowed(date, slotCustomerKind)) {
      toast.error(
        slotCustomerKind === "new"
          ? "New customers can only book today or upcoming dates"
          : `Scheduled date must be within the last ${APPOINTMENT_PAST_DAYS_LIMIT} days or any future day`,
      );
      setDate(slotMinDate);
      return null;
    }
    const servicePayload = selectedServices.map((s) => ({
      serviceId: s.id,
      itemName: s.name,
      price: s.price,
      durationMinutes: s.duration,
    }));
    const extraNotes = [
      notes,
      ...selectedPackages.map((p) => `Package: ${p.name}`),
      ...selectedProducts.map((p) => `Product: ${p.name}`),
    ].filter(Boolean).join("; ");

    const created = await addAppointment({
      customerId: slotCustomerKind === "returning" ? selectedCustomer?.id : undefined,
      customerName: displayName,
      customerPhone: displayPhone || "0000000000",
      appointmentType: visitType === "Walk-in" ? "walk-in" : "appointment",
      scheduledDate: date,
      scheduledTime: time.length === 5 ? `${time}:00` : time,
      durationMinutes: estimatedDuration || 90,
      notes: extraNotes || undefined,
      services: servicePayload,
    });
    clearFormDraft(draftKey);
    setSavedAppointmentId(created.id);
    return { id: created.id, customerId: created.customerId };
  }

  function goToAppointmentBill(appointmentId: string) {
    navigate(`/appointments?type=walk-in&bill=${appointmentId}`);
  }

  async function handleSave() {
    if (saving) return;
    setSaving(true);
    try {
      const created = await persistBooking();
      if (!created) return;
      setSaved(true);
      toast.success(isWalkInPage ? "Walk-in saved!" : "Appointment booked!", {
        description: isWalkInPage
          ? `${displayName} checked in · ${dateFormatted} at ${time}`
          : `${displayName}'s slot saved · ${dateFormatted} at ${time}`,
      });
    } catch (err) {
      toast.error(getApiErrorMessage(err, isWalkInPage ? "Failed to save walk-in" : "Failed to save appointment"));
    } finally {
      setSaving(false);
    }
  }

  async function handleBill() {
    if (!isWalkInPage || saving) return;
    setSaving(true);
    try {
      const created = await persistBooking();
      if (!created) return;
      goToAppointmentBill(created.id);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to open walk-in bill"));
    } finally {
      setSaving(false);
    }
  }


  // ── SUCCESS ──────────────────────────────────────────────────────────────
  if (saved) {
    return (
      <div className="-mx-6 -my-6 flex min-h-[calc(100dvh-3.5rem)] items-center justify-center bg-[#f4f2ed] px-6 py-12 sm:-mx-8 lg:-mx-10">
        <motion.div
          initial={{ scale: 0.92, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-md rounded-3xl bg-white px-10 py-10 text-center shadow-2xl shadow-black/10"
        >
            <motion.div
              initial={{ scale: 0 }} animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 280, damping: 18 }}
              className="flex justify-center mb-6"
            >
              <div className="relative">
                <div className="h-20 w-20 rounded-full bg-[#D4AF37]/10 border-2 border-[#D4AF37]/30 flex items-center justify-center shadow-[0_0_40px_rgba(212,175,55,0.18)]">
                  <CalendarCheck2 className="h-9 w-9 text-[#D4AF37]" />
                </div>
                <div className="absolute -top-1 -right-1 h-6 w-6 rounded-full bg-[#111118] border-2 border-white flex items-center justify-center">
                  <Check className="h-3 w-3 text-[#D4AF37]" strokeWidth={3} />
                </div>
              </div>
            </motion.div>
            <h2 className="text-xl font-bold text-[#111118] mb-1.5">
              {isWalkInPage ? "Walk-in Saved!" : "Appointment Booked!"}
            </h2>
            <p className="text-[13px] text-[#9a9a9a] mb-7 leading-relaxed">
              <span className="font-semibold text-[#111118]">{displayName || "Customer"}</span>
              {isWalkInPage ? " is checked in." : "'s slot is confirmed."}
            </p>
            <div className="rounded-2xl bg-[#faf9f7] border border-black/[0.06] p-4 text-left space-y-2 mb-5">
              {([
                { label: "Date",     value: dateFormatted },
                { label: "Time",     value: time },
                { label: "Services", value: `${selectedServices.length} selected` },
                estimatedDuration > 0 ? { label: "Est. Duration", value: `${estimatedDuration} min` } : null,
              ] as Array<{ label: string; value: string } | null>).filter(Boolean).map(row => (
                <div key={row!.label} className="flex justify-between">
                  <span className="text-[11px] text-[#9a9a9a]">{row!.label}</span>
                  <span className="text-[12px] font-semibold text-[#111118]">{row!.value}</span>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {isWalkInPage ? (
                <>
                  <Button
                    onClick={() => navigate("/appointments?type=walk-in")}
                    variant="outline"
                    className="rounded-xl h-11 border-black/[0.1] font-semibold text-[13px]"
                  >
                    Appointments
                  </Button>
                  <Button
                    onClick={() => {
                      setSaved(false);
                      setSavedAppointmentId(null);
                      setSelectedCustomer(null);
                      setSelectedServices([]);
                      setSelectedPackages([]);
                      setSelectedProducts([]);
                      setWalkInName("");
                      setWalkInPhone("");
                      setWalkInGender("");
                      setWalkInSearch("");
                      setWalkInMode("search");
                      navigate("/walk-in");
                    }}
                    className="rounded-xl h-11 bg-[#111118] text-[#D4AF37] font-semibold hover:bg-[#1e1e1e] text-[13px]"
                  >
                    + New Walk-In
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    onClick={() => navigate("/appointments")}
                    variant="outline"
                    className="rounded-xl h-11 border-black/[0.1] font-semibold text-[13px]"
                  >
                    Appointments
                  </Button>
                  <Button
                    onClick={() => {
                      setSaved(false);
                      setSavedAppointmentId(null);
                      setSelectedCustomer(null); setSelectedServices([]);
                      setWalkInName(""); setWalkInPhone("");
                    }}
                    className="rounded-xl h-11 bg-[#111118] text-[#D4AF37] font-semibold hover:bg-[#1e1e1e] text-[13px]"
                  >
                    + New Booking
                  </Button>
                </>
              )}
            </div>
          </motion.div>
      </div>
    );
  }

  // ── MAIN ──────────────────────────────────────────────────────────────────
  return (
    <div
      className={cn(
        "-mx-4 -my-4 flex flex-col overflow-hidden sm:-mx-6 sm:-my-5 lg:-mx-10 lg:-my-6",
        // In wizard mode the page must fit exactly — the 5rem app header plus the
        // shell padding this page can't negate — so the step nav never scrolls away.
        isDesktop
          ? "min-h-[calc(100dvh-3.5rem)]"
          : "h-[calc(100dvh-6rem)] sm:h-[calc(100dvh-5.5rem)]",
      )}
    >

      {/* Page header + progress stepper */}
      <div className="shrink-0 border-b border-black/[0.06] bg-white px-4 py-4 sm:px-6 lg:px-8">
        <div className="mb-4 flex items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#D4AF37]/20 bg-[#D4AF37]/12">
            {isWalkInPage
              ? <Zap className="h-4 w-4 text-[#D4AF37]" />
              : <CalendarCheck2 className="h-4 w-4 text-[#D4AF37]" />}
          </div>
          <div>
            <p className="text-[15px] font-bold leading-tight text-[#111118]">
              {isWalkInPage ? "New Walk-In" : "Create Appointment"}
            </p>
            <p className="mt-0.5 flex items-center gap-1 text-[10.5px] text-[#9a9a9a]">
              <Sparkles className="h-2.5 w-2.5 text-[#D4AF37]" />
              {isWalkInPage ? "Quick check-in" : "Scheduled booking"}
            </p>
          </div>
        </div>
        <AppointmentStepper
          steps={bookingAppointmentSteps}
          currentStep={isDesktop ? currentStep : activeStep}
          stepValid={stepValid}
          onStepClick={(index) => { if (!isDesktop) setWizardStep(index); }}
        />
      </div>

      {/* One step at a time on tablet/phone, three columns on desktop */}
      <div className={cn("responsive-panels", !isDesktop && "responsive-panels--wizard")}>

        {/* ── COL 1: CUSTOMER ── */}
        {showStep(0) && (
        <div className="responsive-panel flex flex-col border-b lg:border-b-0 lg:border-r border-black/[0.08] bg-[#f4f2ed] overflow-hidden">
          <ColHeader num="01" icon={User} title="Customer" desc="Who's coming in?" />

          <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">

            {/* Visit type toggle removed — each page is locked to one mode */}

            {/* ── Customer section ── */}
            {!isWalkInPage ? (

              /* ── APPOINTMENT: search existing OR create new ── */
              <div>
                {/* Mode toggle */}
                <div className="flex items-center justify-between mb-3">
                  <Label>{apptNewMode ? "New Customer" : "Search Customer"}</Label>
                  <button type="button"
                    onClick={() => { setApptNewMode(v => !v); setSelectedCustomer(null); setCustomerSearch(""); setNewCustName(""); setNewCustPhone(""); setNewCustGender(""); }}
                    className="flex items-center gap-1 text-[10px] font-semibold text-[#D4AF37] hover:text-[#C9A227] transition-colors">
                    {apptNewMode
                      ? <><Search className="h-3 w-3" /> Search existing</>
                      : <><UserPlus className="h-3 w-3" /> New customer</>}
                  </button>
                </div>

                <AnimatePresence mode="wait">
                  {apptNewMode ? (
                    /* New customer inline form */
                    <motion.div key="new-form"
                      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                      className="space-y-2.5">
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#9a9a9a]" />
                        <Input placeholder="Full name *" value={newCustName} onChange={e => setNewCustName(e.target.value)}
                          className="pl-9 h-10 rounded-xl bg-white border-black/[0.08] focus:border-[#D4AF37]/40 text-[12.5px]" />
                      </div>
                      <div className="flex gap-2">
                        <span className="inline-flex items-center px-2.5 rounded-xl border border-black/[0.08] bg-gray-50 text-[12px] text-gray-500 shrink-0">+91</span>
                        <Input placeholder="98765 00000" value={newCustPhone.replace(/^\+91\s?/,"")} onChange={e => setNewCustPhone("+91 " + e.target.value)}
                          className="flex-1 h-10 rounded-xl bg-white border-black/[0.08] focus:border-[#D4AF37]/40 text-[12.5px]" />
                      </div>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#9a9a9a]" />
                        <Input placeholder="Email (optional)"
                          className="pl-9 h-10 rounded-xl bg-white border-black/[0.08] focus:border-[#D4AF37]/40 text-[12.5px]" />
                      </div>
                      {/* Gender */}
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#9a9a9a] mb-1.5">Gender</p>
                        <div className="grid grid-cols-3 gap-1.5">
                          {(["Male", "Female", "Other"] as const).map(g => (
                            <button key={g} type="button" onClick={() => {
                              setNewCustGender(g);
                              setServiceTab(g === "Other" ? "Others" : g);
                              setServiceListPage(1);
                            }}
                              className={cn("py-2 rounded-xl text-[11px] font-semibold border transition-all",
                                newCustGender === g ? "bg-[#111118] text-[#D4AF37] border-[#111118]" : "bg-white border-black/[0.08] text-[#9a9a9a] hover:border-[#D4AF37]/30")}>
                              {g}
                            </button>
                          ))}
                        </div>
                      </div>
                      {newCustName.trim() && (
                        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#D4AF37]/06 border border-[#D4AF37]/20">
                          <Check className="h-3.5 w-3.5 text-[#D4AF37] shrink-0" />
                          <p className="text-[11px] text-[#9a7a1e] font-semibold">Will be added as a new customer on save</p>
                        </div>
                      )}
                    </motion.div>
                  ) : (
                    /* Search existing */
                    <motion.div key="search-form"
                      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#9a9a9a]" />
                        <Input placeholder="Name or phone…" value={customerSearch}
                          onChange={e => { setCustomerSearch(e.target.value); setSelectedCustomer(null); }}
                          className="pl-9 h-10 rounded-xl bg-white border-black/[0.08] focus:border-[#D4AF37]/40 text-[12.5px]" />
                      </div>
                      <AnimatePresence>
                        {customerSearch.trim().length > 0 && (
                          <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -3 }}
                            className="mt-1 rounded-xl border border-black/[0.07] bg-white shadow-lg max-h-44 overflow-y-auto">
                            {filteredCustomers.length === 0 ? (
                              <div className="px-4 py-4 text-center">
                                <p className="text-[11.5px] text-[#9a9a9a] mb-2">No match found</p>
                                <button type="button"
                                  onClick={() => { setApptNewMode(true); setNewCustName(customerSearch); setCustomerSearch(""); }}
                                  className="flex items-center gap-1.5 mx-auto text-[11px] font-bold text-[#D4AF37] hover:text-[#C9A227] transition-colors">
                                  <UserPlus className="h-3.5 w-3.5" /> Create &ldquo;{customerSearch}&rdquo; as new
                                </button>
                              </div>
                            ) : filteredCustomers.map(c => (
                              <button key={c.id} type="button"
                                onClick={() => {
                                  setSelectedCustomer(c);
                                  setCustomerSearch("");
                                  if (c.gender === "Male" || c.gender === "Female") setServiceTab(c.gender);
                                  else if (c.gender === "Other") setServiceTab("Others");
                                  setServiceListPage(1);
                                }}
                                className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-[#f4f2ed] border-b border-black/[0.04] last:border-0">
                                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-[#D4AF37] to-[#C9A227] text-[#111118] text-[10px] font-bold flex items-center justify-center shrink-0">
                                  {initials(c.name)}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-[12px] font-semibold text-[#111118] truncate">{c.name}</p>
                                  <p className="text-[10.5px] text-[#9a9a9a]">{c.phone}</p>
                                </div>
                                <Badge className={cn("text-[8px] border font-bold px-1.5", tierBadge[c.tier])}>{c.tier}</Badge>
                              </button>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                      {selectedCustomer && customerSearch === "" && (
                        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}
                          className="mt-2 flex items-center gap-3 rounded-xl border border-[#D4AF37]/30 bg-white p-3">
                          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#C9A227] text-[#111118] text-[11px] font-bold flex items-center justify-center shrink-0">
                            {initials(selectedCustomer.name)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="text-[13px] font-bold text-[#111118]">{selectedCustomer.name}</p>
                              <Badge className={cn("text-[8px] border font-bold px-1.5", tierBadge[selectedCustomer.tier])}>{selectedCustomer.tier}</Badge>
                            </div>
                            <span className="flex items-center gap-1 text-[10.5px] text-[#6b6b6b] mt-0.5">
                              <Phone className="h-3 w-3" />{selectedCustomer.phone}
                            </span>
                          </div>
                          <button type="button" onClick={() => setSelectedCustomer(null)}
                            className="h-5 w-5 rounded-full border border-black/[0.1] flex items-center justify-center text-[#9a9a9a] hover:text-[#111118] shrink-0">
                            <Check className="h-3 w-3 text-[#D4AF37]" strokeWidth={2.5} />
                          </button>
                        </motion.div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

            ) : (

              /* ── WALK-IN: returning customer first, then new customer ── */
              <div>
                {/* Segmented mode toggle — Returning first (most common at desk) */}
                <div className="mb-3">
                  <Label>Customer</Label>
                  <div className="inline-flex w-full items-center gap-0.5 rounded-xl border border-black/[0.08] bg-[#FAF8F2]/60 p-1" role="tablist" aria-label="Walk-in customer type">
                    {(
                      [
                        { value: "search" as const, label: "Returning", icon: Search },
                        { value: "new" as const, label: "New customer", icon: UserPlus },
                      ] as const
                    ).map(({ value, label, icon: Icon }) => {
                      const isActive = walkInMode === value;
                      return (
                        <button
                          key={value}
                          type="button"
                          role="tab"
                          aria-selected={isActive}
                          onClick={() => {
                            setWalkInMode(value);
                            setSelectedCustomer(null);
                            setWalkInSearch("");
                            setWalkInName("");
                            setWalkInPhone("");
                            setWalkInGender("");
                          }}
                          className={cn(
                            "flex h-11 flex-1 items-center justify-center gap-1.5 rounded-lg px-3 text-[13px] font-semibold transition-all",
                            isActive
                              ? "bg-[#D4AF37]/15 text-[#9a7d20] border border-[#D4AF37]/35"
                              : "border border-transparent text-[#6b6b6b] hover:bg-black/[0.04]",
                          )}
                        >
                          <Icon className="h-4 w-4" />
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <AnimatePresence mode="wait">
                  {walkInMode === "search" ? (
                    /* Returning customer search */
                    <motion.div key="walkin-search"
                      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#9a9a9a]" />
                        <Input placeholder="Search by name or phone…" value={walkInSearch}
                          onChange={e => { setWalkInSearch(e.target.value); setSelectedCustomer(null); }}
                          className="pl-9 h-10 rounded-xl bg-white border-black/[0.08] focus:border-[#D4AF37]/40 text-[12.5px]" />
                      </div>
                      <AnimatePresence>
                        {walkInSearch.trim().length > 0 && (
                          <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -3 }}
                            className="mt-1 rounded-xl border border-black/[0.07] bg-white shadow-lg max-h-44 overflow-y-auto">
                            {filteredWalkIn.length === 0 ? (
                              <div className="px-4 py-4 text-center">
                                <p className="text-[11.5px] text-[#9a9a9a] mb-2">No match found</p>
                                <button type="button"
                                  onClick={() => { setWalkInMode("new"); setWalkInName(walkInSearch); setWalkInSearch(""); }}
                                  className="flex items-center gap-1.5 mx-auto text-[11px] font-bold text-[#D4AF37] hover:text-[#C9A227] transition-colors">
                                  <UserPlus className="h-3.5 w-3.5" /> Add as new customer
                                </button>
                              </div>
                            ) : filteredWalkIn.map(c => (
                              <button key={c.id} type="button"
                                onClick={() => {
                                  setSelectedCustomer(c);
                                  setWalkInSearch("");
                                  if (c.gender === "Male" || c.gender === "Female") setServiceTab(c.gender);
                                  else if (c.gender === "Other") setServiceTab("Others");
                                  setServiceListPage(1);
                                }}
                                className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-[#f4f2ed] border-b border-black/[0.04] last:border-0">
                                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-[#D4AF37] to-[#C9A227] text-[#111118] text-[10px] font-bold flex items-center justify-center shrink-0">
                                  {initials(c.name)}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-[12px] font-semibold text-[#111118] truncate">{c.name}</p>
                                  <p className="text-[10.5px] text-[#9a9a9a]">{c.phone}</p>
                                </div>
                                <Badge className={cn("text-[8px] border font-bold px-1.5", tierBadge[c.tier])}>{c.tier}</Badge>
                              </button>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                      {selectedCustomer && walkInSearch === "" && (
                        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}
                          className="mt-2 flex items-center gap-3 rounded-xl border border-[#D4AF37]/30 bg-white p-3">
                          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#C9A227] text-[#111118] text-[11px] font-bold flex items-center justify-center shrink-0">
                            {initials(selectedCustomer.name)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-bold text-[#111118]">{selectedCustomer.name}</p>
                            <span className="flex items-center gap-1 text-[10.5px] text-[#6b6b6b] mt-0.5">
                              <Phone className="h-3 w-3" />{selectedCustomer.phone}
                            </span>
                          </div>
                          <Check className="h-4 w-4 text-[#D4AF37] shrink-0" strokeWidth={2.5} />
                        </motion.div>
                      )}
                    </motion.div>
                  ) : (
                    /* New walk-in entry */
                    <motion.div key="walkin-new"
                      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                      className="space-y-2.5">
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#9a9a9a]" />
                        <Input placeholder="Full name *" value={walkInName} onChange={e => setWalkInName(e.target.value)}
                          className="pl-9 h-10 rounded-xl bg-white border-black/[0.08] focus:border-[#D4AF37]/40 text-[12.5px]" />
                      </div>
                      <div className="flex gap-2">
                        <span className="inline-flex items-center px-2.5 rounded-xl border border-black/[0.08] bg-gray-50 text-[12px] text-gray-500 shrink-0">+91</span>
                        <Input placeholder="98765 00000" value={walkInPhone.replace(/^\+91\s?/,"")} onChange={e => setWalkInPhone("+91 " + e.target.value)}
                          className="flex-1 h-10 rounded-xl bg-white border-black/[0.08] focus:border-[#D4AF37]/40 text-[12.5px]" />
                      </div>
                      {/* Gender */}
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#9a9a9a] mb-1.5">Gender</p>
                        <div className="grid grid-cols-3 gap-1.5">
                          {(["Male", "Female", "Other"] as const).map(g => (
                            <button key={g} type="button" onClick={() => {
                              setWalkInGender(g);
                              setServiceTab(g === "Other" ? "Others" : g);
                              setServiceListPage(1);
                            }}
                              className={cn("py-2 rounded-xl text-[11px] font-semibold border transition-all",
                                walkInGender === g ? "bg-[#111118] text-[#D4AF37] border-[#111118]" : "bg-white border-black/[0.08] text-[#9a9a9a] hover:border-[#D4AF37]/30")}>
                              {g}
                            </button>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Slot */}
            <div>
              <Label>Slot Details</Label>
              <div className="space-y-2">
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#9a9a9a] pointer-events-none z-10" />
                  <Input
                    type="date"
                    value={date}
                    min={slotMinDate}
                    onChange={(e) => {
                      const next = e.target.value;
                      if (next && !isAppointmentSlotDateAllowed(next, slotCustomerKind)) {
                        toast.error(
                          slotCustomerKind === "new"
                            ? "New customers cannot book previous dates"
                            : `Past dates limited to the last ${APPOINTMENT_PAST_DAYS_LIMIT} days`,
                        );
                        setDate(slotMinDate);
                        return;
                      }
                      setDate(next);
                    }}
                    className="pl-9 h-10 rounded-xl bg-white border-black/[0.08] focus:border-[#D4AF37]/40 text-[12.5px]"
                  />
                </div>
                <p className="text-[10px] text-[#9a9a9a]">
                  {slotCustomerKind === "new"
                    ? "Today and upcoming dates only — previous dates not allowed"
                    : `Past dates: last ${APPOINTMENT_PAST_DAYS_LIMIT} days only · Future: any day`}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#9a9a9a] pointer-events-none z-10" />
                    <Input type="time" value={time} onChange={e => setTime(e.target.value)}
                      className="pl-9 h-10 rounded-xl bg-white border-black/[0.08] focus:border-[#D4AF37]/40 text-[12.5px]" />
                  </div>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#9a9a9a] pointer-events-none z-10" />
                    <Input value={duration} onChange={e => setDuration(e.target.value)} placeholder="Duration"
                      className="pl-9 h-10 rounded-xl bg-white border-black/[0.08] focus:border-[#D4AF37]/40 text-[12.5px]" />
                  </div>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <StickyNote className="h-3 w-3 text-[#9a9a9a]" />
                <Label>Notes (Optional)</Label>
              </div>
              <textarea value={notes} onChange={e => setNotes(e.target.value)}
                placeholder="Special requests or preferences…"
                maxLength={200}
                className="w-full h-20 rounded-xl border border-black/[0.08] bg-white px-3.5 py-3 text-[12.5px] text-[#111118] placeholder:text-[#c0c0c0] resize-none focus:outline-none focus:border-[#D4AF37]/40 focus:ring-2 focus:ring-[#D4AF37]/10"
              />
              <p className="text-[9.5px] text-[#c0c0c0] text-right mt-1 tabular-nums">{notes.length}/200</p>
            </div>
          </div>
        </div>
        )}

        {/* ── COL 2: SERVICES / PACKAGES / PRODUCTS ── */}
        {showStep(1) && (
        <div className={cn("responsive-panel flex flex-col border-b lg:border-b-0 lg:border-r border-black/[0.08] bg-[#f4f2ed] overflow-hidden relative transition-all duration-300", !customerValid && "pointer-events-none select-none")}>
          {/* Locked overlay */}
          {!customerValid && (
            <div className="absolute inset-0 z-10 bg-[#f4f2ed]/70 backdrop-blur-[1px] flex flex-col items-center justify-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-[#111118]/08 border border-[#111118]/10 flex items-center justify-center">
                <Scissors className="h-5 w-5 text-[#111118]/20" />
              </div>
              <p className="text-[12px] font-bold text-[#111118]/30">Fill in customer first</p>
            </div>
          )}
          <ColHeader num="02" icon={Scissors} title="Services" desc="What do they need?" />

          <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">

            {/* Tab bar: Male | Female | Others | Packages | Products (gender tabs filtered by customer) */}
            <div className="tabs-scroll-x p-1 rounded-xl bg-white border border-black/[0.07]">
              {visibleServiceTabs.map(tab => (
                <button key={tab} type="button" onClick={() => { setServiceTab(tab); setServiceSearch(""); setServiceSearchInput(""); setServiceListPage(1); }}
                  className={cn(
                    "rounded-lg py-2 px-3 text-[10.5px] font-bold transition-all whitespace-nowrap",
                    serviceTab === tab
                      ? tab === "Packages" ? "bg-[#d4af37] text-[#111118] shadow-sm"
                        : tab === "Products" ? "bg-[#111118] text-[#D4AF37] shadow-sm"
                        : "bg-[#111118] text-[#D4AF37] shadow-sm"
                      : "text-[#9a9a9a] hover:text-[#111118]"
                  )}
                >{tab}</button>
              ))}
            </div>

            {/* Search — global across current tab */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#9a9a9a]" />
              <Input
                placeholder={
                  serviceTab === "Packages" ? "Search packages…"
                  : serviceTab === "Products" ? "Search products…"
                  : `Search ${serviceTab.toLowerCase()} services…`
                }
                value={serviceSearchInput}
                onChange={e => setServiceSearchInput(e.target.value)}
                className="pl-9 h-10 rounded-xl bg-white border-black/[0.08] focus:border-[#D4AF37]/40 text-[12.5px]"
              />
            </div>

            {/* ── Services list (Male/Female/Others) — grouped by category / service_group ── */}
            {(serviceTab === "Male" || serviceTab === "Female" || serviceTab === "Others") && (
              <div className="space-y-2">
                {filteredServices.length === 0 && (
                  <p className="text-center text-[12px] text-[#c0c0c0] italic py-6">No services found</p>
                )}

                {useGroupedServiceList
                  ? paginatedGroupSections.map(({ categoryName, groupName, services }, index) => {
                      const groupKey = `${categoryName}::${groupName}`;
                      const open = expandedGroups[groupKey] ?? false;
                      const showCategoryLabel =
                        index === 0 ||
                        paginatedGroupSections[index - 1]?.categoryName !== categoryName;
                      const accordionTitle = groupName;
                      return (
                      <div key={groupKey} className="space-y-2">
                        {showCategoryLabel && (
                          <p className="px-1 pt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[#9a9a9a]">
                            {categoryName}
                          </p>
                        )}
                            <div className="overflow-hidden rounded-xl border border-black/[0.07] bg-white">
                              <button
                                type="button"
                                onClick={() =>
                                  setExpandedGroups((prev) => ({ ...prev, [groupKey]: !open }))
                                }
                                className="flex w-full items-center gap-2 px-3 py-2.5 text-left hover:bg-[#faf9f7]"
                              >
                                <ChevronDown
                                  className={cn(
                                    "h-3.5 w-3.5 text-[#D4AF37] transition-transform",
                                    open ? "rotate-0" : "-rotate-90",
                                  )}
                                />
                                <span className="text-[12px] font-bold text-[#111118]">{accordionTitle}</span>
                                <span className="ml-auto text-[10px] text-[#9a9a9a]">{services.length}</span>
                              </button>
                              {open && (
                                <div className="space-y-1.5 border-t border-black/[0.05] px-2 py-2">
                                  {services.map((service) => {
                                    const sel = selectedServices.some((s) => s.id === service.id);
                                    return (
                                      <div key={service.id} className="space-y-1">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setSelectedServices((prev) => {
                                            const exists = prev.find((s) => s.id === service.id);
                                            if (exists) {
                                              setProductOverrides((po) => {
                                                const n = { ...po };
                                                delete n[service.id];
                                                return n;
                                              });
                                              return prev.filter((s) => s.id !== service.id);
                                            }
                                            initOverridesForService(service);
                                            return [...prev, { ...service, qty: 1 }];
                                          })
                                        }
                                        className={cn(
                                          "flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-all duration-200",
                                          sel
                                            ? "border-[#D4AF37]/40 bg-white shadow-[0_0_0_1.5px_rgba(212,175,55,0.15)]"
                                            : "border-black/[0.07] bg-[#faf9f7] hover:border-[#D4AF37]/20",
                                        )}
                                      >
                                        <div
                                          className={cn(
                                            "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br",
                                            service.tone ?? "from-[#9a9a9a] to-[#6b6b6b]",
                                          )}
                                        >
                                          <Scissors className="h-4 w-4 text-white/90" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                          <p className="text-[10px] font-semibold uppercase tracking-wide text-[#9a9a9a]">
                                            {service.categoryLabel || categoryName}
                                            {service.serviceGroup ? ` · ${service.serviceGroup}` : ""}
                                          </p>
                                          <p className="text-[12.5px] font-semibold leading-tight text-[#111118]">
                                            {service.displayName || service.name}
                                          </p>
                                          <p className="mt-0.5 flex items-center gap-1 text-[10.5px] text-[#9a9a9a]">
                                            <Clock className="h-3 w-3" /> {service.duration} min
                                          </p>
                                        </div>
                                        <div className="flex shrink-0 items-center gap-2">
                                          <span className="text-[12.5px] font-bold text-[#111118]">
                                            ₹{service.price.toLocaleString("en-IN")}
                                          </span>
                                          <div
                                            className={cn(
                                              "flex h-6 w-6 items-center justify-center rounded-full transition-all",
                                              sel
                                                ? "bg-[#D4AF37] text-[#111118]"
                                                : "bg-[#f4f2ed] text-[#c0c0c0]",
                                            )}
                                          >
                                            {sel ? (
                                              <Check className="h-3.5 w-3.5" strokeWidth={3} />
                                            ) : (
                                              <Plus className="h-3.5 w-3.5" />
                                            )}
                                          </div>
                                        </div>
                                      </button>
                                      {sel && renderProductOverrides(service.id)}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                      </div>
                      );
                    })
                  : paginatedServices.map((service) => {
                      const sel = selectedServices.some((s) => s.id === service.id);
                      return (
                        <div key={service.id} className="space-y-1">
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedServices((prev) => {
                              const exists = prev.find((s) => s.id === service.id);
                              if (exists) {
                                setProductOverrides((po) => {
                                  const n = { ...po };
                                  delete n[service.id];
                                  return n;
                                });
                                return prev.filter((s) => s.id !== service.id);
                              }
                              initOverridesForService(service);
                              return [...prev, { ...service, qty: 1 }];
                            })
                          }
                          className={cn(
                            "flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-all duration-200",
                            sel
                              ? "border-[#D4AF37]/40 bg-white shadow-[0_0_0_1.5px_rgba(212,175,55,0.15)]"
                              : "border-black/[0.07] bg-white hover:border-[#D4AF37]/20 hover:shadow-sm",
                          )}
                        >
                          <div
                            className={cn(
                              "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br",
                              service.tone ?? "from-[#9a9a9a] to-[#6b6b6b]",
                            )}
                          >
                            <Scissors className="h-4 w-4 text-white/90" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-[#9a9a9a]">
                              {service.categoryLabel}
                              {service.serviceGroup ? ` · ${service.serviceGroup}` : ""}
                            </p>
                            <p className="text-[12.5px] font-semibold leading-tight text-[#111118]">
                              {service.displayName || service.name}
                            </p>
                            <p className="mt-0.5 flex items-center gap-1 text-[10.5px] text-[#9a9a9a]">
                              <Clock className="h-3 w-3" /> {service.duration} min
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            <span className="text-[12.5px] font-bold text-[#111118]">
                              ₹{service.price.toLocaleString("en-IN")}
                            </span>
                            <div
                              className={cn(
                                "flex h-6 w-6 items-center justify-center rounded-full transition-all",
                                sel ? "bg-[#D4AF37] text-[#111118]" : "bg-[#f4f2ed] text-[#c0c0c0]",
                              )}
                            >
                              {sel ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : <Plus className="h-3.5 w-3.5" />}
                            </div>
                          </div>
                        </button>
                        {sel && renderProductOverrides(service.id)}
                        </div>
                      );
                    })}

                {catalogListTotal > SERVICES_PAGE_SIZE && (serviceTab === "Male" || serviceTab === "Female" || serviceTab === "Others") && (
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <p className="text-[11px] font-medium text-[#9a9a9a]">
                      {catalogPageStart}–{catalogPageEnd} of {catalogListTotal}
                      {useGroupedServiceList ? " groups" : " services"}
                    </p>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setServiceListPage((p) => Math.max(1, p - 1))}
                        disabled={catalogPrevDisabled}
                        aria-label="Previous services page"
                        className={cn(
                          "flex h-7 w-7 items-center justify-center rounded-lg border text-[11px] transition-all",
                          catalogPrevDisabled
                            ? "cursor-not-allowed border-black/[0.06] bg-[#f4f2ed] text-[#c0c0c0]"
                            : "border-black/[0.1] bg-white text-[#111118] hover:border-[#D4AF37]/40",
                        )}
                      >
                        <ChevronLeft className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setServiceListPage((p) => p + 1)}
                        disabled={catalogNextDisabled}
                        aria-label="Next services page"
                        className={cn(
                          "flex h-7 w-7 items-center justify-center rounded-lg border text-[11px] transition-all",
                          catalogNextDisabled
                            ? "cursor-not-allowed border-black/[0.06] bg-[#f4f2ed] text-[#c0c0c0]"
                            : "border-[#D4AF37]/30 bg-[#D4AF37]/10 text-[#111118] hover:border-[#D4AF37]/50",
                        )}
                      >
                        <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── Packages list ── */}
            {serviceTab === "Packages" && (
              <div className="space-y-2">
                {filteredPackages.length === 0 && (
                  <p className="text-center text-[12px] text-[#c0c0c0] italic py-6">No packages found</p>
                )}
                {paginatedPackages.map(pkg => {
                  const sel = selectedPackages.some(p => p.id === pkg.id);
                  return (
                    <button key={pkg.id} type="button"
                      onClick={() => setSelectedPackages(prev => {
                        const exists = prev.find(p => p.id === pkg.id);
                        return exists ? prev.filter(p => p.id !== pkg.id) : [...prev, { ...pkg, qty: 1 }];
                      })}
                      className={cn(
                        "w-full flex items-start gap-3 rounded-xl border p-3 text-left transition-all duration-200",
                        sel ? "border-[#D4AF37]/40 bg-white shadow-[0_0_0_1.5px_rgba(212,175,55,0.15)]"
                           : "border-black/[0.07] bg-white hover:border-[#D4AF37]/20 hover:shadow-sm"
                      )}
                    >
                      <div className={cn("h-9 w-9 rounded-xl shrink-0 flex items-center justify-center bg-gradient-to-br", pkg.tone)}>
                        <Sparkles className="h-4 w-4 text-white/90" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-[12.5px] font-semibold text-[#111118] leading-tight">{pkg.name}</p>
                          <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded-full",
                            pkg.gender === "Male" ? "bg-blue-50 text-blue-600"
                            : pkg.gender === "Female" ? "bg-pink-50 text-pink-600"
                            : "bg-gray-100 text-gray-500"
                          )}>{pkg.gender}</span>
                        </div>
                        <p className="text-[10.5px] text-[#9a9a9a] mt-0.5 flex items-center gap-1">
                          <Clock className="h-3 w-3" /> {pkg.duration} min
                        </p>
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {pkg.includes.map(i => (
                            <span key={i} className="text-[9px] bg-[#f4f2ed] border border-black/[0.06] rounded-full px-1.5 py-0.5 text-[#6b6b6b]">{i}</span>
                          ))}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <span className="text-[12.5px] font-bold text-[#111118]">₹{pkg.price.toLocaleString("en-IN")}</span>
                        <div className={cn("h-6 w-6 rounded-full flex items-center justify-center transition-all",
                          sel ? "bg-[#D4AF37] text-[#111118]" : "bg-[#f4f2ed] text-[#c0c0c0]")}>
                          {sel ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : <Plus className="h-3.5 w-3.5" />}
                        </div>
                      </div>
                    </button>
                  );
                })}
                {filteredPackages.length > SERVICES_PAGE_SIZE && (
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <p className="text-[11px] font-medium text-[#9a9a9a]">
                      {catalogPageStart}–{catalogPageEnd} of {filteredPackages.length}
                    </p>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setServiceListPage((p) => Math.max(1, p - 1))}
                        disabled={catalogPrevDisabled}
                        aria-label="Previous packages page"
                        className={cn(
                          "flex h-7 w-7 items-center justify-center rounded-lg border text-[11px] transition-all",
                          catalogPrevDisabled
                            ? "cursor-not-allowed border-black/[0.06] bg-[#f4f2ed] text-[#c0c0c0]"
                            : "border-black/[0.1] bg-white text-[#111118] hover:border-[#D4AF37]/40",
                        )}
                      >
                        <ChevronLeft className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setServiceListPage((p) => p + 1)}
                        disabled={catalogNextDisabled}
                        aria-label="Next packages page"
                        className={cn(
                          "flex h-7 w-7 items-center justify-center rounded-lg border text-[11px] transition-all",
                          catalogNextDisabled
                            ? "cursor-not-allowed border-black/[0.06] bg-[#f4f2ed] text-[#c0c0c0]"
                            : "border-[#D4AF37]/30 bg-[#D4AF37]/10 text-[#111118] hover:border-[#D4AF37]/50",
                        )}
                      >
                        <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── Products list ── */}
            {serviceTab === "Products" && (
              <div className="space-y-2">
                {filteredProducts.length === 0 && (
                  <p className="text-center text-[12px] text-[#c0c0c0] italic py-6">No products found</p>
                )}
                {paginatedProducts.map(prod => {
                  const sel = selectedProducts.some(p => p.id === prod.id);
                  return (
                    <button key={prod.id} type="button"
                      onClick={() => setSelectedProducts(prev => {
                        const exists = prev.find(p => p.id === prod.id);
                        return exists ? prev.filter(p => p.id !== prod.id) : [...prev, { ...prod, qty: 1 }];
                      })}
                      className={cn(
                        "w-full flex items-center gap-3 rounded-xl border p-3 text-left transition-all duration-200",
                        sel ? "border-[#D4AF37]/40 bg-white shadow-[0_0_0_1.5px_rgba(212,175,55,0.15)]"
                           : "border-black/[0.07] bg-white hover:border-[#D4AF37]/20 hover:shadow-sm"
                      )}
                    >
                      <div className="h-9 w-9 rounded-xl shrink-0 flex items-center justify-center bg-gradient-to-br from-[#d4af37]/20 to-[#d4af37]/40 border border-[#d4af37]/30">
                        <Sparkles className="h-4 w-4 text-[#b8962e]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12.5px] font-semibold text-[#111118] leading-tight truncate">{prod.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-[#d4af37] font-semibold">{prod.category}</span>
                          <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded-full",
                            prod.stock < 15 ? "bg-red-50 text-red-500" : "bg-green-50 text-green-600"
                          )}>Stock: {prod.stock}</span>
                          <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded-full",
                            prod.gender === "Male" ? "bg-blue-50 text-blue-600"
                            : prod.gender === "Female" ? "bg-pink-50 text-pink-600"
                            : "bg-gray-100 text-gray-500"
                          )}>{prod.gender}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[12.5px] font-bold text-[#111118]">₹{prod.price.toLocaleString("en-IN")}</span>
                        <div className={cn("h-6 w-6 rounded-full flex items-center justify-center transition-all",
                          sel ? "bg-[#D4AF37] text-[#111118]" : "bg-[#f4f2ed] text-[#c0c0c0]")}>
                          {sel ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : <Plus className="h-3.5 w-3.5" />}
                        </div>
                      </div>
                    </button>
                  );
                })}
                {filteredProducts.length > SERVICES_PAGE_SIZE && (
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <p className="text-[11px] font-medium text-[#9a9a9a]">
                      {catalogPageStart}–{catalogPageEnd} of {filteredProducts.length}
                    </p>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setServiceListPage((p) => Math.max(1, p - 1))}
                        disabled={catalogPrevDisabled}
                        aria-label="Previous products page"
                        className={cn(
                          "flex h-7 w-7 items-center justify-center rounded-lg border text-[11px] transition-all",
                          catalogPrevDisabled
                            ? "cursor-not-allowed border-black/[0.06] bg-[#f4f2ed] text-[#c0c0c0]"
                            : "border-black/[0.1] bg-white text-[#111118] hover:border-[#D4AF37]/40",
                        )}
                      >
                        <ChevronLeft className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setServiceListPage((p) => p + 1)}
                        disabled={catalogNextDisabled}
                        aria-label="Next products page"
                        className={cn(
                          "flex h-7 w-7 items-center justify-center rounded-lg border text-[11px] transition-all",
                          catalogNextDisabled
                            ? "cursor-not-allowed border-black/[0.06] bg-[#f4f2ed] text-[#c0c0c0]"
                            : "border-[#D4AF37]/30 bg-[#D4AF37]/10 text-[#111118] hover:border-[#D4AF37]/50",
                        )}
                      >
                        <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Selected strip */}
            {totalSelectedCount > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                className="sticky bottom-0 rounded-xl bg-white border border-black/[0.07] px-3 py-2.5 shadow-lg"
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-5 w-5 rounded-full bg-[#D4AF37] text-[#111118] text-[9px] font-bold flex items-center justify-center">
                    {totalSelectedCount}
                  </div>
                  <span className="text-[11.5px] font-semibold text-[#111118]">selected</span>
                  {estimatedDuration > 0 && (
                    <span className="text-[10.5px] text-[#9a9a9a] flex items-center gap-1 ml-auto">
                      <Clock className="h-3 w-3 text-[#D4AF37]" /> ~{estimatedDuration} min
                    </span>
                  )}
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  {selectedServices.map(s => (
                    <button key={s.id} type="button"
                      onClick={() => setSelectedServices(prev => prev.filter(x => x.id !== s.id))}
                      className="flex items-center gap-1 bg-[#f4f2ed] border border-black/[0.06] rounded-full px-2 py-0.5 text-[10px] font-medium text-[#111118] hover:border-[#D4AF37]/30">
                      {s.name} <span className="text-[#9a9a9a] ml-0.5">✕</span>
                    </button>
                  ))}
                  {selectedPackages.map(p => (
                    <button key={p.id} type="button"
                      onClick={() => setSelectedPackages(prev => prev.filter(x => x.id !== p.id))}
                      className="flex items-center gap-1 bg-[#D4AF37]/10 border border-[#D4AF37]/30 rounded-full px-2 py-0.5 text-[10px] font-medium text-[#b8962e] hover:border-[#D4AF37]/50">
                      <Sparkles className="h-2.5 w-2.5" />{p.name} <span className="ml-0.5">✕</span>
                    </button>
                  ))}
                  {selectedProducts.map(p => (
                    <button key={p.id} type="button"
                      onClick={() => setSelectedProducts(prev => prev.filter(x => x.id !== p.id))}
                      className="flex items-center gap-1 bg-[#111118]/[0.06] border border-black/[0.1] rounded-full px-2 py-0.5 text-[10px] font-medium text-[#6b6b6b] hover:border-black/20">
                      {p.name} <span className="ml-0.5">✕</span>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </div>
        </div>
        )}

        {/* ── COL 3: CONFIRM ── */}
        {showStep(2) && (
        <div className={cn("responsive-panel flex flex-col bg-[#f4f2ed] overflow-hidden relative transition-all duration-300", !customerValid && "pointer-events-none select-none")}>
          {!customerValid && (
            <div className="absolute inset-0 z-10 bg-[#f4f2ed]/70 backdrop-blur-[1px] flex flex-col items-center justify-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-[#111118]/08 border border-[#111118]/10 flex items-center justify-center">
                <ClipboardCheck className="h-5 w-5 text-[#111118]/20" />
              </div>
              <p className="text-[12px] font-bold text-[#111118]/30">Fill in customer first</p>
            </div>
          )}
          <ColHeader num="03" icon={ClipboardCheck} title="Confirm" desc="Review & save the slot" />

          <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">

            {/* Customer card */}
            <div className={cn(
              "rounded-2xl border p-4",
              customerValid ? "border-[#D4AF37]/25 bg-white shadow-[0_2px_12px_rgba(212,175,55,0.07)]" : "border-black/[0.07] bg-white"
            )}>
              <p className="text-[9.5px] font-bold uppercase tracking-[0.15em] text-[#9a9a9a] mb-3 flex items-center gap-1.5">
                <User className="h-3 w-3 text-[#D4AF37]" /> Customer
              </p>
              {customerValid ? (
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#C9A227] text-[#111118] text-sm font-bold flex items-center justify-center shrink-0">
                    {initials(displayName)}
                  </div>
                  <div>
                    <p className="text-[13px] font-bold text-[#111118]">{displayName}</p>
                    {displayPhone && <p className="text-[11px] text-[#9a9a9a] mt-0.5">{displayPhone}</p>}
                  </div>
                  <div className="ml-auto px-2 py-1 rounded-full bg-[#f4f2ed] border border-black/[0.06]">
                    <p className="text-[10px] font-semibold text-[#9a9a9a]">{visitType}</p>
                  </div>
                </div>
              ) : (
                <p className="text-[12px] text-[#c0c0c0] italic">← Fill in customer details</p>
              )}
            </div>

            {/* Slot */}
            <div className="rounded-2xl border border-black/[0.07] bg-white p-4">
              <p className="text-[9.5px] font-bold uppercase tracking-[0.15em] text-[#9a9a9a] mb-3 flex items-center gap-1.5">
                <Calendar className="h-3 w-3 text-[#D4AF37]" /> Slot
              </p>
              {[
                { label: "Date",     v: dateFormatted || "—" },
                { label: "Time",     v: time || "—" },
                { label: "Duration", v: duration || "—" },
              ].map(({ label, v }) => (
                <div key={label} className="flex justify-between items-center py-1.5 border-b border-black/[0.04] last:border-0">
                  <span className="text-[10.5px] text-[#9a9a9a]">{label}</span>
                  <span className="text-[11.5px] font-semibold text-[#111118]">{v}</span>
                </div>
              ))}
            </div>

            {/* Services */}
            <div className="rounded-2xl border border-black/[0.07] bg-white p-4">
              <p className="text-[9.5px] font-bold uppercase tracking-[0.15em] text-[#9a9a9a] mb-3 flex items-center gap-1.5">
                <Scissors className="h-3 w-3 text-[#D4AF37]" /> Selection ({totalSelectedCount})
              </p>
              {totalSelectedCount === 0
                ? <p className="text-[12px] text-[#c0c0c0] italic">← Select services, packages or products</p>
                : <div className="space-y-2">
                    {selectedServices.map(s => (
                      <div key={s.id} className="flex items-center gap-2">
                        <div className={cn("h-5 w-5 rounded-md flex items-center justify-center bg-gradient-to-br shrink-0", s.tone ?? "from-[#9a9a9a] to-[#6b6b6b]")}>
                          <Scissors className="h-2.5 w-2.5 text-white/80" />
                        </div>
                        <span className="text-[11.5px] text-[#111118] flex-1 truncate">{s.name}</span>
                        <span className="text-[10px] text-[#9a9a9a] shrink-0">{s.duration}m</span>
                        <span className="text-[11px] font-bold text-[#111118]">₹{s.price.toLocaleString("en-IN")}</span>
                      </div>
                    ))}
                    {selectedPackages.map(p => (
                      <div key={p.id} className="flex items-center gap-2">
                        <div className={cn("h-5 w-5 rounded-md flex items-center justify-center bg-gradient-to-br shrink-0", p.tone)}>
                          <Sparkles className="h-2.5 w-2.5 text-white/80" />
                        </div>
                        <span className="text-[11.5px] text-[#111118] flex-1 truncate">{p.name}</span>
                        <span className="text-[10px] text-[#9a9a9a] shrink-0">{p.duration}m</span>
                        <span className="text-[11px] font-bold text-[#111118]">₹{p.price.toLocaleString("en-IN")}</span>
                      </div>
                    ))}
                    {selectedProducts.map(p => (
                      <div key={p.id} className="flex items-center gap-2">
                        <div className="h-5 w-5 rounded-md flex items-center justify-center bg-[#D4AF37]/20 shrink-0">
                          <Sparkles className="h-2.5 w-2.5 text-[#b8962e]" />
                        </div>
                        <span className="text-[11.5px] text-[#111118] flex-1 truncate">{p.name}</span>
                        <span className="text-[10px] text-[#9a9a9a] shrink-0">{p.category}</span>
                        <span className="text-[11px] font-bold text-[#111118]">₹{p.price.toLocaleString("en-IN")}</span>
                      </div>
                    ))}
                    {estimatedDuration > 0 && (
                      <div className="pt-2 border-t border-black/[0.04] flex justify-between">
                        <span className="text-[10px] text-[#9a9a9a]">Est. duration</span>
                        <span className="text-[11px] font-bold text-[#111118] flex items-center gap-1">
                          <Clock className="h-3 w-3 text-[#D4AF37]" /> ~{estimatedDuration} min
                        </span>
                      </div>
                    )}
                  </div>
              }
            </div>

            {/* Notes */}
            {notes && (
              <div className="rounded-2xl border border-black/[0.07] bg-white p-4">
                <p className="text-[9.5px] font-bold uppercase tracking-[0.15em] text-[#9a9a9a] mb-2 flex items-center gap-1.5">
                  <StickyNote className="h-3 w-3 text-[#D4AF37]" /> Notes
                </p>
                <p className="text-[12px] text-[#6b6b6b] leading-relaxed">{notes}</p>
              </div>
            )}


            {/* Save / Bill */}
            {isWalkInPage ? (
              <div className="grid grid-cols-2 gap-2.5">
                <Button
                  onClick={() => { void handleSave(); }}
                  disabled={!canSave || saving}
                  variant="outline"
                  className="h-12 rounded-2xl border-[#D4AF37]/45 text-[#111118] font-bold text-[13px] gap-2 disabled:opacity-30"
                >
                  <CalendarCheck2 className="h-4 w-4" />
                  {saving ? "Saving…" : "Save Walk-In"}
                </Button>
                <Button
                  onClick={() => { void handleBill(); }}
                  disabled={!canSave || saving}
                  className="h-12 rounded-2xl bg-gradient-to-r from-[#D4AF37] to-[#C9A227] text-[#111118] font-bold text-[13px] gap-2 disabled:opacity-30 shadow-lg shadow-[#D4AF37]/20"
                >
                  <Receipt className="h-4 w-4" />
                  {saving ? "Opening…" : "Bill"}
                </Button>
              </div>
            ) : (
              <Button
                onClick={() => { void handleSave(); }}
                disabled={!canSave || saving}
                className="w-full h-12 rounded-2xl bg-gradient-to-r from-[#D4AF37] to-[#C9A227] text-[#111118] font-bold text-[14px] gap-2 disabled:opacity-30 shadow-lg shadow-[#D4AF37]/20 hover:shadow-[#D4AF37]/30 transition-all"
              >
                <CalendarCheck2 className="h-4 w-4" />
                {saving ? "Saving…" : "Create Appointment"}
              </Button>
            )}

            {!canSave && (
              <p className="text-center text-[11px] text-[#9a9a9a] -mt-2">
                {!customerValid
                  ? "← Add a customer to continue"
                  : "← Select at least one service"}
              </p>
            )}

            {/* Cancel */}
            <Button variant="outline" onClick={() => navigate(-1)}
              className="w-full h-10 rounded-xl border-black/[0.1] text-[#9a9a9a] font-medium text-[13px]">
              Cancel
            </Button>
          </div>
        </div>
        )}

      </div>

      {/* Step navigation — tablet/phone only */}
      {!isDesktop && (
        <div className="shrink-0 flex items-center gap-2 border-t border-black/[0.06] bg-white px-4 py-3">
          <Button
            variant="outline"
            disabled={activeStep === 0}
            onClick={() => setWizardStep(Math.max(0, activeStep - 1))}
            className="h-12 rounded-2xl border-black/[0.1] px-4 text-[13px] font-semibold disabled:opacity-30"
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </Button>
          {activeStep < 2 ? (
            <Button
              disabled={!stepValid[activeStep]}
              onClick={() => setWizardStep(activeStep + 1)}
              className="h-12 flex-1 gap-2 rounded-2xl bg-[#111118] text-[13px] font-bold text-[#D4AF37] shadow-lg hover:bg-[#1e1e1e] disabled:opacity-30"
            >
              {activeStep === 0 ? "Continue to services" : "Continue to confirm"}
              <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <p className="flex-1 text-center text-[11.5px] font-medium text-[#9a9a9a]">
              Review the summary above, then save
            </p>
          )}
        </div>
      )}
    </div>
  );
}
