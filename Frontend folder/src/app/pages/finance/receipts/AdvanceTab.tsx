import { useState, useMemo } from "react";
import { Wallet, Calendar, IndianRupee, TrendingUp, Plus } from "lucide-react";
import { Pagination } from "../../../components/shared/Pagination";
import { useTablePagination } from "../../../hooks/useTablePagination";
import { useAdvances } from "../../../context/AdvancesContext";
import { Badge } from "../../../components/ui/badge";
import {
  FinanceStatCard,
  FinanceStatGrid,
  FinancePanel,
  financeBadgeGold,
  financeAvatarWrap,
  financeProgressTrack,
  financeProgressFill,
} from "../finance-ui";
import { fmt } from "./helpers";
import { CollectAdvanceModal } from "./CollectAdvanceModal";

export function AdvanceTab() {
  const { advances } = useAdvances();
  const [collectOpen, setCollectOpen] = useState(false);
  const totalHeld    = advances.reduce((s,a) => s+a.balance, 0);
  const totalReceived= advances.reduce((s,a) => s+a.amount, 0);
  const utilized     = totalReceived - totalHeld;

  const advancePagination = useTablePagination(advances.length);
  const paginatedAdvances = useMemo(
    () => advancePagination.paginate(advances),
    [advances, advancePagination],
  );

  return (
    <div className="space-y-4">
      <FinanceStatGrid cols={3}>
        <FinanceStatCard label="Advance Held" value={fmt(totalHeld)} sub="Current balance" icon={Wallet} index={0} />
        <FinanceStatCard label="Total Collected" value={fmt(totalReceived)} sub="Lifetime" icon={TrendingUp} index={1} />
        <FinanceStatCard label="Utilized" value={fmt(utilized)} sub="Redeemed so far" icon={IndianRupee} index={2} />
      </FinanceStatGrid>

      <FinancePanel
        title="Advance Payment Register"
        subtitle="Transaction type: CAPITAL — bypasses P&L, modifies cash balance only"
        badge={
          <button onClick={() => setCollectOpen(true)}
            className="flex items-center gap-1.5 h-9 px-4 rounded-xl bg-[#111118] text-[#d4af37] text-[12px] font-bold hover:bg-[#1e1e1e] transition-all shrink-0">
            <Plus className="h-3.5 w-3.5" /> Collect Advance
          </button>
        }
      >
        {advances.length === 0 && (
          <div className="px-5 py-10 text-center text-[13px] text-gray-400">No advance payments recorded yet.</div>
        )}
        <div className="divide-y divide-gray-100">
          {paginatedAdvances.map(a => {
            const usedAmt = a.amount - a.balance;
            const pct     = Math.round((usedAmt / a.amount) * 100);
            return (
              <div key={a.id} className="px-5 py-4 hover:bg-[#FAF8F2]/60 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={financeAvatarWrap}>
                      {a.customer[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-bold text-[#111118]">{a.customer}</p>
                      <p className="text-[11px] text-[#6b6b6b]">{a.service}</p>
                      <div className="mt-2 space-y-1">
                        <div className="flex items-center justify-between text-[10px] text-[#9a9a9a]">
                          <span>Utilized {fmt(usedAmt)} of {fmt(a.amount)}</span>
                          <span>{pct}%</span>
                        </div>
                        <div className={`${financeProgressTrack} w-48`}>
                          <div className={financeProgressFill} style={{ width:`${pct}%` }} />
                        </div>
                        <p className="text-[10px] text-[#9a9a9a] flex items-center gap-1"><Calendar className="h-3 w-3" />Booked for {a.bookedFor}</p>
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#9a9a9a]">Balance</p>
                    <p className="text-[18px] font-black text-[#111118]">{fmt(a.balance)}</p>
                    <Badge className={`${financeBadgeGold} text-[10px] mt-1`}>Active</Badge>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <Pagination
          page={advancePagination.page}
          pageSize={advancePagination.pageSize}
          totalRecords={advances.length}
          onPageChange={advancePagination.setPage}
          onPageSizeChange={advancePagination.setPageSize}
        />
      </FinancePanel>

      <CollectAdvanceModal open={collectOpen} onClose={() => setCollectOpen(false)} />
    </div>
  );
}
