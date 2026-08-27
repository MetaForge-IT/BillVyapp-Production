import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "../ui/dialog";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import {
  Search,
  Plus,
  X,
  Clock,
  ChevronDown,
  Tag,
  Gift,
  Star,
  Percent,
  CheckCircle2,
  MessageCircle,
  Phone,
} from "lucide-react";
import { cn } from "../ui/utils";
import { fetchServiceCatalog } from "../../../api/services";
import { mapApiCatalog } from "../../../lib/serviceCatalog";
import {
  PaymentMethodPicker,
  createPaymentMethodValue,
  type PaymentMethodValue,
} from "./PaymentMethodPicker";
import { BRAND } from "../../config/brand";

type ServiceItem = {
  id: string;
  name: string;
  displayName?: string;
  serviceGroup?: string | null;
  category?: string;
  price: number;
  memberPrice: number;
  gender?: "MALE" | "FEMALE" | "UNISEX";
  tag?: "Male" | "Female";
};

type SelectedService = ServiceItem & { qty: number };

const tabOptions = ["Services", "Products", "Combos"];
const genderTabs = ["Male", "Female"];

type NotificationMethod = "whatsapp" | "sms" | "both" | "none";

export function NewAppointmentModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [genderTab, setGenderTab] = useState("Male");
  const [activeTab, setActiveTab] = useState("Services");
  const [serviceList, setServiceList] = useState<ServiceItem[]>([]);
  const [selected, setSelected] = useState<SelectedService[]>([]);
  const [name, setName] = useState("");
  const [gender, setGender] = useState("");
  const [dob, setDob] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [mode, setMode] = useState<"Online Appointment" | "Walk-in">("Online Appointment");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [notes, setNotes] = useState("");
  const [serviceSearch, setServiceSearch] = useState("");

  // Billing & Discounts
  const [applyGST, setApplyGST] = useState(false);
  const [gstRate, setGstRate] = useState(18);
  const [applyCoupon, setApplyCoupon] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [couponApplied, setCouponApplied] = useState(false);
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [applyLoyalty, setApplyLoyalty] = useState(false);
  const [loyaltyPoints] = useState(0);
  const [pointsToRedeem, setPointsToRedeem] = useState(0);
  const [applyGiftCard, setApplyGiftCard] = useState(false);
  const [giftCardCode, setGiftCardCode] = useState("");
  const [giftCardApplied, setGiftCardApplied] = useState(false);
  const [giftCardBalance, setGiftCardBalance] = useState(0);
  const [payMethod, setPayMethod] = useState<PaymentMethodValue>(createPaymentMethodValue());

  // Notification
  const [notifyMethod, setNotifyMethod] = useState<NotificationMethod>("whatsapp");

  useEffect(() => {
    if (!open) return;
    fetchServiceCatalog()
      .then((services) =>
        setServiceList(
          mapApiCatalog(services).map((service) => ({
            id: service.id,
            name: service.name,
            displayName: service.displayName,
            serviceGroup: service.serviceGroup,
            category: service.category,
            price: service.price,
            memberPrice: service.memberPrice,
            gender: service.gender,
            tag: service.tag,
          })),
        ),
      )
      .catch(() => setServiceList([]));
  }, [open]);

  // Confirmation popup
  const [showConfirmation, setShowConfirmation] = useState(false);

  const filteredServices = serviceList.filter((s) => {
    const matchesGender =
      genderTab === "Male"
        ? s.gender === "MALE" || s.tag === "Male"
        : genderTab === "Female"
          ? s.gender === "FEMALE" || s.tag === "Female"
          : true;
    const q = serviceSearch.toLowerCase().trim();
    const matchesSearch =
      q === "" ||
      s.name.toLowerCase().includes(q) ||
      (s.displayName ?? "").toLowerCase().includes(q) ||
      (s.serviceGroup ?? "").toLowerCase().includes(q) ||
      (s.category ?? "").toLowerCase().includes(q);
    return matchesGender && matchesSearch;
  });

  function addService(service: ServiceItem) {
    setSelected((prev) => {
      const existing = prev.find((p) => p.name === service.name);
      if (existing) {
        return prev.map((p) =>
          p.name === service.name ? { ...p, qty: p.qty + 1 } : p
        );
      }
      return [...prev, { ...service, qty: 1 }];
    });
  }

  function removeService(name: string) {
    setSelected((prev) => prev.filter((p) => p.name !== name));
  }

  function adjustQty(name: string, delta: number) {
    setSelected((prev) =>
      prev
        .map((p) => (p.name === name ? { ...p, qty: p.qty + delta } : p))
        .filter((p) => p.qty > 0)
    );
  }

  function applyCouponCode() {
    if (couponCode.toUpperCase() === "SAVE10") {
      setCouponDiscount(10);
      setCouponApplied(true);
    } else if (couponCode.toUpperCase() === "FLAT50") {
      setCouponDiscount(50);
      setCouponApplied(true);
    } else {
      alert("Invalid coupon code");
    }
  }

  function applyGiftCardCode() {
    if (giftCardCode.toUpperCase().startsWith("GC")) {
      setGiftCardBalance(500);
      setGiftCardApplied(true);
    } else {
      alert("Invalid gift card code");
    }
  }

  const subtotal = selected.reduce((sum, s) => sum + s.price * s.qty, 0);
  const loyaltyValue = applyLoyalty ? Math.min(pointsToRedeem / 10, subtotal * 0.1) : 0;
  const giftCardValue = applyGiftCard && giftCardApplied ? Math.min(giftCardBalance, subtotal) : 0;
  const couponValue = applyCoupon && couponApplied ? (couponDiscount > 100 ? couponDiscount : (subtotal * couponDiscount) / 100) : 0;
  const discountedSubtotal = Math.max(0, subtotal - loyaltyValue - giftCardValue - couponValue);
  const gstAmount = applyGST ? (discountedSubtotal * gstRate) / 100 : 0;
  const total = discountedSubtotal + gstAmount;

  function handleConfirm() {
    setShowConfirmation(true);
  }

  function handleCloseConfirmation() {
    setShowConfirmation(false);
    onOpenChange(false);
    resetForm();
  }

  function resetForm() {
    setSelected([]);
    setName("");
    setPhone("");
    setEmail("");
    setGender("");
    setDob("");
    setCustomerSearch("");
    setDate("");
    setTime("");
    setNotes("");
    setApplyGST(false);
    setApplyCoupon(false);
    setCouponApplied(false);
    setApplyLoyalty(false);
    setApplyGiftCard(false);
    setGiftCardApplied(false);
  }

  function handleSaveDraft() {
    onOpenChange(false);
    resetForm();
  }

  const canConfirm =
    selected.length > 0 &&
    (mode === "Online Appointment"
      ? customerSearch.trim().length > 0
      : name.trim().length > 0);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="!fixed !inset-0 !top-0 !left-0 !translate-x-0 !translate-y-0 !max-w-none !w-screen !h-screen !rounded-none !p-0 !gap-0 bg-white border-0 flex flex-col [&>button]:hidden overflow-hidden z-50"
        >
          {/* ── TOP HEADER ── */}
          <div className="flex items-center justify-between px-10 py-5 border-b border-[#EFEFEF] bg-white shrink-0">
            <div className="flex items-center gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#121212]">
                <span className="text-[#D4AF37] text-lg font-bold">S</span>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-[#121212] tracking-tight">New Appointment</h2>
                <p className="text-sm text-[#3f3f46] mt-0.5">Book, bill & confirm in one step</p>
              </div>
            </div>
            <button
              onClick={() => onOpenChange(false)}
              className="flex h-10 w-10 items-center justify-center rounded-xl text-[#3f3f46] hover:bg-[#FAF8F2] hover:text-[#121212] transition-colors border border-[#EFEFEF]"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* ── MAIN BODY: 4 columns ── */}
          <div className="flex flex-1 overflow-hidden min-h-0">

            {/* ── COL 1: Customer Details ── */}
            <div className="w-[22%] border-r border-[#EFEFEF] flex flex-col overflow-y-auto bg-white">
              <div className="px-8 py-6 space-y-7">

                {/* Search — Phone / Name only (Barcode removed) */}
                <section>
                  <p className="text-xs font-bold text-[#9B9B9B] uppercase tracking-widest mb-3">Search Customer</p>
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9B9B9B]" />
                    <Input
                      placeholder="Search by phone or name…"
                      value={customerSearch}
                      onChange={(e) => setCustomerSearch(e.target.value)}
                      className="pl-11 h-11 text-sm rounded-xl border-[#D4AF37]/25 focus:border-[#D4AF37]/60 bg-[#FAFAFA]"
                    />
                  </div>
                  <p className="text-[10px] text-[#9B9B9B] mt-2">Enter phone number or customer name to search</p>
                  {customerSearch && (
                    <div className="mt-3 rounded-xl border border-[#EFEFEF] bg-[#FAF8F2] px-3 py-2 text-[11px] text-[#3f3f46]">
                      Customer search results can be loaded from the customer application for online appointments.
                    </div>
                  )}
                </section>

                {/* Appointment Type */}
                <section>
                  <p className="text-xs font-bold text-[#9B9B9B] uppercase tracking-widest mb-4">Appointment Type</p>
                  <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-[#FAF8F2] mb-3">
                    {(["Online Appointment", "Walk-in"] as const).map((m) => (
                      <button
                        key={m}
                        onClick={() => setMode(m)}
                        className={cn(
                          "rounded-lg py-2.5 text-sm font-medium transition-colors",
                          mode === m ? "bg-[#121212] text-[#D4AF37] font-semibold" : "text-[#3f3f46] hover:text-[#121212]"
                        )}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                  <p className="text-[11px] text-[#3f3f46] leading-5">
                    {mode === "Online Appointment"
                      ? "Online appointments are pulled from the customer application when a matching customer is selected."
                      : "Walk-in bookings create a direct customer record in this salon workflow."}
                  </p>
                  {mode === "Walk-in" && (
                    <div className="grid grid-cols-2 gap-3 mt-4">
                      <div>
                        <label className="text-xs font-semibold text-[#555555] block mb-2">Date</label>
                        <Input
                          type="date"
                          value={date}
                          onChange={(e) => setDate(e.target.value)}
                          className="h-11 text-sm rounded-xl border-[#D4AF37]/25 focus:border-[#D4AF37]/60 bg-[#FAFAFA]"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-[#555555] block mb-2">Time</label>
                        <Input
                          type="time"
                          value={time}
                          onChange={(e) => setTime(e.target.value)}
                          className="h-11 text-sm rounded-xl border-[#D4AF37]/25 focus:border-[#D4AF37]/60 bg-[#FAFAFA]"
                        />
                      </div>
                    </div>
                  )}
                </section>

                {/* Customer Details (shown for walk-in bookings) */}
                {mode === "Walk-in" && (
                  <section>
                    <p className="text-xs font-bold text-[#9B9B9B] uppercase tracking-widest mb-4">Customer Details</p>
                    <div className="space-y-4">
                      <div>
                        <label className="text-xs font-semibold text-[#555555] block mb-2">
                          Full Name <span className="text-red-500">*</span>
                        </label>
                        <Input
                          placeholder="Enter full name"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="h-11 text-sm rounded-xl border-[#D4AF37]/25 focus:border-[#D4AF37]/60 bg-[#FAFAFA]"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-[#555555] block mb-2">
                          Phone Number <span className="text-red-500">*</span>
                        </label>
                        <div className="flex gap-2">
                          <span className="inline-flex items-center px-3 rounded-xl border border-[#D4AF37]/25 bg-[#FAFAFA] text-sm text-[#3f3f46] shrink-0">+91</span>
                          <Input
                            placeholder="98765 00000"
                            value={phone.replace(/^\+91\s?/,"")}
                            onChange={(e) => setPhone("+91 " + e.target.value)}
                            className="flex-1 h-11 text-sm rounded-xl border-[#D4AF37]/25 focus:border-[#D4AF37]/60 bg-[#FAFAFA]"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-[#555555] block mb-2">Email Address</label>
                        <Input
                          placeholder="Enter email address"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="h-11 text-sm rounded-xl border-[#D4AF37]/25 focus:border-[#D4AF37]/60 bg-[#FAFAFA]"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-semibold text-[#555555] block mb-2">
                            Gender <span className="text-red-500">*</span>
                          </label>
                          <div className="relative">
                            <select
                              value={gender}
                              onChange={(e) => setGender(e.target.value)}
                              className="w-full h-11 text-sm rounded-xl border border-[#D4AF37]/25 bg-[#FAFAFA] px-4 appearance-none text-[#121212] focus:outline-none focus:border-[#D4AF37]/60"
                            >
                              <option value="">Select</option>
                              <option value="Male">Male</option>
                              <option value="Female">Female</option>
                              <option value="Other">Other</option>
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#3f3f46] pointer-events-none" />
                          </div>
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-[#555555] block mb-2">Date of Birth</label>
                          <Input
                            type="date"
                            value={dob}
                            onChange={(e) => setDob(e.target.value)}
                            className="h-11 text-sm rounded-xl border-[#D4AF37]/25 focus:border-[#D4AF37]/60 bg-[#FAFAFA]"
                          />
                        </div>
                      </div>
                    </div>
                  </section>
                )}

              </div>
            </div>

            {/* ── COL 2: Service Menu ── */}
            <div className="w-[26%] border-r border-[#EFEFEF] flex flex-col overflow-hidden bg-white">
              <div className="px-8 py-6 shrink-0 space-y-4">
                <p className="text-xs font-bold text-[#9B9B9B] uppercase tracking-widest">Service Menu</p>

                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9B9B9B]" />
                  <Input
                    placeholder="Search services by name or price…"
                    value={serviceSearch}
                    onChange={(e) => setServiceSearch(e.target.value)}
                    className="pl-11 h-11 text-sm rounded-xl border-[#D4AF37]/25 focus:border-[#D4AF37]/60 bg-[#FAFAFA]"
                  />
                </div>

                <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-[#FAF8F2]">
                  {genderTabs.map((g) => (
                    <button
                      key={g}
                      onClick={() => setGenderTab(g)}
                      className={cn(
                        "rounded-lg py-2.5 text-sm font-medium transition-colors",
                        genderTab === g ? "bg-[#121212] text-[#D4AF37] font-semibold" : "text-[#3f3f46] hover:text-[#121212]"
                      )}
                    >
                      {g}
                    </button>
                  ))}
                </div>

                <div className="flex gap-6 border-b border-[#EFEFEF] pb-1">
                  {tabOptions.map((t) => (
                    <button
                      key={t}
                      onClick={() => setActiveTab(t)}
                      className={cn(
                        "text-sm font-medium pb-3 border-b-2 -mb-1 transition-colors",
                        activeTab === t
                          ? "border-[#121212] text-[#121212] font-semibold"
                          : "border-transparent text-[#3f3f46] hover:text-[#121212]"
                      )}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-8 pb-6">
                {activeTab === "Services" ? (
                  <div className="space-y-2">
                    {filteredServices.map((s) => (
                      <div
                        key={s.id}
                        className="flex items-center justify-between gap-4 rounded-xl px-5 py-4 hover:bg-[#FAF8F2] border border-transparent hover:border-[#D4AF37]/20 transition-all cursor-pointer"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <div className="min-w-0">
                              {(s.category || s.serviceGroup) && (
                                <p className="text-[10px] font-semibold uppercase tracking-wide text-[#52525b]">
                                  {[s.category, s.serviceGroup].filter(Boolean).join(" · ")}
                                </p>
                              )}
                              <p className="text-sm font-semibold text-[#121212]">
                                {s.displayName || s.name}
                              </p>
                            </div>
                            {s.tag && (
                              <Badge className="bg-[#121212] text-[#D4AF37] border-0 text-[10px] px-2 py-0.5 rounded-lg">
                                {s.tag}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-[#3f3f46] mt-1">
                            ₹{s.price.toFixed(2)}{" "}
                            <span className="text-[#D4AF37] font-semibold">· Member ₹{s.memberPrice.toFixed(2)}</span>
                          </p>
                        </div>
                        <button
                          onClick={() => addService(s)}
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#121212] text-[#D4AF37] hover:bg-[#2d2d2d] transition-colors shadow-sm"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                    {filteredServices.length === 0 && (
                      <div className="flex items-center justify-center h-40 text-sm text-[#3f3f46]">
                        No services found.
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-48 text-sm text-[#3f3f46]">
                    No {activeTab.toLowerCase()} available.
                  </div>
                )}
              </div>
            </div>

            {/* ── COL 3: Selected Services + Bill + Billing Options ── */}
            <div className="w-[26%] border-r border-[#EFEFEF] flex flex-col overflow-hidden bg-white">
              <div className="px-8 py-6 shrink-0">
                <p className="text-xs font-bold text-[#9B9B9B] uppercase tracking-widest mb-4">Selected Services</p>
              </div>

              <div className="flex-1 overflow-y-auto px-8 pb-4">
                {selected.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-40 rounded-2xl border-2 border-dashed border-[#D4AF37]/25 bg-[#FAF8F2]/40">
                    <div className="text-3xl mb-2">✂️</div>
                    <p className="text-sm font-medium text-[#9B9B9B]">No services added yet</p>
                    <p className="text-xs text-[#9B9B9B] mt-1">Select from the menu</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selected.map((s) => (
                      <div
                        key={s.name}
                        className="rounded-xl border border-[#D4AF37]/20 px-5 py-4 bg-[#FAF8F2]/60"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <p className="text-sm font-semibold text-[#121212] flex-1">{s.name}</p>
                          <button
                            onClick={() => removeService(s.name)}
                            className="text-[#9B9B9B] hover:text-red-500 transition-colors p-1 rounded-lg hover:bg-white shrink-0"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => adjustQty(s.name, -1)}
                              className="w-7 h-7 rounded-lg bg-white border border-[#D4AF37]/30 text-[#121212] font-bold text-sm flex items-center justify-center hover:bg-[#121212] hover:text-[#D4AF37] transition-colors"
                            >−</button>
                            <span className="text-sm font-bold text-[#121212] w-5 text-center">{s.qty}</span>
                            <button
                              onClick={() => adjustQty(s.name, 1)}
                              className="w-7 h-7 rounded-lg bg-white border border-[#D4AF37]/30 text-[#121212] font-bold text-sm flex items-center justify-center hover:bg-[#121212] hover:text-[#D4AF37] transition-colors"
                            >+</button>
                          </div>
                          <span className="text-sm font-bold text-[#121212]">₹{(s.price * s.qty).toFixed(2)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Billing Options + Bill Summary */}
              <div className="shrink-0 px-8 py-5 border-t border-[#EFEFEF] space-y-4 bg-white overflow-y-auto max-h-[55%]">

                {/* GST */}
                <div className="rounded-xl border border-[#EFEFEF] bg-[#FAFAFA] p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Percent className="h-4 w-4 text-[#D4AF37]" />
                      <span className="text-sm font-semibold text-[#121212]">Add GST</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={applyGST}
                        onChange={(e) => setApplyGST(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-10 h-5 bg-[#EFEFEF] peer-checked:bg-[#121212] rounded-full transition-colors relative after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-5" />
                    </label>
                  </div>
                  {applyGST && (
                    <div className="mt-3 flex items-center gap-2">
                      <span className="text-xs text-[#3f3f46]">GST Rate (%)</span>
                      <div className="flex gap-1 ml-auto">
                        {[5, 12, 18, 28].map((r) => (
                          <button
                            key={r}
                            onClick={() => setGstRate(r)}
                            className={cn(
                              "px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors",
                              gstRate === r ? "bg-[#121212] text-[#D4AF37]" : "bg-white border border-[#EFEFEF] text-[#3f3f46] hover:border-[#D4AF37]/30"
                            )}
                          >{r}%</button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Loyalty Points */}
                <div className="rounded-xl border border-[#EFEFEF] bg-[#FAFAFA] p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Star className="h-4 w-4 text-[#D4AF37]" />
                      <span className="text-sm font-semibold text-[#121212]">Loyalty Points</span>
                      <span className="text-xs text-[#9B9B9B]">({loyaltyPoints} pts)</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={applyLoyalty}
                        onChange={(e) => setApplyLoyalty(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-10 h-5 bg-[#EFEFEF] peer-checked:bg-[#121212] rounded-full transition-colors relative after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-5" />
                    </label>
                  </div>
                  {applyLoyalty && (
                    <div className="mt-3 space-y-2">
                      <p className="text-xs text-[#3f3f46]">Redeem points (10 pts = ₹1, max 10% of bill)</p>
                      <Input
                        type="number"
                        placeholder="Enter points to redeem"
                        value={pointsToRedeem || ""}
                        onChange={(e) => setPointsToRedeem(Math.min(Number(e.target.value), loyaltyPoints))}
                        max={loyaltyPoints}
                        className="h-9 text-sm rounded-xl border-[#D4AF37]/25"
                      />
                      {pointsToRedeem > 0 && (
                        <p className="text-xs text-[#D4AF37] font-semibold">Savings: ₹{loyaltyValue.toFixed(2)}</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Coupon */}
                <div className="rounded-xl border border-[#EFEFEF] bg-[#FAFAFA] p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Tag className="h-4 w-4 text-[#D4AF37]" />
                      <span className="text-sm font-semibold text-[#121212]">Apply Coupon</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={applyCoupon}
                        onChange={(e) => { setApplyCoupon(e.target.checked); if (!e.target.checked) { setCouponApplied(false); setCouponCode(""); } }}
                        className="sr-only peer"
                      />
                      <div className="w-10 h-5 bg-[#EFEFEF] peer-checked:bg-[#121212] rounded-full transition-colors relative after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-5" />
                    </label>
                  </div>
                  {applyCoupon && (
                    <div className="mt-3">
                      {!couponApplied ? (
                        <div className="flex gap-2">
                          <Input
                            placeholder="Enter coupon code"
                            value={couponCode}
                            onChange={(e) => setCouponCode(e.target.value)}
                            className="h-9 text-sm rounded-xl border-[#D4AF37]/25 flex-1"
                          />
                          <Button onClick={applyCouponCode} size="sm" className="h-9 px-4 rounded-xl bg-[#121212] text-[#D4AF37] text-xs">Apply</Button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between bg-[#FAF8F2] border border-[#D4AF37]/30 rounded-xl px-3 py-2">
                          <span className="text-xs font-semibold text-[#121212]">"{couponCode.toUpperCase()}" applied — {couponDiscount > 100 ? `₹${couponDiscount}` : `${couponDiscount}%`} off</span>
                          <button onClick={() => { setCouponApplied(false); setCouponCode(""); }} className="text-[#9B9B9B] hover:text-[#121212]"><X className="h-3.5 w-3.5" /></button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Gift Card */}
                <div className="rounded-xl border border-[#EFEFEF] bg-[#FAFAFA] p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Gift className="h-4 w-4 text-[#D4AF37]" />
                      <span className="text-sm font-semibold text-[#121212]">Gift Card</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={applyGiftCard}
                        onChange={(e) => { setApplyGiftCard(e.target.checked); if (!e.target.checked) { setGiftCardApplied(false); setGiftCardCode(""); } }}
                        className="sr-only peer"
                      />
                      <div className="w-10 h-5 bg-[#EFEFEF] peer-checked:bg-[#121212] rounded-full transition-colors relative after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-5" />
                    </label>
                  </div>
                  {applyGiftCard && (
                    <div className="mt-3">
                      {!giftCardApplied ? (
                        <div className="flex gap-2">
                          <Input
                            placeholder="Enter gift card code"
                            value={giftCardCode}
                            onChange={(e) => setGiftCardCode(e.target.value)}
                            className="h-9 text-sm rounded-xl border-[#D4AF37]/25 flex-1"
                          />
                          <Button onClick={applyGiftCardCode} size="sm" className="h-9 px-4 rounded-xl bg-[#121212] text-[#D4AF37] text-xs">Redeem</Button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between bg-[#FAF8F2] border border-[#D4AF37]/30 rounded-xl px-3 py-2">
                          <span className="text-xs font-semibold text-[#121212]">Gift card — ₹{giftCardValue.toFixed(2)} applied</span>
                          <button onClick={() => { setGiftCardApplied(false); setGiftCardCode(""); }} className="text-[#9B9B9B] hover:text-[#121212]"><X className="h-3.5 w-3.5" /></button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Payment Method — same UI as Billing */}
                <PaymentMethodPicker
                  amountDue={total}
                  value={payMethod}
                  onChange={setPayMethod}
                  upiNote={`${BRAND.appName} appointment`}
                />

                {/* Bill Summary */}
                <div>
                  <p className="text-xs font-bold text-[#9B9B9B] uppercase tracking-widest mb-3">Bill Summary</p>
                  <div className="rounded-xl border border-[#D4AF37]/20 bg-[#FAF8F2]/60 px-5 py-4 space-y-2">
                    <div className="flex justify-between text-sm text-[#3f3f46]">
                      <span>Subtotal</span>
                      <span>₹{subtotal.toFixed(2)}</span>
                    </div>
                    {loyaltyValue > 0 && (
                      <div className="flex justify-between text-sm text-green-600">
                        <span>Loyalty Discount</span>
                        <span>−₹{loyaltyValue.toFixed(2)}</span>
                      </div>
                    )}
                    {couponValue > 0 && (
                      <div className="flex justify-between text-sm text-green-600">
                        <span>Coupon Discount</span>
                        <span>−₹{couponValue.toFixed(2)}</span>
                      </div>
                    )}
                    {giftCardValue > 0 && (
                      <div className="flex justify-between text-sm text-green-600">
                        <span>Gift Card</span>
                        <span>−₹{giftCardValue.toFixed(2)}</span>
                      </div>
                    )}
                    {applyGST && (
                      <div className="flex justify-between text-sm text-[#3f3f46]">
                        <span>GST ({gstRate}%)</span>
                        <span>+₹{gstAmount.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-base font-bold text-[#121212] pt-2 border-t border-[#D4AF37]/20 mt-2">
                      <span>Total Amount</span>
                      <span className="text-[#D4AF37]">₹{total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="text-xs font-bold text-[#9B9B9B] uppercase tracking-widest block mb-2">
                    Notes (Optional)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add any additional notes…"
                    className="w-full h-20 text-sm rounded-xl border border-[#D4AF37]/25 px-4 py-3 resize-none text-[#121212] placeholder:text-[#9B9B9B] focus:outline-none focus:border-[#D4AF37]/60 bg-[#FAFAFA]"
                  />
                </div>
              </div>
            </div>

            {/* ── COL 4: Notification ── */}
            <div className="flex-1 flex flex-col overflow-y-auto bg-[#FAFAFA]">
              <div className="px-8 py-6 space-y-6">

                {/* Notify Customer */}
                <div className="rounded-2xl border border-[#D4AF37]/30 bg-white p-6 shadow-sm">
                  <p className="text-xs font-bold text-[#9B9B9B] uppercase tracking-widest mb-4">Notify Customer</p>
                  <p className="text-sm text-[#3f3f46] mb-4 leading-relaxed">
                    Choose how to send the appointment confirmation to the customer.
                  </p>
                  <div className="space-y-3">
                    {[
                      { value: "whatsapp", icon: MessageCircle, label: "WhatsApp", desc: "Send via WhatsApp message" },
                      { value: "sms", icon: Phone, label: "SMS", desc: "Send via text message" },
                      { value: "both", icon: MessageCircle, label: "WhatsApp + SMS", desc: "Send via both channels" },
                      { value: "none", icon: X, label: "Don't Notify", desc: "Skip notification" },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setNotifyMethod(opt.value as NotificationMethod)}
                        className={cn(
                          "w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all",
                          notifyMethod === opt.value
                            ? "bg-[#121212] border-[#121212] text-white"
                            : "bg-white border-[#EFEFEF] hover:border-[#D4AF37]/40 text-[#3D3D3D]"
                        )}
                      >
                        <opt.icon className={cn("h-4 w-4 shrink-0", notifyMethod === opt.value ? "text-[#D4AF37]" : "text-[#9B9B9B]")} />
                        <div>
                          <p className={cn("text-sm font-semibold", notifyMethod === opt.value ? "text-white" : "text-[#121212]")}>{opt.label}</p>
                          <p className={cn("text-xs", notifyMethod === opt.value ? "text-[#D4AF37]/80" : "text-[#9B9B9B]")}>{opt.desc}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                  {notifyMethod !== "none" && phone && (
                    <div className="mt-4 rounded-xl bg-[#FAF8F2] border border-[#D4AF37]/25 px-4 py-3 flex items-center gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-[#D4AF37] shrink-0" />
                      <p className="text-xs font-semibold text-[#121212]">Message will be sent to: {phone}</p>
                    </div>
                  )}
                  {notifyMethod !== "none" && !phone && (
                    <div className="mt-4 rounded-xl bg-[#FAF8F2] border border-[#D4AF37]/15 px-4 py-3">
                      <p className="text-xs text-[#9B9B9B]">Enter a phone number in Customer Details to enable notifications.</p>
                    </div>
                  )}
                </div>

                {/* Appointment Summary Preview */}
                <div className="rounded-2xl border border-[#EFEFEF] bg-white p-6 shadow-sm">
                  <p className="text-xs font-bold text-[#9B9B9B] uppercase tracking-widest mb-4">Appointment Preview</p>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-[#9B9B9B]">Customer</span>
                      <span className="font-semibold text-[#121212]">{name || "—"}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-[#9B9B9B]">Phone</span>
                      <span className="font-semibold text-[#121212]">{phone || "—"}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-[#9B9B9B]">Type</span>
                      <span className="font-semibold text-[#121212]">{mode}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-[#9B9B9B]">Date & Time</span>
                      <span className="font-semibold text-[#121212]">{date && time ? `${date} at ${time}` : "—"}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-[#9B9B9B]">Services</span>
                      <span className="font-semibold text-[#121212]">{selected.length} selected</span>
                    </div>
                    <div className="pt-3 border-t border-[#EFEFEF] flex justify-between text-sm">
                      <span className="text-[#9B9B9B]">Total</span>
                      <span className="font-bold text-[#D4AF37] text-base">₹{total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── FOOTER ── */}
          <div className="flex items-center justify-between px-10 py-5 border-t border-[#EFEFEF] bg-white shrink-0">
            <div className="flex items-center gap-3">
              <div className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium",
                selected.length > 0
                  ? "bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/30"
                  : "bg-[#FAF8F2] text-[#9B9B9B] border border-[#EFEFEF]"
              )}>
                {selected.length > 0 ? `${selected.length} service${selected.length > 1 ? "s" : ""} · ₹${total.toFixed(2)}` : "No services selected"}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="h-11 px-7 rounded-xl border-[#D4AF37]/30 text-[#121212] hover:bg-[#FAF8F2] font-medium"
              >
                Cancel
              </Button>
              <Button
                variant="outline"
                className="h-11 px-7 rounded-xl border-[#D4AF37]/30 text-[#121212] hover:bg-[#FAF8F2] font-medium"
                onClick={handleSaveDraft}
              >
                Save as Draft
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={!canConfirm}
                className="h-11 px-8 rounded-xl bg-[#121212] text-[#D4AF37] hover:bg-[#2d2d2d] font-bold shadow-md disabled:opacity-40"
              >
                Confirm Appointment
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── CONFIRMATION POPUP ── */}
      {showConfirmation && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl p-10 max-w-md w-full mx-4 text-center">
            {/* Gold success ring */}
            <div className="flex items-center justify-center mb-5">
              <div className="relative h-20 w-20">
                <div className="h-20 w-20 rounded-full bg-[#D4AF37]/12 border-2 border-[#D4AF37]/30 flex items-center justify-center">
                  <CheckCircle2 className="h-10 w-10 text-[#D4AF37]" />
                </div>
                <div className="absolute inset-0 rounded-full animate-ping bg-[#D4AF37]/10" style={{ animationDuration: "1.5s", animationIterationCount: 1 }} />
              </div>
            </div>

            <h3 className="text-2xl font-bold text-[#121212] mb-1 tracking-tight">Appointment Confirmed!</h3>
            <p className="text-[#3f3f46] text-sm">
              <span className="font-semibold text-[#121212]">{name || "Customer"}</span>'s appointment has been successfully booked.
            </p>

            {notifyMethod !== "none" && phone && (
              <div className="mt-4 rounded-xl border border-[#D4AF37]/25 bg-[#FAF8F2] px-4 py-3 text-left flex items-center gap-2">
                <MessageCircle className="h-4 w-4 text-[#D4AF37] shrink-0" />
                <p className="text-xs text-[#3f3f46] font-medium">
                  Confirmation sent via{" "}
                  <span className="text-[#121212] font-semibold">
                    {notifyMethod === "whatsapp" ? "WhatsApp" : notifyMethod === "sms" ? "SMS" : "WhatsApp & SMS"}
                  </span>{" "}
                  to {phone}
                </p>
              </div>
            )}

            {/* Summary */}
            <div className="mt-5 rounded-xl border border-[#D4AF37]/20 bg-[#FAF8F2] px-5 py-4 text-left space-y-2.5">
              <div className="flex justify-between text-sm">
                <span className="text-[#9B9B9B]">Services</span>
                <span className="font-semibold text-[#121212]">{selected.length} selected</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[#9B9B9B]">Date & Time</span>
                <span className="font-semibold text-[#121212]">{date && time ? `${date} · ${time}` : "Walk-in"}</span>
              </div>
              <div className="flex justify-between text-sm pt-2.5 border-t border-[#D4AF37]/20">
                <span className="text-[#9B9B9B] font-semibold">Total Amount</span>
                <span className="font-bold text-[#D4AF37] text-base tabular-nums">₹{total.toFixed(2)}</span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="mt-6 space-y-2.5">
              <div className="grid grid-cols-2 gap-2">
                <Button
                  onClick={handleCloseConfirmation}
                  className="h-11 rounded-xl bg-[#121212] text-[#D4AF37] hover:bg-[#1e1e1e] font-semibold text-sm border border-[#D4AF37]/25"
                >
                  <CheckCircle2 className="h-4 w-4 mr-1.5" /> Done
                </Button>
                <Button
                  variant="outline"
                  onClick={() => { alert("WhatsApp confirmation sent to " + phone); }}
                  className="h-11 rounded-xl border-[#D4AF37]/30 text-[#121212] hover:bg-[#FAF8F2] hover:border-[#D4AF37]/60 font-semibold text-sm"
                >
                  <MessageCircle className="h-4 w-4 mr-1.5 text-[#D4AF37]" /> WhatsApp
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  onClick={() => { alert("SMS sent to " + phone); }}
                  className="h-11 rounded-xl border-[#D4AF37]/30 text-[#121212] hover:bg-[#FAF8F2] hover:border-[#D4AF37]/60 font-semibold text-sm"
                >
                  <Phone className="h-4 w-4 mr-1.5 text-[#D4AF37]" /> Send SMS
                </Button>
                <Button
                  variant="outline"
                  onClick={() => { window.print(); }}
                  className="h-11 rounded-xl border-[#D4AF37]/30 text-[#121212] hover:bg-[#FAF8F2] hover:border-[#D4AF37]/60 font-semibold text-sm"
                >
                  🖨️ Print Receipt
                </Button>
              </div>
              <Button
                onClick={() => {
                  setShowConfirmation(false);
                  setSelected([]);
                  setName("");
                  setPhone("");
                  setDate("");
                  setTime("");
                }}
                variant="outline"
                className="w-full h-10 rounded-xl border-[#D4AF37]/20 text-[#9B9B9B] hover:text-[#121212] hover:border-[#D4AF37]/40 font-semibold text-sm"
              >
                + Book Another Appointment
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
