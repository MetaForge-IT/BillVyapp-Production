import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import {
  Plus, Crown, Award, Star, Users, Search,
  CheckCircle, TrendingUp, Zap, IndianRupee, RotateCcw,
} from "lucide-react";
import { Pagination } from "../components/shared/Pagination";
import { useTablePagination } from "../hooks/useTablePagination";
import { SEGMENTED_PILL_LIST, SEGMENTED_PILL_TRIGGER } from "../components/layout/segmented-nav";
import { fetchCustomers } from "../../api/customers";
import { fetchMembershipTiers, type MembershipTier } from "../../api/membership-tiers";
import { fetchPlanEnrollments, fetchSalonPlans, type SalonPlan } from "../../api/plans";
import { getApiErrorMessage } from "../../lib/api";
import { toast } from "sonner";

const TIER_META: Record<string, {
  label: string;
  icon: typeof Crown;
  color: string;
  textColor: string;
  bgColor: string;
  benefits: string[];
  minSpend: string;
}> = {
  platinum: {
    label: "Platinum",
    icon: Crown,
    color: "from-[#d4af37] to-[#2d2d2d]",
    textColor: "text-[#1a1a1a]",
    bgColor: "border-[#d4af37]/30 bg-gradient-to-br from-amber-50 to-white",
    benefits: ["30% off all services", "Priority booking", "Free birthday service", "Dedicated stylist", "Home service 2x/month", "Exclusive product samples"],
    minSpend: "₹80,000/yr",
  },
  gold: {
    label: "Gold",
    icon: Award,
    color: "from-yellow-500 to-yellow-700",
    textColor: "text-yellow-700",
    bgColor: "border-yellow-200 bg-gradient-to-br from-yellow-50 to-white",
    benefits: ["20% off all services", "Early appointment access", "Birthday discount 20%", "Monthly hair analysis", "Product discounts 15%"],
    minSpend: "₹40,000/yr",
  },
  silver: {
    label: "Silver",
    icon: Star,
    color: "from-gray-400 to-gray-600",
    textColor: "text-gray-600",
    bgColor: "border-gray-200 bg-gradient-to-br from-gray-50 to-white",
    benefits: ["10% off all services", "Birthday discount 10%", "Loyalty points 2x", "Monthly newsletter"],
    minSpend: "₹15,000/yr",
  },
  basic: {
    label: "Basic",
    icon: Users,
    color: "from-blue-400 to-blue-600",
    textColor: "text-blue-600",
    bgColor: "border-blue-200 bg-gradient-to-br from-blue-50 to-white",
    benefits: ["5% off on 5th visit", "Loyalty points 1x", "Birthday greeting"],
    minSpend: "No minimum",
  },
};

const tierColorMap: Record<string, string> = {
  Platinum: "from-[#d4af37] to-[#2d2d2d]",
  Gold: "from-yellow-500 to-yellow-700",
  Silver: "from-gray-400 to-gray-600",
  Basic: "from-blue-400 to-blue-600",
};

const tierBadgeMap: Record<string, string> = {
  Platinum: "bg-[#d4af37]/20 text-[#1a1a1a] hover:bg-[#d4af37]/20",
  Gold: "bg-yellow-100 text-yellow-700 hover:bg-yellow-100",
  Silver: "bg-gray-100 text-gray-700 hover:bg-gray-100",
  Basic: "bg-blue-100 text-blue-700 hover:bg-blue-100",
};

function formatCurrency(amount: number): string {
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
  return `₹${amount.toLocaleString("en-IN")}`;
}

function formatJoined(date: string): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function tierLabel(slug: string): string {
  return TIER_META[slug]?.label ?? slug.charAt(0).toUpperCase() + slug.slice(1);
}

