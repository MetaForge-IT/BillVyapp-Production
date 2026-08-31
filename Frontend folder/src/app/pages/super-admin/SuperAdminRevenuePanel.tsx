import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { IndianRupee, Store, TrendingUp } from "lucide-react";
import { SafeChartContainer } from "../../components/shared/SafeChartContainer";
import {
  fetchPlatformRevenue,
  type PlatformRevenue,
  type PlatformRevenueRange,
} from "../../../api/franchises";
import { getApiErrorMessage, ApiError } from "../../../lib/api";
import { getAccessToken } from "../../../stores/authStore";
import { cn } from "../../components/ui/utils";

const RANGES: Array<{ id: PlatformRevenueRange; label: string }> = [
  { id: "today", label: "Today" },
  { id: "7d", label: "7 days" },
  { id: "30d", label: "30 days" },
  { id: "mtd", label: "Month" },
];

const FRANCHISE_COLORS = ["#D4AF37", "#111118", "#9a7d20", "#3f3f46", "#C9A227", "#3d3d4a"];
const SHOP_COLORS = ["#D4AF37", "#b8962e", "#111118", "#3f3f46", "#8a7a40", "#4a4a55", "#c4a84a"];

function formatInr(n: number): string {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

function formatInrCompact(n: number): string {
  if (n >= 10_000_000) return `₹${(n / 10_000_000).toFixed(1)}Cr`;
  if (n >= 100_000) return `₹${(n / 100_000).toFixed(1)}L`;
  if (n >= 1_000) return `₹${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1)}K`;
  return formatInr(n);
}

function shortDate(iso: string): string {
  const [, m, d] = iso.split("-");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${Number(d)} ${months[Number(m) - 1] ?? m}`;
}

function MoneyTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number; name?: string; payload?: { franchiseName?: string; shopName?: string } }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0];
  const title =
    row.payload?.franchiseName ||
    row.payload?.shopName ||
    (label ? shortDate(String(label)) : row.name) ||
    "Revenue";
  return (
    <div className="rounded-xl border border-black/10 bg-white px-3 py-2 shadow-lg">
      <p className="text-[11px] font-semibold text-[#3f3f46]">{title}</p>
      <p className="text-sm font-bold text-[#111118]">{formatInr(Number(row.value ?? 0))}</p>
    </div>
  );
}

export function SuperAdminRevenuePanel() {
  const [range, setRange] = useState<PlatformRevenueRange>("30d");
  const [data, setData] = useState<PlatformRevenue | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!getAccessToken()) {
      setLoading(false);
      setError("Session expired. Please sign in again as Super Admin.");
      return;
    }
    setLoading(true);
    setError(null);
    void fetchPlatformRevenue(range)
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.statusCode === 401) {
          setError("Session expired. Please sign in again as Super Admin.");
          return;
        }
        if (err instanceof ApiError && err.statusCode === 403) {
          setError("Super Admin access required to view platform revenue.");
          return;
        }
        setError(getApiErrorMessage(err, "Failed to load revenue"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [range]);

  const franchiseChart = useMemo(
    () =>
      (data?.byFranchise ?? [])
        .filter((f) => f.revenue > 0 || (data?.byFranchise.length ?? 0) <= 8)
        .slice(0, 12)
        .map((f) => ({
          ...f,
          label: f.franchiseName.length > 14 ? `${f.franchiseName.slice(0, 12)}…` : f.franchiseName,
        })),
    [data],
  );

  const shopChart = useMemo(
    () =>
      (data?.byShop ?? [])
        .slice(0, 12)
        .map((s) => ({
          ...s,
          label: s.shopName.length > 14 ? `${s.shopName.slice(0, 12)}…` : s.shopName,
        })),
    [data],
  );

  const trendChart = useMemo(
    () =>
      (data?.dailyTrend ?? []).map((d) => ({
        ...d,
        label: shortDate(d.date),
      })),
    [data],
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#D4AF37]">Revenue</p>
          <h2 className="text-lg font-bold text-[#111118]">Per franchise & shop</h2>
          <p className="text-[12px] text-[#3f3f46]">
            Collected payments from invoices (paid / partially paid)
            {data ? ` · ${shortDate(data.from)} – ${shortDate(data.to)}` : ""}
          </p>
        </div>
        <div className="flex rounded-xl border border-black/[0.08] bg-white p-1">
          {RANGES.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setRange(r.id)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-[11px] font-semibold transition",
                range === r.id
                  ? "bg-[#111118] text-[#D4AF37]"
                  : "text-[#3f3f46] hover:text-[#111118]",
              )}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-black/[0.07] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-[12px] font-semibold text-[#3f3f46]">Collected</p>
            <IndianRupee className="h-4 w-4 text-[#D4AF37]" />
          </div>
          <p className="mt-3 text-2xl font-bold text-[#111118]">
            {loading || !data ? "…" : formatInrCompact(data.totals.revenue)}
          </p>
          <p className="mt-1 text-[11px] text-[#52525b]">
            {data ? `${data.totals.invoiceCount} invoices` : "—"}
          </p>
        </div>
        <div className="rounded-2xl border border-black/[0.07] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-[12px] font-semibold text-[#3f3f46]">Billed</p>
            <TrendingUp className="h-4 w-4 text-[#D4AF37]" />
          </div>
          <p className="mt-3 text-2xl font-bold text-[#111118]">
            {loading || !data ? "…" : formatInrCompact(data.totals.billed)}
          </p>
          <p className="mt-1 text-[11px] text-[#52525b]">Invoice totals before dues</p>
        </div>
        <div className="rounded-2xl border border-black/[0.07] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-[12px] font-semibold text-[#3f3f46]">Active shops</p>
            <Store className="h-4 w-4 text-[#D4AF37]" />
          </div>
          <p className="mt-3 text-2xl font-bold text-[#111118]">
            {loading || !data ? "…" : data.totals.shopCount}
          </p>
          <p className="mt-1 text-[11px] text-[#52525b]">
            {data ? `${data.totals.franchiseCount} franchises` : "—"}
          </p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-black/[0.07] bg-white p-5 shadow-sm">
          <h3 className="text-[13px] font-bold text-[#111118]">Revenue by franchise</h3>
          <p className="mb-4 text-[11px] text-[#52525b]">Collected amount per brand</p>
          <div className="h-[260px]">
            {loading ? (
              <div className="flex h-full items-center justify-center text-[12px] text-[#52525b]">
                Loading chart…
              </div>
            ) : franchiseChart.length === 0 ? (
              <div className="flex h-full items-center justify-center text-[12px] text-[#52525b]">
                No franchise data
              </div>
            ) : (
              <SafeChartContainer height="100%" minHeight={200}>
                <BarChart data={franchiseChart} margin={{ top: 8, right: 8, left: 0, bottom: 24 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eee" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: "#52525b", fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    interval={0}
                    angle={-20}
                    textAnchor="end"
                    height={48}
                  />
                  <YAxis
                    tickFormatter={(v) => formatInrCompact(Number(v))}
                    tick={{ fill: "#52525b", fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    width={56}
                  />
                  <Tooltip content={<MoneyTooltip />} cursor={{ fill: "rgba(212,175,55,0.08)" }} />
                  <Bar dataKey="revenue" radius={[8, 8, 0, 0]} maxBarSize={48}>
                    {franchiseChart.map((_, i) => (
                      <Cell key={i} fill={FRANCHISE_COLORS[i % FRANCHISE_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </SafeChartContainer>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-black/[0.07] bg-white p-5 shadow-sm">
          <h3 className="text-[13px] font-bold text-[#111118]">Revenue by shop</h3>
          <p className="mb-4 text-[11px] text-[#52525b]">Top shops by collected amount</p>
          <div className="h-[260px]">
            {loading ? (
              <div className="flex h-full items-center justify-center text-[12px] text-[#52525b]">
                Loading chart…
              </div>
            ) : shopChart.every((s) => s.revenue === 0) ? (
              <div className="flex h-full items-center justify-center text-[12px] text-[#52525b]">
                No invoice payments in this range
              </div>
            ) : (
              <SafeChartContainer height="100%" minHeight={200}>
                <BarChart data={shopChart} margin={{ top: 8, right: 8, left: 0, bottom: 24 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eee" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: "#52525b", fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    interval={0}
                    angle={-20}
                    textAnchor="end"
                    height={48}
                  />
                  <YAxis
                    tickFormatter={(v) => formatInrCompact(Number(v))}
                    tick={{ fill: "#52525b", fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    width={56}
                  />
                  <Tooltip content={<MoneyTooltip />} cursor={{ fill: "rgba(212,175,55,0.08)" }} />
                  <Bar dataKey="revenue" radius={[8, 8, 0, 0]} maxBarSize={40}>
                    {shopChart.map((_, i) => (
                      <Cell key={i} fill={SHOP_COLORS[i % SHOP_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </SafeChartContainer>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-black/[0.07] bg-white p-5 shadow-sm">
        <h3 className="text-[13px] font-bold text-[#111118]">Daily collected trend</h3>
        <p className="mb-4 text-[11px] text-[#52525b]">Platform-wide payments by invoice date</p>
        <div className="h-[240px]">
          {loading ? (
            <div className="flex h-full items-center justify-center text-[12px] text-[#52525b]">
              Loading chart…
            </div>
          ) : (
            <SafeChartContainer height="100%" minHeight={200}>
              <AreaChart data={trendChart} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="saRevenueFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#D4AF37" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#D4AF37" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: "#52525b", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  minTickGap={24}
                />
                <YAxis
                  tickFormatter={(v) => formatInrCompact(Number(v))}
                  tick={{ fill: "#52525b", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  width={56}
                />
                <Tooltip content={<MoneyTooltip />} />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#D4AF37"
                  strokeWidth={2}
                  fill="url(#saRevenueFill)"
                />
              </AreaChart>
            </SafeChartContainer>
          )}
        </div>
      </div>

      {!loading && data && data.byShop.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-black/[0.07] bg-white shadow-sm">
          <div className="border-b border-black/[0.06] px-5 py-3">
            <h3 className="text-[13px] font-bold text-[#111118]">Shop breakdown</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-[12px]">
              <thead className="bg-[#faf9f7] text-[10px] uppercase tracking-wider text-[#52525b]">
                <tr>
                  <th className="px-5 py-2.5 font-semibold">Shop</th>
                  <th className="px-5 py-2.5 font-semibold">Franchise</th>
                  <th className="px-5 py-2.5 font-semibold text-right">Invoices</th>
                  <th className="px-5 py-2.5 font-semibold text-right">Billed</th>
                  <th className="px-5 py-2.5 font-semibold text-right">Collected</th>
                </tr>
              </thead>
              <tbody>
                {data.byShop.map((shop) => (
                  <tr key={shop.salonId} className="border-t border-black/[0.05]">
                    <td className="px-5 py-3">
                      <p className="font-semibold text-[#111118]">{shop.shopName}</p>
                      {shop.city && <p className="text-[11px] text-[#52525b]">{shop.city}</p>}
                    </td>
                    <td className="px-5 py-3 text-[#3f3f46]">{shop.franchiseName}</td>
                    <td className="px-5 py-3 text-right text-[#3f3f46]">{shop.invoiceCount}</td>
                    <td className="px-5 py-3 text-right text-[#3f3f46]">{formatInr(shop.billed)}</td>
                    <td className="px-5 py-3 text-right font-semibold text-[#111118]">
                      {formatInr(shop.revenue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
