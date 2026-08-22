import { useCallback, useEffect, useMemo, useState } from "react";
import { Zap } from "lucide-react";
import { toast } from "../../components/ui/hot-toast";
import { cn } from "../../components/ui/utils";
import { AppointmentStepper } from "../appointments/AppointmentStepper";
import { walkInBillingSteps, type AppointmentService } from "../appointments/appointmentData";
import { useBreakpoint } from "../../hooks/useBreakpoint";
import { useAppointments } from "../../context/AppointmentContext";
import { useSettings } from "../../context/SettingsContext";
import { useCoupons } from "../../context/CouponsContext";
import { fetchServiceCatalog } from "../../../api/services";
import { createCustomer, searchCustomersByPhone, type Customer } from "../../../api/customers";
import { completeCheckout, confirmOnlyCheckout } from "../../../api/billing";
import { usePendingPayments } from "../../context/PendingPaymentsContext";
import { mapApiCatalog, mapToAppointmentService } from "../../../lib/serviceCatalog";
import { getApiErrorMessage } from "../../../lib/api";
import { toLocalDateKey } from "../../../lib/appointmentSlotDate";
import {
  buildBillingPayments,
  createPaymentMethodValue,
  isPaymentMethodValid,
  paymentMethodLabel,
  type PaymentMethodValue,
} from "../../components/shared/PaymentMethodPicker";
import { triggerConfetti } from "../../components/ui/success-animation";
import { BillStep } from "./BillStep";
import { CustomerStep } from "./CustomerStep";
import {
  PaymentResultDialog,
  type ReceiptStep,
  type WalkInReceiptData,
} from "./PaymentResultDialog";
import { ServicesStep } from "./ServicesStep";
import { WizardFooter } from "./WizardFooter";
import {
  NO_DISCOUNT_TOOLS,
  type CouponApplied,
  type CustomerGender,
  type DiscountTool,
  type LookupStatus,
  type SelectedService,
} from "./types";
import { validateIndianMobile } from "../../../lib/mobileNumber";
import { last10, mapTier } from "./utils";