function buildTierCards(
  membershipPlans: SalonPlan[],
  memberCounts: Record<string, number>,
  apiTiers: MembershipTier[],
) {
  const slugs = ["platinum", "gold", "silver", "basic"] as const;

  return slugs.map((slug) => {
    const meta = TIER_META[slug];
    const apiTier = apiTiers.find((t) => t.slug === slug);
    const apiPlan = membershipPlans.find(
      (p) => p.namePreset === slug || p.name.toLowerCase() === slug,
    );
    const price = apiPlan
      ? apiPlan.price === 0
        ? "Free"
        : `₹${apiPlan.price.toLocaleString("en-IN")}/yr`
      : apiTier
        ? apiTier.price === 0
          ? "Free"
          : `₹${apiTier.price.toLocaleString("en-IN")}/yr`
        : slug === "basic"
          ? "Free"
          : "—";

    const tierBenefits = apiTier?.benefits
      ? apiTier.benefits.split("\n").map((line) => line.trim()).filter(Boolean)
      : meta.benefits;

    return {
      slug,
      name: apiTier?.name ?? meta.label,
      icon: meta.icon,
      members: memberCounts[slug] ?? 0,
      price,
      color: meta.color,
      textColor: meta.textColor,
      bgColor: meta.bgColor,
      benefits: apiPlan?.description
        ? [apiPlan.description, ...tierBenefits.slice(0, 4)]
        : tierBenefits,
      minSpend: meta.minSpend,
    };
  });
}

