import { Star, Phone } from "lucide-react";
import { Badge } from "../../components/ui/badge";
import { cn } from "../../components/ui/utils";
import {
  financePanel,
  financeIconWrap,
} from "../finance/finance-ui";
import { type Customer } from "../../../api/customers";
import { type MembershipTier } from "../../../api/membership-tiers";
import { type SalonPlan } from "../../../api/plans";

export const CARD_TABLE = `${financePanel} overflow-hidden`;
export const TABLE_ROW = "border-b border-black/[0.05] hover:bg-[#FAF8F2]/80 transition-colors";

const today = new Date();
export const daysBetween = (isoDate: string): number | null => {
  if (!isoDate?.trim()) return null;
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) return null;
  return Math.floor((today.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
};

export const membershipColors: Record<string, string> = {
  platinum: "bg-[#121212] text-[#D4AF37] border-[#D4AF37]/30",
  gold: "bg-[#D4AF37]/10 text-[#9a7d20] border-[#D4AF37]/25",
  silver: "bg-[#FAF8F2] text-[#3f3f46] border-black/[0.08]",
  basic: "bg-[#f4f2ed] text-[#111118] border-black/[0.08]",
};

export type MembershipBenefitInfo = {
  benefits: string[];
  discount: number;
  pointsMultiplier: number;
  freeServices: string[];
  price: number;
  durationLabel: string;
};

export const DEFAULT_MEMBERSHIP_BENEFITS: Record<string, MembershipBenefitInfo> = {
  basic: { benefits: ["Standard loyalty points", "Access to promotions"], discount: 0, pointsMultiplier: 1, freeServices: [], price: 0, durationLabel: "Free" },
};

function parseTierBenefits(benefits: string): string[] {
  if (!benefits.trim()) return [];
  return benefits.split("\n").map((line) => line.trim()).filter(Boolean);
}

export function buildMembershipBenefits(
  tiers: MembershipTier[],
  plans: SalonPlan[],
): Record<string, MembershipBenefitInfo> {
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

export function isBirthdayToday(birthday: string): boolean {
  if (!birthday) return false;
  const today = new Date();
  const bday = new Date(birthday);
  return bday.getMonth() === today.getMonth() && bday.getDate() === today.getDate();
}

export function isBirthdayThisMonth(birthday: string): boolean {
  if (!birthday) return false;
  const today = new Date();
  const bday = new Date(birthday);
  return bday.getMonth() === today.getMonth();
}

export function getInactiveDays(c: Customer): number | null {
  return daysBetween(c.lastVisitDate);
}

export function getInactivityLabel(days: number | null): string {
  if (days == null) return "No visits yet";
  if (days <= 0) return "Active today";
  if (days === 1) return "1 day inactive";
  if (days < 7) return `${days} days inactive`;
  if (days < 30) return `${Math.floor(days / 7)} week${Math.floor(days / 7) > 1 ? "s" : ""} inactive`;
  return `${Math.floor(days / 30)} month${Math.floor(days / 30) > 1 ? "s" : ""} inactive`;
}

/** Sort customers with the most recent visit/join day first (matches the list “Date” column). */
export function compareCustomersByLatestDate(a: Customer, b: Customer): number {
  const latestMs = (c: Customer) => {
    const visit = c.lastVisitDate?.trim() ? Date.parse(c.lastVisitDate) : Number.NaN;
    const joined = c.joinDate?.trim() ? Date.parse(c.joinDate) : Number.NaN;
    return Math.max(
      Number.isFinite(visit) ? visit : 0,
      Number.isFinite(joined) ? joined : 0,
    );
  };
  return latestMs(b) - latestMs(a);
}

/** Latest visit date for list/table “Date” column. */
export function formatLatestVisitDate(c: Customer): string {
  const raw = c.lastVisitDate?.trim() || c.lastVisit?.trim();
  if (!raw) return "—";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function getInactivityColor(days: number | null): string {
  if (days == null) return "bg-[#f4f2ed] text-[#3f3f46] border-black/[0.08]";
  if (days <= 3) return "bg-[#D4AF37]/10 text-[#9a7d20] border-[#D4AF37]/25";
  if (days <= 14) return "bg-[#FFFBEB] text-[#9a7d20] border-[#D4AF37]/20";
  if (days <= 30) return "bg-[#FAF8F2] text-[#3f3f46] border-black/[0.08]";
  return "bg-red-50 text-red-700 border-red-200";
}

export function StarRow({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className={`h-3.5 w-3.5 ${i <= rating ? "fill-[#d4af37] text-[#d4af37]" : "text-[#e8e6e1] fill-[#e8e6e1]"}`} />
      ))}
    </div>
  );
}

export const tierAvatarRing: Record<string, string> = {
  platinum: "ring-2 ring-[#D4AF37]/60 shadow-[0_0_28px_rgba(212,175,55,0.22)]",
  gold: "ring-2 ring-[#D4AF37]/40 shadow-[0_0_20px_rgba(212,175,55,0.12)]",
  silver: "ring-2 ring-black/[0.12]",
  basic: "ring-2 ring-black/[0.08]",
};

export const tierHeroGlow: Record<string, string> = {
  platinum: "bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(212,175,55,0.18),transparent)]",
  gold: "bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(212,175,55,0.12),transparent)]",
  silver: "bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(18,18,18,0.06),transparent)]",
  basic: "bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(18,18,18,0.04),transparent)]",
};

/** Badge showing how the customer was acquired (walk-in vs online). */
export function SourceBadge({ source }: { source?: string }) {
  if (source === "walk-in") {
    return (
      <Badge className="border text-xs bg-[#FAF8F2] text-[#3f3f46] border-black/[0.08]">
        🚶 Walk-in
      </Badge>
    );
  }
  if (source === "online") {
    return (
      <Badge className="border text-xs bg-[#D4AF37]/10 text-[#9a7d20] border-[#D4AF37]/25">
        📅 Online
      </Badge>
    );
  }
  return (
    <Badge className="border text-xs bg-gray-50 text-gray-500 border-gray-200">
      Unknown
    </Badge>
  );
}

export function DetailMetricChip({
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

export function InfoFieldCard({
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
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#52525b]">{label}</p>
          <p className="mt-1 text-sm font-semibold text-[#111118] break-words">{value}</p>
        </div>
      </div>
    </div>
  );
}

export function isNewCustomer(c: Customer): boolean {
  return c.totalVisits <= 0 && !c.lastVisitDate;
}

/** New CRM customers (no visits) → walk-in; returning customers → appointment. */
export function customerBookingPath(c: Customer): string {
  const params = new URLSearchParams({
    customerId: c.id,
    name: c.name,
    phone: c.phone,
  });
  const base = isNewCustomer(c) ? "/walk-in" : "/appointments/new";
  return `${base}?${params.toString()}`;
}
