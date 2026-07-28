import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate, useLocation } from "react-router";
import { useCoupons } from "../context/CouponsContext";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import {
  Users, User, Search, Plus, Star, Crown, Phone, Mail, Calendar, Heart,
  Gift, UserPlus, Cake, Award, Edit, MessageSquare, Send,
  CheckCircle, Sparkles, TrendingUp, ShieldCheck, X, Bell,
  LayoutList, LayoutGrid, Filter, ArrowLeft, Clock, ThumbsUp, ThumbsDown, Minus, IndianRupee,
} from "lucide-react";
import { Pagination } from "../components/shared/Pagination";
import { PageStatCard } from "../components/shared/PageStatCard";
import { useTablePagination } from "../hooks/useTablePagination";
import {
  financeGoldBtn,
  financePanel,
  financePanelHeader,
  financePanelTitle,
  financeIconWrap,
  financeBadgeGold,
  financePrimaryBtn,
} from "./finance/finance-ui";

import { type Customer, fetchCustomers, createCustomer, updateCustomer, fetchCustomerVisits, redeemLoyaltyPoints, type CustomerVisit } from "../../api/customers";
import { fetchMembershipTiers, type MembershipTier } from "../../api/membership-tiers";
import { enrollCustomerInPlan, fetchSalonPlans, fetchPlanEnrollments, type PlanEnrollment } from "../../api/plans";
import { customerToApiPayload } from "../../lib/customerMappers";
import { getApiErrorMessage } from "../../lib/api";
import { NotifyCustomerModal, SendCouponModal } from "./customers/CustomersCommModals";
import {
  MembershipPaymentConfirmDialog,
  type MembershipPaymentDetails,
} from "./customers/MembershipPaymentConfirmDialog";
import { toast } from "sonner";
import { SEGMENTED_PILL_LIST, SEGMENTED_PILL_TRIGGER } from "../components/layout/segmented-nav";
import { TIER_GRID_4 } from "../config/responsive-classes";
import { cn } from "../components/ui/utils";

const CARD_TABLE = `${financePanel} overflow-hidden`;
const TABLE_ROW = "border-b border-black/[0.05] hover:bg-[#FAF8F2]/80 transition-colors";

const today = new Date();
const daysBetween = (isoDate: string): number | null => {
  if (!isoDate?.trim()) return null;
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) return null;
  return Math.floor((today.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
};

const membershipColors: Record<string, string> = {
  platinum: "bg-[#121212] text-[#D4AF37] border-[#D4AF37]/30",
  gold: "bg-[#D4AF37]/10 text-[#9a7d20] border-[#D4AF37]/25",
  silver: "bg-[#FAF8F2] text-[#6b6b6b] border-black/[0.08]",
  basic: "bg-[#f4f2ed] text-[#111118] border-black/[0.08]",
};

const DEFAULT_MEMBERSHIP_BENEFITS: Record<string, { benefits: string[]; discount: number; pointsMultiplier: number; freeServices: string[]; price: number; durationLabel: string }> = {
  basic: { benefits: ["Standard loyalty points", "Access to promotions"], discount: 0, pointsMultiplier: 1, freeServices: [], price: 0, durationLabel: "Free" },
};

function parseTierBenefits(benefits: string): string[] {
  if (!benefits.trim()) return [];
  return benefits.split("\n").map((line) => line.trim()).filter(Boolean);
}

function buildMembershipBenefits(
  tiers: MembershipTier[],
  plans: Awaited<ReturnType<typeof fetchSalonPlans>>,
): Record<string, { benefits: string[]; discount: number; pointsMultiplier: number; freeServices: string[]; price: number; durationLabel: string }> {
  const map = { ...DEFAULT_MEMBERSHIP_BENEFITS };
  for (const tier of tiers) {
    const plan = plans.find(
      (p) =>
        p.planType === "membership" &&
        (p.namePreset === tier.slug || p.name.toLowerCase() === tier.slug),
    );
    map[tier.slug] = {
      benefits: parseTierBenefits(tier.benefits),
      discount: tier.discountPercent,
      pointsMultiplier: tier.pointsMultiplier,
      freeServices: [],
      price: plan?.price ?? tier.price,
      durationLabel: tier.durationMonths >= 12 ? "1 year" : `${tier.durationMonths} mo`,
    };
  }
  return map;
}

function isBirthdayToday(birthday: string): boolean {
  if (!birthday) return false;
  const today = new Date();
  const bday = new Date(birthday);
  return bday.getMonth() === today.getMonth() && bday.getDate() === today.getDate();
}

function isBirthdayThisMonth(birthday: string): boolean {
  if (!birthday) return false;
  const today = new Date();
  const bday = new Date(birthday);
  return bday.getMonth() === today.getMonth();
}

function getInactiveDays(c: Customer): number | null {
  return daysBetween(c.lastVisitDate);
}

function getInactivityLabel(days: number | null): string {
  if (days == null) return "No visits yet";
  if (days <= 0) return "Active today";
  if (days === 1) return "1 day inactive";
  if (days < 7) return `${days} days inactive`;
  if (days < 30) return `${Math.floor(days / 7)} week${Math.floor(days / 7) > 1 ? "s" : ""} inactive`;
  return `${Math.floor(days / 30)} month${Math.floor(days / 30) > 1 ? "s" : ""} inactive`;
}

function getInactivityColor(days: number | null): string {
  if (days == null) return "bg-[#f4f2ed] text-[#6b6b6b] border-black/[0.08]";
  if (days <= 3) return "bg-[#D4AF37]/10 text-[#9a7d20] border-[#D4AF37]/25";
  if (days <= 14) return "bg-[#FFFBEB] text-[#9a7d20] border-[#D4AF37]/20";
  if (days <= 30) return "bg-[#FAF8F2] text-[#6b6b6b] border-black/[0.08]";
  return "bg-red-50 text-red-700 border-red-200";
}

function StarRow({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map(i => (
        <Star key={i} className={`h-3.5 w-3.5 ${i <= rating ? "fill-[#d4af37] text-[#d4af37]" : "text-[#e8e6e1] fill-[#e8e6e1]"}`} />
      ))}
    </div>
  );
}

const tierAvatarRing: Record<string, string> = {
  platinum: "ring-2 ring-[#D4AF37]/60 shadow-[0_0_28px_rgba(212,175,55,0.22)]",
  gold: "ring-2 ring-[#D4AF37]/40 shadow-[0_0_20px_rgba(212,175,55,0.12)]",
  silver: "ring-2 ring-black/[0.12]",
  basic: "ring-2 ring-black/[0.08]",
};

const tierHeroGlow: Record<string, string> = {
  platinum: "bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(212,175,55,0.18),transparent)]",
  gold: "bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(212,175,55,0.12),transparent)]",
  silver: "bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(18,18,18,0.06),transparent)]",
  basic: "bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(18,18,18,0.04),transparent)]",
};

function DetailMetricChip({
  icon: Icon,
  label,
  value,
  highlight,
}: {
  icon: typeof Star;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-2.5 rounded-xl border px-3 py-2.5 min-w-0",
        highlight
          ? "border-[#D4AF37]/35 bg-[#D4AF37]/10"
          : "border-white/10 bg-white/[0.06] backdrop-blur-sm",
      )}
    >
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border",
          highlight
            ? "border-[#D4AF37]/30 bg-[#D4AF37]/15"
            : "border-white/10 bg-white/[0.08]",
        )}
      >
        <Icon className={cn("h-3.5 w-3.5", highlight ? "text-[#D4AF37]" : "text-white/70")} />
      </div>
      <div className="min-w-0">
        <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-white/45 truncate">{label}</p>
        <p className={cn("text-sm font-bold truncate tabular-nums", highlight ? "text-[#D4AF37]" : "text-white")}>
          {value}
        </p>
      </div>
    </div>
  );
}

function InfoFieldCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Phone;
  label: string;
  value: string;
}) {
  return (
    <div className={`${financePanel} p-4 hover:shadow-md transition-shadow duration-200`}>
      <div className="flex items-start gap-3">
        <div className={financeIconWrap}>
          <Icon className="h-4 w-4 text-[#D4AF37]" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#9a9a9a]">{label}</p>
          <p className="mt-1 text-sm font-semibold text-[#111118] break-words">{value}</p>
        </div>
      </div>
    </div>
  );
}

function isNewCustomer(c: Customer): boolean {
  return c.totalVisits <= 0 && !c.lastVisitDate;
}

/** New CRM customers (no visits) → walk-in; returning customers → appointment. */
function customerBookingPath(c: Customer): string {
  const params = new URLSearchParams({
    customerId: c.id,
    name: c.name,
    phone: c.phone,
  });
  const base = isNewCustomer(c) ? "/walk-in" : "/appointments/new";
  return `${base}?${params.toString()}`;
}

