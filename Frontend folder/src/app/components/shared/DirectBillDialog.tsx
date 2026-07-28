import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  CreditCard,
  Plus,
  Receipt,
  Search,
  Tag,
  User,
  UserPlus,
  Wallet,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { confirmOnlyCheckout, completeCheckout } from "../../../api/billing";
import { fetchCustomers, type Customer } from "../../../api/customers";
import { fetchServiceCatalog } from "../../../api/services";
import { getApiErrorMessage } from "../../../lib/api";
import { formatInr, parseInr } from "../../../lib/inventoryMappers";
import { mapApiCatalog, type CatalogService } from "../../../lib/serviceCatalog";
import { BRAND } from "../../config/brand";
import { useAdvances } from "../../context/AdvancesContext";
import { useCoupons } from "../../context/CouponsContext";
import { useIncentives } from "../../context/IncentivesContext";
import { usePendingPayments } from "../../context/PendingPaymentsContext";
import { useProducts } from "../../context/ProductsContext";
import { useReceipts } from "../../context/ReceiptsContext";
import { Badge } from "../ui/badge";
import { Dialog, DialogContent } from "../ui/dialog";
import { Input } from "../ui/input";
import { cn } from "../ui/utils";
import {
  PaymentMethodPicker,
  createPaymentMethodValue,
  isPaymentMethodValid,
  paymentMethodLabel,
  paymentMethodReference,
  primaryPayMethod,
  type PaymentMethodValue,
} from "./PaymentMethodPicker";

type BillItem = {
  type: "service" | "product";
  name: string;
  price: number;
  qty: number;
  serviceId?: string;
  productId?: string;
};

type SelectedCustomer = {
  id?: string;
  name: string;
  phone: string;
};

type ReceiptResult = {
  receiptNumber: string;
  customer: string;
  total: number;
  pending: boolean;
  paymentMethod: string;
};

const TIER_BADGE: Record<string, string> = {
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

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "?";
}

