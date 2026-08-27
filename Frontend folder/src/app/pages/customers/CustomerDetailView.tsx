import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import type { NavigateFunction } from "react-router";
import {
  User, Star, Crown, Phone, Mail, Calendar, Heart,
  UserPlus, Cake, Award, Edit, MessageSquare,
  ShieldCheck, Bell, LayoutGrid, ArrowLeft, Clock, IndianRupee, Sparkles, TrendingUp,
  Download,
} from "lucide-react";
import { formatDisplayPhone } from "../../../lib/phone";
import { PageStatCard } from "../../components/shared/PageStatCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import {
  financeGoldBtn,
  financePanel,
  financePanelHeader,
  financePanelTitle,
  financeIconWrap,
  financePrimaryBtn,
} from "../finance/finance-ui";
import { type Customer, fetchCustomerVisits, type CustomerVisit } from "../../../api/customers";
import { SEGMENTED_PILL_LIST, SEGMENTED_PILL_TRIGGER } from "../../components/layout/segmented-nav";
import { cn } from "../../components/ui/utils";
import { downloadReceiptBill } from "../../lib/downloadReceipt";
import { toIstDateKey } from "../../../lib/istDate";
import { useReceiptShopInfo } from "../../components/shared/SalonReceiptBrand";
import { toast } from "../../components/ui/hot-toast";
import {
  membershipColors,
  tierAvatarRing,
  tierHeroGlow,
  DetailMetricChip,
  InfoFieldCard,
  isBirthdayToday,
  getInactiveDays,
  getInactivityLabel,
  isNewCustomer,
  customerBookingPath,
  type MembershipBenefitInfo,
} from "./customerHelpers";