// ── CUSTOMER DETAIL VIEW (full-page like reference photo) ──
function CustomerDetailView({ customer, membershipBenefits, onBack, onEdit, onNotify, onCoupon, onLoyalty, onToggleStatus, navigate }: {
  customer: Customer;
  membershipBenefits: Record<string, { benefits: string[]; discount: number; pointsMultiplier: number; freeServices: string[]; price: number; durationLabel: string }>;
  onBack: () => void;
  onEdit: () => void;
  onNotify: (c: Customer) => void;
  onCoupon: (c: Customer) => void;
  onLoyalty: (c: Customer) => void;
  onToggleStatus: (c: Customer) => void;
  navigate: ReturnType<typeof useNavigate>;
}) {
  const genderIcon = (g: string) => g === "male" ? "♂" : g === "female" ? "♀" : "⚧";
  const genderColor = (g: string) => g === "male" ? "bg-[#FAF8F2] text-[#111118] border-black/[0.08]" : g === "female" ? "bg-[#FFFBEB] text-[#9a7d20] border-[#D4AF37]/20" : "bg-[#f4f2ed] text-[#6b6b6b] border-black/[0.08]";
  const inactiveDays = getInactiveDays(customer);
  const [visits, setVisits] = useState<CustomerVisit[]>([]);
  const [visitsLoading, setVisitsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setVisitsLoading(true);
    fetchCustomerVisits(customer.id)
      .then((data) => { if (!cancelled) setVisits(data); })
      .catch(() => { if (!cancelled) setVisits([]); })
      .finally(() => { if (!cancelled) setVisitsLoading(false); });
    return () => { cancelled = true; };
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
          <button type="button" onClick={() => onNotify(customer)} className="h-9 px-3 rounded-xl border border-black/[0.08] bg-white text-[11px] font-semibold text-[#6b6b6b] hover:border-[#D4AF37]/35 hover:bg-[#FAF8F2] inline-flex items-center gap-1.5 transition-all">
            <Bell className="h-3.5 w-3.5 text-[#D4AF37]" /> Notify
          </button>
          <button
            type="button"
            onClick={() => navigate(`/feedback?customer=${encodeURIComponent(customer.name)}`)}
            className="h-9 px-3 rounded-xl border border-black/[0.08] bg-white text-[11px] font-semibold text-[#6b6b6b] hover:border-[#D4AF37]/35 hover:bg-[#FAF8F2] inline-flex items-center gap-1.5 transition-all"
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
              {customer.name.split(" ").map(n => n[0]).join("")}
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
              <InfoFieldCard icon={Phone} label="Phone" value={customer.phone} />
              <InfoFieldCard icon={Mail} label="Email" value={customer.email} />
              <InfoFieldCard
                icon={Cake}
                label="Birthday"
                value={customer.birthday ? new Date(customer.birthday).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }) : "—"}
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
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#9a9a9a]">Address</p>
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
            {!visitsLoading && visits.map((visit) => (
              <div key={`${visit.type}-${visit.id}`} className="flex items-center justify-between gap-4 px-5 py-4">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[#111118] truncate">{visit.label}</p>
                  <p className="text-[11px] text-[#9a9a9a] mt-0.5">
                    {new Date(visit.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                    {" · "}
                    {visit.type === "appointment" ? "Appointment" : "Invoice"}
                  </p>
                </div>
                <p className="text-sm font-bold text-[#111118] shrink-0">₹{visit.amount.toLocaleString("en-IN")}</p>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="loyalty" className="mt-0">
          <div className={`${financePanel} p-8 text-center`}>
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#D4AF37]/10 border border-[#D4AF37]/25">
              <Crown className="h-6 w-6 text-[#D4AF37]" />
            </div>
            <p className="text-sm font-semibold text-[#111118]">Loyalty program</p>
            <p className="mt-1 text-[12px] text-[#9a9a9a] max-w-sm mx-auto">
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

export function Customers() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("action") === "add") {
      setAddOpen(true);
      navigate("/customers", { replace: true });
    }
  }, [location.search]);

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customersLoading, setCustomersLoading] = useState(true);
  const customersLoadGen = useRef(0);

  useEffect(() => {
    let cancelled = false;
    const gen = ++customersLoadGen.current;
    (async () => {
      try {
        const data = await fetchCustomers();
        // Skip if a newer create/reload already advanced the generation.
        if (!cancelled && gen === customersLoadGen.current) setCustomers(data);
      } catch {
        if (!cancelled) toast.error("Failed to load customers from server");
      } finally {
        if (!cancelled && gen === customersLoadGen.current) setCustomersLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [detailView, setDetailView] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTier, setFilterTier] = useState("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "inactive">("all");
  const [filterBirthday, setFilterBirthday] = useState<"all" | "today" | "thismonth">("all");
  const [filterInactive, setFilterInactive] = useState<"all" | "7" | "30" | "60" | "90">("all");
  const [filterGender, setFilterGender] = useState<"all" | "male" | "female" | "other">("all");
  const [lastVisitFrom, setLastVisitFrom] = useState("");
  const [lastVisitTo, setLastVisitTo] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState<Customer | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [loyaltyOpen, setLoyaltyOpen] = useState(false);
  const [buyTier, setBuyTier] = useState<string>("");
  const [membershipPayOpen, setMembershipPayOpen] = useState(false);
  const [purchasingMembership, setPurchasingMembership] = useState(false);
  const [activeEnrollment, setActiveEnrollment] = useState<PlanEnrollment | null>(null);
  const [loyaltyCustomer, setLoyaltyCustomer] = useState<Customer | null>(null);
  const [notifyOpen, setNotifyOpen] = useState(false);
  const [notifyMsg, setNotifyMsg] = useState("");
  const [notifyTarget, setNotifyTarget] = useState<Customer | null>(null);
  const [redeemPoints, setRedeemPoints] = useState(0);
  const [singleCouponOpen, setSingleCouponOpen] = useState(false);
  const [couponTarget, setCouponTarget] = useState<Customer | null>(null);
  const [selectedCouponId, setSelectedCouponId] = useState("");
  const { coupons, recordSend } = useCoupons();
  const [bdayCouponOpen, setBdayCouponOpen] = useState(false);
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<Set<string>>(new Set());
  const [bulkCouponOpen, setBulkCouponOpen] = useState(false);
  const [bulkCouponId, setBulkCouponId] = useState("");
  const [newCustomer, setNewCustomer] = useState({ name: "", phone: "", email: "", gender: "" as "male"|"female"|"other"|"", membershipTier: "basic", birthday: "", address: "", notes: "" });
  const [membershipBenefits, setMembershipBenefits] = useState(DEFAULT_MEMBERSHIP_BENEFITS);
  const [redeeming, setRedeeming] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchMembershipTiers(), fetchSalonPlans()])
      .then(([tiers, plans]) => {
        if (!cancelled) setMembershipBenefits(buildMembershipBenefits(tiers, plans));
      })
      .catch(() => {
        if (!cancelled) setMembershipBenefits(DEFAULT_MEMBERSHIP_BENEFITS);
      });
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => customers.filter(c => {
    const q = searchQuery.toLowerCase();
    const matchQ = c.name.toLowerCase().includes(q) || c.phone.includes(q) || c.email.toLowerCase().includes(q);
    const matchT = filterTier === "all" || c.membershipTier === filterTier;
    const matchS = filterStatus === "all" || c.status === filterStatus;
    const matchB = filterBirthday === "all" ? true :
      filterBirthday === "today" ? isBirthdayToday(c.birthday) :
      isBirthdayThisMonth(c.birthday);
    const matchG = filterGender === "all" || c.gender === filterGender;
    const visitDate = c.lastVisitDate ? new Date(c.lastVisitDate) : null;
    const matchFrom = !lastVisitFrom ? true : (visitDate ? visitDate >= new Date(lastVisitFrom) : false);
    const matchTo = !lastVisitTo ? true : (visitDate ? visitDate <= new Date(lastVisitTo) : false);
    const days = getInactiveDays(c);
    const matchI = filterInactive === "all" ? true : days != null && days >= Number(filterInactive);
    return matchQ && matchT && matchS && matchB && matchI && matchG && matchFrom && matchTo;
  }), [customers, searchQuery, filterTier, filterStatus, filterBirthday, filterInactive, filterGender, lastVisitFrom, lastVisitTo]);
  const { page, setPage, pageSize, setPageSize, paginate } = useTablePagination(
    filtered.length,
    [searchQuery, filterTier, filterStatus, filterBirthday, filterInactive, filterGender, lastVisitFrom, lastVisitTo],
  );
  const paginatedCustomers = useMemo(() => paginate(filtered), [filtered, paginate]);
  const birthdayCustomers = useMemo(() => customers.filter(c => isBirthdayThisMonth(c.birthday)), [customers]);
  const todayBirthdays = useMemo(() => customers.filter(c => isBirthdayToday(c.birthday)), [customers]);


  const openLoyalty = (c: Customer) => {
    setLoyaltyCustomer(c);
    setRedeemPoints(0);
    setBuyTier("");
    setMembershipPayOpen(false);
    setActiveEnrollment(null);
    setLoyaltyOpen(true);
    void fetchPlanEnrollments()
      .then((rows) => {
        const match = rows.find(
          (e) =>
            e.customerId === c.id &&
            e.planType === "membership" &&
            e.status === "Active",
        );
        setActiveEnrollment(match ?? null);
      })
      .catch(() => setActiveEnrollment(null));
  };
  const [savingCustomer, setSavingCustomer] = useState(false);

  const reloadCustomers = async () => {
    customersLoadGen.current += 1;
    const updated = await fetchCustomers();
    setCustomers(updated);
    return updated;
  };

  const openMembershipPayment = () => {
    if (!buyTier || !loyaltyCustomer) return;
    setMembershipPayOpen(true);
  };

  const purchaseMembership = async (details: MembershipPaymentDetails) => {
    if (!loyaltyCustomer || !buyTier) return;
    const customerId = loyaltyCustomer.id;
    const tier = buyTier;
    const tierInfo = membershipBenefits[tier];
    if (!tierInfo) {
      toast.error("Membership tier not found");
      return;
    }
    setPurchasingMembership(true);
    try {
      const plans = await fetchSalonPlans();
      const plan = plans.find(
        (p) =>
          p.planType === "membership" &&
          (p.namePreset === tier || p.name.toLowerCase() === tier),
      );
      if (!plan) {
        toast.error("Membership plan not found. Create it under Finance → Membership first.");
        return;
      }
      const enrollment = await enrollCustomerInPlan({
        customerId,
        planId: plan.id,
        amountPaid: details.amount,
      });
      const updated = await reloadCustomers();
      const refreshed = updated.find((c) => c.id === customerId);
      if (refreshed) {
        setLoyaltyCustomer(refreshed);
        if (selectedCustomer?.id === customerId) setSelectedCustomer(refreshed);
      }
      setActiveEnrollment(enrollment);
      setBuyTier("");
      setMembershipPayOpen(false);
      toast.success(`${tier.toUpperCase()} membership activated`, {
        description: `Payment recorded: ₹${details.amount.toLocaleString("en-IN")} · ${details.label}`,
      });
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to purchase membership"));
    } finally {
      setPurchasingMembership(false);
    }
  };

  const handleRedeemPoints = async () => {
    if (!loyaltyCustomer || redeemPoints <= 0 || redeemPoints > loyaltyCustomer.loyaltyPoints) return;
    setRedeeming(true);
    try {
      const result = await redeemLoyaltyPoints(loyaltyCustomer.id, redeemPoints);
      setCustomers((prev) =>
        prev.map((c) => (c.id === loyaltyCustomer.id ? { ...c, loyaltyPoints: result.loyaltyPoints } : c)),
      );
      setLoyaltyCustomer((lc) => (lc ? { ...lc, loyaltyPoints: result.loyaltyPoints } : lc));
      setRedeemPoints(0);
      toast.success(`Redeemed ${redeemPoints} points`);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to redeem points"));
    } finally {
      setRedeeming(false);
    }
  };
  const openNotify = (c: Customer, msg?: string) => {
    setNotifyTarget(c);
    setNotifyMsg(msg || `Dear ${c.name}, thank you for being a valued ${c.membershipTier.toUpperCase()} member at BillVyapp! Your loyalty points: ${c.loyaltyPoints}. Book your next appointment today!`);
    setNotifyOpen(true);
  };
  const openCoupon = (c: Customer) => {
    setCouponTarget(c);
    const suggested = coupons.find(cp => cp.status === "active" && new Date(cp.validTill) >= new Date());
    setSelectedCouponId(suggested?.id || "");
    setSingleCouponOpen(true);
  };

  const allFilteredSelected = filtered.length > 0 && filtered.every(c => selectedCustomerIds.has(c.id));
  const someSelected = selectedCustomerIds.size > 0;

  const toggleSelectAll = () => {
    if (allFilteredSelected) {
      setSelectedCustomerIds(new Set());
    } else {
      setSelectedCustomerIds(new Set(filtered.map(c => c.id)));
    }
  };

  const toggleSelectCustomer = (id: string) => {
    setSelectedCustomerIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const openBulkCoupon = () => {
    const suggested = coupons.find(cp => cp.status === "active" && new Date(cp.validTill) >= new Date());
    setBulkCouponId(suggested?.id || "");
    setBulkCouponOpen(true);
  };

  const handleToggleStatus = async (c: Customer) => {
    const newStatus = c.status === "active" ? "inactive" : "active";
    try {
      const updated = await updateCustomer(c.id, { status: newStatus });
      setCustomers((prev) => prev.map((x) => (x.id === c.id ? updated : x)));
      if (selectedCustomer?.id === c.id) setSelectedCustomer(updated);
      toast.success(`Customer marked ${newStatus}`);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to update status"));
    }
  };

  const sendBirthdayCoupons = () => {
    todayBirthdays.forEach(c => console.log(`Birthday coupon sent to ${c.name}`));
    setBdayCouponOpen(false);
    toast.success("Birthday coupons sent", {
      description: `Delivered to ${todayBirthdays.length} customer(s)`,
    });
  };

  const sendSingleCoupon = (channel: "whatsapp" | "sms") => {
    const sel = coupons.find(c => c.id === selectedCouponId);
    if (!sel || !couponTarget) return;
    recordSend(sel.id, couponTarget.id, couponTarget.name, channel);
    toast.success(`Coupon ${sel.code} sent`, {
      description: `Delivered via ${channel === "whatsapp" ? "WhatsApp" : "SMS"} to ${couponTarget.name}`,
    });
    setSingleCouponOpen(false);
  };

  const sendBulkCoupon = (channel: "whatsapp" | "sms") => {
    const sel = coupons.find(c => c.id === bulkCouponId);
    if (!sel) return;
    const targets = customers.filter(c => selectedCustomerIds.has(c.id));
    targets.forEach(c => recordSend(sel.id, c.id, c.name, channel));
    toast.success(`Coupon ${sel.code} sent`, {
      description: `Delivered to ${targets.length} customer(s) via ${channel === "whatsapp" ? "WhatsApp" : "SMS"}`,
    });
    setBulkCouponOpen(false);
    setSelectedCustomerIds(new Set());
  };

  const saveEdit = async () => {
    if (!editData || savingCustomer) return;
    setSavingCustomer(true);
    try {
      const updated = await updateCustomer(editData.id, customerToApiPayload(editData));
      setCustomers((prev) => prev.map((c) => (c.id === editData.id ? updated : c)));
      setSelectedCustomer(updated);
      setEditMode(false);
      setEditData(null);
      toast.success("Customer updated");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to update customer"));
    } finally {
      setSavingCustomer(false);
    }
  };

  const addCustomer = async () => {
    if (!newCustomer.name || !newCustomer.phone || savingCustomer) return;
    setSavingCustomer(true);
    try {
      const created = await createCustomer({
        fullName: newCustomer.name,
        phone: newCustomer.phone,
        email: newCustomer.email || undefined,
        gender: newCustomer.gender || undefined,
        dateOfBirth: newCustomer.birthday || undefined,
        address: newCustomer.address || undefined,
        notes: newCustomer.notes || undefined,
        status: "active",
      });
      // Close the dialog and open detail immediately so success isn't blocked on list refresh.
      setCustomers((prev) =>
        prev.some((c) => c.id === created.id) ? prev : [...prev, created],
      );
      setSelectedCustomer(created);
      setDetailView(true);
      setAddOpen(false);
      setNewCustomer({ name: "", phone: "", email: "", gender: "female", membershipTier: "basic", birthday: "", address: "", notes: "" });
      toast.success("Customer added");
      // Invalidate any in-flight initial fetch, then reload so list search sees the new row.
      customersLoadGen.current += 1;
      try {
        const latest = await fetchCustomers();
        setCustomers(latest);
        setSelectedCustomer(latest.find((c) => c.id === created.id) ?? created);
      } catch {
        // Keep the optimistic row from create if the refresh fails.
      }
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to add customer"));
    } finally {
      setSavingCustomer(false);
    }
  };

  const handleSelectCustomer = (c: Customer) => { setSelectedCustomer(c); setDetailView(true); setEditMode(false); setEditData(null); };
  const handleBack = () => { setDetailView(false); setSelectedCustomer(null); setEditMode(false); setEditData(null); };
  const startEdit = () => { if (!selectedCustomer) return; setEditData({ ...selectedCustomer }); setEditMode(true); };

  const genderIcon = (g: string) => g === "male" ? "♂" : g === "female" ? "♀" : "⚧";
  const genderColor = (g: string) => g === "male" ? "bg-[#FAF8F2] text-[#111118] border-black/[0.08]" : g === "female" ? "bg-[#FFFBEB] text-[#9a7d20] border-[#D4AF37]/20" : "bg-[#f4f2ed] text-[#6b6b6b] border-black/[0.08]";

  // ── DETAIL VIEW ──
  if (detailView && selectedCustomer) {
    if (editMode && editData) {
      const initials = editData.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();
      const tierMeta: Record<string, { label: string; color: string; bg: string; icon: string }> = {
        basic:    { label: "Basic",    color: "text-blue-600",   bg: "bg-blue-50   border-blue-200",   icon: "🔵" },
        silver:   { label: "Silver",   color: "text-gray-500",   bg: "bg-[#FAF8F2]/60   border-black/[0.08]",   icon: "🥈" },
        gold:     { label: "Gold",     color: "text-amber-600",  bg: "bg-amber-50  border-amber-200",  icon: "🥇" },
        platinum: { label: "Platinum", color: "text-violet-600", bg: "bg-violet-50 border-violet-200", icon: "👑" },
      };
      const tier = tierMeta[editData.membershipTier] ?? tierMeta.basic;

      const editField = (label: string, hint?: string, children?: React.ReactNode) => (
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5">
            <label className="text-[12px] font-semibold text-gray-500 uppercase tracking-[0.06em]">{label}</label>
            {hint && <span className="text-[10px] text-gray-400">{hint}</span>}
          </div>
          {children}
        </div>
      );

      const editInput = (value: string, onChange: (v: string) => void, opts?: { type?: string; placeholder?: string; prefix?: React.ReactNode }) => (
        <div className="relative flex items-center">
          {opts?.prefix && <span className="absolute left-3 flex items-center pointer-events-none">{opts.prefix}</span>}
          <input
            type={opts?.type ?? "text"}
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder={opts?.placeholder}
            className={`w-full h-11 rounded-xl border border-black/[0.08] bg-[#FAF8F2]/60 text-[13px] text-[#111118] focus:bg-white focus:outline-none focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/15 transition-all ${opts?.prefix ? "pl-10 pr-4" : "px-4"}`}
          />
        </div>
      );

      return (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }}
          className="max-w-5xl space-y-4">

          {/* ── Top bar ── */}
          <div className="flex items-center justify-between">
            <button onClick={() => { setEditMode(false); setEditData(null); }}
              className="flex items-center gap-1.5 text-[12px] font-semibold text-gray-400 hover:text-[#111118] transition-colors">
              <ArrowLeft className="h-3.5 w-3.5" /> Back to Profile
            </button>
          </div>

          {/* ── Identity header card ── */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#111118] to-[#1e1e28] px-6 py-5">
            <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-[#d4af37]/08 blur-3xl pointer-events-none" />
            <div className="relative flex items-center gap-5">
              <div className="relative shrink-0">
                <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-[#d4af37]/30 to-[#d4af37]/10 border border-[#d4af37]/20 flex items-center justify-center">
                  <span className="text-[22px] font-black text-[#d4af37]">{initials}</span>
                </div>
                <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-[#111118] border-2 border-[#d4af37]/30 flex items-center justify-center text-[10px]">
                  {editData.status === "active" ? "✓" : "✗"}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[18px] font-black text-white leading-tight">{editData.name || "—"}</p>
                <p className="text-[11px] text-white/40 mt-0.5">Customer ID #{editData.id} · Editing profile</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${tier.bg} ${tier.color}`}>
                    {tier.icon} {tier.label}
                  </span>
                  <span className="text-[10px] text-white/30">{editData.phone}</span>
                  <span className="text-[10px] text-white/30">{editData.email}</span>
                </div>
              </div>
              <p className="text-[11px] text-white/25 shrink-0">All fields auto-save on submit</p>
            </div>
          </div>

          {/* ── Two-column main grid ── */}
          <div className="grid grid-cols-2 gap-4">

            {/* LEFT col */}
            <div className="space-y-4">

              {/* Contact Information */}
              <div className="rounded-2xl border border-black/[0.08] bg-white overflow-hidden">
                <div className="flex items-center gap-3 px-5 py-3 border-b border-gray-100 bg-[#FAF8F2]/60/60">
                  <div className="h-7 w-7 rounded-lg bg-[#d4af37]/10 border border-[#d4af37]/20 flex items-center justify-center shrink-0">
                    <User className="h-3.5 w-3.5 text-[#d4af37]" />
                  </div>
                  <p className="text-[12px] font-bold text-[#111118]">Contact Information</p>
                </div>
                <div className="p-4 space-y-3">
                  {editField("Full Name", undefined,
                    editInput(editData.name, v => setEditData(d => d ? { ...d, name: v } : d), { placeholder: "Customer full name" })
                  )}
                  {editField("Phone Number", undefined,
                    <div className="flex gap-2">
                      <div className="flex items-center h-11 px-3.5 rounded-xl border border-black/[0.08] bg-gray-100 text-[13px] font-bold text-gray-500 shrink-0">+91</div>
                      <input
                        value={editData.phone.replace(/^\+91\s?/, "")}
                        onChange={e => setEditData(d => d ? { ...d, phone: "+91 " + e.target.value } : d)}
                        placeholder="98765 43210"
                        className="flex-1 h-11 px-4 rounded-xl border border-black/[0.08] bg-[#FAF8F2]/60 text-[13px] text-[#111118] focus:bg-white focus:outline-none focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/15 transition-all"
                      />
                    </div>
                  )}
                  {editField("Email", "(optional)",
                    editInput(editData.email, v => setEditData(d => d ? { ...d, email: v } : d), {
                      type: "email", placeholder: "customer@email.com",
                      prefix: <Mail className="h-3.5 w-3.5 text-gray-400" />,
                    })
                  )}
                </div>
              </div>

              {/* Personal Details */}
              <div className="rounded-2xl border border-black/[0.08] bg-white overflow-hidden">
                <div className="flex items-center gap-3 px-5 py-3 border-b border-gray-100 bg-[#FAF8F2]/60/60">
                  <div className="h-7 w-7 rounded-lg bg-[#d4af37]/10 border border-[#d4af37]/20 flex items-center justify-center shrink-0">
                    <Heart className="h-3.5 w-3.5 text-[#d4af37]" />
                  </div>
                  <p className="text-[12px] font-bold text-[#111118]">Personal Details</p>
                </div>
                <div className="p-4 space-y-3">
                  {editField("Gender", undefined,
                    <div className="flex gap-1.5">
                      {["female","male","other"].map(g => (
                        <button key={g} type="button"
                          onClick={() => setEditData(d => d ? { ...d, gender: g as any } : d)}
                          className={`flex-1 h-11 rounded-xl border text-[12px] font-semibold transition-all ${
                            editData.gender === g
                              ? "bg-[#111118] border-[#111118] text-[#d4af37]"
                              : "border-black/[0.08] bg-[#FAF8F2]/60 text-gray-500 hover:border-gray-300 hover:bg-white"
                          }`}>
                          {g === "female" ? "♀ Female" : g === "male" ? "♂ Male" : "⊕ Other"}
                        </button>
                      ))}
                    </div>
                  )}
                  {editField("Birthday", undefined,
                    editInput(editData.birthday, v => setEditData(d => d ? { ...d, birthday: v } : d), {
                      type: "date",
                      prefix: <Calendar className="h-3.5 w-3.5 text-gray-400" />,
                    })
                  )}
                </div>
              </div>
            </div>

            {/* RIGHT col */}
            <div className="space-y-4">

              {/* Account */}
              <div className="rounded-2xl border border-black/[0.08] bg-white overflow-hidden">
                <div className="flex items-center gap-3 px-5 py-3 border-b border-gray-100 bg-[#FAF8F2]/60/60">
                  <div className="h-7 w-7 rounded-lg bg-[#d4af37]/10 border border-[#d4af37]/20 flex items-center justify-center shrink-0">
                    <Crown className="h-3.5 w-3.5 text-[#d4af37]" />
                  </div>
                  <p className="text-[12px] font-bold text-[#111118]">Account & Membership</p>
                </div>
                <div className="p-4 space-y-3">
                  {editField("Status", undefined,
                    <div className="flex gap-1.5">
                      {[{v:"active",label:"Active",icon:"✓"},{v:"inactive",label:"Inactive",icon:"✗"}].map(s => (
                        <button key={s.v} type="button"
                          onClick={() => setEditData(d => d ? { ...d, status: s.v as any } : d)}
                          className={`flex-1 h-11 rounded-xl border text-[12px] font-semibold transition-all flex items-center justify-center gap-1.5 ${
                            editData.status === s.v
                              ? s.v === "active" ? "bg-[#121212] border-[#121212] text-[#D4AF37]" : "bg-red-500 border-red-500 text-white"
                              : "border-black/[0.08] bg-[#FAF8F2]/60 text-gray-500 hover:border-gray-300"
                          }`}>
                          <span className="text-[10px]">{s.icon}</span> {s.label}
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="rounded-xl border border-black/[0.08] bg-[#FAF8F2]/60 px-4 py-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-gray-500">Membership tier</p>
                    <p className="mt-1 text-[13px] font-bold capitalize text-[#111118]">{editData.membershipTier}</p>
                    <p className="mt-1 text-[11px] text-gray-400">Upgrade via the Loyalty panel after saving — tier changes when a membership plan is purchased.</p>
                  </div>
                  {editField("Address", "(optional)",
                    editInput(editData.address || "", v => setEditData(d => d ? { ...d, address: v } : d), { placeholder: "Street, Area, City" })
                  )}
                  {editField("GSTIN", "(optional)",
                    editInput(editData.gstin || "", v => setEditData(d => d ? { ...d, gstin: v } : d), { placeholder: "22AAAAA0000A1Z5" })
                  )}
                </div>
              </div>

              {/* Notes */}
              <div className="rounded-2xl border border-black/[0.08] bg-white overflow-hidden">
                <div className="flex items-center gap-3 px-5 py-3 border-b border-gray-100 bg-[#FAF8F2]/60/60">
                  <div className="h-7 w-7 rounded-lg bg-[#d4af37]/10 border border-[#d4af37]/20 flex items-center justify-center shrink-0">
                    <MessageSquare className="h-3.5 w-3.5 text-[#d4af37]" />
                  </div>
                  <p className="text-[12px] font-bold text-[#111118]">Notes & Allergies</p>
                </div>
                <div className="p-4">
                  <textarea rows={4}
                    value={editData.notes || ""}
                    onChange={e => setEditData(d => d ? { ...d, notes: e.target.value } : d)}
                    placeholder="Allergies, product preferences, special notes…"
                    className="w-full px-4 py-3 rounded-xl border border-black/[0.08] bg-[#FAF8F2]/60 text-[13px] text-[#111118] focus:bg-white focus:outline-none focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/15 transition-all resize-none leading-relaxed"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ── Bottom action bar ── */}
          <div className="flex items-center justify-between pb-2">
            <p className="text-[11px] text-gray-400">Changes apply immediately on save</p>
            <div className="flex items-center gap-2">
              <button onClick={() => { setEditMode(false); setEditData(null); }}
                className="h-9 px-4 rounded-xl border border-black/[0.08] text-[12px] font-semibold text-gray-500 hover:bg-[#FAF8F2]/60 transition-all">
                Cancel
              </button>
              <button onClick={saveEdit}
                className="flex items-center gap-2 h-9 px-5 rounded-xl bg-gradient-to-r from-[#d4af37] to-[#b8962e] text-[12px] font-bold text-black hover:shadow-lg hover:shadow-[#d4af37]/25 transition-all">
                <CheckCircle className="h-3.5 w-3.5" /> Save Changes
              </button>
            </div>
          </div>
        </motion.div>
      );
    }

    return (
      <>
        <CustomerDetailView
          customer={selectedCustomer}
          membershipBenefits={membershipBenefits}
          onBack={handleBack}
          onEdit={startEdit}
          onNotify={openNotify}
          onCoupon={openCoupon}
          onLoyalty={openLoyalty}
          onToggleStatus={handleToggleStatus}
          navigate={navigate}
        />
        {/* Modals needed in detail view */}
        <Dialog open={loyaltyOpen} onOpenChange={setLoyaltyOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Crown className="h-6 w-6 text-[#d4af37]" />
                {loyaltyCustomer?.membershipTier.toUpperCase()} Loyalty — {loyaltyCustomer?.name}
              </DialogTitle>
            </DialogHeader>
            {loyaltyCustomer && (() => {
              const b = membershipBenefits[loyaltyCustomer.membershipTier];
              return (
                <div className="space-y-4">
                  <div className="bg-gradient-to-br from-[#1a1a1a] to-[#2d2d2d] rounded-xl p-5 text-white">
                    <div className="flex items-center justify-between mb-3">
                      <div><p className="text-sm text-[#d4af37]">Available Points</p><p className="text-4xl font-bold text-[#d4af37]">{loyaltyCustomer.loyaltyPoints}</p></div>
                      <div className="text-right"><p className="text-xs text-gray-400">Multiplier</p><p className="text-2xl font-bold">{b.pointsMultiplier}×</p><p className="text-xs text-gray-400">on all spends</p></div>
                    </div>
                    <div className="w-full bg-white/20 rounded-full h-2 mb-1"><div className="bg-[#d4af37] h-2 rounded-full" style={{ width: `${Math.min((loyaltyCustomer.loyaltyPoints / 5000) * 100, 100)}%` }} /></div>
                    <p className="text-xs text-gray-400">{Math.max(0, 5000 - loyaltyCustomer.loyaltyPoints)} pts to next tier</p>
                  </div>
                  <div>
                    <p className="font-semibold text-sm mb-2 flex items-center gap-1"><Sparkles className="h-4 w-4 text-[#d4af37]" />Member Benefits</p>
                    <div className="grid grid-cols-2 gap-2">
                      {b.benefits.map(bx => (
                        <div key={bx} className="flex items-start gap-2 bg-amber-50 rounded-lg p-2">
                          <CheckCircle className="h-4 w-4 text-[#D4AF37] shrink-0 mt-0.5" />
                          <p className="text-xs">{bx}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  {b.freeServices.length > 0 && (
                    <div>
                      <p className="font-semibold text-sm mb-2">Complimentary Services</p>
                      <div className="flex gap-2 flex-wrap">{b.freeServices.map(fs => <Badge key={fs} className="bg-[#D4AF37]/10 text-[#9a7d20] border-[#D4AF37]/25">{fs} — FREE</Badge>)}</div>
                    </div>
                  )}
                  {b.discount > 0 && (<div className="bg-[#FFFBEB] border border-[#D4AF37]/20 rounded-xl p-3"><p className="text-sm font-semibold text-[#9a7d20]">{b.discount}% discount applied automatically on all services</p></div>)}
                  {activeEnrollment && (
                    <div className="rounded-xl border border-[#D4AF37]/30 bg-[#111118] p-4 text-white">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[#d4af37]">Payment recorded</p>
                      <p className="mt-1 text-sm font-semibold capitalize">{activeEnrollment.packageName} membership</p>
                      <div className="mt-2 grid grid-cols-2 gap-2 text-[12px]">
                        <div>
                          <p className="text-white/40">Amount paid</p>
                          <p className="font-bold text-[#d4af37]">₹{activeEnrollment.amountPaid.toLocaleString("en-IN")}</p>
                        </div>
                        <div>
                          <p className="text-white/40">Valid until</p>
                          <p className="font-semibold">{new Date(activeEnrollment.expiry).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>
                        </div>
                      </div>
                      <p className="mt-2 text-[11px] text-white/40">Also listed under Finance → Membership / Packages</p>
                    </div>
                  )}
                  <div className="bg-gradient-to-br from-amber-50 to-white border-2 border-[#d4af37]/30 rounded-xl p-4">
                    <p className="font-semibold text-sm mb-2 flex items-center gap-1"><Crown className="h-4 w-4 text-[#d4af37]" />Buy / Upgrade Membership</p>
                    <p className="text-xs text-muted-foreground mb-3">Collect payment at the counter first, then confirm below. Activation records the amount as paid.</p>
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      {Object.entries(membershipBenefits).filter(([k]) => k !== "basic").map(([tier, info]) => (
                        <button
                          key={tier}
                          onClick={() => setBuyTier(tier)}
                          className={`text-left rounded-lg border-2 p-2 transition-all ${buyTier === tier ? "border-[#d4af37] bg-[#d4af37]/10" : "border-black/[0.08] hover:border-[#d4af37]/40"} ${loyaltyCustomer.membershipTier === tier ? "opacity-60" : ""}`}
                          disabled={loyaltyCustomer.membershipTier === tier}
                        >
                          <p className="text-xs font-semibold capitalize">{tier}{loyaltyCustomer.membershipTier === tier ? " (Current)" : ""}</p>
                          <p className="text-sm font-bold text-[#1a1a1a]">₹{info.price.toLocaleString("en-IN")}<span className="text-[10px] text-muted-foreground font-normal"> / {info.durationLabel}</span></p>
                        </button>
                      ))}
                    </div>
                    <Button
                      className="w-full bg-gradient-to-r from-[#1a1a1a] to-[#2d2d2d]"
                      disabled={!buyTier || buyTier === loyaltyCustomer.membershipTier}
                      onClick={openMembershipPayment}
                    >
                      <IndianRupee className="h-4 w-4 mr-1" />
                      {buyTier ? `Collect ₹${membershipBenefits[buyTier]?.price.toLocaleString("en-IN")} & Confirm Payment` : "Select a plan to purchase"}
                    </Button>
                  </div>
                  <div>
                    <Label className="font-semibold">Redeem Points (discounts only)</Label>
                    <div className="flex gap-2 mt-1">
                      <Input type="number" placeholder="Points to redeem" min={0} max={loyaltyCustomer.loyaltyPoints} value={redeemPoints || ""} onChange={e => setRedeemPoints(Number(e.target.value))} className="w-40" />
                      <span className="flex items-center text-sm text-muted-foreground">= ₹{Math.floor(redeemPoints / 10)} value</span>
                      <Button disabled={redeeming || redeemPoints <= 0 || redeemPoints > loyaltyCustomer.loyaltyPoints} onClick={() => void handleRedeemPoints()}>Redeem</Button>
                    </div>
                  </div>
                </div>
              );
            })()}
          </DialogContent>
        </Dialog>
        <NotifyCustomerModal
          open={notifyOpen}
          onOpenChange={setNotifyOpen}
          target={notifyTarget}
          message={notifyMsg}
          onMessageChange={setNotifyMsg}
        />
        <SendCouponModal
          open={singleCouponOpen}
          onOpenChange={setSingleCouponOpen}
          title="Send Coupon"
          subtitle={couponTarget ? `Deliver to ${couponTarget.name}` : undefined}
          customer={couponTarget}
          selectedCouponId={selectedCouponId}
          onSelectCoupon={setSelectedCouponId}
          coupons={coupons}
          onSend={sendSingleCoupon}
        />
        <MembershipPaymentConfirmDialog
          open={membershipPayOpen}
          onOpenChange={setMembershipPayOpen}
          customerName={loyaltyCustomer?.name ?? ""}
          tier={buyTier}
          amount={membershipBenefits[buyTier]?.price ?? 0}
          durationLabel={membershipBenefits[buyTier]?.durationLabel ?? ""}
          saving={purchasingMembership}
          onConfirm={(details) => void purchaseMembership(details)}
        />
      </>
    );
  }

  // ── MAIN LIST VIEW ──
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#D4AF37]">CRM</p>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-[#1a1a1a] to-[#d4af37] bg-clip-text text-transparent">Customers</h1>
          <p className="text-muted-foreground mt-1 text-sm">Manage customers, loyalty programs, and communication</p>
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          {todayBirthdays.length > 0 && (
            <Button variant="outline" size="sm" className="rounded-xl border-[#D4AF37]/35 text-[#9a7d20] bg-[#FFFBEB] hover:bg-[#FAF8F2]" onClick={() => setBdayCouponOpen(true)}>
              <Cake className="h-4 w-4 mr-1" />{todayBirthdays.length} Birthday Today
            </Button>
          )}
          <Button variant="outline" size="sm" className="rounded-xl border-[#D4AF37]/40 text-[#9a7d20] hover:bg-[#D4AF37]/08 hover:border-[#D4AF37]/60" onClick={() => navigate('/feedback')}>
            <MessageSquare className="h-4 w-4 mr-1" />Customer Feedback
          </Button>
          <button type="button" className={financeGoldBtn + " inline-flex items-center gap-2"} onClick={() => setAddOpen(true)}>
            <UserPlus className="h-4 w-4" />Add Customer
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-3 md:grid-cols-4">
        <PageStatCard
          label="Total Customers"
          value={customers.length}
          sub="All in CRM"
          icon={Users}
          index={0}
          onClick={() => { setFilterTier("all"); setFilterStatus("all"); setFilterBirthday("all"); }}
        />
        <PageStatCard
          label="Active Customers"
          value={customers.filter(c => c.status === "active").length}
          sub="Currently active"
          icon={CheckCircle}
          index={1}
          onClick={() => setFilterStatus("active")}
        />
        <PageStatCard
          label="Platinum Members"
          value={customers.filter(c => c.membershipTier === "platinum").length}
          sub="VIP tier members"
          icon={Crown}
          index={2}
          onClick={() => setFilterTier("platinum")}
        />
        <PageStatCard
          label="Birthdays This Month"
          value={birthdayCustomers.length}
          sub="Send birthday coupons"
          icon={Gift}
          index={3}
          onClick={() => setFilterBirthday("thismonth")}
        />
      </div>

      {/* Search + Filters */}
      <div className="rounded-2xl border border-black/[0.07] bg-white shadow-sm px-4 py-3">
        <div className="flex items-center gap-2.5 flex-wrap">

          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by name, phone, or email…"
              className="w-full h-10 pl-10 pr-9 rounded-xl border border-black/[0.08] text-[13px] text-[#111] placeholder:text-[#9a9a9a] outline-none focus:border-[#D4AF37]/50 focus:ring-2 focus:ring-[#D4AF37]/12 bg-[#FAF8F2]/60 transition-all"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center transition-colors">
                <X className="h-3 w-3 text-gray-500" />
              </button>
            )}
          </div>

          {/* Tier */}
          <div className="relative shrink-0">
            <Crown className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#d4af37] pointer-events-none" />
            <select value={filterTier} onChange={e => setFilterTier(e.target.value)}
              className={`h-10 pl-9 pr-7 rounded-xl border text-[13px] font-semibold appearance-none outline-none cursor-pointer transition-all focus:ring-2 focus:ring-[#d4af37]/20 ${filterTier !== "all" ? "border-[#d4af37]/60 bg-[#fffbea] text-[#9a7a1e]" : "border-black/[0.08] bg-[#FAF8F2]/60 text-[#6b6b6b] hover:border-black/[0.12]"}`}>
              <option value="all">All Tiers</option>
              <option value="platinum">👑 Platinum</option>
              <option value="gold">🥇 Gold</option>
              <option value="silver">🥈 Silver</option>
              <option value="basic">🔵 Basic</option>
            </select>
            <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-gray-400">
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </span>
            {filterTier !== "all" && <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-[#d4af37]" />}
          </div>

          {/* Status */}
          <div className="relative shrink-0">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#d4af37] pointer-events-none" />
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as typeof filterStatus)}
              className={`h-10 pl-9 pr-7 rounded-xl border text-[13px] font-semibold appearance-none outline-none cursor-pointer transition-all focus:ring-2 focus:ring-[#d4af37]/20 ${filterStatus !== "all" ? "border-[#d4af37]/60 bg-[#fffbea] text-[#9a7a1e]" : "border-black/[0.08] bg-[#FAF8F2]/60 text-[#6b6b6b] hover:border-black/[0.12]"}`}>
              <option value="all">All Status</option>
              <option value="active">✅ Active</option>
              <option value="inactive">🔴 Inactive</option>
            </select>
            <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-gray-400">
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </span>
            {filterStatus !== "all" && <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-[#d4af37]" />}
          </div>

          {/* Gender */}
          <div className="relative shrink-0">
            <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#d4af37] pointer-events-none" />
            <select value={filterGender} onChange={e => setFilterGender(e.target.value as typeof filterGender)}
              className={`h-10 pl-9 pr-7 rounded-xl border text-[13px] font-semibold appearance-none outline-none cursor-pointer transition-all focus:ring-2 focus:ring-[#d4af37]/20 ${filterGender !== "all" ? "border-[#d4af37]/60 bg-[#fffbea] text-[#9a7a1e]" : "border-black/[0.08] bg-[#FAF8F2]/60 text-[#6b6b6b] hover:border-black/[0.12]"}`}>
              <option value="all">All Genders</option>
              <option value="male">👨 Male</option>
              <option value="female">👩 Female</option>
              <option value="other">🧑 Other</option>
            </select>
            <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-gray-400">
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </span>
            {filterGender !== "all" && <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-[#d4af37]" />}
          </div>

          {/* Clear */}
          {(searchQuery || filterTier !== "all" || filterStatus !== "all" || filterGender !== "all" || filterInactive !== "all" || lastVisitFrom || lastVisitTo) && (
            <button onClick={() => { setSearchQuery(""); setFilterTier("all"); setFilterStatus("all"); setFilterGender("all"); setFilterInactive("all"); setLastVisitFrom(""); setLastVisitTo(""); }}
              className="flex items-center gap-1.5 h-10 px-3 text-[12px] font-semibold text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl border border-black/[0.08] hover:border-red-200 transition-all shrink-0">
              <X className="h-3.5 w-3.5" /> Clear
            </button>
          )}
        </div>

        {/* Birthday match action bar */}
        {filterBirthday !== "all" && filtered.length > 0 && (
          <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-100">
            <span className="text-[12px] font-semibold text-orange-700 bg-orange-50 border border-orange-200 px-2.5 py-1 rounded-full">
              🎂 {filtered.length} customer{filtered.length !== 1 ? "s" : ""} matched
            </span>
            <button onClick={() => { if (filtered.length > 0) openCoupon(filtered[0]); }}
              className="text-[12px] font-bold text-white bg-pink-600 hover:bg-pink-700 px-3 py-1.5 rounded-xl transition-colors">
              🎁 Send Birthday Coupons ({filtered.length})
            </button>
          </div>
        )}
      </div>

      {/* Customer Table */}
      {someSelected && (
        <div className="fixed bottom-3 left-1/2 z-50 flex items-center gap-2 rounded-full border border-[#d4af37] bg-white/95 shadow-lg px-3 py-2 w-auto min-w-[18rem] max-w-[90vw] -translate-x-1/2 backdrop-blur-sm">
          <span className="text-xs font-semibold text-[#1a1a1a] whitespace-nowrap">{selectedCustomerIds.size} customer{selectedCustomerIds.size !== 1 ? "s" : ""} selected</span>
          <div className="flex gap-2 flex-wrap items-center">
            <Button size="sm" className="bg-[#d4af37] hover:bg-[#b8962e] text-black h-8 px-3 text-[0.7rem] font-semibold" onClick={openBulkCoupon}>
              🎁 Send Coupon
            </Button>
            <Button size="sm" variant="outline" className="h-8 px-2 text-[0.7rem]" onClick={() => setSelectedCustomerIds(new Set())}>
              ✕ Clear
            </Button>
          </div>
        </div>
      )}

      <Card className={CARD_TABLE}>
        <CardHeader className={financePanelHeader + " pb-2"}>
          <CardTitle className="flex items-center gap-2 text-[13px] font-semibold text-[#111118]">
            <Users className="h-4 w-4 text-[#D4AF37]" />Customer List
            <Badge className={`ml-auto ${financeBadgeGold}`}>{filtered.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-black/[0.06] bg-[#FAF8F2]">
                  <th className="px-4 py-3 w-10">
                    <input
                      type="checkbox"
                      checked={allFilteredSelected}
                      onChange={toggleSelectAll}
                      className="h-4 w-4 rounded border-gray-300 accent-[#d4af37] cursor-pointer"
                      title="Select all"
                    />
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Customer</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Tier</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Status</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Inactivity</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Visits</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Total Spend</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Birthday</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedCustomers.map(c => {
                  const days = getInactiveDays(c);
                  return (
                    <tr
                      key={c.id}
                      onClick={() => handleSelectCustomer(c)}
                      className={`${TABLE_ROW} cursor-pointer ${selectedCustomerIds.has(c.id) ? "bg-[#FFFBEB]/80" : ""}`}
                    >
                      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedCustomerIds.has(c.id)}
                          onChange={() => toggleSelectCustomer(c.id)}
                          onClick={e => e.stopPropagation()}
                          className="h-4 w-4 rounded border-gray-300 accent-[#d4af37] cursor-pointer"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#1a1a1a] to-[#2d2d2d] text-white font-bold text-xs flex-shrink-0">
                            {c.name.split(" ").map(n=>n[0]).join("")}
                          </div>
                          <div>
                            <p className="font-semibold">{c.name}</p>
                            <p className="text-xs text-muted-foreground">{c.email}</p>
                          </div>
                          {isBirthdayToday(c.birthday) && <span title="Birthday Today">🎂</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={`${membershipColors[c.membershipTier]} border text-xs capitalize`}>{c.membershipTier}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={c.status === "active" ? "bg-[#D4AF37]/10 text-[#9a7d20] border-[#D4AF37]/25" : "bg-red-50 text-red-700 border-red-200"}>
                          {c.status === "active" ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={`${getInactivityColor(days)} border text-xs`}>
                          <Clock className="h-3 w-3 mr-1 inline" />{getInactivityLabel(days)}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 font-medium">{c.totalVisits}</td>
                      <td className="px-4 py-3 font-semibold text-[#d4af37]">₹{c.totalSpend.toLocaleString()}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{c.birthday ? new Date(c.birthday).toLocaleDateString("en-IN",{day:"numeric",month:"short"}) : "—"}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          {!someSelected && (
                            <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={e=>{e.stopPropagation(); openCoupon(c);}}>🎁</Button>
                          )}
                          <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={e=>{e.stopPropagation(); openNotify(c);}}>
                            <Bell className="h-3 w-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr><td colSpan={9} className="text-center py-10 text-muted-foreground">No customers match your search.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <Pagination
            page={page}
            pageSize={pageSize}
            totalRecords={filtered.length}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </CardContent>
      </Card>

      {/* ── ADD CUSTOMER MODAL ── */}
      <Dialog open={addOpen} onOpenChange={(open) => { setAddOpen(open); if (!open) setNewCustomer({ name: "", phone: "", email: "", gender: "", membershipTier: "basic", birthday: "", address: "", notes: "" }); }}>
        <DialogContent className="sm:max-w-xl p-0 gap-0 overflow-hidden rounded-2xl [&>button:last-of-type]:hidden">
          {/* Dark header */}
          <div className="bg-[#111118] px-6 py-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-[#d4af37]/15 border border-[#d4af37]/20 flex items-center justify-center shrink-0">
                <UserPlus className="h-4.5 w-4.5 text-[#d4af37]" style={{ height: 18, width: 18 }} />
              </div>
              <div>
                <DialogTitle className="text-[15px] font-bold text-white leading-tight">Add New Customer</DialogTitle>
                <p className="text-[11px] text-white/40 mt-0.5">Fields marked <span className="text-red-400">*</span> are required</p>
              </div>
            </div>
            <button
              onClick={() => { setAddOpen(false); setNewCustomer({ name: "", phone: "", email: "", gender: "", membershipTier: "basic", birthday: "", address: "", notes: "" }); }}
              className="h-7 w-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors shrink-0"
            >
              <X className="h-3.5 w-3.5 text-white/70" />
            </button>
          </div>

          {/* Scrollable body */}
          <div className="overflow-y-auto max-h-[70vh] bg-[#faf8f2] px-6 py-5 space-y-5">

            {/* Contact Information */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#b8962e] mb-3">Contact Information</p>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-600">Full Name <span className="text-red-500">*</span></Label>
                  <Input
                    autoFocus
                    placeholder="e.g. Priya Sharma"
                    value={newCustomer.name}
                    onChange={e => setNewCustomer(d => ({ ...d, name: e.target.value }))}
                    className="h-10 px-3.5 rounded-xl border border-black/[0.08] bg-white focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/12 focus:bg-white"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-gray-600">Phone <span className="text-red-500">*</span></Label>
                    <div className="flex h-10 rounded-xl border border-black/[0.08] bg-white overflow-hidden focus-within:border-[#d4af37] focus-within:ring-2 focus-within:ring-[#d4af37]/12">
                      <span className="flex items-center px-3 text-xs font-bold text-white bg-[#111118] border-r border-black/[0.08] shrink-0">+91</span>
                      <input
                        placeholder="98765 00000"
                        value={newCustomer.phone.replace(/^\+91\s?/, "")}
                        onChange={e => setNewCustomer(d => ({ ...d, phone: "+91 " + e.target.value }))}
                        className="flex-1 px-3 text-sm bg-transparent outline-none placeholder:text-gray-400"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-gray-600">Email <span className="text-[10px] text-gray-400 font-normal">(optional)</span></Label>
                    <Input
                      type="email"
                      placeholder="email@example.com"
                      value={newCustomer.email}
                      onChange={e => setNewCustomer(d => ({ ...d, email: e.target.value }))}
                      className="h-10 px-3.5 rounded-xl border border-black/[0.08] bg-white focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/12"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-[#d4af37]/10" />

            {/* Personal Details */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#b8962e] mb-3">Personal Details</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-600">Gender</Label>
                  <div className="flex gap-1.5">
                    {[{ v: "female", l: "♀ Female" }, { v: "male", l: "♂ Male" }, { v: "other", l: "⚧ Other" }].map(g => (
                      <button
                        key={g.v}
                        type="button"
                        onClick={() => setNewCustomer(d => ({ ...d, gender: d.gender === g.v ? "" : g.v }))}
                        className={`flex-1 py-2 rounded-lg text-[11px] font-semibold border transition-all ${
                          newCustomer.gender === g.v
                            ? "bg-[#111118] text-[#d4af37] border-[#111118]"
                            : "bg-white text-gray-500 border-black/[0.08] hover:border-gray-300"
                        }`}
                      >
                        {g.l}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-600">Birthday <span className="text-[10px] text-gray-400 font-normal">(optional)</span></Label>
                  <Input
                    type="date"
                    value={newCustomer.birthday}
                    onChange={e => setNewCustomer(d => ({ ...d, birthday: e.target.value }))}
                    className="h-10 px-3.5 rounded-xl border border-black/[0.08] bg-white focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/12"
                  />
                </div>
              </div>
            </div>

            <div className="border-t border-[#d4af37]/10" />

            {/* Location & Notes */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#b8962e] mb-3">Location & Notes</p>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-600">Address <span className="text-[10px] text-gray-400 font-normal">(optional)</span></Label>
                  <Input
                    placeholder="Street, City"
                    value={newCustomer.address}
                    onChange={e => setNewCustomer(d => ({ ...d, address: e.target.value }))}
                    className="h-10 px-3.5 rounded-xl border border-black/[0.08] bg-white focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/12"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-600">Notes / Allergies <span className="text-[10px] text-gray-400 font-normal">(optional)</span></Label>
                  <Textarea
                    rows={2}
                    placeholder="Allergies, preferences, special notes…"
                    value={newCustomer.notes}
                    onChange={e => setNewCustomer(d => ({ ...d, notes: e.target.value }))}
                    className="px-3.5 py-2.5 rounded-xl border border-black/[0.08] bg-white focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/12 resize-none text-sm"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-gray-100 bg-white">
            <p className="text-[11px] text-gray-400">
              {newCustomer.name && newCustomer.phone
                ? <span className="text-emerald-600 font-medium">✓ Ready to add</span>
                : "Name & phone required"}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setAddOpen(false)} className="rounded-xl h-9 text-sm">Cancel</Button>
              <Button
                onClick={addCustomer}
                disabled={!newCustomer.name || !newCustomer.phone}
                className="rounded-xl h-9 text-sm bg-gradient-to-r from-[#d4af37] to-[#b8962e] text-black font-bold hover:opacity-90 disabled:opacity-40 px-5"
              >
                <UserPlus className="h-3.5 w-3.5 mr-1.5" />
                Add Customer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── LOYALTY PROGRAM MODAL ── */}
      <Dialog open={loyaltyOpen} onOpenChange={setLoyaltyOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Crown className="h-6 w-6 text-[#d4af37]" />
              {loyaltyCustomer?.membershipTier.toUpperCase()} Loyalty — {loyaltyCustomer?.name}
            </DialogTitle>
          </DialogHeader>
          {loyaltyCustomer && (() => {
            const b = membershipBenefits[loyaltyCustomer.membershipTier];
            return (
              <div className="space-y-4">
                <div className="bg-gradient-to-br from-[#1a1a1a] to-[#2d2d2d] rounded-xl p-5 text-white">
                  <div className="flex items-center justify-between mb-3">
                    <div><p className="text-sm text-[#d4af37]">Available Points</p><p className="text-4xl font-bold text-[#d4af37]">{loyaltyCustomer.loyaltyPoints}</p></div>
                    <div className="text-right"><p className="text-xs text-gray-400">Multiplier</p><p className="text-2xl font-bold">{b.pointsMultiplier}×</p><p className="text-xs text-gray-400">on all spends</p></div>
                  </div>
                  <div className="w-full bg-white/20 rounded-full h-2 mb-1"><div className="bg-[#d4af37] h-2 rounded-full" style={{ width: `${Math.min((loyaltyCustomer.loyaltyPoints / 5000) * 100, 100)}%` }} /></div>
                  <p className="text-xs text-gray-400">{Math.max(0, 5000 - loyaltyCustomer.loyaltyPoints)} pts to next tier</p>
                </div>
                <div>
                  <p className="font-semibold text-sm mb-2 flex items-center gap-1"><Sparkles className="h-4 w-4 text-[#d4af37]" />Member Benefits</p>
                  <div className="grid grid-cols-2 gap-2">
                    {b.benefits.map(bx => (
                      <div key={bx} className="flex items-start gap-2 bg-amber-50 rounded-lg p-2">
                        <CheckCircle className="h-4 w-4 text-[#D4AF37] shrink-0 mt-0.5" />
                        <p className="text-xs">{bx}</p>
                      </div>
                    ))}
                  </div>
                </div>
                {b.freeServices.length > 0 && (
                  <div>
                    <p className="font-semibold text-sm mb-2">Complimentary Services</p>
                    <div className="flex gap-2 flex-wrap">{b.freeServices.map(fs => <Badge key={fs} className="bg-[#D4AF37]/10 text-[#9a7d20] border-[#D4AF37]/25">{fs} — FREE</Badge>)}</div>
                  </div>
                )}
                {b.discount > 0 && (<div className="bg-[#FFFBEB] border border-[#D4AF37]/20 rounded-xl p-3"><p className="text-sm font-semibold text-[#9a7d20]">{b.discount}% discount applied automatically on all services</p></div>)}
                {activeEnrollment && (
                  <div className="rounded-xl border border-[#D4AF37]/30 bg-[#111118] p-4 text-white">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#d4af37]">Payment recorded</p>
                    <p className="mt-1 text-sm font-semibold capitalize">{activeEnrollment.packageName} membership</p>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-[12px]">
                      <div>
                        <p className="text-white/40">Amount paid</p>
                        <p className="font-bold text-[#d4af37]">₹{activeEnrollment.amountPaid.toLocaleString("en-IN")}</p>
                      </div>
                      <div>
                        <p className="text-white/40">Valid until</p>
                        <p className="font-semibold">{new Date(activeEnrollment.expiry).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>
                      </div>
                    </div>
                    <p className="mt-2 text-[11px] text-white/40">Also listed under Finance → Membership / Packages</p>
                  </div>
                )}
                <div className="bg-gradient-to-br from-amber-50 to-white border-2 border-[#d4af37]/30 rounded-xl p-4">
                  <p className="font-semibold text-sm mb-2 flex items-center gap-1"><Crown className="h-4 w-4 text-[#d4af37]" />Buy / Upgrade Membership</p>
                  <p className="text-xs text-muted-foreground mb-3">Collect payment at the counter first, then confirm below. Activation records the amount as paid.</p>
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    {Object.entries(membershipBenefits).filter(([k]) => k !== "basic").map(([tier, info]) => (
                      <button
                        key={tier}
                        onClick={() => setBuyTier(tier)}
                        className={`text-left rounded-lg border-2 p-2 transition-all ${buyTier === tier ? "border-[#d4af37] bg-[#d4af37]/10" : "border-black/[0.08] hover:border-[#d4af37]/40"} ${loyaltyCustomer.membershipTier === tier ? "opacity-60" : ""}`}
                        disabled={loyaltyCustomer.membershipTier === tier}
                      >
                        <p className="text-xs font-semibold capitalize">{tier}{loyaltyCustomer.membershipTier === tier ? " (Current)" : ""}</p>
                        <p className="text-sm font-bold text-[#1a1a1a]">₹{info.price.toLocaleString("en-IN")}<span className="text-[10px] text-muted-foreground font-normal"> / {info.durationLabel}</span></p>
                      </button>
                    ))}
                  </div>
                  <Button
                    className="w-full bg-gradient-to-r from-[#1a1a1a] to-[#2d2d2d]"
                    disabled={!buyTier || buyTier === loyaltyCustomer.membershipTier}
                    onClick={openMembershipPayment}
                  >
                    <IndianRupee className="h-4 w-4 mr-1" />
                    {buyTier ? `Collect ₹${membershipBenefits[buyTier]?.price.toLocaleString("en-IN")} & Confirm Payment` : "Select a plan to purchase"}
                  </Button>
                </div>
                <div>
                  <Label className="font-semibold">Redeem Points (discounts only)</Label>
                  <div className="flex gap-2 mt-1">
                    <Input type="number" placeholder="Points to redeem" min={0} max={loyaltyCustomer.loyaltyPoints} value={redeemPoints || ""} onChange={e => setRedeemPoints(Number(e.target.value))} className="w-40" />
                    <span className="flex items-center text-sm text-muted-foreground">= ₹{Math.floor(redeemPoints / 10)} value</span>
                    <Button disabled={redeeming || redeemPoints <= 0 || redeemPoints > loyaltyCustomer.loyaltyPoints} onClick={() => void handleRedeemPoints()}>Redeem</Button>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button className="flex-1 bg-[#121212] hover:bg-[#1a1a1a] text-[#D4AF37]" onClick={() => { openNotify(loyaltyCustomer); setLoyaltyOpen(false); }}><Send className="h-4 w-4 mr-1" />Send Member Offer</Button>
                  <Button variant="outline" className="flex-1" onClick={() => { if (loyaltyCustomer) navigate(customerBookingPath(loyaltyCustomer)); setLoyaltyOpen(false); }}><Calendar className="h-4 w-4 mr-1" />Book Appointment</Button>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* ── COUPON MODAL (single customer) ── */}
      <SendCouponModal
        open={singleCouponOpen}
        onOpenChange={setSingleCouponOpen}
        title="Send Coupon"
        subtitle={couponTarget ? `Deliver to ${couponTarget.name}` : undefined}
        customer={couponTarget}
        selectedCouponId={selectedCouponId}
        onSelectCoupon={setSelectedCouponId}
        coupons={coupons}
        onSend={sendSingleCoupon}
      />

      {/* ── BULK COUPON MODAL ── */}
      <SendCouponModal
        open={bulkCouponOpen}
        onOpenChange={setBulkCouponOpen}
        title="Send Coupon"
        subtitle={`Bulk send to ${selectedCustomerIds.size} selected`}
        customer={null}
        recipientNames={customers.filter(c => selectedCustomerIds.has(c.id)).map(c => c.name)}
        selectedCouponId={bulkCouponId}
        onSelectCoupon={setBulkCouponId}
        coupons={coupons}
        onSend={sendBulkCoupon}
      />

      {/* ── BIRTHDAY COUPON BULK MODAL ── */}
      <Dialog open={bdayCouponOpen} onOpenChange={setBdayCouponOpen}>
        <DialogContent className="gap-0 overflow-hidden rounded-2xl border-black/[0.08] p-0 sm:max-w-md">
          <div className="relative border-b border-black/[0.06] bg-[#111118] px-6 py-5">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#D4AF37]/70 to-transparent" />
            <DialogHeader className="space-y-1 text-left">
              <DialogTitle className="flex items-center gap-2.5 text-[16px] font-bold text-white">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#D4AF37]/25 bg-[#D4AF37]/15">
                  <Cake className="h-4 w-4 text-[#D4AF37]" />
                </div>
                Birthday Coupons
              </DialogTitle>
              <p className="text-[12px] text-white/50">Celebrate customers with a special offer today</p>
            </DialogHeader>
          </div>
          <div className="space-y-4 bg-[#f4f2ed] p-6">
            <p className="text-[13px] text-[#6b6b6b]">
              {todayBirthdays.length} customer{todayBirthdays.length !== 1 ? "s have" : " has"} a birthday today.
            </p>
            <div className="max-h-40 space-y-2 overflow-y-auto rounded-xl border border-black/[0.06] bg-white p-3">
              {todayBirthdays.map(c => (
                <div key={c.id} className="flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-[#faf9f7]">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#D4AF37] to-[#C9A227] text-[10px] font-bold text-[#111118]">
                    {c.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12px] font-semibold text-[#111118]">{c.name}</p>
                    <p className="text-[10px] text-[#9a9a9a]">{c.phone} · {c.membershipTier}</p>
                  </div>
                  <Gift className="h-3.5 w-3.5 shrink-0 text-[#D4AF37]" />
                </div>
              ))}
              {todayBirthdays.length === 0 && (
                <p className="py-4 text-center text-[12px] text-[#9a9a9a]">No birthdays today</p>
              )}
            </div>
            <div className="flex gap-2.5 pt-1">
              <Button
                className="h-11 flex-1 rounded-xl bg-[#111118] text-[13px] font-bold text-[#D4AF37] hover:bg-[#1e1e1e] disabled:opacity-40"
                onClick={sendBirthdayCoupons}
                disabled={todayBirthdays.length === 0}
              >
                <Gift className="mr-2 h-4 w-4" />
                Send to all
              </Button>
              <Button
                variant="outline"
                className="h-11 rounded-xl border-black/[0.1] bg-white text-[13px] font-semibold text-[#6b6b6b] hover:border-[#D4AF37]/30"
                onClick={() => setBdayCouponOpen(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <NotifyCustomerModal
        open={notifyOpen}
        onOpenChange={setNotifyOpen}
        target={notifyTarget}
        message={notifyMsg}
        onMessageChange={setNotifyMsg}
      />
      <MembershipPaymentConfirmDialog
        open={membershipPayOpen}
        onOpenChange={setMembershipPayOpen}
        customerName={loyaltyCustomer?.name ?? ""}
        tier={buyTier}
        amount={membershipBenefits[buyTier]?.price ?? 0}
        durationLabel={membershipBenefits[buyTier]?.durationLabel ?? ""}
        saving={purchasingMembership}
        onConfirm={(details) => void purchaseMembership(details)}
      />
    </motion.div>
  );
}
