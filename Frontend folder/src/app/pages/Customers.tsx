import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate, useLocation } from "react-router";
import { useCoupons } from "../context/CouponsContext";
import { useRole } from "../context/RoleContext";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Switch } from "../components/ui/switch";
import {
  Users, User, Search, Crown, Phone, Mail, Calendar, Heart,
  Gift, UserPlus, Cake, MessageSquare, CheckCircle, X, Bell,
  Filter, ArrowLeft, Clock, IndianRupee, ArrowRight,
} from "lucide-react";
import { formatDisplayPhone, phoneTelHref } from "../../lib/phone";
import { getApiErrorMessage } from "../../lib/api";
import { istDateKey } from "../../lib/istDate";
import {
  sendBirthdayOfferWhatsApp,
  sendCouponWhatsApp,
} from "../../api/messaging";
import { Pagination } from "../components/shared/Pagination";
import { PageStatCard } from "../components/shared/PageStatCard";
import { DEFAULT_PAGE_SIZE } from "../hooks/useTablePagination";
import {
  financeGoldBtn,
  financePanelHeader,
  financeBadgeGold,
} from "./finance/finance-ui";

import { type Customer, createCustomer, updateCustomer, redeemLoyaltyPoints } from "../../api/customers";
import { useCustomersQuery } from "../hooks/useCustomersQuery";
import { fetchAccountingOverview } from "../../api/accounting";
import { fetchMembershipTiers } from "../../api/membership-tiers";
import { enrollCustomerInPlan, fetchSalonPlans, fetchPlanEnrollments, type PlanEnrollment } from "../../api/plans";
import { customerToApiPayload } from "../../lib/customerMappers";
import { NotifyCustomerModal } from "./customers/CustomersCommModals";
import {
  MembershipPaymentConfirmDialog,
  type MembershipPaymentDetails,
} from "./customers/MembershipPaymentConfirmDialog";
import { toast } from "../components/ui/hot-toast";
import { cn } from "../components/ui/utils";
import {
  CARD_TABLE,
  TABLE_ROW,
  membershipColors,
  DEFAULT_MEMBERSHIP_BENEFITS,
  buildMembershipBenefits,
  isBirthdayToday,
  isBirthdayThisMonth,
  getInactiveDays,
  formatLatestVisitDate,
  SourceBadge,
  customerBookingPath,
} from "./customers/customerHelpers";
import { CustomerDetailView } from "./customers/CustomerDetailView";
import { AddCustomerModal, EMPTY_NEW_CUSTOMER, type NewCustomerForm } from "./customers/AddCustomerModal";
import { LoyaltyProgramModal } from "./customers/LoyaltyProgramModal";
import { CouponModals } from "./customers/CouponModals";