export function CustomerDetailView({
  customer,
  membershipBenefits: _membershipBenefits,
  onBack,
  onEdit,
  onNotify,
  onCoupon: _onCoupon,
  onLoyalty,
  onToggleStatus,
  navigate,
}: {
  customer: Customer;
  membershipBenefits: Record<string, MembershipBenefitInfo>;
  onBack: () => void;
  onEdit: () => void;
  onNotify: (c: Customer) => void;
  onCoupon: (c: Customer) => void;
  onLoyalty: (c: Customer) => void;
  onToggleStatus: (c: Customer) => void;
  navigate: NavigateFunction;
}) {
  const genderIcon = (g: string) => (g === "male" ? "♂" : g === "female" ? "♀" : "⚧");
  const genderColor = (g: string) =>
    g === "male"
      ? "bg-[#FAF8F2] text-[#111118] border-black/[0.08]"
      : g === "female"
        ? "bg-[#FFFBEB] text-[#9a7d20] border-[#D4AF37]/20"
        : "bg-[#f4f2ed] text-[#3f3f46] border-black/[0.08]";
  const inactiveDays = getInactiveDays(customer);
  const shopInfo = useReceiptShopInfo();
  const [visits, setVisits] = useState<CustomerVisit[]>([]);
  const [visitsLoading, setVisitsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setVisitsLoading(true);
    fetchCustomerVisits(customer.id)
      .then((data) => {
        if (!cancelled) setVisits(data);
      })
      .catch(() => {
        if (!cancelled) setVisits([]);
      })
      .finally(() => {
        if (!cancelled) setVisitsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [customer.id]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="space-y-5"
    >
      {/* Top bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex w-fit items-center gap-1.5 rounded-xl border border-black/[0.08] bg-white px-3 py-2 text-[12px] font-semibold text-[#111118] shadow-sm transition-all hover:border-[#D4AF37]/35 hover:bg-[#FAF8F2]"
        >
          <ArrowLeft className="h-4 w-4 text-[#D4AF37]" />
          Back to customers
        </button>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={onEdit} className={`${financePrimaryBtn} h-9 px-3 text-[11px] inline-flex items-center gap-1.5`}>
            <Edit className="h-3.5 w-3.5" /> Edit
          </button>
          <button
            type="button"
            onClick={() => onNotify(customer)}
            className="h-9 px-3 rounded-xl border border-black/[0.08] bg-white text-[11px] font-semibold text-[#3f3f46] hover:border-[#D4AF37]/35 hover:bg-[#FAF8F2] inline-flex items-center gap-1.5 transition-all"
          >
            <Bell className="h-3.5 w-3.5 text-[#D4AF37]" /> Notify
          </button>
          <button
            type="button"
            onClick={() => navigate(`/feedback?customer=${encodeURIComponent(customer.name)}`)}
            className="h-9 px-3 rounded-xl border border-black/[0.08] bg-white text-[11px] font-semibold text-[#3f3f46] hover:border-[#D4AF37]/35 hover:bg-[#FAF8F2] inline-flex items-center gap-1.5 transition-all"
          >
            <MessageSquare className="h-3.5 w-3.5 text-[#D4AF37]" /> Feedback
          </button>
          <button
            type="button"
            onClick={() => navigate(customerBookingPath(customer))}
            className={`${financeGoldBtn} h-9 inline-flex items-center gap-1.5`}
            title={isNewCustomer(customer) ? "Book as walk-in (new customer)" : "Book appointment (returning customer)"}
          >
            <Calendar className="h-3.5 w-3.5" />
            {isNewCustomer(customer) ? "Book Walk-in" : "Book"}
          </button>
        </div>
      </div>

      {/* Profile hero */}
      <div className="relative overflow-hidden rounded-2xl border border-[#D4AF37]/20 bg-gradient-to-br from-[#111118] via-[#16161f] to-[#0d0d14] shadow-[0_16px_48px_rgba(17,17,24,0.18)]">
        <div className={cn("pointer-events-none absolute inset-0", tierHeroGlow[customer.membershipTier])} />
        <div className="pointer-events-none absolute -top-24 -right-24 h-56 w-56 rounded-full bg-[#D4AF37]/[0.07] blur-3xl" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#D4AF37]/50 to-transparent" />

        <div className="relative p-5 sm:p-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
            <div
              className={cn(
                "flex h-[72px] w-[72px] sm:h-20 sm:w-20 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#D4AF37] to-[#9a7d20] text-[#111118] font-bold text-xl sm:text-2xl",
                tierAvatarRing[customer.membershipTier],
              )}
            >
              {customer.name.split(" ").map((n) => n[0]).join("")}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-2xl sm:text-[1.65rem] font-bold text-white tracking-tight">{customer.name}</h2>
                {customer.status === "inactive" && (
                  <span className="rounded-full border border-red-400/30 bg-red-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-red-300">
                    Inactive
                  </span>
                )}
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-2">
                <button type="button" onClick={() => onLoyalty(customer)} className="group">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] transition-all group-hover:scale-[1.02]",
                      membershipColors[customer.membershipTier],
                    )}
                  >
                    {customer.membershipTier === "platinum" && <Crown className="h-3 w-3" />}
                    {customer.membershipTier}
                  </span>
                </button>
                <span className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-semibold", genderColor(customer.gender))}>
                  {genderIcon(customer.gender)} {customer.gender}
                </span>
                {isBirthdayToday(customer.birthday) && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-pink-300/40 bg-pink-500/15 px-2.5 py-1 text-[10px] font-semibold text-pink-200">
                    🎂 Birthday today
                  </span>
                )}
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-4">
                <DetailMetricChip icon={Star} label="Rating" value={`${customer.satisfaction}/5`} highlight />
                <DetailMetricChip icon={Award} label="Loyalty pts" value={customer.loyaltyPoints.toLocaleString("en-IN")} />
                <DetailMetricChip icon={TrendingUp} label="Total spent" value={`₹${customer.totalSpend.toLocaleString("en-IN")}`} />
                <DetailMetricChip icon={Clock} label="Last visit" value={getInactivityLabel(inactiveDays)} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className={SEGMENTED_PILL_LIST}>
          <TabsTrigger value="overview" className={SEGMENTED_PILL_TRIGGER}>
            <LayoutGrid className="h-3.5 w-3.5" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="history" className={SEGMENTED_PILL_TRIGGER}>
            <Clock className="h-3.5 w-3.5" />
            History
          </TabsTrigger>
          <TabsTrigger value="loyalty" className={SEGMENTED_PILL_TRIGGER} onClick={() => onLoyalty(customer)}>
            <Crown className="h-3.5 w-3.5" />
            Loyalty
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 mt-0">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <PageStatCard label="Total Visits" value={customer.totalVisits} sub="Lifetime visits" icon={Calendar} index={0} />
            <PageStatCard label="Total Spent" value={`₹${customer.totalSpend.toLocaleString("en-IN")}`} sub="Lifetime revenue" icon={IndianRupee} index={1} />
            <PageStatCard label="Loyalty Points" value={customer.loyaltyPoints} sub={`${customer.membershipTier} tier`} icon={Award} index={2} className="sm:col-span-2 lg:col-span-1" />
          </div>

          <div className={`${financePanel}`}>
            <div className={financePanelHeader}>
              <p className={financePanelTitle}>Contact & profile</p>
            </div>
            <div className="grid gap-3 p-4 sm:grid-cols-2">
              <InfoFieldCard icon={Phone} label="Phone" value={formatDisplayPhone(customer.phone)} />
              <InfoFieldCard icon={Mail} label="Email" value={customer.email} />
              <InfoFieldCard
                icon={Cake}
                label="Birthday"
                value={
                  customer.birthday
                    ? new Date(customer.birthday).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })
                    : "—"
                }
              />
              <InfoFieldCard icon={UserPlus} label="Member since" value={new Date(customer.joinDate).toLocaleDateString("en-IN")} />
              <InfoFieldCard icon={Heart} label="Favourite service" value={customer.favoriteService} />
            </div>
          </div>

          {customer.address && (
            <div className={`${financePanel} p-4`}>
              <div className="flex items-start gap-3">
                <div className={financeIconWrap}>
                  <User className="h-4 w-4 text-[#D4AF37]" />
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#52525b]">Address</p>
                  <p className="mt-1 text-sm font-medium text-[#111118]">{customer.address}</p>
                </div>
              </div>
            </div>
          )}

          {customer.notes && (
            <div className="rounded-xl border border-[#D4AF37]/25 bg-[#FFFBEB] p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#D4AF37]/15 border border-[#D4AF37]/25">
                  <ShieldCheck className="h-4 w-4 text-[#9a7d20]" />
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#9a7d20]">Notes / allergies</p>
                  <p className="mt-1 text-sm font-medium text-[#111118]">{customer.notes}</p>
                </div>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={() => onToggleStatus(customer)}
            className={cn(
              "h-10 rounded-xl px-4 text-[12px] font-semibold transition-all",
              customer.status === "active"
                ? "border border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                : `${financeGoldBtn} inline-flex items-center`,
            )}
          >
            {customer.status === "active" ? "Deactivate customer" : "Activate customer"}
          </button>
        </TabsContent>

        <TabsContent value="history" className="mt-0">
          <div className={`${financePanel} divide-y divide-black/[0.06]`}>
            {visitsLoading && (
              <div className="p-8 text-center text-sm text-muted-foreground">Loading visit history...</div>
            )}
            {!visitsLoading && visits.length === 0 && (
              <div className="p-8 text-center">
                <p className="text-sm text-muted-foreground">No visit history yet for this customer.</p>
              </div>
            )}
            {!visitsLoading &&
              visits.map((visit) => {
                const receiptNo =
                  visit.type === "invoice" && typeof visit.meta.receiptNumber === "string"
                    ? visit.meta.receiptNumber
                    : null;
                const services = Array.isArray(visit.meta.services)
                  ? (visit.meta.services as string[])
                  : [];
                const paymentMethod =
                  typeof visit.meta.paymentMethod === "string" ? visit.meta.paymentMethod : undefined;
                const visitDate = new Date(visit.date);
                const dateStr = visitDate.toLocaleDateString("en-IN", {
                  timeZone: "Asia/Kolkata",
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                });
                const timeStr = visitDate.toLocaleTimeString("en-IN", {
                  timeZone: "Asia/Kolkata",
                  hour: "2-digit",
                  minute: "2-digit",
                });

                const handleDownload = () => {
                  if (!receiptNo) return;
                  const ok = downloadReceiptBill(
                    {
                      receiptNo,
                      date: toIstDateKey(visitDate),
                      time: timeStr,
                      customer: customer.name,
                      phone: customer.phone,
                      services: services.length ? services : [visit.label],
                      total: visit.amount,
                      paymentMethod,
                    },
                    shopInfo,
                  );
                  if (!ok) {
                    toast.error("Could not download the receipt bill");
                    return;
                  }
                  toast.success(`${receiptNo} downloaded — use Save as PDF in the print dialog`);
                };

                return (
                  <div key={`${visit.type}-${visit.id}`} className="flex items-center justify-between gap-4 px-5 py-4">
                    <div className="min-w-0 flex-1">
                      {receiptNo ? (
                        <button
                          type="button"
                          onClick={handleDownload}
                          className="font-mono text-[13px] font-bold text-[#b8962e] hover:text-[#d4af37] hover:underline underline-offset-2 transition-colors"
                        >
                          {receiptNo}
                        </button>
                      ) : (
                        <p className="text-sm font-semibold text-[#111118] truncate">{visit.label}</p>
                      )}
                      <p className="text-[11px] text-[#52525b] mt-0.5 truncate">
                        {dateStr}
                        {" · "}
                        {visit.type === "appointment" ? "Appointment" : "Invoice"}
                        {services.length > 0 ? ` · ${services.join(", ")}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <p className="text-sm font-bold text-[#111118]">₹{visit.amount.toLocaleString("en-IN")}</p>
                      {receiptNo && (
                        <button
                          type="button"
                          onClick={handleDownload}
                          className="h-8 w-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:text-[#D4AF37] hover:border-[#D4AF37]/30 transition-all"
                          aria-label={`Download ${receiptNo}`}
                          title="Download bill"
                        >
                          <Download className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        </TabsContent>

        <TabsContent value="loyalty" className="mt-0">
          <div className={`${financePanel} p-8 text-center`}>
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#D4AF37]/10 border border-[#D4AF37]/25">
              <Crown className="h-6 w-6 text-[#D4AF37]" />
            </div>
            <p className="text-sm font-semibold text-[#111118]">Loyalty program</p>
            <p className="mt-1 text-[12px] text-[#52525b] max-w-sm mx-auto">
              View tier benefits, points history, and rewards for {customer.name}.
            </p>
            <button type="button" onClick={() => onLoyalty(customer)} className={`${financeGoldBtn} mt-5 inline-flex items-center gap-2`}>
              <Sparkles className="h-4 w-4" /> Open loyalty panel
            </button>
          </div>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}
