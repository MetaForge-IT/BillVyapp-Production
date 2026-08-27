import { useState, useMemo, useEffect, useCallback } from "react";
import { Clock, Search, CheckCircle2, Ban, Plus } from "lucide-react";
import { Pagination } from "../../../components/shared/Pagination";
import { useTablePagination } from "../../../hooks/useTablePagination";
import {
  fetchPlanEnrollments,
  fetchSalonPlans,
  fetchPlanServices,
  fetchPlanCustomers,
  type PlanEnrollment,
  type SalonPlan,
  type SalonServiceOption,
  type CustomerOption,
} from "../../../../api/plans";
import { getApiErrorMessage } from "../../../../lib/api";
import { Badge } from "../../../components/ui/badge";
import {
  FinanceStatCard,
  FinanceStatGrid,
  FinancePanel,
  financeBadge,
  financeBadgeGold,
  financeAvatarWrap,
  financePrimaryBtn,
  financeProgressTrack,
  financeProgressFill,
} from "../finance-ui";
import { fmt } from "./helpers";
import { CreatePlanModal } from "./CreatePlanModal";
import { AssignPlanModal } from "./AssignPlanModal";

export function MembershipTab({ onStatsChange }: { onStatsChange?: (stats: { active: number; exhausted: number; expired: number }) => void }) {
  const [search, setSearch] = useState("");
  const [enrollments, setEnrollments] = useState<PlanEnrollment[]>([]);
  const [plans, setPlans] = useState<SalonPlan[]>([]);
  const [services, setServices] = useState<SalonServiceOption[]>([]);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [enrollmentData, planData, serviceData, customerData] = await Promise.all([
        fetchPlanEnrollments(),
        fetchSalonPlans(),
        fetchPlanServices(),
        fetchPlanCustomers(),
      ]);
      setEnrollments(enrollmentData);
      setPlans(planData);
      setServices(serviceData);
      setCustomers(customerData);
    } catch (error) {
      console.warn("Plans API unavailable:", getApiErrorMessage(error));
      setEnrollments([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    const rows = enrollments.filter(
      (m) =>
        !q ||
        m.customer.toLowerCase().includes(q) ||
        m.packageName.toLowerCase().includes(q) ||
        m.phone.includes(search),
    );
    // FIFO: oldest enrollment first (first in → first out of the list)
    return [...rows].sort((a, b) => {
      const aTime = new Date(a.startDate).getTime();
      const bTime = new Date(b.startDate).getTime();
      if (aTime !== bTime) return aTime - bTime;
      return a.customer.localeCompare(b.customer);
    });
  }, [enrollments, search]);

  const active    = enrollments.filter((m) => m.status === "Active").length;
  const expired   = enrollments.filter((m) => m.status === "Expired").length;
  const exhausted = enrollments.filter((m) => m.status === "Exhausted").length;

  useEffect(() => {
    onStatsChange?.({ active, exhausted, expired });
  }, [active, exhausted, expired, onStatsChange]);

  const membershipPagination = useTablePagination(filtered.length, [search]);
  const paginatedMemberships = useMemo(
    () => membershipPagination.paginate(filtered),
    [filtered, membershipPagination],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <button type="button" className={financePrimaryBtn + " !h-9 !px-4 !text-[12px]"} onClick={() => setAssignOpen(true)}>
          Assign to Customer
        </button>
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="h-9 px-4 rounded-xl bg-gradient-to-r from-[#d4af37] to-[#b8962e] text-[12px] font-bold text-black flex items-center gap-2 shadow-md shadow-[#d4af37]/20"
        >
          <Plus className="h-4 w-4" /> Create Membership / Package
        </button>
      </div>

      <FinanceStatGrid cols={3}>
        <FinanceStatCard label="Active" value={active} icon={CheckCircle2} index={0} />
        <FinanceStatCard label="Exhausted" value={exhausted} icon={Ban} index={1} />
        <FinanceStatCard label="Expired" value={expired} icon={Clock} index={2} />
      </FinanceStatGrid>

      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#52525b] pointer-events-none" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search customer or package..."
          className="w-full h-10 pl-10 pr-4 rounded-xl border border-black/[0.07] text-[13px] bg-white shadow-sm focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/12 transition-all placeholder:text-[#52525b]" />
      </div>

      <FinancePanel
        title="Membership / Package enrollments"
        subtitle={`${filtered.length} record${filtered.length !== 1 ? "s" : ""} · oldest first (FIFO)`}
      >
        {loading && (
          <div className="px-5 py-10 text-center text-[13px] text-[#52525b]">Loading memberships...</div>
        )}
        {!loading && paginatedMemberships.length === 0 && (
          <div className="px-5 py-10 text-center text-[13px] text-[#52525b]">
            No customer memberships yet. Create a plan and assign it to a customer.
          </div>
        )}
        <div className="divide-y divide-black/[0.05]">
          {paginatedMemberships.map((m) => {
            const svcPct = m.servicesTotal > 0
              ? Math.min(100, Math.round((m.servicesUsed / m.servicesTotal) * 100))
              : 0;
            const walletPct = m.walletTotal > 0
              ? Math.min(100, Math.round((m.walletUsed / m.walletTotal) * 100))
              : 0;
            const statusLabel = m.status;

            return (
              <div key={m.id} className="px-5 py-4 hover:bg-[#FAF8F2]/60 transition-colors">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={financeAvatarWrap}>
                      {m.customer[0]}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-[13px] font-bold text-[#111118] truncate">{m.customer}</p>
                        <Badge className={`text-[10px] ${statusLabel === "Active" ? financeBadgeGold : financeBadge}`}>
                          {statusLabel}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-[#3f3f46] truncate">{m.packageName} · {m.phone}</p>
                    </div>
                  </div>
                  <p className="text-[10px] text-[#52525b] shrink-0">Exp {m.expiry}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="flex justify-between text-[11px] text-[#3f3f46] mb-1">
                      <span>Services</span>
                      <span className="font-bold text-[#111118]">{m.servicesUsed}/{m.servicesTotal || "—"}</span>
                    </div>
                    {m.servicesTotal > 0 && (
                      <div className={financeProgressTrack}>
                        <div className={financeProgressFill} style={{ width: `${svcPct}%` }} />
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="flex justify-between text-[11px] text-[#3f3f46] mb-1">
                      <span>Wallet</span>
                      <span className="font-bold text-[#111118]">
                        {m.walletTotal > 0 ? `${fmt(m.walletBalance)} left` : "—"}
                      </span>
                    </div>
                    {m.walletTotal > 0 && (
                      <div className={financeProgressTrack}>
                        <div className={financeProgressFill} style={{ width: `${walletPct}%` }} />
                      </div>
                    )}
                  </div>
                  <div className="col-span-2 flex items-center justify-between rounded-xl border border-[#D4AF37]/20 bg-[#FFFBEB] px-3 py-2">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[#9a7d20]">Amount paid</p>
                      <p className="text-[14px] font-black text-[#111118]">{fmt(m.amountPaid)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[#52525b]">Started</p>
                      <p className="text-[12px] font-semibold text-[#3f3f46]">{m.startDate}</p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        {!loading && filtered.length > 0 && (
          <Pagination
            page={membershipPagination.page}
            pageSize={membershipPagination.pageSize}
            totalRecords={filtered.length}
            onPageChange={membershipPagination.setPage}
            onPageSizeChange={membershipPagination.setPageSize}
          />
        )}
      </FinancePanel>

      <CreatePlanModal open={createOpen} onClose={() => setCreateOpen(false)} onCreated={loadData} services={services} />
      <AssignPlanModal open={assignOpen} onClose={() => setAssignOpen(false)} onAssigned={loadData} plans={plans} customers={customers} />
    </div>
  );
}