export function DirectBillDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { products, refresh: refreshProducts } = useProducts();
  const { coupons } = useCoupons();
  const { getActiveAdvancesForPhone, deductAdvance } = useAdvances();
  const { recordBillingIncentives } = useIncentives();
  const { refresh: refreshReceipts } = useReceipts();
  const { refresh: refreshPending } = usePendingPayments();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [services, setServices] = useState<CatalogService[]>([]);
  const [customerMode, setCustomerMode] = useState<"search" | "new">("search");
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerSelected, setCustomerSelected] = useState(false);
  const [customer, setCustomer] = useState<SelectedCustomer>({ name: "", phone: "" });
  const [items, setItems] = useState<BillItem[]>([]);
  const [itemSearch, setItemSearch] = useState("");
  const [catalogTab, setCatalogTab] = useState<"products" | "services">("products");
  const [discount, setDiscount] = useState(0);
  const [discountReason, setDiscountReason] = useState("");
  const [couponInput, setCouponInput] = useState("");
  const [coupon, setCoupon] = useState<{ code: string; value: number; type: "%" | "₹" } | null>(null);
  const [giftCardInput, setGiftCardInput] = useState("");
  const [loyaltyAvailable, setLoyaltyAvailable] = useState(0);
  const [loyaltyRedeem, setLoyaltyRedeem] = useState(0);
  const [advanceApplied, setAdvanceApplied] = useState(0);
  const [gstEnabled, setGstEnabled] = useState(false);
  const [gstRate, setGstRate] = useState(5);
  const [customTaxMode, setCustomTaxMode] = useState(false);
  const [customTaxInput, setCustomTaxInput] = useState("");
  const [notes, setNotes] = useState("");
  const [payment, setPayment] = useState<PaymentMethodValue>(createPaymentMethodValue());
  const [receipt, setReceipt] = useState<ReceiptResult | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setCustomerMode("search");
    setCustomerSearch("");
    setCustomerSelected(false);
    setCustomer({ name: "", phone: "" });
    setItems([]);
    setItemSearch("");
    setCatalogTab("products");
    setDiscount(0);
    setDiscountReason("");
    setCouponInput("");
    setCoupon(null);
    setGiftCardInput("");
    setLoyaltyAvailable(0);
    setLoyaltyRedeem(0);
    setAdvanceApplied(0);
    setGstEnabled(false);
    setGstRate(5);
    setCustomTaxMode(false);
    setCustomTaxInput("");
    setNotes("");
    setPayment(createPaymentMethodValue());
  };

  useEffect(() => {
    if (!open) return;
    reset();
    void Promise.all([
      fetchCustomers().then(setCustomers),
      fetchServiceCatalog().then((rows) => setServices(mapApiCatalog(rows))),
    ]).catch((error) => toast.error(getApiErrorMessage(error, "Failed to load billing data")));
  }, [open]);

  const loadLoyalty = (phone: string, rows = customers) => {
    const normalized = phone.replace(/\D/g, "").slice(-10);
    const matched = rows.find((row) => row.phone.replace(/\D/g, "").slice(-10) === normalized);
    setLoyaltyAvailable(matched?.loyaltyPoints ?? 0);
  };

  const subtotal = items.reduce((total, item) => total + item.price * item.qty, 0);
  const couponDiscount = coupon
    ? coupon.type === "%"
      ? Math.round((subtotal * coupon.value) / 100)
      : coupon.value
    : 0;
  const loyaltyDiscount = Math.min(
    loyaltyRedeem * 0.5,
    Math.max(0, subtotal - couponDiscount - discount),
  );
  const beforeTax = Math.max(0, subtotal - couponDiscount - loyaltyDiscount - discount);
  const gst = gstEnabled ? Math.round((beforeTax * gstRate) / 100) : 0;
  const grandTotal = Math.max(0, Math.round(beforeTax + gst));
  const advances = customer.phone ? getActiveAdvancesForPhone(customer.phone) : [];
  const advanceAvailable = advances.reduce((sum, advance) => sum + advance.balance, 0);
  const dueNow = Math.max(0, grandTotal - advanceApplied);
  const itemCount = items.reduce((sum, item) => sum + item.qty, 0);
  const savedTotal = couponDiscount + loyaltyDiscount + discount;

  const searchResults = useMemo(() => {
    const query = itemSearch.trim().toLowerCase();
    if (!query) return [];
    return [
      ...services
        .filter((service) => service.name.toLowerCase().includes(query))
        .map((service) => ({
          type: "service" as const,
          name: service.name,
          price: service.price,
          serviceId: service.id,
          meta: service.duration ? `${service.duration} min` : "Service",
        })),
      ...products
        .filter(
          (product) =>
            product.activeStatus !== "inactive" &&
            product.name.toLowerCase().includes(query),
        )
        .map((product) => ({
          type: "product" as const,
          name: product.name,
          price: parseInr(product.price),
          productId: product.id,
          meta: `${product.stock} in stock`,
        })),
    ];
  }, [itemSearch, products, services]);

  const catalogItems = useMemo(() => {
    if (catalogTab === "products") {
      return products
        .filter((product) => product.activeStatus !== "inactive")
        .map((product) => ({
          type: "product" as const,
          id: product.id,
          name: product.name,
          price: parseInr(product.price),
          meta: `${product.stock} in stock`,
          productId: product.id,
        }));
    }
    return services.map((service) => ({
      type: "service" as const,
      id: service.id,
      name: service.name,
      price: service.price,
      meta: service.duration ? `${service.duration} min` : "Service",
      serviceId: service.id,
    }));
  }, [catalogTab, products, services]);

  const matchingCustomers = useMemo(() => {
    const query = customerSearch.toLowerCase();
    if (!query) return [];
    return customers.filter(
      (row) =>
        row.name.toLowerCase().includes(query) ||
        row.phone.replace(/\D/g, "").includes(query.replace(/\D/g, "")),
    );
  }, [customerSearch, customers]);

  const addItem = (item: Omit<BillItem, "qty">) => {
    setItems((current) => {
      const existing = current.find((row) =>
        item.type === "product"
          ? row.productId === item.productId
          : row.serviceId === item.serviceId,
      );
      return existing
        ? current.map((row) => (row === existing ? { ...row, qty: row.qty + 1 } : row))
        : [...current, { ...item, qty: 1 }];
    });
    setItemSearch("");
  };

  const updateQuantity = (index: number, quantity: number) => {
    setItems((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, qty: Math.max(1, quantity) } : item,
      ),
    );
  };

  const settleAdvance = (amount: number) => {
    let remaining = amount;
    for (const advance of advances) {
      if (remaining <= 0) break;
      const used = Math.min(advance.balance, remaining);
      void deductAdvance(advance.id, used);
      remaining -= used;
    }
  };

  const buildPayload = () => ({
    customerId: customer.id,
    customerName: customer.name.trim() || "Walk-in Customer",
    customerPhone: customer.phone.trim(),
    source: "pos" as const,
    items: items.map((item) => ({
      lineType: item.type,
      serviceId: item.serviceId,
      productId: item.productId,
      itemName: item.name,
      quantity: item.qty,
      unitPrice: item.price,
    })),
    subtotal,
    discountAmount: loyaltyDiscount,
    couponDiscount,
    manualDiscountAmount: discount,
    manualDiscountReason: discount > 0 ? discountReason.trim() : undefined,
    gstRate: gstEnabled ? gstRate : 0,
    gstAmount: gst,
    totalAmount: grandTotal,
    notes: notes || undefined,
    dueDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
  });

  const validate = () => {
    if (items.length === 0) {
      toast.error("Add at least one service or product.");
      return false;
    }
    if (!customer.name.trim()) {
      toast.error("Select or enter a customer name.");
      return false;
    }
    if (discount > 0 && discountReason.trim().length < 3) {
      toast.error("Enter a reason for the manual discount (at least 3 characters).");
      return false;
    }
    return true;
  };

  const refreshBillingData = () =>
    void Promise.all([refreshReceipts(), refreshPending(), refreshProducts()]).catch(() => {});

  const confirmOnly = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      const invoice = await confirmOnlyCheckout(buildPayload());
      setReceipt({
        receiptNumber: invoice.receiptNumber,
        customer: customer.name,
        total: grandTotal,
        pending: true,
        paymentMethod: "Pending",
      });
      onOpenChange(false);
      refreshBillingData();
      toast.success("Direct bill confirmed", {
        description: `Invoice ${invoice.receiptNumber} is pending payment.`,
      });
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to confirm direct bill"));
    } finally {
      setSubmitting(false);
    }
  };

  const completePayment = async () => {
    if (!validate()) return;
    if (dueNow > 0 && !isPaymentMethodValid(payment, dueNow)) {
      toast.error("Enter a valid payment amount.");
      return;
    }
    setSubmitting(true);
    const paymentLabel =
      advanceApplied > 0
        ? `Advance ${formatInr(advanceApplied)}${dueNow > 0 ? ` + ${paymentMethodLabel(payment, dueNow)}` : ""}`
        : dueNow === 0
          ? "Fully covered by advance"
          : paymentMethodLabel(payment, dueNow);
    const primaryMethod = primaryPayMethod(payment);
    const payments = [
      ...(advanceApplied > 0
        ? [{ paymentMethod: "wallet" as const, amount: advanceApplied }]
        : []),
      ...(dueNow > 0
        ? payment.method === "split"
          ? payment.splitRows
              .filter((row) => parseFloat(row.amount) > 0)
              .map((row) => ({
                paymentMethod: row.method,
                amount: parseFloat(row.amount),
                reference: row.ref || undefined,
              }))
          : [
              {
                paymentMethod: primaryMethod,
                amount: dueNow,
                reference: paymentMethodReference(payment),
              },
            ]
        : []),
    ];
    try {
      const invoice = await completeCheckout({
        ...buildPayload(),
        payments,
        loyaltyPointsEarned: Math.floor(grandTotal / 10),
      });
      if (advanceApplied > 0) settleAdvance(advanceApplied);
      recordBillingIncentives({
        customerName: customer.name,
        receiptRef: invoice.receiptNumber,
        items: items
          .filter((item) => item.type === "service")
          .map((item) => ({ name: item.name, rate: item.price, qty: item.qty })),
      });
      setReceipt({
        receiptNumber: invoice.receiptNumber,
        customer: customer.name,
        total: grandTotal,
        pending: false,
        paymentMethod: paymentLabel,
      });
      onOpenChange(false);
      refreshBillingData();
      toast.success("Payment completed", {
        description: `Receipt ${invoice.receiptNumber} created.`,
      });
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to complete payment"));
    } finally {
      setSubmitting(false);
    }
  };

  const selectedCustomerRecord = customers.find(
    (row) => row.id === customer.id || row.phone === customer.phone || row.name === customer.name,
  );

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-sm:dialog-mobile-sheet flex flex-col sm:max-w-7xl sm:h-[min(92dvh,860px)] max-h-[95dvh] overflow-hidden p-0 rounded-2xl shadow-2xl border-0 [&>button:last-of-type]:hidden">
          <div className="flex min-h-0 flex-1 flex-col bg-[#f4f2ed]">
            {/* Header */}
            <div className="relative flex items-center justify-between border-b border-black/[0.06] bg-[#111118] px-5 py-4">
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#D4AF37]/60 to-transparent" />
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#D4AF37]/25 bg-[#D4AF37]/12 shadow-[0_0_20px_rgba(212,175,55,0.12)]">
                  <Receipt className="h-4 w-4 text-[#D4AF37]" />
                </div>
                <div>
                  <p className="text-[14px] font-bold text-white">Direct Billing</p>
                  <p className="text-[11px] text-white/45">Quick bill · {BRAND.appName}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-white/40 transition-all hover:border-white/20 hover:bg-white/5 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body — 3 panels */}
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden xl:flex-row">
              {/* LEFT — Customer + Cart */}
              <div className="flex w-full min-h-0 flex-col overflow-hidden border-b border-black/[0.06] xl:w-[340px] xl:shrink-0 xl:border-b-0 xl:border-r max-h-[38dvh] xl:max-h-none">
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

                  <div className="mb-3 grid grid-cols-2 gap-1.5 rounded-xl border border-black/[0.07] bg-[#f4f2ed] p-1">
                    {(["search", "new"] as const).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => {
                          setCustomerMode(mode);
                          setCustomerSearch("");
                          setCustomerSelected(false);
                          setCustomer({ name: "", phone: "" });
                          setLoyaltyAvailable(0);
                        }}
                        className={cn(
                          "flex items-center justify-center gap-1.5 rounded-lg py-2 text-[11px] font-semibold transition-all",
                          customerMode === mode
                            ? "bg-[#111118] text-[#D4AF37] shadow-sm"
                            : "text-[#9a9a9a] hover:text-[#111118]",
                        )}
                      >
                        {mode === "search" ? (
                          <>
                            <Search className="h-3 w-3" /> Find Customer
                          </>
                        ) : (
                          <>
                            <UserPlus className="h-3 w-3" /> New Customer
                          </>
                        )}
                      </button>
                    ))}
                  </div>

                  {customerMode === "search" ? (
                    <div className="space-y-2">
                      <div className="relative">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#9a9a9a]" />
                        <Input
                          value={customerSearch}
                          onChange={(e) => {
                            setCustomerSearch(e.target.value);
                            setCustomerSelected(false);
                          }}
                          placeholder="Search by name or phone…"
                          className="h-10 rounded-xl border-black/[0.08] bg-white pl-9 pr-9 text-[12.5px] focus:border-[#D4AF37]/40"
                        />
                        {customerSearch && (
                          <button
                            type="button"
                            onClick={() => {
                              setCustomerSearch("");
                              setCustomerSelected(false);
                              setCustomer({ name: "", phone: "" });
                            }}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#9a9a9a] hover:text-[#111118]"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>

                      {customerSearch.length >= 1 && !customerSelected && (
                        matchingCustomers.length > 0 ? (
                          <div className="max-h-40 overflow-y-auto rounded-xl border border-black/[0.08] bg-white shadow-[0_8px_24px_rgba(17,17,24,0.08)] divide-y divide-black/[0.04]">
                            {matchingCustomers.map((row) => {
                              const tier = membershipTierLabel(row.membershipTier);
                              return (
                                <button
                                  key={row.id}
                                  type="button"
                                  onMouseDown={(e) => e.preventDefault()}
                                  onClick={() => {
                                    setCustomer({ id: row.id, name: row.name, phone: row.phone });
                                    setCustomerSearch(row.name);
                                    setCustomerSelected(true);
                                    setLoyaltyAvailable(row.loyaltyPoints ?? 0);
                                  }}
                                  className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-[#FFFBEB]"
                                >
                                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#C9A227] text-[10px] font-bold text-[#111118]">
                                    {initials(row.name)}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate text-[12px] font-semibold text-[#111118]">{row.name}</p>
                                    <p className="text-[10px] text-[#9a9a9a]">
                                      {row.phone} · {row.totalVisits} visits
                                    </p>
                                  </div>
                                  <Badge className={cn("shrink-0 border text-[9px] font-bold", TIER_BADGE[tier] ?? TIER_BADGE.Basic)}>
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
                        )
                      )}

                      {customerSelected && customer.name && (
                        <div className="flex items-center gap-3 rounded-xl border border-[#D4AF37]/30 bg-[#FFFBEB] p-3 shadow-[0_2px_12px_rgba(212,175,55,0.08)]">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#C9A227] text-[11px] font-bold text-[#111118]">
                            {initials(customer.name)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="truncate text-[13px] font-bold text-[#111118]">{customer.name}</p>
                              {selectedCustomerRecord && (
                                <Badge
                                  className={cn(
                                    "border text-[9px] font-bold",
                                    TIER_BADGE[membershipTierLabel(selectedCustomerRecord.membershipTier)] ??
                                      TIER_BADGE.Basic,
                                  )}
                                >
                                  {membershipTierLabel(selectedCustomerRecord.membershipTier)}
                                </Badge>
                              )}
                            </div>
                            <p className="mt-0.5 truncate text-[10.5px] text-[#9a9a9a]">{customer.phone}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setCustomerSearch("");
                              setCustomerSelected(false);
                              setCustomer({ name: "", phone: "" });
                              setLoyaltyAvailable(0);
                            }}
                            className="shrink-0 rounded-lg p-1 text-[#9a9a9a] transition-colors hover:bg-white hover:text-[#111118]"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      <div className="relative">
                        <User className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#9a9a9a]" />
                        <Input
                          value={customer.name}
                          onChange={(e) => setCustomer((c) => ({ ...c, name: e.target.value }))}
                          placeholder="Customer name *"
                          className="h-10 rounded-xl border-black/[0.08] bg-white pl-9 text-[12.5px] focus:border-[#D4AF37]/40"
                        />
                      </div>
                      <div className="flex gap-2">
                        <span className="inline-flex shrink-0 items-center rounded-xl border border-black/[0.08] bg-[#faf9f7] px-2.5 text-[12px] text-[#6b6b6b]">
                          +91
                        </span>
                        <Input
                          value={customer.phone.replace(/^\+91\s?/, "")}
                          onChange={(e) => {
                            const phone = `+91 ${e.target.value}`;
                            setCustomer((c) => ({ ...c, phone }));
                            loadLoyalty(phone);
                          }}
                          placeholder="98765 00000"
                          className="h-10 flex-1 rounded-xl border-black/[0.08] bg-white text-[12.5px] focus:border-[#D4AF37]/40"
                        />
                      </div>
                      {customer.name.trim() && (
                        <div className="flex items-center gap-2 rounded-xl border border-black/[0.06] bg-[#faf9f7] px-3 py-2">
                          <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-[#D4AF37]" />
                          <p className="text-[11px] text-[#6b6b6b]">New customer — details will be saved with this bill</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Quick search */}
                <div className="border-b border-black/[0.06] bg-white px-4 pb-0 pt-3">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9a9a9a]" />
                    <input
                      type="text"
                      placeholder="Search service or product to add…"
                      value={itemSearch}
                      onChange={(e) => setItemSearch(e.target.value)}
                      className="h-10 w-full rounded-xl border border-black/[0.08] bg-white pl-10 pr-9 text-[12px] font-medium outline-none transition-colors placeholder:font-normal placeholder:text-[#9a9a9a] focus:border-[#D4AF37]/50 focus:ring-2 focus:ring-[#D4AF37]/10"
                    />
                    {itemSearch && (
                      <button
                        type="button"
                        onClick={() => setItemSearch("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  {itemSearch.trim().length > 0 && (
                    <div className="mt-2 mb-1 max-h-44 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-sm divide-y divide-gray-50">
                      {searchResults.length === 0 ? (
                        <p className="px-4 py-4 text-center text-[12px] text-gray-400">
                          No results for “{itemSearch}”
                        </p>
                      ) : (
                        searchResults.map((item) => (
                          <button
                            key={`${item.type}-${item.type === "service" ? item.serviceId : item.productId}`}
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              addItem(item);
                            }}
                            className="group flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-amber-50"
                          >
                            <span
                              className={cn(
                                "shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold",
                                item.type === "service"
                                  ? "bg-[#d4af37]/15 text-[#9a7a1e]"
                                  : "bg-gray-100 text-gray-600",
                              )}
                            >
                              {item.type === "service" ? "SVC" : "PRD"}
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-[12px] font-semibold text-[#111]">{item.name}</p>
                              <p className="text-[10px] text-gray-400">{item.meta}</p>
                            </div>
                            <span className="text-[12px] font-bold text-[#111]">₹{item.price.toLocaleString()}</span>
                            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#d4af37] opacity-0 transition-opacity group-hover:opacity-100">
                              <Plus className="h-3.5 w-3.5 text-white" />
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                  <div className="pb-3" />
                </div>

                {/* Cart */}
                <div className="flex-1 overflow-y-auto bg-[#faf9f7]">
                  {items.length === 0 ? (
                    <div className="flex h-full min-h-[140px] flex-col items-center justify-center gap-3 px-8 text-center">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-dashed border-[#D4AF37]/25 bg-[#FFFBEB]">
                        <Receipt className="h-6 w-6 text-[#D4AF37]/50" />
                      </div>
                      <div>
                        <p className="text-[13px] font-semibold text-[#6b6b6b]">No items in cart</p>
                        <p className="mt-0.5 text-[11px] text-[#9a9a9a]">
                          Browse products or search above to add
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2 px-4 py-3">
                      {items.map((item, idx) => (
                        <div
                          key={`${item.type}-${item.serviceId ?? item.productId}-${idx}`}
                          className="flex items-center gap-2 rounded-xl border border-black/[0.06] bg-white px-3 py-3 shadow-sm transition-all hover:border-[#D4AF37]/25 hover:shadow-md"
                        >
                          <span className="w-5 shrink-0 text-center text-[10px] font-black text-[#D4AF37]/60">
                            {idx + 1}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <p className="truncate text-[12px] font-semibold text-[#111118]">{item.name}</p>
                              <span
                                className={cn(
                                  "shrink-0 rounded px-1 py-0.5 text-[8px] font-bold uppercase",
                                  item.type === "service"
                                    ? "bg-[#D4AF37]/12 text-[#9a7a1e]"
                                    : "bg-black/[0.06] text-[#6b6b6b]",
                                )}
                              >
                                {item.type === "service" ? "Svc" : "Prd"}
                              </span>
                            </div>
                            <p className="mt-0.5 text-[10px] text-[#9a9a9a]">
                              ₹{item.price.toLocaleString()} / unit
                            </p>
                          </div>
                          <div className="flex w-24 items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => updateQuantity(idx, item.qty - 1)}
                              className="flex h-7 w-7 items-center justify-center rounded-lg border border-black/[0.08] bg-[#faf9f7] text-[#6b6b6b] transition-all hover:border-[#111118] hover:bg-[#111118] hover:text-white"
                            >
                              −
                            </button>
                            <span className="w-5 text-center text-[13px] font-bold tabular-nums text-[#111118]">
                              {item.qty}
                            </span>
                            <button
                              type="button"
                              onClick={() => updateQuantity(idx, item.qty + 1)}
                              className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#D4AF37]/30 bg-[#FFFBEB] text-[#9a7a1e] transition-all hover:border-[#D4AF37] hover:bg-[#D4AF37] hover:text-[#111118]"
                            >
                              +
                            </button>
                          </div>
                          <span className="w-20 text-right text-[13px] font-black tabular-nums text-[#111118]">
                            ₹{(item.price * item.qty).toLocaleString()}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setItems((current) => current.filter((_, i) => i !== idx))
                            }
                            className="flex h-7 w-8 shrink-0 items-center justify-center rounded-lg text-[#9a9a9a] transition-colors hover:bg-red-50 hover:text-red-500"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3 border-t border-[#D4AF37]/15 bg-[#111118] px-5 py-3.5">
                  <span className="text-[11px] font-medium text-white/45">
                    {itemCount === 0 ? "No items" : `${itemCount} item${itemCount !== 1 ? "s" : ""}`}
                  </span>
                  <span className="text-white/20">·</span>
                  <span className="text-[11px] font-medium text-white/45">Subtotal</span>
                  <span className="text-[18px] font-black tabular-nums text-[#D4AF37]">
                    ₹{subtotal.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* MIDDLE — Catalog */}
              <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden border-b border-black/[0.06] xl:border-b-0 xl:border-r bg-white max-h-[28dvh] xl:max-h-none">
                <div className="shrink-0 border-b border-black/[0.06] px-4 py-3">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-[12px] font-bold text-[#111118]">Add to bill</p>
                    <p className="text-[10px] text-[#9a9a9a]">Tap an item to add</p>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 rounded-xl border border-black/[0.07] bg-[#f4f2ed] p-1">
                    {(["products", "services"] as const).map((tab) => (
                      <button
                        key={tab}
                        type="button"
                        onClick={() => setCatalogTab(tab)}
                        className={cn(
                          "rounded-lg py-2 text-[11px] font-semibold capitalize transition-all",
                          catalogTab === tab
                            ? "bg-[#111118] text-[#D4AF37] shadow-sm"
                            : "text-[#9a9a9a] hover:text-[#111118]",
                        )}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto p-3">
                  {catalogItems.length === 0 ? (
                    <div className="flex h-full min-h-[120px] items-center justify-center text-[12px] text-[#9a9a9a]">
                      No {catalogTab} available
                    </div>
                  ) : (
                    <div className="grid gap-2 sm:grid-cols-2">
                      {catalogItems.map((item) => (
                        <button
                          key={`${item.type}-${item.id}`}
                          type="button"
                          onClick={() =>
                            addItem({
                              type: item.type,
                              name: item.name,
                              price: item.price,
                              serviceId: "serviceId" in item ? item.serviceId : undefined,
                              productId: "productId" in item ? item.productId : undefined,
                            })
                          }
                          className="group flex flex-col rounded-xl border border-black/[0.07] bg-[#faf9f7] p-3 text-left transition-all hover:border-[#D4AF37]/40 hover:bg-[#FFFBEB] hover:shadow-sm"
                        >
                          <div className="mb-2 flex items-start justify-between gap-2">
                            <span
                              className={cn(
                                "rounded px-1.5 py-0.5 text-[9px] font-bold uppercase",
                                item.type === "service"
                                  ? "bg-[#D4AF37]/15 text-[#9a7a1e]"
                                  : "bg-black/[0.06] text-[#6b6b6b]",
                              )}
                            >
                              {item.type === "service" ? "Svc" : "Prd"}
                            </span>
                            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#D4AF37]/15 text-[#9a7a1e] opacity-0 transition-opacity group-hover:opacity-100">
                              <Plus className="h-3.5 w-3.5" />
                            </div>
                          </div>
                          <p className="line-clamp-2 text-[12px] font-semibold text-[#111118]">{item.name}</p>
                          <p className="mt-1 text-[10px] text-[#9a9a9a]">{item.meta}</p>
                          <p className="mt-2 text-[13px] font-black tabular-nums text-[#111118]">
                            ₹{item.price.toLocaleString()}
                          </p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* RIGHT — Billing & Payment */}
              <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-white xl:max-w-[420px]">
                <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-5 sm:py-5">
                  {/* GST */}
                  <div>
                    <div className="mb-3 flex items-center justify-between">
                      <h4 className="text-[11px] font-bold uppercase tracking-[0.12em] text-gray-500">Tax</h4>
                      <button
                        type="button"
                        onClick={() => setGstEnabled((v) => !v)}
                        className={cn(
                          "flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-bold transition-all",
                          gstEnabled
                            ? "border-[#d4af37]/40 bg-[#d4af37]/10 text-[#9a7a1e]"
                            : "border-gray-200 bg-white text-gray-400",
                        )}
                      >
                        <div
                          className={cn(
                            "relative h-3.5 w-7 rounded-full transition-colors",
                            gstEnabled ? "bg-[#d4af37]" : "bg-gray-300",
                          )}
                        >
                          <div
                            className={cn(
                              "absolute top-0.5 h-3 w-3 rounded-full bg-white shadow transition-all",
                              gstEnabled ? "right-0.5" : "left-0.5",
                            )}
                          />
                        </div>
                        GST {gstEnabled ? "Enabled" : "Disabled"}
                      </button>
                    </div>
                    {gstEnabled && (
                      <div className="space-y-2">
                        <div className="flex gap-2">
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
                                "flex-1 rounded-xl border-2 py-2.5 text-[12px] font-bold transition-all",
                                !customTaxMode && gstRate === rate
                                  ? "border-[#111] bg-[#111] text-[#d4af37] shadow-sm"
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
                              "flex-1 rounded-xl border-2 py-2.5 text-[12px] font-bold transition-all",
                              customTaxMode
                                ? "border-[#111] bg-[#111] text-[#d4af37] shadow-sm"
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
                              onChange={(e) => {
                                const v = e.target.value;
                                setCustomTaxInput(v);
                                const n = parseFloat(v);
                                if (!Number.isNaN(n) && n >= 0 && n <= 100) setGstRate(n);
                              }}
                              placeholder="Enter tax %"
                              className="h-10 w-full rounded-xl border-2 border-[#d4af37] bg-amber-50/50 pl-4 pr-10 text-[13px] font-bold text-[#111] outline-none placeholder:font-normal placeholder:text-gray-400"
                            />
                            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[13px] font-bold text-gray-400">
                              %
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="h-px bg-gray-200" />

                  {/* Discounts */}
                  <div>
                    <h4 className="mb-3 text-[11px] font-bold uppercase tracking-[0.12em] text-gray-500">
                      Discounts & Offers
                    </h4>
                    <div className="space-y-3">
                      <div className="rounded-xl border border-gray-200 bg-white p-4">
                        <div className="mb-2.5 flex items-center gap-2">
                          <Tag className="h-3.5 w-3.5 shrink-0 text-[#d4af37]" />
                          <span className="text-[12px] font-semibold text-[#111]">Coupon Code</span>
                          {coupon && (
                            <span className="ml-auto rounded-full bg-[#d4af37]/10 px-2 py-0.5 text-[10px] font-black text-[#9a7a1e]">
                              -₹{couponDiscount.toLocaleString()}
                            </span>
                          )}
                        </div>
                        {coupon ? (
                          <div className="flex items-center justify-between rounded-lg border border-[#d4af37]/20 bg-[#d4af37]/06 px-3 py-2">
                            <div className="flex items-center gap-2">
                              <span className="text-[13px] font-black tracking-wider text-[#9a7a1e]">
                                {coupon.code}
                              </span>
                              <span className="text-[10px] text-gray-400">applied</span>
                            </div>
                            <button type="button" onClick={() => setCoupon(null)} className="text-gray-400 hover:text-gray-700">
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <input
                              value={couponInput}
                              onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                              placeholder="Enter coupon code"
                              className="h-9 flex-1 rounded-lg border border-gray-200 bg-white px-3 text-[12px] font-medium uppercase outline-none transition-colors placeholder:normal-case placeholder:font-normal placeholder:text-gray-400 focus:border-[#d4af37]"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const code = couponInput.trim().toUpperCase();
                                const match = coupons.find(
                                  (c) => c.code.toUpperCase() === code && c.status === "active",
                                );
                                if (match) {
                                  setCoupon({
                                    code: match.code,
                                    value: match.value,
                                    type: match.type === "percentage" ? "%" : "₹",
                                  });
                                  setCouponInput("");
                                } else {
                                  toast.error("Coupon not found or inactive");
                                }
                              }}
                              className="h-9 shrink-0 rounded-lg bg-[#111] px-4 text-[11px] font-bold text-[#d4af37] hover:bg-[#2a2a2a]"
                            >
                              Apply
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="rounded-xl border border-gray-200 bg-white p-4">
                        <div className="mb-2.5 flex items-center gap-2">
                          <CreditCard className="h-3.5 w-3.5 shrink-0 text-[#d4af37]" />
                          <span className="text-[12px] font-semibold text-[#111]">Gift Card</span>
                        </div>
                        <div className="flex gap-2">
                          <input
                            value={giftCardInput}
                            onChange={(e) => setGiftCardInput(e.target.value.toUpperCase())}
                            placeholder="GC-XXXX-XXXX"
                            className="h-9 flex-1 rounded-lg border border-gray-200 bg-white px-3 text-[12px] font-medium uppercase outline-none transition-colors placeholder:normal-case placeholder:font-normal placeholder:text-gray-400 focus:border-[#d4af37]"
                          />
                          <button
                            type="button"
                            onClick={() => toast.info("Gift cards are not configured yet")}
                            className="h-9 shrink-0 rounded-lg bg-[#111] px-4 text-[11px] font-bold text-[#d4af37] hover:bg-[#2a2a2a]"
                          >
                            Redeem
                          </button>
                        </div>
                      </div>

                      {advanceAvailable > 0 && (
                        <div className="rounded-xl border border-[#d4af37]/30 bg-white p-4">
                          <div className="mb-2.5 flex items-center gap-2">
                            <Wallet className="h-3.5 w-3.5 shrink-0 text-[#d4af37]" />
                            <span className="text-[12px] font-semibold text-[#111]">Advance Payment</span>
                            <span className="ml-auto rounded-full bg-[#d4af37]/10 px-2 py-0.5 text-[10px] font-black text-[#9a7a1e]">
                              ₹{advanceAvailable.toLocaleString()} available
                            </span>
                          </div>
                          {advanceApplied > 0 ? (
                            <div className="flex items-center justify-between rounded-lg border border-[#d4af37]/20 bg-[#d4af37]/06 px-3 py-2">
                              <span className="text-[13px] font-black text-[#9a7a1e]">
                                ₹{advanceApplied.toLocaleString()} applied
                              </span>
                              <button type="button" onClick={() => setAdvanceApplied(0)} className="text-gray-400 hover:text-gray-700">
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setAdvanceApplied(Math.min(advanceAvailable, grandTotal))}
                              className="h-9 w-full rounded-lg bg-[#111] text-[11px] font-bold text-[#d4af37] hover:bg-[#2a2a2a]"
                            >
                              Apply full advance (₹{Math.min(advanceAvailable, grandTotal).toLocaleString()})
                            </button>
                          )}
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-xl border border-gray-200 bg-white p-4">
                          <div className="mb-2 flex items-center justify-between">
                            <span className="text-[12px] font-semibold text-[#111]">Loyalty</span>
                            <span className="rounded-md bg-gray-50 px-1.5 py-0.5 text-[10px] text-gray-400">
                              {loyaltyAvailable} pts
                            </span>
                          </div>
                          <input
                            type="number"
                            min={0}
                            max={loyaltyAvailable}
                            value={loyaltyRedeem || ""}
                            onChange={(e) =>
                              setLoyaltyRedeem(
                                Math.min(loyaltyAvailable, Math.max(0, Number(e.target.value))),
                              )
                            }
                            placeholder="Redeem pts"
                            className="h-9 w-full rounded-lg border border-gray-200 px-3 text-[12px] outline-none focus:border-[#d4af37]"
                          />
                        </div>
                        <div className="rounded-xl border border-gray-200 bg-white p-4">
                          <div className="mb-2">
                            <span className="text-[12px] font-semibold text-[#111]">Manual Discount</span>
                          </div>
                          <input
                            type="number"
                            min={0}
                            max={subtotal}
                            value={discount || ""}
                            onChange={(e) => {
                              const next = Math.min(Number(e.target.value) || 0, subtotal);
                              setDiscount(next);
                              if (next <= 0) setDiscountReason("");
                            }}
                            placeholder="₹ amount"
                            className="h-9 w-full rounded-lg border border-gray-200 px-3 text-[12px] outline-none focus:border-[#d4af37]"
                          />
                        </div>
                      </div>

                      {discount > 0 && (
                        <div className="rounded-xl border border-[#d4af37]/35 bg-[#FFFBEB] p-4">
                          <div className="mb-2 flex items-center gap-2">
                            <Tag className="h-3.5 w-3.5 shrink-0 text-[#d4af37]" />
                            <span className="text-[12px] font-semibold text-[#111]">
                              Manual discount reason <span className="text-red-500">*</span>
                            </span>
                          </div>
                          <textarea
                            value={discountReason}
                            onChange={(e) => setDiscountReason(e.target.value)}
                            placeholder="Why is this discount being given? (required)"
                            rows={2}
                            className="w-full resize-none rounded-lg border border-[#d4af37]/30 bg-white px-3 py-2 text-[12px] outline-none placeholder:text-gray-400 focus:border-[#d4af37]"
                          />
                          <p className="mt-1.5 text-[10px] text-[#9a7a1e]">
                            Saved with this bill against the customer for audit.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="h-px bg-gray-200" />

                  {/* Bill summary */}
                  <div className="overflow-hidden rounded-2xl border border-black/[0.07]">
                    <div className="space-y-2 bg-[#faf9f7] px-5 py-4">
                      <div className="flex items-center justify-between text-[13px]">
                        <span className="text-gray-500">Subtotal</span>
                        <span className="font-semibold tabular-nums text-[#111]">
                          ₹{subtotal.toLocaleString()}
                        </span>
                      </div>
                      {couponDiscount > 0 && (
                        <div className="flex items-center justify-between text-[13px]">
                          <span className="text-gray-500">
                            Coupon <span className="text-[11px] font-medium text-[#9a7a1e]">({coupon?.code})</span>
                          </span>
                          <span className="font-semibold tabular-nums text-[#9a7a1e]">
                            - {formatInr(couponDiscount)}
                          </span>
                        </div>
                      )}
                      {loyaltyDiscount > 0 && (
                        <div className="flex items-center justify-between text-[13px]">
                          <span className="text-gray-500">
                            Loyalty{" "}
                            <span className="text-[11px] font-medium text-[#9a7a1e]">({loyaltyRedeem} pts)</span>
                          </span>
                          <span className="font-semibold tabular-nums text-[#9a7a1e]">
                            - {formatInr(loyaltyDiscount)}
                          </span>
                        </div>
                      )}
                      {discount > 0 && (
                        <div className="flex items-center justify-between text-[13px]">
                          <span className="text-gray-500">
                            Manual Discount
                            {discountReason.trim() ? (
                              <span className="mt-0.5 block text-[10px] font-medium text-[#9a7a1e]">
                                {discountReason.trim()}
                              </span>
                            ) : null}
                          </span>
                          <span className="font-semibold tabular-nums text-[#9a7a1e]">
                            - {formatInr(discount)}
                          </span>
                        </div>
                      )}
                      {gstEnabled && gst > 0 && (
                        <div className="flex items-center justify-between text-[13px]">
                          <span className="text-gray-500">GST ({gstRate}%)</span>
                          <span className="font-semibold tabular-nums text-[#111]">
                            + ₹{gst.toLocaleString()}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center justify-between bg-[#111118] px-5 py-4">
                      <span className="text-[12px] font-bold uppercase tracking-wider text-white/50">
                        Grand Total
                      </span>
                      <span className="text-[24px] font-black tabular-nums text-[#D4AF37]">
                        ₹{grandTotal.toLocaleString()}
                      </span>
                    </div>
                    {advanceApplied > 0 && (
                      <>
                        <div className="flex items-center justify-between px-5 pt-3 text-[13px]">
                          <span className="text-gray-500">Advance Applied</span>
                          <span className="font-semibold tabular-nums text-[#9a7a1e]">
                            - {formatInr(advanceApplied)}
                          </span>
                        </div>
                        <div className="mt-1 flex items-center justify-between bg-[#0d0d14] px-5 py-3.5">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-[#D4AF37]/70">
                            Balance Due Now
                          </span>
                          <span className="text-[20px] font-black tabular-nums text-white">
                            ₹{dueNow.toLocaleString()}
                          </span>
                        </div>
                      </>
                    )}
                    {savedTotal > 0 && (
                      <div className="border-t border-[#D4AF37]/15 bg-[#FFFBEB] px-5 py-2.5 text-center">
                        <span className="text-[11px] font-bold text-[#9a7a1e]">
                          You saved ₹{Math.round(savedTotal).toLocaleString()} on this bill
                        </span>
                      </div>
                    )}
                  </div>

                  <PaymentMethodPicker
                    amountDue={dueNow}
                    value={payment}
                    onChange={setPayment}
                    upiNote={`${BRAND.appName} bill${customer.name ? ` — ${customer.name}` : ""}`}
                  />

                  <div>
                    <h4 className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[#9a9a9a]">
                      Notes
                    </h4>
                    <textarea
                      placeholder="Add a note for this transaction…"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="h-12 w-full resize-none rounded-xl border border-black/[0.08] bg-[#faf9f7] px-3 py-2 text-[12px] text-[#111118] outline-none transition-colors placeholder:text-[#9a9a9a] focus:border-[#D4AF37]/40"
                    />
                  </div>
                </div>

                <div className="flex shrink-0 flex-col gap-2.5 border-t border-black/[0.06] bg-[#faf9f7] px-4 py-3 sm:flex-row sm:gap-3 sm:px-5">
                  <button
                    type="button"
                    onClick={confirmOnly}
                    disabled={submitting || items.length === 0}
                    className="h-11 flex-1 rounded-xl border border-[#D4AF37]/35 bg-white text-[12px] font-bold text-[#9a7a1e] transition-all hover:border-[#D4AF37] hover:bg-[#FFFBEB] disabled:cursor-not-allowed disabled:opacity-40 sm:max-w-[180px]"
                  >
                    Confirm Only
                  </button>
                  <button
                    type="button"
                    disabled={
                      submitting ||
                      items.length === 0 ||
                      (dueNow > 0 && !isPaymentMethodValid(payment, dueNow))
                    }
                    onClick={completePayment}
                    className="flex min-h-11 flex-[2] items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#C9A227] px-3 py-2 text-[13px] font-black text-[#111118] shadow-lg shadow-[#D4AF37]/20 transition-all hover:from-[#C9A227] hover:to-[#B8922E] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    {submitting ? (
                      "Processing…"
                    ) : (
                      <span className="flex min-w-0 flex-col items-start leading-tight text-left">
                        <span>Complete Payment</span>
                        <span className="text-[10px] font-semibold tracking-wide text-[#111118]/70">
                          {dueNow === 0 ? "Covered by advance" : `₹${dueNow.toLocaleString()} due`}
                        </span>
                      </span>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={receipt !== null} onOpenChange={(value) => !value && setReceipt(null)}>
        <DialogContent className="max-w-sm rounded-2xl border-0 p-0 overflow-hidden [&>button:last-of-type]:hidden">
          {receipt && (
            <div className="space-y-5 bg-white px-6 py-8 text-center">
              <div
                className={cn(
                  "mx-auto flex h-16 w-16 items-center justify-center rounded-full",
                  receipt.pending ? "bg-amber-50" : "bg-emerald-50",
                )}
              >
                <CheckCircle2
                  className={cn("h-8 w-8", receipt.pending ? "text-amber-500" : "text-emerald-500")}
                />
              </div>
              <div>
                <h2 className="text-xl font-bold text-[#111118]">
                  {receipt.pending ? "Direct Bill Confirmed" : "Payment Successful"}
                </h2>
                <p className="mt-1 text-sm text-[#9a9a9a]">
                  {receipt.receiptNumber} · {receipt.customer}
                </p>
              </div>
              <div className="rounded-2xl bg-[#111118] px-5 py-4 text-white">
                <p className="text-[11px] text-white/55">
                  {receipt.pending ? "Balance due" : receipt.paymentMethod}
                </p>
                <p className="mt-1 text-2xl font-black text-[#D4AF37]">{formatInr(receipt.total)}</p>
              </div>
              <button
                type="button"
                onClick={() => setReceipt(null)}
                className="h-11 w-full rounded-xl bg-[#111118] text-sm font-bold text-[#D4AF37] hover:bg-[#1e1e1e]"
              >
                Done
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
