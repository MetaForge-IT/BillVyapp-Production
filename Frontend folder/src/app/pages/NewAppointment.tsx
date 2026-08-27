import { useMemo, useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { toast } from "../components/ui/hot-toast";
import { Zap, Sparkles, CalendarCheck2 } from "lucide-react";
import { AppointmentStepper } from "./appointments/AppointmentStepper";
import { bookingAppointmentSteps } from "./appointments/appointmentData";
import { cn } from "../components/ui/utils";
import { useAppointments } from "../context/AppointmentContext";
import { useServiceProducts } from "../context/ServiceProductsContext";
import { useProducts } from "../context/ProductsContext";
import { useCustomersQuery } from "../hooks/useCustomersQuery";
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
import type {
  AppointmentCustomer,
  AppointmentService,
  AppointmentType,
  AppointmentPackage,
  AppointmentProduct,
} from "./appointments/appointmentData";
import {
  SERVICES_PAGE_SIZE,
  NEW_APPOINTMENT_DRAFT_KEY,
  NEW_WALK_IN_DRAFT_KEY,
  createDefaultAppointmentDraft,
  type BookingMode,
  type SelectedService,
  type SelectedPackage,
  type SelectedProduct,
  type ServiceTab,
  type ProductOverride,
} from "./appointments/newAppointmentDraft";
import { mapCustomerTier } from "./appointments/newAppointmentUi";
import { BookingSuccessScreen } from "./appointments/BookingSuccessScreen";
import { BookingCustomerColumn } from "./appointments/BookingCustomerColumn";
import { BookingServicesColumn } from "./appointments/BookingServicesColumn";
import { BookingConfirmColumn } from "./appointments/BookingConfirmColumn";
import { BookingStepNav } from "./appointments/BookingStepNav";

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
  const openAsWalkIn = isWalkInPage;
  const [draft] = useState(() => {
    const base = prefillsFromCrm
      ? createDefaultAppointmentDraft(isWalkInPage ? "walk-in" : "appointment")
      : readFormDraft(draftKey, createDefaultAppointmentDraft(isWalkInPage ? "walk-in" : "appointment"));
    return openAsWalkIn
      ? { ...base, visitType: "Walk-in" as const }
      : { ...base, visitType: "Appointment" as const };
  });
  const { customers: customerRows, error: customersError } = useCustomersQuery();
  const appointmentCustomers = useMemo<AppointmentCustomer[]>(
    () =>
      customerRows.map((c) => ({
        id: c.id,
        name: c.name,
        phone: c.phone,
        email: c.email,
        tier: mapCustomerTier(c.membershipTier),
        gender:
          c.gender === "male"
            ? ("Male" as const)
            : c.gender === "female"
              ? ("Female" as const)
              : c.gender === "other"
                ? ("Other" as const)
                : undefined,
      })),
    [customerRows],
  );
  const [catalogServices, setCatalogServices] = useState<AppointmentService[]>([]);
  const [loadedPackages, setLoadedPackages] = useState<AppointmentPackage[]>([]);

  useEffect(() => {
    if (customersError) toast.error(getApiErrorMessage(customersError, "Failed to load customers"));
  }, [customersError]);

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

  const crmPrefillApplied = useRef(false);
  useEffect(() => {
    if (crmPrefillApplied.current) return;
    const customerId = searchParams.get("customerId");
    const name = searchParams.get("name");
    const phone = searchParams.get("phone");
    if (!customerId && !name) return;

    if (customerId && appointmentCustomers.length === 0) return;

    const isWalkIn = isWalkInPage;
    const matched =
      (customerId ? appointmentCustomers.find((c) => c.id === customerId) : undefined) ??
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

  const [customerSearch, setCustomerSearch] = useState(draft.customerSearch);
  const [selectedCustomer, setSelectedCustomer] = useState<AppointmentCustomer | null>(
    draft.selectedCustomer,
  );
  const [visitType, setVisitType] = useState<AppointmentType>(
    isWalkInPage ? "Walk-in" : "Appointment",
  );
  const [walkInName, setWalkInName] = useState(draft.walkInName);
  const [walkInPhone, setWalkInPhone] = useState(draft.walkInPhone);
  const [walkInGender, setWalkInGender] = useState<"Male" | "Female" | "Other" | "">(
    draft.walkInGender,
  );
  const [walkInMode, setWalkInMode] = useState<"new" | "search">(draft.walkInMode);
  const [walkInSearch, setWalkInSearch] = useState(draft.walkInSearch);
  const [apptNewMode, setApptNewMode] = useState(draft.apptNewMode);
  const [newCustName, setNewCustName] = useState(draft.newCustName);
  const [newCustPhone, setNewCustPhone] = useState(draft.newCustPhone);
  const [newCustGender, setNewCustGender] = useState<"Male" | "Female" | "Other" | "">(
    draft.newCustGender,
  );
  const [date, setDate] = useState(draft.date);
  const [time, setTime] = useState(draft.time);
  const [duration, setDuration] = useState(draft.duration);
  const [notes, setNotes] = useState(draft.notes);

  const isReturningCustomer =
    visitType === "Walk-in" ? walkInMode === "search" : !apptNewMode;
  const slotCustomerKind = isReturningCustomer ? "returning" : "new";
  const slotMinDate = getAppointmentSlotMinDate(slotCustomerKind);

  useEffect(() => {
    if (date && !isAppointmentSlotDateAllowed(date, slotCustomerKind)) {
      setDate(slotMinDate);
    }
  }, [slotCustomerKind, date, slotMinDate]);

  const [serviceListPage, setServiceListPage] = useState(1);
  const [serviceTab, setServiceTab] = useState<ServiceTab>(draft.serviceTab);
  const [serviceSearch, setServiceSearch] = useState(draft.serviceSearch);
  const [serviceSearchInput, setServiceSearchInput] = useState(draft.serviceSearch);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const timer = window.setTimeout(() => setServiceSearch(serviceSearchInput), 300);
    return () => window.clearTimeout(timer);
  }, [serviceSearchInput]);
  const [selectedServices, setSelectedServices] = useState<SelectedService[]>(draft.selectedServices);
  const [selectedPackages, setSelectedPackages] = useState<SelectedPackage[]>(draft.selectedPackages);
  const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>(draft.selectedProducts);

  const { getLinks } = useServiceProducts();
  const { products: inventoryProducts } = useProducts();
  const [productOverrides, setProductOverrides] = useState<Record<string, ProductOverride[]>>(
    draft.productOverrides,
  );
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
    draftKey,
  ]);

  function initOverridesForService(service: AppointmentService) {
    const links = getLinks(service.id);
    if (links.length === 0) return;
    setProductOverrides((prev) => ({
      ...prev,
      [service.id]: links.map((l) => ({
        sku: l.sku,
        name: l.name,
        qty: l.defaultQty,
        unit: l.unit,
        defaultQty: l.defaultQty,
      })),
    }));
  }

  function updateOverrideQty(serviceId: string, sku: string, qty: number) {
    setProductOverrides((prev) => ({
      ...prev,
      [serviceId]: (prev[serviceId] ?? []).map((o) => (o.sku === sku ? { ...o, qty } : o)),
    }));
  }

  function stockStatus(sku: string) {
    return inventoryProducts.find((p) => p.sku === sku)?.status ?? "ok";
  }

  function stockOf(sku: string) {
    return inventoryProducts.find((p) => p.sku === sku)?.stock ?? 0;
  }

  const filteredCustomers = useMemo(
    () =>
      appointmentCustomers.filter(
        (c) =>
          c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
          c.phone.includes(customerSearch),
      ),
    [customerSearch],
  );

  const customerGenderForServices: "Male" | "Female" | "Other" | "" =
    visitType === "Walk-in"
      ? walkInMode === "new"
        ? walkInGender
        : (selectedCustomer?.gender ?? "")
      : apptNewMode
        ? newCustGender
        : (selectedCustomer?.gender ?? "");

  const visibleServiceTabs = useMemo((): ServiceTab[] => {
    const extras: ServiceTab[] = ["Packages", "Products"];
    if (customerGenderForServices === "Male") return ["Male", "Others", ...extras];
    if (customerGenderForServices === "Female") return ["Female", "Others", ...extras];
    if (customerGenderForServices === "Other") return ["Others", ...extras];
    return ["Male", "Female", "Others", ...extras];
  }, [customerGenderForServices]);

  useEffect(() => {
    if (!visibleServiceTabs.includes(serviceTab)) {
      setServiceTab(visibleServiceTabs[0] ?? "Others");
      setServiceListPage(1);
    }
  }, [visibleServiceTabs, serviceTab]);

  useEffect(() => {
    if (!customerGenderForServices) return;
    setSelectedServices((prev) =>
      prev.filter((s) => {
        if (customerGenderForServices === "Male")
          return s.category === "Male" || s.category === "Others";
        if (customerGenderForServices === "Female")
          return s.category === "Female" || s.category === "Others";
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
      return (
        q === "" ||
        p.name.toLowerCase().includes(q) ||
        p.includes.some((i) => i.toLowerCase().includes(q))
      );
    });
  }, [serviceTab, serviceSearch, loadedPackages, customerGenderForServices]);

  const filteredProducts = useMemo(() => {
    const q = serviceSearch.toLowerCase();
    if (serviceTab !== "Products") return [];
    return inventoryProducts
      .filter((product) => product.activeStatus !== "inactive")
      .filter(
        (product) =>
          q === "" ||
          product.name.toLowerCase().includes(q) ||
          product.category.toLowerCase().includes(q),
      )
      .map(
        (product): AppointmentProduct => ({
          id: product.id,
          name: product.name,
          price: parseInr(product.price),
          category: product.category,
          usedIn: "",
          stock: product.stock,
          gender: "All",
        }),
      );
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

  const catalogPageStart =
    catalogListTotal === 0 ? 0 : (serviceListPage - 1) * SERVICES_PAGE_SIZE + 1;
  const catalogPageEnd = Math.min(serviceListPage * SERVICES_PAGE_SIZE, catalogListTotal);
  const catalogPrevDisabled = serviceListPage === 1;
  const catalogNextDisabled = serviceListPage * SERVICES_PAGE_SIZE >= catalogListTotal;

  const effectiveWalkInName =
    walkInMode === "new" ? walkInName : (selectedCustomer?.name ?? "");
  const effectiveWalkInPhone =
    walkInMode === "new" ? walkInPhone : (selectedCustomer?.phone ?? "");
  const effectiveApptName = apptNewMode ? newCustName : (selectedCustomer?.name ?? "");
  const effectiveApptPhone = apptNewMode ? newCustPhone : (selectedCustomer?.phone ?? "");

  const displayName = visitType === "Walk-in" ? effectiveWalkInName : effectiveApptName;
  const displayPhone = visitType === "Walk-in" ? effectiveWalkInPhone : effectiveApptPhone;

  const totalSelectedCount =
    selectedServices.length + selectedPackages.length + selectedProducts.length;
  const estimatedDuration =
    selectedServices.reduce((sum, s) => sum + s.duration * s.qty, 0) +
    selectedPackages.reduce((sum, p) => sum + p.duration * p.qty, 0);
  const dateFormatted = date
    ? new Date(date).toLocaleDateString("en-IN", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "";

  const customerValid =
    visitType === "Walk-in"
      ? effectiveWalkInName.trim().length > 0
      : apptNewMode
        ? newCustName.trim().length > 0
        : !!selectedCustomer;
  const servicesValid = totalSelectedCount > 0;
  const canSave = customerValid && servicesValid;

  const stepValid = [customerValid, servicesValid, canSave];
  const currentStep = !customerValid ? 0 : !servicesValid ? 1 : 2;

  const { isDesktop } = useBreakpoint();
  const [wizardStep, setWizardStep] = useState(0);
  const furthestStep = !customerValid ? 0 : !servicesValid ? 1 : 2;
  const activeStep = Math.min(wizardStep, furthestStep);
  const showStep = (index: number) => isDesktop || activeStep === index;

  useEffect(() => {
    setWizardStep((prev) => Math.min(prev, furthestStep));
  }, [furthestStep]);

  const filteredWalkIn = useMemo(
    () =>
      walkInSearch.trim().length > 0
        ? appointmentCustomers.filter(
            (c) =>
              c.name.toLowerCase().includes(walkInSearch.toLowerCase()) ||
              c.phone.includes(walkInSearch),
          )
        : [],
    [walkInSearch],
  );

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
    ]
      .filter(Boolean)
      .join("; ");

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
      toast.error(
        getApiErrorMessage(err, isWalkInPage ? "Failed to save walk-in" : "Failed to save appointment"),
      );
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

  function handleSuccessReset() {
    setSaved(false);
    setSavedAppointmentId(null);
    setSelectedCustomer(null);
    setSelectedServices([]);
    setWalkInName("");
    setWalkInPhone("");
    if (isWalkInPage) {
      setSelectedPackages([]);
      setSelectedProducts([]);
      setWalkInGender("");
      setWalkInSearch("");
      setWalkInMode("search");
    }
  }

  if (saved) {
    return (
      <BookingSuccessScreen
        isWalkInPage={isWalkInPage}
        displayName={displayName}
        dateFormatted={dateFormatted}
        time={time}
        selectedServices={selectedServices}
        estimatedDuration={estimatedDuration}
        onReset={handleSuccessReset}
      />
    );
  }

  return (
    <div
      className={cn(
        "-mx-4 -my-4 flex flex-col overflow-hidden sm:-mx-6 sm:-my-5 lg:-mx-10 lg:-my-6",
        isDesktop
          ? "min-h-[calc(100dvh-3.5rem)]"
          : "h-[calc(100dvh-6rem)] sm:h-[calc(100dvh-5.5rem)]",
      )}
    >
      <div className="shrink-0 border-b border-black/[0.06] bg-white px-4 py-4 sm:px-6 lg:px-8">
        <div className="mb-4 flex items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#D4AF37]/20 bg-[#D4AF37]/12">
            {isWalkInPage ? (
              <Zap className="h-4 w-4 text-[#D4AF37]" />
            ) : (
              <CalendarCheck2 className="h-4 w-4 text-[#D4AF37]" />
            )}
          </div>
          <div>
            <p className="text-[15px] font-bold leading-tight text-[#111118]">
              {isWalkInPage ? "New Walk-In" : "Create Appointment"}
            </p>
            <p className="mt-0.5 flex items-center gap-1 text-[10.5px] text-[#52525b]">
              <Sparkles className="h-2.5 w-2.5 text-[#D4AF37]" />
              {isWalkInPage ? "Quick check-in" : "Scheduled booking"}
            </p>
          </div>
        </div>
        <AppointmentStepper
          steps={bookingAppointmentSteps}
          currentStep={isDesktop ? currentStep : activeStep}
          stepValid={stepValid}
          onStepClick={(index) => {
            if (!isDesktop) setWizardStep(index);
          }}
        />
      </div>

      <div className={cn("responsive-panels", !isDesktop && "responsive-panels--wizard")}>
        {showStep(0) && (
          <BookingCustomerColumn
            isWalkInPage={isWalkInPage}
            apptNewMode={apptNewMode}
            setApptNewMode={setApptNewMode}
            newCustName={newCustName}
            setNewCustName={setNewCustName}
            newCustPhone={newCustPhone}
            setNewCustPhone={setNewCustPhone}
            newCustGender={newCustGender}
            setNewCustGender={setNewCustGender}
            customerSearch={customerSearch}
            setCustomerSearch={setCustomerSearch}
            selectedCustomer={selectedCustomer}
            setSelectedCustomer={setSelectedCustomer}
            filteredCustomers={filteredCustomers}
            walkInMode={walkInMode}
            setWalkInMode={setWalkInMode}
            walkInSearch={walkInSearch}
            setWalkInSearch={setWalkInSearch}
            walkInName={walkInName}
            setWalkInName={setWalkInName}
            walkInPhone={walkInPhone}
            setWalkInPhone={setWalkInPhone}
            walkInGender={walkInGender}
            setWalkInGender={setWalkInGender}
            filteredWalkIn={filteredWalkIn}
            date={date}
            setDate={setDate}
            time={time}
            setTime={setTime}
            duration={duration}
            setDuration={setDuration}
            notes={notes}
            setNotes={setNotes}
            slotMinDate={slotMinDate}
            slotCustomerKind={slotCustomerKind}
            setServiceTab={setServiceTab}
            setServiceListPage={setServiceListPage}
          />
        )}

        {showStep(1) && (
          <BookingServicesColumn
            customerValid={customerValid}
            visibleServiceTabs={visibleServiceTabs}
            serviceTab={serviceTab}
            setServiceTab={setServiceTab}
            serviceSearchInput={serviceSearchInput}
            setServiceSearchInput={setServiceSearchInput}
            setServiceSearch={setServiceSearch}
            setServiceListPage={setServiceListPage}
            filteredServices={filteredServices}
            useGroupedServiceList={useGroupedServiceList}
            paginatedGroupSections={paginatedGroupSections}
            paginatedServices={paginatedServices}
            expandedGroups={expandedGroups}
            setExpandedGroups={setExpandedGroups}
            selectedServices={selectedServices}
            setSelectedServices={setSelectedServices}
            selectedPackages={selectedPackages}
            setSelectedPackages={setSelectedPackages}
            selectedProducts={selectedProducts}
            setSelectedProducts={setSelectedProducts}
            filteredPackages={filteredPackages}
            paginatedPackages={paginatedPackages}
            filteredProducts={filteredProducts}
            paginatedProducts={paginatedProducts}
            catalogListTotal={catalogListTotal}
            catalogPageStart={catalogPageStart}
            catalogPageEnd={catalogPageEnd}
            catalogPrevDisabled={catalogPrevDisabled}
            catalogNextDisabled={catalogNextDisabled}
            productOverrides={productOverrides}
            setProductOverrides={setProductOverrides}
            expandedServiceId={expandedServiceId}
            setExpandedServiceId={setExpandedServiceId}
            initOverridesForService={initOverridesForService}
            updateOverrideQty={updateOverrideQty}
            stockOf={stockOf}
            stockStatus={stockStatus}
            totalSelectedCount={totalSelectedCount}
            estimatedDuration={estimatedDuration}
          />
        )}

        {showStep(2) && (
          <BookingConfirmColumn
            customerValid={customerValid}
            displayName={displayName}
            displayPhone={displayPhone}
            visitType={visitType}
            dateFormatted={dateFormatted}
            time={time}
            duration={duration}
            notes={notes}
            totalSelectedCount={totalSelectedCount}
            selectedServices={selectedServices}
            selectedPackages={selectedPackages}
            selectedProducts={selectedProducts}
            estimatedDuration={estimatedDuration}
            isWalkInPage={isWalkInPage}
            canSave={canSave}
            saving={saving}
            onSave={() => {
              void handleSave();
            }}
            onBill={() => {
              void handleBill();
            }}
          />
        )}
      </div>

      {!isDesktop && (
        <BookingStepNav
          activeStep={activeStep}
          stepValid={stepValid}
          onBack={() => setWizardStep(Math.max(0, activeStep - 1))}
          onContinue={() => setWizardStep(activeStep + 1)}
        />
      )}
    </div>
  );
}