export function WalkInBilling() {
  const { addAppointment, applyLocalStatus, refresh: refreshAppointments } = useAppointments();
  const { settings } = useSettings();
  const { coupons } = useCoupons();
  const { refresh: refreshPending } = usePendingPayments();
  const { isDesktop } = useBreakpoint();

  const [catalog, setCatalog] = useState<AppointmentService[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [serviceSearch, setServiceSearch] = useState("");
  const [selectedServices, setSelectedServices] = useState<SelectedService[]>([]);

  const [phoneDigits, setPhoneDigits] = useState("");
  const [debouncedPhone, setDebouncedPhone] = useState("");
  const [lookupStatus, setLookupStatus] = useState<LookupStatus>("idle");
  const [phoneMatches, setPhoneMatches] = useState<Customer[]>([]);
  const [customerId, setCustomerId] = useState<string | undefined>();
  const [customerName, setCustomerName] = useState("");
  const [customerGender, setCustomerGender] = useState<CustomerGender>("");
  const [customerTier, setCustomerTier] = useState("Regular");
  const [stylistName, setStylistName] = useState("");

  const [gstEnabled, setGstEnabled] = useState(false);
  const [gstRate, setGstRate] = useState(18);
  const [customTaxMode, setCustomTaxMode] = useState(false);
  const [customTaxInput, setCustomTaxInput] = useState("");
  const [discountTools, setDiscountTools] = useState<Record<DiscountTool, boolean>>(NO_DISCOUNT_TOOLS);
  const [couponInput, setCouponInput] = useState("");
  const [couponApplied, setCouponApplied] = useState<CouponApplied | null>(null);
  const [loyaltyAvailable, setLoyaltyAvailable] = useState(0);
  const [loyaltyRedeem, setLoyaltyRedeem] = useState(0);
  const [discountMode, setDiscountMode] = useState<"pct" | "flat">("flat");
  const [discountPct, setDiscountPct] = useState(0);
  const [discountFlat, setDiscountFlat] = useState(0);
  const [discountReason, setDiscountReason] = useState("");
  const [payMethod, setPayMethod] = useState<PaymentMethodValue>(() =>
    createPaymentMethodValue({ method: "cash" }),
  );
  const [submitting, setSubmitting] = useState(false);
  const [scanFocus, setScanFocus] = useState(false);
  const [wizardStep, setWizardStep] = useState(0);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [receiptStep, setReceiptStep] = useState<ReceiptStep>("success");
  const [receiptData, setReceiptData] = useState<WalkInReceiptData | null>(null);

  useEffect(() => {
    setCatalogLoading(true);
    fetchServiceCatalog()
      .then((rows) => setCatalog(mapApiCatalog(rows).map(mapToAppointmentService)))
      .catch((err) => {
        setCatalog([]);
        toast.error(getApiErrorMessage(err, "Failed to load services"));
      })
      .finally(() => setCatalogLoading(false));
  }, []);

  useEffect(() => {
    const fin = settings?.financial;
    if (!fin) return;
    setGstRate(fin.gstRate ?? 18);
  }, [settings?.financial]);

  const searchResults = useMemo(() => {
    const q = serviceSearch.trim().toLowerCase();
    if (!q) return [];
    return catalog
      .filter((s) => {
        const hay = `${s.displayName ?? ""} ${s.name} ${s.categoryLabel ?? ""} ${s.serviceGroup ?? ""}`.toLowerCase();
        return hay.includes(q);
      })
      .slice(0, 24);
  }, [catalog, serviceSearch]);

  const addOrBumpService = useCallback((svc: AppointmentService) => {
    setSelectedServices((prev) => {
      const exists = prev.find((s) => s.id === svc.id);
      if (exists) return prev.map((s) => (s.id === svc.id ? { ...s, qty: s.qty + 1 } : s));
      return [...prev, { ...svc, qty: 1 }];
    });
  }, []);

  const isSelected = (id: string) => selectedServices.some((s) => s.id === id);
  const selectedQty = (id: string) => selectedServices.find((s) => s.id === id)?.qty ?? 0;

  const bumpQty = (id: string, delta: number) => {
    setSelectedServices((prev) =>
      prev
        .map((s) => (s.id === id ? { ...s, qty: Math.max(0, s.qty + delta) } : s))
        .filter((s) => s.qty > 0),
    );
  };

  const phoneValidation = useMemo(() => {
    const digits = last10(phoneDigits);
    if (digits.length < 10) {
      return { ready: false as const, error: null as string | null, phone: digits };
    }
    const result = validateIndianMobile(digits);
    if (!result.ok) {
      return { ready: false as const, error: result.error, phone: digits };
    }
    return { ready: true as const, error: null as string | null, phone: result.phone };
  }, [phoneDigits]);

  // Debounce phone input — search after manager stops typing (~450ms)
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedPhone(last10(phoneDigits));
    }, 450);
    return () => window.clearTimeout(timer);
  }, [phoneDigits]);

  const applyFoundCustomer = useCallback((found: Customer) => {
    setCustomerId(found.id);
    setCustomerName(found.name);
    setCustomerTier(mapTier(found.membershipTier));
    setLoyaltyAvailable(found.loyaltyPoints ?? 0);
    setLoyaltyRedeem(0);
    const g =
      found.gender === "male" ? "Male" : found.gender === "female" ? "Female" : "Other";
    setCustomerGender(g);
    const phone = last10(found.phone);
    if (phone) setPhoneDigits(phone);
    setPhoneMatches([]);
    setLookupStatus("found");
  }, []);

  const clearFoundCustomer = useCallback(() => {
    setCustomerId(undefined);
    setCustomerName("");
    setCustomerGender("");
    setCustomerTier("Regular");
    setLoyaltyAvailable(0);
    setLoyaltyRedeem(0);
  }, []);

  useEffect(() => {
    const digits = debouncedPhone;
    if (digits.length < 4) {
      setLookupStatus("idle");
      setPhoneMatches([]);
      clearFoundCustomer();
      return;
    }

    let cancelled = false;
    setLookupStatus("loading");

    void searchCustomersByPhone(digits)
      .then((matches) => {
        if (cancelled) return;
        setPhoneMatches(matches);

        if (digits.length >= 10) {
          const exact =
            matches.find((c) => last10(c.phone) === digits) ??
            (matches.length === 1 ? matches[0] : undefined);
          if (exact) {
            applyFoundCustomer(exact);
            return;
          }
          clearFoundCustomer();
          setLookupStatus("new");
          setPhoneMatches([]);
          return;
        }

        // Partial digits — keep suggestion list visible for the manager to pick
        setLookupStatus("idle");
      })
      .catch(() => {
        if (cancelled) return;
        setPhoneMatches([]);
        if (digits.length >= 10) {
          clearFoundCustomer();
          setLookupStatus("new");
        } else {
          setLookupStatus("idle");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedPhone, applyFoundCustomer, clearFoundCustomer]);

  const selectPhoneMatch = (customer: Customer) => {
    applyFoundCustomer(customer);
  };
  const servicesValid = selectedServices.length > 0;
  const customerValid =
    phoneValidation.ready &&
    customerName.trim().length > 0 &&
    (lookupStatus === "found" || lookupStatus === "new");
  const billValid = servicesValid && customerValid;
  const stepValid = [servicesValid, customerValid, billValid];
  const furthestStep = !servicesValid ? 0 : !customerValid ? 1 : 2;
  const activeStep = Math.min(wizardStep, furthestStep);
  const showStep = (index: number) => isDesktop || activeStep === index;

  useEffect(() => {
    setWizardStep((prev) => Math.min(prev, furthestStep));
  }, [furthestStep]);

  const subtotal = selectedServices.reduce((sum, s) => sum + s.price * s.qty, 0);
  const billCouponDisc = couponApplied
    ? couponApplied.type === "%"
      ? Math.round((subtotal * couponApplied.value) / 100)
      : couponApplied.value
    : 0;
  const billLoyalty = Math.min(loyaltyRedeem * 0.5, Math.max(0, subtotal - billCouponDisc));
  const discount =
    discountMode === "pct"
      ? Math.round((subtotal * discountPct) / 100)
      : Math.min(Math.round(discountFlat), subtotal);
  const afterDiscount = Math.max(0, subtotal - billCouponDisc - billLoyalty - discount);
  const gstAmount = gstEnabled ? Math.round((afterDiscount * gstRate) / 100) : 0;
  const total = Math.max(0, Math.round(afterDiscount + gstAmount));
  const estimatedDuration = selectedServices.reduce((sum, s) => sum + s.duration * s.qty, 0);
  const scanToPayFocus = payMethod.method === "upi" && scanFocus;

  function applyCouponCode() {
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
  }

  async function ensureCustomerId(): Promise<string | undefined> {
    if (customerId) return customerId;
    const validated = validateIndianMobile(phoneDigits);
    if (!validated.ok) {
      toast.error(validated.error);
      throw new Error(validated.error);
    }
    const gender =
      customerGender === "Male" ? "male" : customerGender === "Female" ? "female" : "other";
    const created = await createCustomer({
      fullName: customerName.trim(),
      phone: validated.phone,
      gender,
      source: "walk-in",
    });
    setCustomerId(created.id);
    setLookupStatus("found");
    setCustomerTier(mapTier(created.membershipTier));
    return created.id;
  }

  async function createWalkInAppointment(resolvedCustomerId?: string) {
    const now = new Date();
    // Local calendar date + local clock — never mix UTC date (toISOString) with local time.
    const scheduledDate = toLocalDateKey(now);
    const scheduledTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:00`;
    return addAppointment({
      customerId: resolvedCustomerId,
      customerName: customerName.trim(),
      customerPhone: last10(phoneDigits),
      appointmentType: "walk-in",
      scheduledDate,
      scheduledTime,
      durationMinutes: estimatedDuration || 30,
      staffName: stylistName.trim() || undefined,
      services: selectedServices.flatMap((s) =>
        Array.from({ length: s.qty }, () => ({
          serviceId: s.id,
          itemName: s.displayName || s.name,
          price: s.price,
          durationMinutes: s.duration,
        })),
      ),
    });
  }

  function buildCheckoutPayload(appointmentId: string, resolvedCustomerId?: string) {
    const due = new Date();
    due.setDate(due.getDate() + 7);
    return {
      customerId: resolvedCustomerId,
      customerName: customerName.trim(),
      customerPhone: last10(phoneDigits),
      appointmentId,
      source: "walk-in" as const,
      items: selectedServices.map((s) => ({
        lineType: "service" as const,
        serviceId: s.id,
        itemName: s.displayName || s.name,
        quantity: s.qty,
        unitPrice: s.price,
      })),
      subtotal,
      discountAmount: billLoyalty > 0 ? billLoyalty : undefined,
      couponDiscount: billCouponDisc > 0 ? billCouponDisc : undefined,
      couponCode: billCouponDisc > 0 ? couponApplied?.code : undefined,
      manualDiscountAmount: discount > 0 ? discount : undefined,
      manualDiscountReason: discount > 0 ? discountReason.trim() || "Walk-in discount" : undefined,
      gstRate: gstEnabled ? gstRate : 0,
      gstAmount,
      totalAmount: total,
      dueDate: toLocalDateKey(due),
    };
  }

  function buildReceiptSnapshot(
    invoiceNo: string,
    grand: number,
    payLabel: string,
    loyaltyEarned: number,
    appointmentId?: string,
  ): WalkInReceiptData {
    return {
      invoiceNo,
      customer: customerName.trim() || "Walk-in Customer",
      date: new Date().toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
      items: selectedServices.map((s) => ({
        name: s.displayName || s.name,
        qty: s.qty,
        rate: s.price,
        total: s.price * s.qty,
      })),
      subtotal,
      gst: gstAmount,
      grandTotal: grand,
      paymentMethod: payLabel,
      loyaltyEarned,
      appointmentId,
    };
  }

  async function handlePay() {
    if (!billValid || submitting) return;
    if (discount > 0 && discountReason.trim().length < 3) {
      toast.error("Enter a discount reason (at least 3 characters)");
      return;
    }
    if (total > 0 && !isPaymentMethodValid(payMethod, total)) {
      toast.error("Complete the payment details before collecting");
      return;
    }
    setSubmitting(true);
    try {
      const resolvedCustomerId = await ensureCustomerId();
      const appt = await createWalkInAppointment(resolvedCustomerId);
      const invoice = await completeCheckout({
        ...buildCheckoutPayload(appt.id, resolvedCustomerId ?? appt.customerId),
        payments: buildBillingPayments(payMethod, total),
        loyaltyPointsEarned: Math.floor(total / 10),
      });
      const payLabel = paymentMethodLabel(payMethod, total);
      setReceiptData(
        buildReceiptSnapshot(
          invoice.receiptNumber,
          total,
          payLabel,
          Math.floor(total / 10),
          invoice.appointmentId || appt.id,
        ),
      );
      setReceiptStep("success");
      setScanFocus(false);
      triggerConfetti();
      setReceiptOpen(true);
      applyLocalStatus(appt.id, "completed");
      void Promise.all([refreshPending(), refreshAppointments()]).catch(() => {});
      toast.success("Payment completed", {
        description: `Receipt ${invoice.receiptNumber} · ₹${total.toLocaleString("en-IN")}`,
      });
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to complete payment"));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleConfirmOnly() {
    if (!billValid || submitting) return;
    if (discount > 0 && discountReason.trim().length < 3) {
      toast.error("Enter a discount reason (at least 3 characters)");
      return;
    }
    setSubmitting(true);
    try {
      const resolvedCustomerId = await ensureCustomerId();
      const appt = await createWalkInAppointment(resolvedCustomerId);
      const invoice = await confirmOnlyCheckout(
        buildCheckoutPayload(appt.id, resolvedCustomerId ?? appt.customerId),
      );
      setReceiptData(
        buildReceiptSnapshot(
          invoice.receiptNumber,
          total,
          "Pending",
          0,
          invoice.appointmentId || appt.id,
        ),
      );
      setReceiptStep("pending");
      setScanFocus(false);
      setReceiptOpen(true);
      // Confirm-only completes the visit on the server — drop it from Appointments immediately.
      applyLocalStatus(appt.id, "completed");
      void Promise.all([refreshPending(), refreshAppointments()]).catch(() => {});
      toast.success("Bill confirmed", {
        description: `Invoice ${invoice.receiptNumber} · balance ₹${total.toLocaleString("en-IN")} · Pending Payments`,
      });
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to confirm bill"));
    } finally {
      setSubmitting(false);
    }
  }

  function resetWizard() {
    setSelectedServices([]);
    setServiceSearch("");
    setPhoneDigits("");
    setDebouncedPhone("");
    setPhoneMatches([]);
    setCustomerId(undefined);
    setCustomerName("");
    setCustomerGender("");
    setCustomerTier("Regular");
    setStylistName("");
    setLookupStatus("idle");
    setLoyaltyAvailable(0);
    setLoyaltyRedeem(0);
    setDiscountTools(NO_DISCOUNT_TOOLS);
    setCouponApplied(null);
    setCouponInput("");
    setDiscountMode("flat");
    setDiscountPct(0);
    setDiscountFlat(0);
    setDiscountReason("");
    setCustomTaxMode(false);
    setCustomTaxInput("");
    setPayMethod(createPaymentMethodValue({ method: "cash" }));
    setScanFocus(false);
    setReceiptOpen(false);
    setReceiptData(null);
    setWizardStep(0);
  }

  return (
    <>
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="shrink-0 border-b border-black/[0.06] bg-white px-4 py-4 sm:px-6 lg:px-8">
        <div className="mb-4 flex items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#D4AF37]/20 bg-[#D4AF37]/12">
            <Zap className="h-4 w-4 text-[#D4AF37]" />
          </div>
          <p className="text-[15px] font-bold leading-tight text-[#111118]">Walk-In Billing</p>
        </div>
        <AppointmentStepper
          steps={walkInBillingSteps}
          currentStep={isDesktop ? furthestStep : activeStep}
          stepValid={stepValid}
          onStepClick={(index) => {
            if (!isDesktop) setWizardStep(index);
          }}
        />
      </div>

      <div className={cn("responsive-panels", !isDesktop && "responsive-panels--wizard")}>
        {showStep(0) && (
          <ServicesStep
            catalog={catalog}
            catalogLoading={catalogLoading}
            serviceSearch={serviceSearch}
            onServiceSearchChange={setServiceSearch}
            searchResults={searchResults}
            selectedServices={selectedServices}
            selectedQty={selectedQty}
            isSelected={isSelected}
            onAddOrBump={addOrBumpService}
            onBumpQty={bumpQty}
          />
        )}

        {showStep(1) && (
          <CustomerStep
            servicesValid={servicesValid}
            phoneDigits={phoneDigits}
            onPhoneChange={(digits) => {
              setPhoneDigits(digits);
              // Reset selection while typing so stale "found" state doesn't stick
              if (lookupStatus === "found" || lookupStatus === "new") {
                setLookupStatus("idle");
                clearFoundCustomer();
                setPhoneMatches([]);
              }
            }}
            phoneError={phoneValidation.error}
            lookupStatus={lookupStatus}
            phoneMatches={phoneMatches}
            onSelectMatch={selectPhoneMatch}
            isPhoneDebouncing={phoneDigits !== debouncedPhone && last10(phoneDigits).length >= 4}
            customerName={customerName}
            onCustomerNameChange={setCustomerName}
            customerGender={customerGender}
            onCustomerGenderChange={setCustomerGender}
            customerTier={customerTier}
            stylistName={stylistName}
            onStylistNameChange={setStylistName}
          />
        )}

        {showStep(2) && (
          <BillStep
            billValid={billValid}
            servicesValid={servicesValid}
            scanToPayFocus={scanToPayFocus}
            onScanFocusChange={setScanFocus}
            customerName={customerName}
            phoneDigits={phoneDigits}
            selectedServices={selectedServices}
            estimatedDuration={estimatedDuration}
            total={total}
            payMethod={payMethod}
            onPayMethodChange={setPayMethod}
            submitting={submitting}
            onPay={() => void handlePay()}
            onConfirmOnly={() => void handleConfirmOnly()}
            onCancel={resetWizard}
            discountTools={discountTools}
            onToggleTool={(tool, enabled) =>
              setDiscountTools((prev) => ({ ...prev, [tool]: enabled }))
            }
            gstEnabled={gstEnabled}
            onGstEnabledChange={setGstEnabled}
            gstRate={gstRate}
            onGstRateChange={setGstRate}
            customTaxMode={customTaxMode}
            customTaxInput={customTaxInput}
            onCustomTaxMode={setCustomTaxMode}
            onCustomTaxInputChange={setCustomTaxInput}
            couponInput={couponInput}
            onCouponInputChange={setCouponInput}
            couponApplied={couponApplied}
            onClearCoupon={() => setCouponApplied(null)}
            onApplyCoupon={applyCouponCode}
            billCouponDisc={billCouponDisc}
            loyaltyAvailable={loyaltyAvailable}
            loyaltyRedeem={loyaltyRedeem}
            onLoyaltyRedeemChange={setLoyaltyRedeem}
            discountMode={discountMode}
            onDiscountModeChange={setDiscountMode}
            discountPct={discountPct}
            onDiscountPctChange={setDiscountPct}
            discountFlat={discountFlat}
            onDiscountFlatChange={setDiscountFlat}
            discount={discount}
            discountReason={discountReason}
            onDiscountReasonChange={setDiscountReason}
            subtotal={subtotal}
            afterDiscount={afterDiscount}
            billLoyalty={billLoyalty}
            gstAmount={gstAmount}
          />
        )}
      </div>

      {!isDesktop && (
        <WizardFooter
          activeStep={activeStep}
          stepValid={stepValid}
          onBack={() => setWizardStep(Math.max(0, activeStep - 1))}
          onNext={() => setWizardStep(activeStep + 1)}
        />
      )}
    </div>

    <PaymentResultDialog
      open={receiptOpen}
      onOpenChange={setReceiptOpen}
      step={receiptStep}
      receipt={receiptData}
      onDone={resetWizard}
    />
    </>
  );
}
