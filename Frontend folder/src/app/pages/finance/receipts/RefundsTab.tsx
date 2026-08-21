import { useState, useMemo, useEffect, useCallback } from "react";
import { RotateCcw, Clock, Ban, UserCheck } from "lucide-react";
import { Pagination } from "../../../components/shared/Pagination";
import { useTablePagination } from "../../../hooks/useTablePagination";
import { useReceipts } from "../../../context/ReceiptsContext";
import { getApiErrorMessage } from "../../../../lib/api";
import { fetchRefunds, approveRefund, rejectRefund } from "../../../../api/billing";
import { toast } from "../../../components/ui/hot-toast";
import { useSettings } from "../../../context/SettingsContext";
import { useRole } from "../../../context/RoleContext";
import { Badge } from "../../../components/ui/badge";
import { Dialog, DialogContent } from "../../../components/ui/dialog";
import {
  FinanceStatCard,
  FinanceStatGrid,
  FinancePanel,
  financeBadge,
  financeBadgeGold,
  financeIconWrap,
  financePrimaryBtn,
  financePanelHeader,
} from "../finance-ui";
import type { RefundRecord } from "./types";
import { fmt, mapRefundInvoice } from "./helpers";

export function RefundsTab({ onLoaded }: { onLoaded?: (refunds: RefundRecord[]) => void }) {
  const { settings } = useSettings();
  const { role } = useRole();
  const { refresh: refreshReceipts } = useReceipts();
  const canApprove = settings.staffControls.canVoidBill[role] || role === "accountant";

  const [approveId, setApproveId] = useState<string | null>(null);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState(false);
  const [approving, setApproving] = useState(false);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [refunds, setRefunds] = useState<RefundRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const loadRefunds = useCallback(() => {
    setLoading(true);
    return fetchRefunds()
      .then((data) => {
        const mapped = data.map(mapRefundInvoice);
        setRefunds(mapped);
        onLoaded?.(mapped);
      })
      .catch((err) => {
        setRefunds([]);
        toast.error(getApiErrorMessage(err, "Failed to load refunds"));
      })
      .finally(() => setLoading(false));
  }, [onLoaded]);

  useEffect(() => {
    void loadRefunds();
  }, [loadRefunds]);

  const totalApproved = refunds.filter(r => r.status === "approved").reduce((s,r) => s+r.amount, 0);
  const totalPending  = refunds.filter(r => r.status === "pending").reduce((s,r) => s+r.amount, 0);

  const refundsPagination = useTablePagination(refunds.length);
  const paginatedRefunds = useMemo(
    () => refundsPagination.paginate(refunds),
    [refunds, refundsPagination],
  );

  const confirmApprove = async () => {
    if (!approveId || !pin) return;
    setApproving(true);
    setPinError(false);
    try {
      await approveRefund(approveId, { pin });
      toast.success("Refund approved");
      setApproveId(null);
      setPin("");
      await loadRefunds();
      await refreshReceipts();
    } catch (err) {
      const message = getApiErrorMessage(err, "Failed to approve refund");
      if (message.toLowerCase().includes("pin")) {
        setPinError(true);
      } else {
        toast.error(message);
      }
    } finally {
      setApproving(false);
    }
  };

  const handleReject = async (id: string) => {
    setRejectingId(id);
    try {
      await rejectRefund(id);
      toast.success("Refund request rejected");
      await loadRefunds();
      await refreshReceipts();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to reject refund"));
    } finally {
      setRejectingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <FinanceStatGrid cols={3}>
        <FinanceStatCard
          label="Total Refunded"
          value={fmt(totalApproved)}
          sub={`${refunds.filter(r => r.status === "approved").length} approved`}
          icon={RotateCcw}
          index={0}
        />
        <FinanceStatCard
          label="Pending Approval"
          value={fmt(totalPending)}
          sub={`${refunds.filter(r => r.status === "pending").length} awaiting`}
          icon={Clock}
          index={1}
        />
        <FinanceStatCard
          label="Total Refunds"
          value={refunds.length}
          sub="This month"
          icon={Ban}
          index={2}
        />
      </FinanceStatGrid>

      <FinancePanel
        title="Refund Ledger"
        subtitle="Transaction type: REFUND"
      >
        {loading && (
          <div className="px-5 py-10 text-center text-[13px] text-gray-400">Loading refunds...</div>
        )}
        {!loading && refunds.length === 0 && (
          <div className="px-5 py-10 text-center text-[13px] text-gray-400">No refunds recorded yet.</div>
        )}
        <div className="divide-y divide-gray-100">
          {paginatedRefunds.map(r => (
            <div key={r.id} className="px-5 py-4 flex items-center gap-4 hover:bg-[#FAF8F2]/60 transition-colors">
              <div className={financeIconWrap}>
                <RotateCcw className="h-4 w-4 text-[#D4AF37]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-[13px] font-bold text-[#111118]">{r.customer}</p>
                  <span className="text-[10px] font-mono text-[#9a9a9a]">← {r.invoiceId}</span>
                  <Badge className={`text-[10px] ${r.status === "approved" ? financeBadgeGold : financeBadge}`}>
                    {r.status === "approved" ? "Approved" : "Pending"}
                  </Badge>
                </div>
                <p className="text-[11px] text-[#6b6b6b] mt-0.5">{r.reason}</p>
                <p className="text-[10px] text-[#9a9a9a] mt-0.5">
                  {r.status==="approved" ? `Approved by ${r.approvedBy}` : "Awaiting manager approval"} · {r.date}
                </p>
              </div>
              <div className="text-right shrink-0 flex flex-col items-end gap-1.5">
                <p className="text-[15px] font-black text-[#111118]">−{fmt(r.amount)}</p>
                <Badge className={`${financeBadge} text-[10px]`}>{r.mode}</Badge>
                {r.status === "pending" && canApprove && (
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => setApproveId(r.id)}
                      className={financePrimaryBtn}
                      disabled={rejectingId === r.id}
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => void handleReject(r.id)}
                      disabled={rejectingId === r.id || approving}
                      className="h-7 px-2.5 rounded-lg border border-gray-200 text-[10px] font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-40"
                    >
                      {rejectingId === r.id ? "..." : "Reject"}
                    </button>
                  </div>
                )}
                {r.status === "pending" && !canApprove && (
                  <span className="text-[10px] text-[#9a9a9a]">Manager approval required</span>
                )}
              </div>
            </div>
          ))}
        </div>
        <Pagination
          page={refundsPagination.page}
          pageSize={refundsPagination.pageSize}
          totalRecords={refunds.length}
          onPageChange={refundsPagination.setPage}
          onPageSizeChange={refundsPagination.setPageSize}
        />
      </FinancePanel>

      {/* Approval dialog */}
      <Dialog open={!!approveId} onOpenChange={() => { setApproveId(null); setPin(""); setPinError(false); }}>
        <DialogContent className="p-0 gap-0 overflow-hidden rounded-2xl w-[min(95vw,22rem)] max-w-none border border-black/[0.07] shadow-lg">
          <div className={`${financePanelHeader} border-b border-black/[0.07]`}>
            <div className="flex items-center gap-3">
              <div className={financeIconWrap}>
                <UserCheck className="h-4 w-4 text-[#D4AF37]" />
              </div>
              <div>
                <p className="text-[14px] font-bold text-[#111118]">Approve Refund</p>
                <p className="text-[10px] text-[#9a9a9a] mt-0.5">Manager / Owner PIN required</p>
              </div>
            </div>
          </div>
          <div className="bg-[#faf8f2] px-6 py-5 space-y-4">
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#b8962e]">Enter Approval PIN</p>
              <input type="password" maxLength={6} value={pin} onChange={e => { setPin(e.target.value); setPinError(false); }}
                placeholder="••••"
                className={`w-full h-10 px-3.5 rounded-xl border text-[14px] font-bold tracking-widest bg-white focus:outline-none focus:ring-2 focus:ring-[#d4af37]/12 transition-all placeholder:font-normal placeholder:tracking-normal placeholder:text-gray-300 ${pinError ? "border-red-400 focus:border-red-400" : "border-gray-200 focus:border-[#d4af37]"}`} />
              {pinError && <p className="text-[11px] text-red-500">Incorrect PIN. Try again.</p>}
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => { setApproveId(null); setPin(""); setPinError(false); }}
                className="h-9 px-4 rounded-xl border border-gray-200 text-[12px] font-semibold text-gray-600 hover:bg-gray-100 transition-all">Cancel</button>
              <button onClick={() => void confirmApprove()} disabled={!pin || approving}
                className="h-9 px-5 rounded-xl bg-gradient-to-r from-[#d4af37] to-[#b8962e] text-[12px] font-bold text-black disabled:opacity-40 transition-all shadow-md shadow-[#d4af37]/20">
                {approving ? "Approving..." : "Confirm Approval"}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