export function Memberships() {
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [membershipPlans, setMembershipPlans] = useState<SalonPlan[]>([]);
  const [members, setMembers] = useState<
    Array<{
      id: string;
      name: string;
      tier: string;
      joined: string;
      points: number;
      spent: string;
      avatar: string;
    }>
  >([]);
  const [memberCounts, setMemberCounts] = useState<Record<string, number>>({});
  const [apiTiers, setApiTiers] = useState<MembershipTier[]>([]);
  const [kpis, setKpis] = useState({
    totalMembers: 0,
    revenue: 0,
    pointsIssued: 0,
    renewalRate: 0,
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [customers, enrollments, plans, tiers] = await Promise.all([
        fetchCustomers(),
        fetchPlanEnrollments(),
        fetchSalonPlans(),
        fetchMembershipTiers(),
      ]);

      setApiTiers(tiers);

      const membershipOnly = plans.filter((p) => p.planType === "membership");
      setMembershipPlans(membershipOnly);

      const memberCounts: Record<string, number> = {
        basic: 0,
        silver: 0,
        gold: 0,
        platinum: 0,
      };
      for (const c of customers) {
        const slug = c.membershipTier || "basic";
        if (slug in memberCounts) memberCounts[slug] += 1;
        else memberCounts[slug] = 1;
      }

      const memberRows = customers
        .filter((c) => c.membershipTier && c.membershipTier !== "basic")
        .map((c) => ({
          id: c.id,
          name: c.name,
          tier: tierLabel(c.membershipTier),
          joined: formatJoined(c.joinDate),
          points: c.loyaltyPoints,
          spent: formatCurrency(c.totalSpend),
          avatar: c.name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .slice(0, 2)
            .toUpperCase(),
        }));

      setMembers(memberRows);

      const membershipEnrollments = enrollments.filter((e) => e.planType === "membership");
      const activeEnrollments = membershipEnrollments.filter((e) => e.status === "Active");
      const totalPoints = customers.reduce((sum, c) => sum + c.loyaltyPoints, 0);
      const revenue = membershipEnrollments.reduce((sum, e) => sum + e.amountPaid, 0);
      const renewalRate =
        membershipEnrollments.length > 0
          ? Math.round((activeEnrollments.length / membershipEnrollments.length) * 1000) / 10
          : 0;

      setMemberCounts(memberCounts);

      setKpis({
        totalMembers: customers.filter((c) => c.membershipTier !== "basic").length,
        revenue,
        pointsIssued: totalPoints,
        renewalRate,
      });
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to load membership data"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const tiers = useMemo(
    () => buildTierCards(membershipPlans, memberCounts, apiTiers),
    [membershipPlans, memberCounts, apiTiers],
  );

  const filtered = members.filter((m) =>
    m.name.toLowerCase().includes(search.toLowerCase()),
  );

  const { page, setPage, pageSize, setPageSize, paginate } = useTablePagination(filtered.length, [search]);
  const paginatedMembers = useMemo(() => paginate(filtered), [filtered, paginate]);

  const topPointMembers = useMemo(
    () => [...members].sort((a, b) => b.points - a.points).slice(0, 6),
    [members],
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-[#1a1a1a] to-[#d4af37] bg-clip-text text-transparent">
            Membership & Loyalty
          </h1>
          <p className="text-muted-foreground mt-1">Manage plans, loyalty points, and member benefits</p>
        </div>
        <Button
          className="bg-gradient-to-r from-[#1a1a1a] to-[#2d2d2d] shadow-lg shadow-[#d4af37]/30"
          onClick={() => toast.info("Use Finance → Receipts → Membership to enroll customers")}
        >
          <Plus className="h-4 w-4 mr-2" />
          Enroll Member
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        {[
          { label: "Total Members", value: loading ? "…" : kpis.totalMembers.toLocaleString("en-IN"), sub: "Non-basic tiers", icon: Users, valClass: "text-[#1a1a1a]", cardClass: "border-[#d4af37]/30 bg-gradient-to-br from-amber-50 to-white" },
          { label: "Membership Revenue", value: loading ? "…" : formatCurrency(kpis.revenue), sub: "From enrollments", icon: IndianRupee, valClass: "text-green-600", cardClass: "border-green-200 bg-gradient-to-br from-green-50 to-white" },
          { label: "Points Issued", value: loading ? "…" : kpis.pointsIssued.toLocaleString("en-IN"), sub: "Across all customers", icon: Zap, valClass: "text-[#d4af37]", cardClass: "border-yellow-200 bg-gradient-to-br from-yellow-50 to-white" },
          { label: "Active Rate", value: loading ? "…" : `${kpis.renewalRate}%`, sub: "Active enrollments", icon: RotateCcw, valClass: "text-blue-600", cardClass: "border-blue-200 bg-gradient-to-br from-blue-50 to-white" },
        ].map(s => (
          <Card key={s.label} className={`border-2 ${s.cardClass}`}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{s.label}</p>
                  <p className={`text-2xl font-bold ${s.valClass}`}>{s.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{s.sub}</p>
                </div>
                <s.icon className={`h-10 w-10 opacity-20 ${s.valClass}`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="plans">
        <TabsList className={SEGMENTED_PILL_LIST}>
          <TabsTrigger value="plans" className={SEGMENTED_PILL_TRIGGER}>Plans</TabsTrigger>
          <TabsTrigger value="members" className={SEGMENTED_PILL_TRIGGER}>Members</TabsTrigger>
          <TabsTrigger value="points" className={SEGMENTED_PILL_TRIGGER}>Loyalty Points</TabsTrigger>
        </TabsList>

        {/* Plans Tab */}
        <TabsContent value="plans" className="mt-4">
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {tiers.map(tier => (
              <Card key={tier.name} className={`shadow-lg border-2 ${tier.bgColor} relative overflow-hidden`}>
                {tier.name === "Platinum" && (
                  <div className="absolute top-0 right-0 bg-gradient-to-l from-[#d4af37] to-[#2d2d2d] text-white text-xs px-3 py-1 rounded-bl-xl font-semibold">
                    TOP TIER
                  </div>
                )}
                <CardContent className="pt-6">
                  <div className="flex flex-col items-center text-center mb-4">
                    <div className={`flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br ${tier.color} text-white mb-3 shadow-lg`}>
                      <tier.icon className="h-8 w-8" />
                    </div>
                    <h3 className={`text-xl font-bold ${tier.textColor}`}>{tier.name}</h3>
                    <p className={`text-sm font-semibold ${tier.textColor} opacity-70`}>{tier.price}</p>
                    <p className="text-xs text-muted-foreground mt-1">Min spend: {tier.minSpend}</p>
                  </div>

                  <div className="space-y-2 mb-4">
                    {tier.benefits.map(b => (
                      <div key={b} className="flex items-center gap-2 text-sm">
                        <CheckCircle className={`h-4 w-4 flex-shrink-0 ${tier.textColor}`} />
                        <span>{b}</span>
                      </div>
                    ))}
                  </div>

                  <div className="pt-4 border-t border-border text-center">
                    <p className={`text-3xl font-bold ${tier.textColor}`}>{tier.members.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">active members</p>
                  </div>

                  <Button variant="outline" className={`w-full mt-4 text-sm border-2 ${tier.textColor} border-current hover:bg-current hover:text-white`}>
                    Manage Plan
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Members Tab */}
        <TabsContent value="members" className="mt-4 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search members by name..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-10 max-w-sm"
            />
          </div>

          <Card className="shadow-lg">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Member</th>
                      <th className="text-center py-3 px-4 text-sm font-semibold text-muted-foreground">Tier</th>
                      <th className="text-center py-3 px-4 text-sm font-semibold text-muted-foreground">Joined</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-muted-foreground">Points</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-muted-foreground">Total Spent</th>
                      <th className="text-center py-3 px-4 text-sm font-semibold text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                          Loading members…
                        </td>
                      </tr>
                    ) : paginatedMembers.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                          No members found
                        </td>
                      </tr>
                    ) : (
                      paginatedMembers.map((m) => (
                        <tr key={m.id} className="border-b border-border hover:bg-muted/20 transition-colors">
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-3">
                              <div className={`flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br ${tierColorMap[m.tier]} text-white text-xs font-bold`}>
                                {m.avatar}
                              </div>
                              <p className="font-medium text-sm">{m.name}</p>
                            </div>
                          </td>
                          <td className="py-4 px-4 text-center">
                            <Badge className={`${tierBadgeMap[m.tier]} text-xs`}>{m.tier}</Badge>
                          </td>
                          <td className="py-4 px-4 text-center text-sm text-muted-foreground">{m.joined}</td>
                          <td className="py-4 px-4 text-right font-semibold text-sm text-[#d4af37]">
                            {m.points.toLocaleString()} pts
                          </td>
                          <td className="py-4 px-4 text-right font-semibold text-sm text-green-600">{m.spent}</td>
                          <td className="py-4 px-4 text-center">
                            <Button variant="ghost" size="sm" className="text-xs text-[#1a1a1a]">View Profile</Button>
                          </td>
                        </tr>
                      ))
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
        </TabsContent>

        {/* Loyalty Points Tab */}
        <TabsContent value="points" className="mt-4 space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Zap className="h-5 w-5 text-[#d4af37]" />
                  Points Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { tier: "Platinum", earn: "3 pts / ₹100", redeem: "1 pt = ₹1", bonus: "3x on birthday" },
                  { tier: "Gold", earn: "2 pts / ₹100", redeem: "1 pt = ₹0.75", bonus: "2x on birthday" },
                  { tier: "Silver", earn: "1.5 pts / ₹100", redeem: "1 pt = ₹0.50", bonus: "1.5x on birthday" },
                  { tier: "Basic", earn: "1 pt / ₹100", redeem: "1 pt = ₹0.25", bonus: "—" },
                ].map(row => (
                  <div key={row.tier} className="p-3 rounded-xl border border-border hover:border-[#1a1a1a] transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <Badge className={tierBadgeMap[row.tier]}>{row.tier}</Badge>
                      <span className="text-xs text-muted-foreground">Bonus: {row.bonus}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground">Earn Rate</p>
                        <p className="font-semibold text-[#1a1a1a]">{row.earn}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Redeem Rate</p>
                        <p className="font-semibold text-green-600">{row.redeem}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-[#1a1a1a]" />
                  Top Point Holders
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {loading ? (
                  <p className="text-sm text-muted-foreground">Loading…</p>
                ) : topPointMembers.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No loyalty data yet</p>
                ) : (
                  topPointMembers.map((m) => (
                    <div key={m.id} className="flex items-center gap-3">
                      <div className="h-2.5 w-2.5 rounded-full flex-shrink-0 bg-green-500" />
                      <div className="flex-1">
                        <p className="text-sm">{m.name} — {m.tier}</p>
                        <p className="text-xs text-muted-foreground">Joined {m.joined}</p>
                      </div>
                      <span className="text-sm font-semibold text-green-600">
                        {m.points.toLocaleString()} pts
                      </span>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