export function Customers() {
  const { role } = useRole();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("action") === "add") {
      if (role !== "admin") setAddOpen(true);
      navigate("/customers", { replace: true });
    }
  }, [location.search]);

  const [showSearchFilters, setShowSearchFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterTier, setFilterTier] = useState("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "inactive">("all");
  const [filterBirthday, setFilterBirthday] = useState<"all" | "today" | "thismonth">("all");
  const [filterInactive, setFilterInactive] = useState<"all" | "7" | "30" | "60" | "90">("all");
  const [filterGender, setFilterGender] = useState<"all" | "male" | "female" | "other">("all");
  const [filterSource, setFilterSource] = useState<"all" | "walk-in" | "online">("all");
  const [lastVisitFrom, setLastVisitFrom] = useState("");
  const [lastVisitTo, setLastVisitTo] = useState("");
  const [listPage, setListPage] = useState(1);
  const [listPageSize, setListPageSize] = useState(DEFAULT_PAGE_SIZE);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(searchQuery.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    setListPage(1);
  }, [debouncedSearch, filterStatus, listPageSize]);

  const {
    customers,
    total: customersTotal,
    customersLoading,
    reloadCustomers,
    setCustomersCache: setCustomers,
    error: customersQueryError,
  } = useCustomersQuery({
    page: listPage,
    limit: listPageSize,
    search: debouncedSearch || undefined,
    status: filterStatus === "all" ? undefined : filterStatus,
  });
  const [todayRevenue, setTodayRevenue] = useState<number | null>(null);

  useEffect(() => {
    if (customersQueryError) toast.error("Failed to load customers from server");
  }, [customersQueryError]);

  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(customersTotal / listPageSize) || 1);
    if (listPage > maxPage) setListPage(maxPage);
  }, [customersTotal, listPageSize, listPage]);

  useEffect(() => {
    let cancelled = false;
    fetchAccountingOverview(istDateKey())
      .then((overview) => {
        if (!cancelled) setTodayRevenue(overview.totalSales ?? 0);
      })
      .catch(() => {
        if (!cancelled) setTodayRevenue(null);
      });
    return () => { cancelled = true; };
  }, []);

  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [detailView, setDetailView] = useState(false);
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
  const [newCustomer, setNewCustomer] = useState<NewCustomerForm>(EMPTY_NEW_CUSTOMER);
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

  const clearSearchFilters = () => {
    setSearchQuery("");
    setFilterTier("all");
    setFilterStatus("all");
    setFilterGender("all");
    setFilterSource("all");
    setFilterBirthday("all");
    setFilterInactive("all");
    setLastVisitFrom("");
    setLastVisitTo("");
  };

  const filtered = useMemo(() => {
    return customers.filter(c => {
      // Search + status already applied server-side.
      const matchT = filterTier === "all" || c.membershipTier === filterTier;
      const matchB = !showSearchFilters || filterBirthday === "all" ? true :
        filterBirthday === "today" ? isBirthdayToday(c.birthday) :
        isBirthdayThisMonth(c.birthday);
      const matchG = !showSearchFilters || filterGender === "all" || c.gender === filterGender;
      const matchSrc = !showSearchFilters || filterSource === "all" || (c.source ?? "unknown") === filterSource;
      const visitDate = c.lastVisitDate ? new Date(c.lastVisitDate) : null;
      const matchFrom = !showSearchFilters || !lastVisitFrom ? true : (visitDate ? visitDate >= new Date(lastVisitFrom) : false);
      const matchTo = !showSearchFilters || !lastVisitTo ? true : (visitDate ? visitDate <= new Date(lastVisitTo) : false);
      const days = getInactiveDays(c);
      const matchI = !showSearchFilters || filterInactive === "all" ? true : days != null && days >= Number(filterInactive);
      return matchT && matchB && matchI && matchG && matchSrc && matchFrom && matchTo;
    });
  }, [customers, showSearchFilters, filterTier, filterBirthday, filterInactive, filterGender, filterSource, lastVisitFrom, lastVisitTo]);

  // Live counts for the source segmented toggle (respects all filters except source itself).
  const sourceCounts = useMemo(() => ({
    all: customers.length,
    "walk-in": customers.filter(c => (c.source ?? "unknown") === "walk-in").length,
    online: customers.filter(c => (c.source ?? "unknown") === "online").length,
  }), [customers]);
  const paginatedCustomers = filtered;
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

  const sendBirthdayCoupons = async () => {
    const offerLabel = "20 percent OFF";
    const validUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

    let sent = 0;
    let failed = 0;
    for (const c of todayBirthdays) {
      if (!c.phone) {
        failed += 1;
        continue;
      }
      try {
        await sendBirthdayOfferWhatsApp({
          phone: c.phone,
          customerName: c.name,
          offerLabel,
          validUntil,
        });
        sent += 1;
      } catch {
        failed += 1;
      }
    }

    setBdayCouponOpen(false);
    if (sent > 0) {
      toast.success("Birthday WhatsApp offers sent", {
        description: `Delivered to ${sent} customer(s)${failed ? ` · ${failed} failed` : ""}`,
      });
    } else {
      toast.error("Could not send birthday WhatsApp offers");
    }
  };

  const couponValueLabel = (coupon: { type: string; value: number }) =>
    coupon.type === "percentage" ? `${coupon.value} percent OFF` : `Rs.${coupon.value} OFF`;

  const sendSingleCoupon = async (channel: "whatsapp" | "sms") => {
    const sel = coupons.find((c) => c.id === selectedCouponId);
    if (!sel || !couponTarget) return;

    if (channel !== "whatsapp") {
      toast.error("SMS sending is disabled — use WhatsApp");
      return;
    }
    if (!couponTarget.phone) {
      toast.error("Customer has no phone number");
      return;
    }

    try {
      await sendCouponWhatsApp({
        phone: couponTarget.phone,
        code: sel.code,
        valueLabel: couponValueLabel(sel),
        validUntil: sel.validTill,
        customerName: couponTarget.name,
      });
      recordSend(sel.id, couponTarget.id, couponTarget.name, "whatsapp");
      toast.success(`Coupon ${sel.code} sent on WhatsApp`, {
        description: `Delivered to ${couponTarget.name}`,
      });
      setSingleCouponOpen(false);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to send coupon on WhatsApp"));
    }
  };

  const sendBulkCoupon = async (channel: "whatsapp" | "sms") => {
    const sel = coupons.find((c) => c.id === bulkCouponId);
    if (!sel) return;

    if (channel !== "whatsapp") {
      toast.error("SMS sending is disabled — use WhatsApp");
      return;
    }

    const targets = customers.filter((c) => selectedCustomerIds.has(c.id) && c.phone);
    let sent = 0;
    let failed = 0;

    for (const c of targets) {
      try {
        await sendCouponWhatsApp({
          phone: c.phone,
          code: sel.code,
          valueLabel: couponValueLabel(sel),
          validUntil: sel.validTill,
          customerName: c.name,
        });
        recordSend(sel.id, c.id, c.name, "whatsapp");
        sent += 1;
      } catch {
        failed += 1;
      }
    }

    if (sent > 0) {
      toast.success(`Coupon ${sel.code} sent`, {
        description: `WhatsApp delivered to ${sent} customer(s)${failed ? ` · ${failed} failed` : ""}`,
      });
      setBulkCouponOpen(false);
      setSelectedCustomerIds(new Set());
    } else {
      toast.error("Could not send coupon WhatsApp messages");
    }
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
      setNewCustomer({ ...EMPTY_NEW_CUSTOMER, gender: "female" });
      toast.success("Customer added");
      try {
        const latest = await reloadCustomers();
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
        <LoyaltyProgramModal
          open={loyaltyOpen}
          onOpenChange={setLoyaltyOpen}
          loyaltyCustomer={loyaltyCustomer}
          membershipBenefits={membershipBenefits}
          activeEnrollment={activeEnrollment}
          buyTier={buyTier}
          setBuyTier={setBuyTier}
          redeemPoints={redeemPoints}
          setRedeemPoints={setRedeemPoints}
          redeeming={redeeming}
          onRedeem={() => void handleRedeemPoints()}
          onOpenMembershipPayment={openMembershipPayment}
        />
        <NotifyCustomerModal
          open={notifyOpen}
          onOpenChange={setNotifyOpen}
          target={notifyTarget}
          message={notifyMsg}
          onMessageChange={setNotifyMsg}
        />
        <CouponModals
          singleCouponOpen={singleCouponOpen}
          setSingleCouponOpen={setSingleCouponOpen}
          couponTarget={couponTarget}
          selectedCouponId={selectedCouponId}
          setSelectedCouponId={setSelectedCouponId}
          coupons={coupons}
          onSendSingle={sendSingleCoupon}
          bulkCouponOpen={bulkCouponOpen}
          setBulkCouponOpen={setBulkCouponOpen}
          selectedCount={selectedCustomerIds.size}
          recipientNames={customers.filter(c => selectedCustomerIds.has(c.id)).map(c => c.name)}
          bulkCouponId={bulkCouponId}
          setBulkCouponId={setBulkCouponId}
          onSendBulk={sendBulkCoupon}
          bdayCouponOpen={bdayCouponOpen}
          setBdayCouponOpen={setBdayCouponOpen}
          todayBirthdays={todayBirthdays}
          onSendBirthdayCoupons={sendBirthdayCoupons}
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
      className="flex h-[calc(100dvh-8rem)] min-h-0 flex-col gap-3 overflow-hidden sm:gap-4"
    >
      <div className="shrink-0 space-y-3 sm:space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 shrink-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#D4AF37]">CRM</p>
          <h1 className="whitespace-nowrap text-2xl font-bold bg-gradient-to-r from-[#1a1a1a] to-[#d4af37] bg-clip-text text-transparent sm:text-3xl">Customers</h1>
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
          {role !== "admin" && (
            <button type="button" className={financeGoldBtn + " inline-flex items-center gap-2"} onClick={() => setAddOpen(true)}>
              <UserPlus className="h-4 w-4" />Add Customer
            </button>
          )}
        </div>
      </div>

      {/* Stat cards — tablet + desktop; phones keep list space. */}
      <div className="hidden shrink-0 gap-3 md:grid md:grid-cols-2 lg:grid-cols-4">
        <PageStatCard
          label="Today's Revenue"
          value={todayRevenue == null ? "—" : `₹${todayRevenue.toLocaleString("en-IN")}`}
          sub="Sales collected today"
          icon={IndianRupee}
          index={0}
        />
        <PageStatCard
          label="Total Customers"
          value={customers.length}
          sub="All in CRM"
          icon={Users}
          index={1}
          onClick={() => { setShowSearchFilters(true); setFilterTier("all"); setFilterStatus("all"); setFilterBirthday("all"); }}
        />
        <PageStatCard
          label="Active Customers"
          value={customers.filter(c => c.status === "active").length}
          sub="Currently active"
          icon={CheckCircle}
          index={2}
          onClick={() => { setShowSearchFilters(true); setFilterStatus("active"); }}
        />
        <PageStatCard
          label="Birthdays This Month"
          value={birthdayCustomers.length}
          sub="Send birthday coupons"
          icon={Gift}
          index={3}
          onClick={() => { setShowSearchFilters(true); setFilterBirthday("thismonth"); }}
        />
      </div>

      {/* Search + Filters — visible only when toggle is on */}
      <div className="shrink-0 rounded-2xl border border-black/[0.07] bg-white shadow-sm px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#D4AF37]/25 bg-[#D4AF37]/10">
              <Filter className="h-4 w-4 text-[#D4AF37]" />
            </div>
            <div>
              <p className="text-[13px] font-bold text-[#111118]">Search &amp; filters</p>
              <p className="text-[11px] text-[#9a9a9a]">
                {showSearchFilters ? "Turn off to hide and reset" : "Turn on to search or filter customers"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-[11px] font-semibold ${showSearchFilters ? "text-[#9a7d20]" : "text-[#9a9a9a]"}`}>
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

        {showSearchFilters && (
          <>
        <div className="mt-3 flex items-center gap-2.5 flex-wrap">

          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search name or phone number"
              className="w-full h-10 pl-10 pr-9 rounded-xl border border-black/[0.08] text-[13px] text-[#111] placeholder:text-[#9a9a9a] outline-none focus:border-[#D4AF37]/50 focus:ring-2 focus:ring-[#D4AF37]/12 bg-[#FAF8F2]/60 transition-all"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center transition-colors">
                <X className="h-3 w-3 text-gray-500" />
              </button>
            )}
          </div>

          {/* Source — 1-click segmented toggle with live counts */}
          <div className="inline-flex shrink-0 items-center gap-0.5 rounded-xl border border-black/[0.08] bg-[#FAF8F2]/60 p-1" role="tablist" aria-label="Filter by source">
            {([
              { value: "all", label: "All", icon: Users },
              { value: "walk-in", label: "Walk-in", icon: ArrowRight },
              { value: "online", label: "Online", icon: Calendar },
            ] as const).map(({ value, label, icon: Icon }) => {
              const isActive = filterSource === value;
              return (
                <button
                  key={value}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setFilterSource(value)}
                  className={`flex h-11 items-center gap-1.5 rounded-lg px-3.5 text-[13px] font-semibold transition-all ${
                    isActive
                      ? "bg-[#D4AF37]/15 text-[#9a7d20] border border-[#D4AF37]/35"
                      : "text-[#6b6b6b] border border-transparent hover:bg-black/[0.04]"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${isActive ? "bg-[#D4AF37]/25 text-[#9a7d20]" : "bg-black/[0.06] text-[#6b6b6b]"}`}>
                    {sourceCounts[value]}
                  </span>
                </button>
              );
            })}
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
            <span className="select-chevron-legacy pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-gray-400">
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
            <span className="select-chevron-legacy pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-gray-400">
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
            <span className="select-chevron-legacy pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-gray-400">
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </span>
            {filterGender !== "all" && <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-[#d4af37]" />}
          </div>

          {/* Birthday */}
          <div className="relative shrink-0">
            <Cake className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#d4af37] pointer-events-none" />
            <select
              value={filterBirthday}
              onChange={(e) => setFilterBirthday(e.target.value as typeof filterBirthday)}
              className={`h-10 pl-9 pr-7 rounded-xl border text-[13px] font-semibold appearance-none outline-none cursor-pointer transition-all focus:ring-2 focus:ring-[#d4af37]/20 ${filterBirthday !== "all" ? "border-[#d4af37]/60 bg-[#fffbea] text-[#9a7a1e]" : "border-black/[0.08] bg-[#FAF8F2]/60 text-[#6b6b6b] hover:border-black/[0.12]"}`}
            >
              <option value="all">All Birthdays</option>
              <option value="today">🎂 Today</option>
              <option value="thismonth">This Month</option>
            </select>
            <span className="select-chevron-legacy pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-gray-400">
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </span>
            {filterBirthday !== "all" && <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-[#d4af37]" />}
          </div>

          {/* Inactive days */}
          <div className="relative shrink-0">
            <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#d4af37] pointer-events-none" />
            <select
              value={filterInactive}
              onChange={(e) => setFilterInactive(e.target.value as typeof filterInactive)}
              className={`h-10 pl-9 pr-7 rounded-xl border text-[13px] font-semibold appearance-none outline-none cursor-pointer transition-all focus:ring-2 focus:ring-[#d4af37]/20 ${filterInactive !== "all" ? "border-[#d4af37]/60 bg-[#fffbea] text-[#9a7a1e]" : "border-black/[0.08] bg-[#FAF8F2]/60 text-[#6b6b6b] hover:border-black/[0.12]"}`}
            >
              <option value="all">Any Activity</option>
              <option value="7">Inactive 7+ days</option>
              <option value="30">Inactive 30+ days</option>
              <option value="60">Inactive 60+ days</option>
              <option value="90">Inactive 90+ days</option>
            </select>
            <span className="select-chevron-legacy pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-gray-400">
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </span>
            {filterInactive !== "all" && <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-[#d4af37]" />}
          </div>

          {/* Last visit range */}
          <div className="flex items-center gap-1.5 shrink-0">
            <Calendar className="h-4 w-4 text-[#d4af37] shrink-0" />
            <input
              type="date"
              value={lastVisitFrom}
              onChange={(e) => setLastVisitFrom(e.target.value)}
              title="Last visit from"
              className={`h-10 rounded-xl border px-2 text-[12px] font-semibold outline-none focus:ring-2 focus:ring-[#d4af37]/20 ${lastVisitFrom ? "border-[#d4af37]/60 bg-[#fffbea] text-[#9a7a1e]" : "border-black/[0.08] bg-[#FAF8F2]/60 text-[#6b6b6b]"}`}
            />
            <span className="text-[11px] text-gray-400">to</span>
            <input
              type="date"
              value={lastVisitTo}
              onChange={(e) => setLastVisitTo(e.target.value)}
              title="Last visit to"
              className={`h-10 rounded-xl border px-2 text-[12px] font-semibold outline-none focus:ring-2 focus:ring-[#d4af37]/20 ${lastVisitTo ? "border-[#d4af37]/60 bg-[#fffbea] text-[#9a7a1e]" : "border-black/[0.08] bg-[#FAF8F2]/60 text-[#6b6b6b]"}`}
            />
          </div>

          {/* Clear */}
          {(searchQuery || filterTier !== "all" || filterStatus !== "all" || filterGender !== "all" || filterSource !== "all" || filterBirthday !== "all" || filterInactive !== "all" || lastVisitFrom || lastVisitTo) && (
            <button
              type="button"
              onClick={clearSearchFilters}
              className="flex items-center gap-1.5 h-10 px-3 text-[12px] font-semibold text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl border border-black/[0.08] hover:border-red-200 transition-all shrink-0"
            >
              <X className="h-3.5 w-3.5" /> Clear
            </button>
          )}
        </div>

        <div className="mt-2 flex items-center justify-between gap-2">
          <span className="text-[11px] font-semibold text-[#9a9a9a]">
            Showing {filtered.length} of {customers.length} customers
          </span>
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
          </>
        )}
      </div>
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

      <Card className={cn(CARD_TABLE, "flex min-h-0 flex-1 flex-col")}>
        <CardHeader className={financePanelHeader + " shrink-0 pb-2"}>
          <CardTitle className="flex items-center gap-2 text-[13px] font-semibold text-[#111118]">
            <Users className="h-4 w-4 text-[#D4AF37]" />Customer List
            <label className="ml-auto flex cursor-pointer items-center gap-2 text-[11px] font-semibold text-[#6b6b6b] lg:hidden">
              <input
                type="checkbox"
                checked={allFilteredSelected}
                onChange={toggleSelectAll}
                className="h-4 w-4 rounded border-gray-300 accent-[#d4af37]"
              />
              Select all
            </label>
            <Badge className={financeBadgeGold}>{filtered.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex min-h-0 flex-1 flex-col overflow-hidden px-0 pb-0">
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {/* Phone/tablet: complete customer cards with no horizontal scrolling. */}
          <div className="divide-y divide-black/[0.06] lg:hidden">
            {paginatedCustomers.map((customer, index) => {
              const selected = selectedCustomerIds.has(customer.id);
              const formattedPhone = formatDisplayPhone(customer.phone);
              const telHref = phoneTelHref(customer.phone);

              return (
                <article
                  key={customer.id}
                  className={cn(
                    "space-y-3 p-4 transition-colors sm:p-5",
                    selected
                      ? "bg-[#FFFBEB]/90"
                      : index % 2 === 0
                        ? "bg-white"
                        : "bg-[#FAFAFA]",
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="pt-2"
                      onClick={(event) => event.stopPropagation()}
                      onKeyDown={(event) => event.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => toggleSelectCustomer(customer.id)}
                        aria-label={`Select ${customer.name}`}
                        className="h-5 w-5 cursor-pointer rounded border-gray-300 accent-[#d4af37]"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => handleSelectCustomer(customer)}
                      className="flex min-w-0 flex-1 items-center gap-3 text-left"
                    >
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#1a1a1a] to-[#2d2d2d] text-[13px] font-bold text-white">
                        {customer.name.split(" ").map((name) => name[0]).join("").slice(0, 2)}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-[15px] font-bold text-[#111118]">{customer.name}</p>
                          {isBirthdayToday(customer.birthday) && <span title="Birthday today">🎂</span>}
                        </div>
                        <p className="mt-0.5 truncate text-[11px] text-[#9a9a9a]">{customer.email || "No email"}</p>
                      </div>
                    </button>

                    <Badge className={cn(
                      "shrink-0 border text-[10px]",
                      customer.status === "active"
                        ? "border-[#D4AF37]/25 bg-[#D4AF37]/10 text-[#9a7d20]"
                        : "border-red-200 bg-red-50 text-red-700",
                    )}>
                      {customer.status === "active" ? "Active" : "Inactive"}
                    </Badge>
                  </div>

                  {telHref ? (
                    <a
                      href={telHref}
                      onClick={(event) => event.stopPropagation()}
                      className="ml-8 inline-flex items-center gap-2 whitespace-nowrap rounded-xl border border-[#D4AF37]/25 bg-[#FFFBEB] px-3.5 py-2 text-[15px] font-bold tabular-nums text-[#111118] transition-colors hover:bg-[#FFF4D6] active:scale-[0.98]"
                      aria-label={`Call ${customer.name} at ${formattedPhone}`}
                    >
                      <Phone className="h-4 w-4 shrink-0 text-[#D4AF37]" />
                      <span>{formattedPhone}</span>
                    </a>
                  ) : (
                    <div className="ml-8 inline-flex items-center gap-2 whitespace-nowrap rounded-xl border border-[#D4AF37]/25 bg-[#FFFBEB] px-3.5 py-2 text-[15px] font-bold tabular-nums text-[#111118]">
                      <Phone className="h-4 w-4 shrink-0 text-[#D4AF37]" />
                      <span>{formattedPhone}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2 pl-8 sm:grid-cols-3">
                    <div className="rounded-xl border border-black/[0.06] bg-white/80 px-3 py-2">
                      <p className="text-[9px] font-bold uppercase tracking-wider text-[#9a9a9a]">Date</p>
                      <p className="mt-0.5 text-[13px] font-semibold tabular-nums text-[#111118]">
                        {formatLatestVisitDate(customer)}
                      </p>
                    </div>
                    <div className="rounded-xl border border-black/[0.06] bg-white/80 px-3 py-2">
                      <p className="text-[9px] font-bold uppercase tracking-wider text-[#9a9a9a]">Source</p>
                      <div className="mt-1"><SourceBadge source={customer.source} /></div>
                    </div>
                    <div className="rounded-xl border border-black/[0.06] bg-white/80 px-3 py-2">
                      <p className="text-[9px] font-bold uppercase tracking-wider text-[#9a9a9a]">Tier</p>
                      <div className="mt-1">
                        <Badge className={`${membershipColors[customer.membershipTier]} border text-[10px] capitalize`}>
                          {customer.membershipTier}
                        </Badge>
                      </div>
                    </div>
                    <div className="rounded-xl border border-black/[0.06] bg-white/80 px-3 py-2">
                      <p className="text-[9px] font-bold uppercase tracking-wider text-[#9a9a9a]">Visits</p>
                      <p className="mt-0.5 text-[15px] font-black text-[#111118]">{customer.totalVisits}</p>
                    </div>
                    <div className="rounded-xl border border-[#D4AF37]/20 bg-[#FFFBEB] px-3 py-2">
                      <p className="text-[9px] font-bold uppercase tracking-wider text-[#9a7d20]">Total Spend</p>
                      <p className="mt-0.5 text-[15px] font-black text-[#9a7d20]">₹{customer.totalSpend.toLocaleString()}</p>
                    </div>
                    <div className="rounded-xl border border-black/[0.06] bg-white/80 px-3 py-2">
                      <p className="text-[9px] font-bold uppercase tracking-wider text-[#9a9a9a]">Birthday</p>
                      <p className="mt-0.5 flex items-center gap-1 text-[13px] font-semibold text-[#111118]">
                        {customer.birthday ? (
                          <>
                            <Cake className="h-3.5 w-3.5 text-pink-500" />
                            {new Date(customer.birthday).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                          </>
                        ) : (
                          "—"
                        )}
                      </p>
                    </div>
                  </div>

                  <div
                    className="flex items-center justify-end gap-2 pl-8"
                    onClick={(event) => event.stopPropagation()}
                    onKeyDown={(event) => event.stopPropagation()}
                  >
                    {!someSelected && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-10 rounded-xl px-3 text-[12px]"
                        onClick={() => openCoupon(customer)}
                      >
                        🎁 Coupon
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-10 rounded-xl px-3 text-[12px]"
                      onClick={() => openNotify(customer)}
                    >
                      <Bell className="mr-1.5 h-3.5 w-3.5" />
                      Notify
                    </Button>
                  </div>
                </article>
              );
            })}
            {filtered.length === 0 && (
              <div className="py-10 text-center text-sm text-muted-foreground">
                No customers match your search.
              </div>
            )}
          </div>

          {/* Laptop/desktop: retain the dense customer table. */}
          <div className="hidden overflow-x-auto lg:block">
            <table className="w-full min-w-[920px] text-sm">
              <thead className="sticky top-0 z-10">
                <tr className="border-b border-black/[0.06] bg-[#FAF8F2]">
                  <th className="w-10 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={allFilteredSelected}
                      onChange={toggleSelectAll}
                      className="h-4 w-4 cursor-pointer rounded border-gray-300 accent-[#d4af37]"
                      title="Select all"
                    />
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Customer</th>
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Date</th>
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Source</th>
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Tier</th>
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Visits</th>
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Total Spend</th>
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Birthday</th>
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedCustomers.map(c => {
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
                          className="h-4 w-4 cursor-pointer rounded border-gray-300 accent-[#d4af37]"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#1a1a1a] to-[#2d2d2d] text-xs font-bold text-white">
                            {c.name.split(" ").map(n=>n[0]).join("")}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-semibold">{c.name}</p>
                            <p className="mt-0.5 text-[13px] font-semibold tabular-nums tracking-wide text-[#111118]">
                              {formatDisplayPhone(c.phone)}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">{c.email || "No email"}</p>
                          </div>
                          {isBirthdayToday(c.birthday) && <span title="Birthday Today">🎂</span>}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-[13px] font-medium tabular-nums text-[#111118]">
                        {formatLatestVisitDate(c)}
                      </td>
                      <td className="px-4 py-3">
                        <SourceBadge source={c.source} />
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={`${membershipColors[c.membershipTier]} border text-xs capitalize`}>{c.membershipTier}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={c.status === "active" ? "bg-[#D4AF37]/10 text-[#9a7d20] border-[#D4AF37]/25" : "bg-red-50 text-red-700 border-red-200"}>
                          {c.status === "active" ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 font-medium">{c.totalVisits}</td>
                      <td className="px-4 py-3 font-semibold text-[#d4af37]">₹{c.totalSpend.toLocaleString()}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{c.birthday ? new Date(c.birthday).toLocaleDateString("en-IN",{day:"numeric",month:"short"}) : "—"}</td>
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
                  <tr><td colSpan={10} className="py-10 text-center text-muted-foreground">No customers match your search.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          </div>
          <div className="shrink-0 border-t border-black/[0.06] bg-white">
          <Pagination
            page={listPage}
            pageSize={listPageSize}
            totalRecords={customersTotal}
            onPageChange={setListPage}
            onPageSizeChange={(size) => {
              setListPageSize(size);
              setListPage(1);
            }}
          />
          </div>
        </CardContent>
      </Card>

      {/* ── ADD CUSTOMER MODAL ── */}
      {role !== "admin" && (
        <AddCustomerModal
          open={addOpen}
          onOpenChange={setAddOpen}
          newCustomer={newCustomer}
          setNewCustomer={setNewCustomer}
          onAdd={addCustomer}
        />
      )}

      <LoyaltyProgramModal
        open={loyaltyOpen}
        onOpenChange={setLoyaltyOpen}
        loyaltyCustomer={loyaltyCustomer}
        membershipBenefits={membershipBenefits}
        activeEnrollment={activeEnrollment}
        buyTier={buyTier}
        setBuyTier={setBuyTier}
        redeemPoints={redeemPoints}
        setRedeemPoints={setRedeemPoints}
        redeeming={redeeming}
        onRedeem={() => void handleRedeemPoints()}
        onOpenMembershipPayment={openMembershipPayment}
        showQuickActions
        onSendOffer={() => { if (loyaltyCustomer) openNotify(loyaltyCustomer); setLoyaltyOpen(false); }}
        onBookAppointment={() => { if (loyaltyCustomer) navigate(customerBookingPath(loyaltyCustomer)); setLoyaltyOpen(false); }}
      />

      <CouponModals
        singleCouponOpen={singleCouponOpen}
        setSingleCouponOpen={setSingleCouponOpen}
        couponTarget={couponTarget}
        selectedCouponId={selectedCouponId}
        setSelectedCouponId={setSelectedCouponId}
        coupons={coupons}
        onSendSingle={sendSingleCoupon}
        bulkCouponOpen={bulkCouponOpen}
        setBulkCouponOpen={setBulkCouponOpen}
        selectedCount={selectedCustomerIds.size}
        recipientNames={customers.filter(c => selectedCustomerIds.has(c.id)).map(c => c.name)}
        bulkCouponId={bulkCouponId}
        setBulkCouponId={setBulkCouponId}
        onSendBulk={sendBulkCoupon}
        bdayCouponOpen={bdayCouponOpen}
        setBdayCouponOpen={setBdayCouponOpen}
        todayBirthdays={todayBirthdays}
        onSendBirthdayCoupons={sendBirthdayCoupons}
      />

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
