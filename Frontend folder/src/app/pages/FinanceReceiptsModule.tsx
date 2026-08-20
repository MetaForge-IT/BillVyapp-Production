import { useState, useMemo, useEffect, useCallback } from "react";
import { Receipts } from "./Receipts";
import { Pagination } from "../components/shared/Pagination";
import { useTablePagination } from "../hooks/useTablePagination";
import { useSearchParams } from "react-router";
import {
  RotateCcw, Clock, Wallet, Package, Search, Phone, MessageSquare,
  Calendar, AlertTriangle, CheckCircle2, UserCheck,
  IndianRupee, TrendingUp, Ban, Plus, X, User,
  Send,
} from "lucide-react";
import { cn } from "../components/ui/utils";
import { usePendingPayments, type PendingPayment } from "../context/PendingPaymentsContext";
import { useReceipts } from "../context/ReceiptsContext";
import { useAdvances } from "../context/AdvancesContext";
import {
  fetchPlanEnrollments,
  fetchSalonPlans,
  createSalonPlan,
  enrollCustomerInPlan,
  fetchPlanServices,
  fetchPlanCustomers,
  type PlanEnrollment,
  type SalonPlan,
  type NamePreset,
  type PlanType,
  type SalonServiceOption,
  type CustomerOption,
} from "../../api/plans";
import { fetchRefunds, approveRefund, rejectRefund, type RefundInvoice } from "../../api/billing";
import { getApiErrorMessage } from "../../lib/api";
import { toast } from "../components/ui/hot-toast";
import { BRAND } from "../config/brand";
import { useSettings } from "../context/SettingsContext";
import { useRole } from "../context/RoleContext";
import { Badge } from "../components/ui/badge";
import { Dialog, DialogContent } from "../components/ui/dialog";
import { SegmentedPillNav } from "../components/layout/SegmentedPillNav";
import {
  BILL_PAY_METHODS,
  PaymentMethodPicker,
  buildBillingPayments,
  createPaymentMethodValue,
  primaryPayMethod,
  paymentMethodReference,
  isPaymentMethodValid,
  paymentMethodLabel,
  type PaymentMethodValue,
} from "../components/shared/PaymentMethodPicker";
import {
  FinanceStatCard,
  FinanceStatGrid,
  FinancePanel,
  financeBadge,
  financeBadgeGold,
  financeIconWrap,
  financeAvatarWrap,
  financePrimaryBtn,
  financeProgressTrack,
  financeProgressFill,
  financePanelHeader,
} from "./finance/finance-ui";

/* ─────────────────────────────────────────────────────────
   TYPES
───────────────────────────────────────────────────────── */
interface RefundRecord {
  id: string; invoiceId: string; customer: string; phone: string;
  amount: number; reason: string; approvedBy: string; mode: string;
  date: string; status: "approved" | "pending";
  txType: "REFUND";
}
interface PendingRecord {
  id: string; invoiceId: string; customer: string; phone: string;
  due: number; total: number; dueDate: string; services: string[];
  partialPaid: number; status: "PARTIAL" | "UNPAID";
  txType: "REVENUE";
}

/* ─────────────────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────────────────── */
const TODAY = "2026-06-29";
const isOverdue = (d: string) => new Date(d) < new Date(TODAY);
const fmt = (n: number) => `₹${n.toLocaleString("en-IN")}`;

function phoneForMessaging(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `91${digits}`;
  return digits;
}

function hasValidPhone(phone: string): boolean {
  return phone.replace(/\D/g, "").length >= 10;
}

function defaultPaymentReminder(payment: PendingPayment): string {
  const overdue = isOverdue(payment.dueDate);
  return overdue
    ? `Hi ${payment.customer},\n\nYour payment of ${fmt(payment.due)} for invoice ${payment.invoiceId} at ${BRAND.clientName} was due on ${payment.dueDate}.\n\nPlease contact us to arrange payment at your earliest convenience.\n\nThank you.`
    : `Hi ${payment.customer},\n\nThis is a friendly reminder from ${BRAND.clientName}. Invoice ${payment.invoiceId} has an outstanding balance of ${fmt(payment.due)} (due ${payment.dueDate}).\n\nPlease visit us or reply to settle the amount.\n\nThank you.`;
}

function mapRefundInvoice(invoice: RefundInvoice): RefundRecord {
  const pending = invoice.refundStatus === "pending";
  const primaryPayment = invoice.paymentMethod ?? "cash";
  return {
    id: invoice.id,
    invoiceId: invoice.receiptNumber || invoice.receiptNo || invoice.id,
    customer: invoice.customerName || invoice.customer || "Unknown",
    phone: invoice.customerPhone || invoice.phone || "",
    amount: invoice.refundAmount ?? invoice.paidAmount ?? invoice.totalAmount ?? invoice.total ?? 0,
    reason: invoice.refundReason || (pending ? "Awaiting reason" : "Refunded invoice"),
    approvedBy: invoice.approvedBy || (pending ? "" : "Manager"),
    mode: primaryPayment,
    date: (invoice.voidedAt || invoice.requestedAt || invoice.date || new Date().toISOString()).slice(0, 10),
    status: pending ? "pending" : "approved",
    txType: "REFUND",
  };
}

/* ─────────────────────────────────────────────────────────
   1B. REFUNDS TAB
───────────────────────────────────────────────────────── */
function RefundsTab({ onLoaded }: { onLoaded?: (refunds: RefundRecord[]) => void }) {
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

/* ─────────────────────────────────────────────────────────
   1C. PENDING PAYMENTS TAB
───────────────────────────────────────────────────────── */
function PendingTab() {
  const { pendingPayments, collectPayment } = usePendingPayments();
  const { refresh: refreshReceipts } = useReceipts();
  const [collectTarget, setCollectTarget] = useState<PendingPayment | null>(null);
  const [collectAmount, setCollectAmount] = useState("");
  const [collectPay, setCollectPay] = useState<PaymentMethodValue>(createPaymentMethodValue());
  const [messageTarget, setMessageTarget] = useState<PendingPayment | null>(null);
  const [reminderMessage, setReminderMessage] = useState("");
  const [reminderPhone, setReminderPhone] = useState("");

  const closeCollect = () => {
    setCollectTarget(null);
    setCollectAmount("");
    setCollectPay(createPaymentMethodValue());
  };

  const closeMessage = () => {
    setMessageTarget(null);
    setReminderMessage("");
    setReminderPhone("");
  };

  const openMessage = (payment: PendingPayment) => {
    setMessageTarget(payment);
    setReminderMessage(defaultPaymentReminder(payment));
    setReminderPhone(payment.phone ?? "");
  };

  const sendReminder = (channel: "whatsapp" | "sms") => {
    if (!messageTarget) return;
    if (!hasValidPhone(reminderPhone)) {
      toast.error("Enter a valid 10-digit phone number");
      return;
    }
    if (!reminderMessage.trim()) {
      toast.error("Enter a message before sending");
      return;
    }

    const phone = phoneForMessaging(reminderPhone);
    const text = encodeURIComponent(reminderMessage.trim());

    if (channel === "whatsapp") {
      window.open(`https://wa.me/${phone}?text=${text}`, "_blank", "noopener,noreferrer");
      toast.success("WhatsApp opened", { description: `Reminder ready for ${messageTarget.customer}` });
    } else {
      window.open(`sms:${phone}?body=${text}`, "_self");
      toast.success("SMS opened", { description: `Reminder ready for ${messageTarget.customer}` });
    }
    closeMessage();
  };

  const canSendReminder = reminderMessage.trim().length > 0 && hasValidPhone(reminderPhone);

  const totalDue = pendingPayments.reduce((s, p) => s + p.due, 0);
  const overdueCount = pendingPayments.filter((p) => isOverdue(p.dueDate)).length;
  const partialCount = pendingPayments.filter((p) => p.status === "PARTIAL").length;

  const pendingPagination = useTablePagination(pendingPayments.length);
  const paginatedPending = useMemo(
    () => pendingPagination.paginate(pendingPayments),
    [pendingPayments, pendingPagination],
  );

  const openCollect = (payment: PendingPayment) => {
    setCollectTarget(payment);
    setCollectAmount(String(payment.due));
    setCollectPay(createPaymentMethodValue());
  };

  const submitCollect = async () => {
    if (!collectTarget) return;
    const amount = parseFloat(collectAmount);
    if (!amount || amount <= 0) {
      toast.error("Enter a valid collection amount.");
      return;
    }
    if (amount > collectTarget.due + 0.01) {
      toast.error("Amount cannot exceed outstanding balance.");
      return;
    }
    if (!isPaymentMethodValid(collectPay, amount)) {
      toast.error(
        collectPay.method === "cash"
          ? "Cash received must cover the collection amount."
          : "Split amounts must equal the collection amount.",
      );
      return;
    }

    try {
      const payments = buildBillingPayments(collectPay, amount);
      await collectPayment(
        collectTarget.id,
        amount,
        primaryPayMethod(collectPay),
        paymentMethodReference(collectPay),
        payments,
      );
      await refreshReceipts();
      toast.success(
        amount < collectTarget.due
          ? `Partial payment of ${fmt(amount)} recorded`
          : `Payment of ${fmt(amount)} collected successfully`,
        { description: paymentMethodLabel(collectPay, amount) },
      );
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to collect payment"));
    }
    closeCollect();
  };

  const collectAmountNum = parseFloat(collectAmount) || 0;
  const canSubmitCollect =
    !!collectTarget &&
    collectAmountNum > 0 &&
    collectAmountNum <= (collectTarget?.due ?? 0) + 0.01 &&
    isPaymentMethodValid(collectPay, collectAmountNum);

  return (
    <div className="space-y-4">
      <FinanceStatGrid cols={3}>
        <FinanceStatCard label="Total Due" value={fmt(totalDue)} sub="Outstanding balance" icon={IndianRupee} index={0} />
        <FinanceStatCard label="Overdue" value={overdueCount} sub="Past due date" icon={AlertTriangle} index={1} />
        <FinanceStatCard label="Partial Paid" value={partialCount} sub="Part payment received" icon={Clock} index={2} />
      </FinanceStatGrid>

      <FinancePanel
        title="Pending Invoice Register"
        badge={<span className={`${financeBadgeGold} px-2 py-0.5 rounded-full font-bold`}>{pendingPayments.length} unpaid</span>}
      >
        <div className="divide-y divide-gray-100">
          {paginatedPending.length === 0 ? (
            <div className="px-5 py-10 text-center text-[13px] text-[#9a9a9a]">No pending payments right now.</div>
          ) : paginatedPending.map((p) => {
            const over = isOverdue(p.dueDate);
            const pct = p.total > 0 ? Math.round((p.paidAmount / p.total) * 100) : 0;
            return (
              <div key={p.id} className="px-5 py-4 hover:bg-[#FAF8F2]/60 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-[13px] font-bold text-[#111118]">{p.customer}</p>
                      <span className="text-[10px] font-mono text-[#9a9a9a]">{p.invoiceId}</span>
                      <Badge className={`text-[10px] ${financeBadge}`}>{p.status}</Badge>
                      {over && <Badge className={`text-[10px] ${financeBadgeGold}`}>Overdue</Badge>}
                    </div>
                    <p className="text-[11px] text-[#6b6b6b] mt-0.5">{p.services.join(", ")}</p>
                    <div className="flex items-center gap-4 mt-1.5">
                      <span className="text-[10px] text-[#9a9a9a] flex items-center gap-1"><Calendar className="h-3 w-3" />Due {p.dueDate}</span>
                      <span className="text-[10px] text-[#9a9a9a] flex items-center gap-1"><Phone className="h-3 w-3" />{p.phone}</span>
                    </div>
                    {p.paidAmount > 0 && (
                      <div className="mt-2 space-y-1">
                        <div className="flex justify-between text-[10px] text-[#9a9a9a]">
                          <span>Paid {fmt(p.paidAmount)} of {fmt(p.total)}</span>
                          <span>{pct}%</span>
                        </div>
                        <div className={`${financeProgressTrack} w-40`}>
                          <div className={financeProgressFill} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[15px] font-black text-[#111118]">{fmt(p.due)}</p>
                    <p className="text-[10px] text-[#9a9a9a] mt-0.5">outstanding</p>
                    <div className="flex gap-1.5 mt-2 justify-end">
                      <button type="button" className={financePrimaryBtn} onClick={() => openCollect(p)}>Collect</button>
                      <button
                        type="button"
                        onClick={() => openMessage(p)}
                        className="h-7 w-7 rounded-lg border border-black/[0.07] flex items-center justify-center text-[#9a9a9a] hover:text-[#D4AF37] hover:border-[#D4AF37]/30 transition-all"
                        title="Send payment reminder"
                      >
                        <MessageSquare className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <Pagination
          page={pendingPagination.page}
          pageSize={pendingPagination.pageSize}
          totalRecords={pendingPayments.length}
          onPageChange={pendingPagination.setPage}
          onPageSizeChange={pendingPagination.setPageSize}
        />
      </FinancePanel>

      <Dialog open={!!collectTarget} onOpenChange={(open) => !open && closeCollect()}>
        <DialogContent className="p-0 gap-0 overflow-hidden rounded-2xl w-[min(95vw,32rem)] max-w-none border border-black/[0.07] shadow-xl [&>button:last-of-type]:hidden">
          {collectTarget && (() => {
            const paidPct = collectTarget.total > 0
              ? Math.round((collectTarget.paidAmount / collectTarget.total) * 100)
              : 0;
            const over = isOverdue(collectTarget.dueDate);
            const initials = collectTarget.customer
              .split(" ")
              .map((n) => n[0])
              .join("")
              .slice(0, 2)
              .toUpperCase();
            const remainingAfter = Math.max(0, collectTarget.due - collectAmountNum);
            const isFullPay = collectAmountNum >= collectTarget.due - 0.01;

            return (
              <>
                <div className="bg-[#111118] px-6 py-5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={financeIconWrap}>
                      <IndianRupee className="h-4 w-4 text-[#d4af37]" />
                    </div>
                    <div>
                      <p className="text-white font-bold text-[14px] leading-tight">Collect Payment</p>
                      <p className="text-gray-500 text-[11px] mt-0.5">Record payment against outstanding invoice</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={closeCollect}
                    className="h-8 w-8 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] flex items-center justify-center text-gray-400 hover:text-white transition-all"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="px-6 py-5 space-y-4 bg-[#faf8f2]">
                  {/* Customer summary */}
                  <div className="rounded-xl border border-black/[0.07] bg-white p-4 shadow-sm">
                    <div className="flex items-start gap-3">
                      <div className={financeAvatarWrap}>{initials}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-[13px] font-bold text-[#111118]">{collectTarget.customer}</p>
                          {over && (
                            <span className={`${financeBadgeGold} px-2 py-0.5 rounded-full font-bold`}>Overdue</span>
                          )}
                        </div>
                        <p className="text-[10px] font-mono text-[#9a9a9a] mt-0.5">{collectTarget.invoiceId}</p>
                        <p className="text-[11px] text-[#6b6b6b] mt-1 truncate">{collectTarget.services.join(", ")}</p>
                        <div className="flex items-center gap-3 mt-2 text-[10px] text-[#9a9a9a]">
                          <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{collectTarget.phone}</span>
                          <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />Due {collectTarget.dueDate}</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-[#9a9a9a]">Balance</p>
                        <p className="text-[18px] font-black text-[#111118] leading-tight">{fmt(collectTarget.due)}</p>
                        <p className="text-[10px] text-[#9a9a9a] mt-0.5">of {fmt(collectTarget.total)}</p>
                      </div>
                    </div>
                    {collectTarget.paidAmount > 0 && (
                      <div className="mt-3 pt-3 border-t border-black/[0.05] space-y-1.5">
                        <div className="flex justify-between text-[10px] text-[#9a9a9a]">
                          <span>Paid {fmt(collectTarget.paidAmount)}</span>
                          <span className="font-semibold text-[#9a7d20]">{paidPct}% settled</span>
                        </div>
                        <div className={financeProgressTrack}>
                          <div className={financeProgressFill} style={{ width: `${paidPct}%` }} />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Amount */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                        Amount to Collect <span className="text-[#d4af37]">*</span>
                      </p>
                      <span className="rounded-full border border-[#D4AF37]/30 bg-[#FFFBEB] px-2.5 py-0.5 text-[10px] font-bold text-[#9a7a1e]">
                        Max {fmt(collectTarget.due)}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { label: "Full Balance", value: collectTarget.due },
                        { label: "Half", value: Math.ceil(collectTarget.due / 2) },
                        ...(collectTarget.due > 500 ? [{ label: "₹500", value: 500 }] : []),
                      ].map(({ label, value }) => (
                        <button
                          key={label}
                          type="button"
                          onClick={() => setCollectAmount(String(value))}
                          className={cn(
                            "h-7 px-3 rounded-lg border text-[10px] font-bold transition-all",
                            collectAmountNum === value
                              ? "border-[#111118] bg-[#111118] text-[#D4AF37]"
                              : "border-black/[0.08] bg-white text-[#6b6b6b] hover:border-[#D4AF37]/30 hover:text-[#111118]",
                          )}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    <div className="relative">
                      <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                      <input
                        type="number"
                        min={1}
                        max={collectTarget.due}
                        value={collectAmount}
                        onChange={(e) => setCollectAmount(e.target.value)}
                        placeholder={String(collectTarget.due)}
                        className="w-full h-11 pl-9 pr-3 rounded-xl border border-gray-200 bg-white text-[15px] font-bold text-[#111118] outline-none focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/12"
                      />
                    </div>
                    {collectAmountNum > 0 && (
                      <p className="text-[10.5px] text-[#9a9a9a] flex items-center gap-1.5">
                        {isFullPay ? (
                          <>
                            <CheckCircle2 className="h-3 w-3 text-[#00C896] shrink-0" />
                            <span className="text-[#00C896] font-semibold">Full settlement</span>
                            <span>— invoice will be marked paid</span>
                          </>
                        ) : (
                          <>
                            <Clock className="h-3 w-3 shrink-0" />
                            <span>{fmt(remainingAfter)} will remain outstanding</span>
                          </>
                        )}
                      </p>
                    )}
                  </div>

                  {/* Payment method — same UI as Billing */}
                  <PaymentMethodPicker
                    amountDue={collectAmountNum > 0 ? collectAmountNum : collectTarget.due}
                    value={collectPay}
                    onChange={setCollectPay}
                    methods={BILL_PAY_METHODS}
                    amountFieldLabel="Collect Amount"
                    upiNote={`${BRAND.appName} collect — ${collectTarget.customer}`}
                  />
                </div>

                <div className="px-6 py-4 border-t border-gray-100 bg-white flex items-center justify-between gap-3">
                  <p className="text-[10.5px] text-[#9a9a9a] hidden sm:block">
                    Collecting <span className="font-bold text-[#111118]">{collectAmountNum > 0 ? fmt(collectAmountNum) : "—"}</span>
                    {collectPay.method !== "cash" && paymentMethodReference(collectPay)
                      ? ` · Ref ${paymentMethodReference(collectPay)}`
                      : ""}
                  </p>
                  <div className="flex items-center gap-2 ml-auto">
                    <button
                      type="button"
                      onClick={closeCollect}
                      className="h-10 px-5 rounded-xl border border-gray-200 text-[13px] font-semibold text-gray-600 hover:bg-gray-50 transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={submitCollect}
                      disabled={!canSubmitCollect}
                      className="h-10 px-6 rounded-xl bg-gradient-to-r from-[#d4af37] to-[#b8962e] text-[13px] font-bold text-black disabled:opacity-40 transition-all shadow-md shadow-[#d4af37]/20 flex items-center gap-2"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Record Payment
                    </button>
                  </div>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      <Dialog open={!!messageTarget} onOpenChange={(open) => !open && closeMessage()}>
        <DialogContent className="p-0 gap-0 overflow-hidden rounded-2xl w-[min(95vw,28rem)] max-w-none border border-black/[0.07] shadow-xl [&>button:last-of-type]:hidden">
          {messageTarget && (
            <>
              <div className="bg-[#111118] px-6 py-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={financeIconWrap}>
                    <MessageSquare className="h-4 w-4 text-[#d4af37]" />
                  </div>
                  <div>
                    <p className="text-white font-bold text-[14px] leading-tight">Payment Reminder</p>
                    <p className="text-gray-500 text-[11px] mt-0.5">Send via WhatsApp or SMS</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={closeMessage}
                  className="h-8 w-8 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] flex items-center justify-center text-gray-400 hover:text-white transition-all"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="px-6 py-5 space-y-4 bg-[#faf8f2]">
                <div className="rounded-xl border border-black/[0.07] bg-white p-4 shadow-sm">
                  <p className="text-[13px] font-bold text-[#111118]">{messageTarget.customer}</p>
                  <p className="text-[10px] font-mono text-[#9a9a9a] mt-0.5">{messageTarget.invoiceId}</p>
                  <div className="flex items-center gap-3 mt-2 text-[10px] text-[#9a9a9a]">
                    <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />Due {messageTarget.dueDate}</span>
                  </div>
                  <p className="mt-2 text-[15px] font-black text-[#111118]">{fmt(messageTarget.due)} outstanding</p>
                </div>

                <div className="space-y-1.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Customer Phone</p>
                  <input
                    type="tel"
                    value={reminderPhone}
                    onChange={(e) => setReminderPhone(e.target.value)}
                    placeholder="e.g. 9876543210"
                    className="w-full h-10 rounded-xl border border-gray-200 bg-white px-3.5 text-[13px] text-[#111118] outline-none focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/12"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Message</p>
                    <span className="text-[10px] tabular-nums text-[#c0c0c0]">{reminderMessage.length}/320</span>
                  </div>
                  <textarea
                    rows={5}
                    maxLength={320}
                    value={reminderMessage}
                    onChange={(e) => setReminderMessage(e.target.value)}
                    placeholder="Write your payment reminder…"
                    className="w-full resize-none rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-[13px] leading-relaxed text-[#111118] outline-none focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/12"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    disabled={!canSendReminder}
                    onClick={() => sendReminder("whatsapp")}
                    className="h-11 rounded-xl bg-[#111118] text-[13px] font-bold text-[#D4AF37] hover:bg-[#1e1e1e] disabled:opacity-40 flex items-center justify-center gap-2"
                  >
                    <Send className="h-4 w-4" />
                    WhatsApp
                  </button>
                  <button
                    type="button"
                    disabled={!canSendReminder}
                    onClick={() => sendReminder("sms")}
                    className="h-11 rounded-xl border border-black/[0.1] bg-white text-[13px] font-semibold text-[#111118] hover:border-[#D4AF37]/35 hover:bg-[#FFFBEB] disabled:opacity-40 flex items-center justify-center gap-2"
                  >
                    <Phone className="h-4 w-4 text-[#D4AF37]" />
                    Send SMS
                  </button>
                </div>

                {!hasValidPhone(reminderPhone) && (
                  <p className="text-center text-[11px] text-[#9a9a9a]">Enter a valid phone number to enable sending.</p>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   1D. ADVANCE PAYMENTS TAB
───────────────────────────────────────────────────────── */
function CollectAdvanceModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { addAdvance } = useAdvances();
  const [customer, setCustomer] = useState("");
  const [phone, setPhone] = useState("");
  const [service, setService] = useState("");
  const [amount, setAmount] = useState("");
  const [bookedFor, setBookedFor] = useState("");

  if (!open) return null;

  const canSave = customer.trim() && phone.trim() && service.trim() && Number(amount) > 0 && bookedFor;

  function reset() {
    setCustomer(""); setPhone(""); setService(""); setAmount(""); setBookedFor("");
  }

  function handleSave() {
    if (!canSave) return;
    void addAdvance({
      customer: customer.trim(),
      phone: phone.trim(),
      service: service.trim(),
      amount: Number(amount),
      bookedFor,
    }).then((created) => {
      if (!created) return;
      toast.success("Advance collected", { description: `${fmt(Number(amount))} recorded for ${customer.trim()}` });
      reset();
      onClose();
    });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { reset(); onClose(); } }}>
      <DialogContent className="p-0 gap-0 overflow-hidden rounded-2xl w-[min(95vw,28rem)] max-w-none [&>button:last-of-type]:hidden">
        <div className="bg-[#111118] px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={financeIconWrap}><Wallet className="h-4 w-4 text-[#d4af37]" /></div>
            <div>
              <p className="text-white font-bold text-[14px] leading-tight">Collect Advance Payment</p>
              <p className="text-gray-500 text-[11px] mt-0.5">Record a deposit against a future booking</p>
            </div>
          </div>
          <button onClick={() => { reset(); onClose(); }} className="h-8 w-8 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] flex items-center justify-center text-gray-400 hover:text-white transition-all">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="px-6 py-5 space-y-3.5 bg-[#faf8f2]">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Customer Name <span className="text-[#d4af37]">*</span></p>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                <input value={customer} onChange={e => setCustomer(e.target.value)} placeholder="e.g. Ritu Sharma"
                  className="w-full h-10 pl-9 pr-3 rounded-xl border border-gray-200 bg-white text-[13px] text-[#111118] outline-none focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/12" />
              </div>
            </div>
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Phone <span className="text-[#d4af37]">*</span></p>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91 98765 43210"
                  className="w-full h-10 pl-9 pr-3 rounded-xl border border-gray-200 bg-white text-[13px] text-[#111118] outline-none focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/12" />
              </div>
            </div>
          </div>
          <div className="space-y-1.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Service Booked For <span className="text-[#d4af37]">*</span></p>
            <input value={service} onChange={e => setService(e.target.value)} placeholder="e.g. Bridal Makeup Package"
              className="w-full h-10 px-3.5 rounded-xl border border-gray-200 bg-white text-[13px] text-[#111118] outline-none focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/12" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Advance Amount (₹) <span className="text-[#d4af37]">*</span></p>
              <div className="relative">
                <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                <input type="number" min={1} value={amount} onChange={e => setAmount(e.target.value)} placeholder="5000"
                  className="w-full h-10 pl-9 pr-3 rounded-xl border border-gray-200 bg-white text-[13px] font-semibold text-[#111118] outline-none focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/12" />
              </div>
            </div>
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Booked For <span className="text-[#d4af37]">*</span></p>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
                <input type="date" value={bookedFor} onChange={e => setBookedFor(e.target.value)}
                  className="w-full h-10 pl-9 pr-3 rounded-xl border border-gray-200 bg-white text-[13px] text-[#111118] outline-none focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/12" />
              </div>
            </div>
          </div>
          <p className="text-[10.5px] text-gray-400 flex items-center gap-1.5 pt-1">
            <IndianRupee className="h-3 w-3 shrink-0" /> Recorded as a CAPITAL transaction — cash-in-hand, not revenue until applied to a bill.
          </p>
        </div>
        <div className="px-6 py-4 border-t border-gray-100 bg-white flex items-center justify-end gap-2">
          <button onClick={() => { reset(); onClose(); }} className="h-10 px-5 rounded-xl border border-gray-200 text-[13px] font-semibold text-gray-600 hover:bg-gray-50 transition-all">Cancel</button>
          <button onClick={handleSave} disabled={!canSave}
            className="h-10 px-6 rounded-xl bg-gradient-to-r from-[#d4af37] to-[#b8962e] text-[13px] font-bold text-black disabled:opacity-40 transition-all flex items-center gap-2">
            <Plus className="h-4 w-4" /> Collect Advance
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AdvanceTab() {
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

/* ─────────────────────────────────────────────────────────
   1E. MEMBERSHIP & PACKAGE USAGE TAB
───────────────────────────────────────────────────────── */
const NAME_PRESET_OPTIONS: { value: NamePreset; label: string }[] = [
  { value: "basic", label: "Basic" },
  { value: "silver", label: "Silver" },
  { value: "gold", label: "Gold" },
  { value: "platinum", label: "Platinum" },
  { value: "custom", label: "Custom" },
];

const EMPTY_PLAN_FORM = {
  namePreset: "gold" as NamePreset,
  customName: "",
  planType: "membership" as PlanType,
  price: "",
  walletAmount: "",
  validityDays: "365",
  serviceLimit: "",
  discountPercent: "",
  description: "",
  isActive: true,
  selectedServices: [] as string[],
};

function CreatePlanModal({
  open,
  onClose,
  onCreated,
  services,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  services: SalonServiceOption[];
}) {
  const [form, setForm] = useState(EMPTY_PLAN_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) setForm(EMPTY_PLAN_FORM);
  }, [open]);

  if (!open) return null;

  const canSave =
    form.price &&
    Number(form.price) >= 0 &&
    form.validityDays &&
    Number(form.validityDays) > 0 &&
    (form.namePreset !== "custom" || form.customName.trim());

  const toggleService = (serviceId: string) => {
    setForm((prev) => ({
      ...prev,
      selectedServices: prev.selectedServices.includes(serviceId)
        ? prev.selectedServices.filter((id) => id !== serviceId)
        : [...prev.selectedServices, serviceId],
    }));
  };

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      await createSalonPlan({
        namePreset: form.namePreset,
        customName: form.namePreset === "custom" ? form.customName.trim() : undefined,
        planType: form.planType,
        price: Number(form.price),
        walletAmount: form.walletAmount ? Number(form.walletAmount) : null,
        validityDays: Number(form.validityDays),
        serviceLimit: form.serviceLimit ? Number(form.serviceLimit) : null,
        discountPercent: form.discountPercent ? Number(form.discountPercent) : null,
        description: form.description.trim() || null,
        isActive: form.isActive,
        includedServices: form.selectedServices.map((serviceId) => ({ serviceId, quantity: 1 })),
      });
      toast.success("Membership / Package plan created");
      onCreated();
      onClose();
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    "w-full h-10 px-3.5 rounded-xl border border-gray-200 bg-white text-[13px] text-[#111118] outline-none focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/12";

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="p-0 gap-0 overflow-hidden rounded-2xl w-[min(95vw,36rem)] max-w-none max-h-[92vh] flex flex-col [&>button:last-of-type]:hidden">
        <div className="bg-[#111118] px-6 py-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className={financeIconWrap}><Package className="h-4 w-4 text-[#d4af37]" /></div>
            <div>
              <p className="text-white font-bold text-[14px] leading-tight">Create Membership / Package</p>
              <p className="text-gray-500 text-[11px] mt-0.5">Define a new plan for your salon</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="h-8 w-8 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] flex items-center justify-center text-gray-400 hover:text-white transition-all">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-3.5 bg-[#faf8f2] overflow-y-auto flex-1">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Plan Name <span className="text-[#d4af37]">*</span></p>
              <select
                value={form.namePreset}
                onChange={(e) => setForm({ ...form, namePreset: e.target.value as NamePreset })}
                className={inputClass}
              >
                {NAME_PRESET_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Type <span className="text-[#d4af37]">*</span></p>
              <select
                value={form.planType}
                onChange={(e) => setForm({ ...form, planType: e.target.value as PlanType })}
                className={inputClass}
              >
                <option value="membership">Membership</option>
                <option value="package">Package</option>
              </select>
            </div>
          </div>

          {form.namePreset === "custom" && (
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Custom Name <span className="text-[#d4af37]">*</span></p>
              <input
                value={form.customName}
                onChange={(e) => setForm({ ...form, customName: e.target.value })}
                placeholder="e.g. Bridal Bliss Bundle"
                className={inputClass}
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Price (₹) <span className="text-[#d4af37]">*</span></p>
              <input type="number" min={0} value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="5000" className={inputClass} />
            </div>
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Wallet Amount (₹)</p>
              <input type="number" min={0} value={form.walletAmount} onChange={(e) => setForm({ ...form, walletAmount: e.target.value })} placeholder="Optional" className={inputClass} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Validity (days) <span className="text-[#d4af37]">*</span></p>
              <input type="number" min={1} value={form.validityDays} onChange={(e) => setForm({ ...form, validityDays: e.target.value })} className={inputClass} />
            </div>
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Service Limit</p>
              <input type="number" min={0} value={form.serviceLimit} onChange={(e) => setForm({ ...form, serviceLimit: e.target.value })} placeholder="Optional" className={inputClass} />
            </div>
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Discount (%)</p>
              <input type="number" min={0} max={100} value={form.discountPercent} onChange={(e) => setForm({ ...form, discountPercent: e.target.value })} placeholder="Optional" className={inputClass} />
            </div>
          </div>

          <div className="space-y-1.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Status</p>
            <select
              value={form.isActive ? "active" : "inactive"}
              onChange={(e) => setForm({ ...form, isActive: e.target.value === "active" })}
              className={inputClass}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Description</p>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={2}
              placeholder="Optional plan details..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white text-[13px] text-[#111118] outline-none focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/12 resize-none"
            />
          </div>

          <div className="space-y-1.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Included Services</p>
            <div className="max-h-36 overflow-y-auto rounded-xl border border-gray-200 bg-white p-2 space-y-1">
              {services.length === 0 ? (
                <p className="text-[12px] text-[#9a9a9a] px-2 py-3 text-center">No services found in catalog</p>
              ) : services.map((svc) => (
                <label key={svc.id} className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-[#faf8f2] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.selectedServices.includes(svc.id)}
                    onChange={() => toggleService(svc.id)}
                    className="rounded border-gray-300 text-[#d4af37] focus:ring-[#d4af37]/30"
                  />
                  <span className="text-[12px] text-[#111118] flex-1">{svc.name}</span>
                  <span className="text-[10px] text-[#9a9a9a]">{fmt(svc.price)}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 bg-white flex items-center justify-end gap-2 shrink-0">
          <button type="button" onClick={onClose} className="h-10 px-5 rounded-xl border border-gray-200 text-[13px] font-semibold text-gray-600 hover:bg-gray-50 transition-all">Cancel</button>
          <button type="button" onClick={handleSave} disabled={!canSave || saving}
            className="h-10 px-6 rounded-xl bg-gradient-to-r from-[#d4af37] to-[#b8962e] text-[13px] font-bold text-black disabled:opacity-40 transition-all flex items-center gap-2">
            <Plus className="h-4 w-4" /> {saving ? "Saving..." : "Create Plan"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AssignPlanModal({
  open,
  onClose,
  onAssigned,
  plans,
  customers,
}: {
  open: boolean;
  onClose: () => void;
  onAssigned: () => void;
  plans: SalonPlan[];
  customers: CustomerOption[];
}) {
  const [customerId, setCustomerId] = useState("");
  const [planId, setPlanId] = useState("");
  const [amountPaid, setAmountPaid] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) {
      setCustomerId("");
      setPlanId("");
      setAmountPaid("");
    }
  }, [open]);

  const selectedPlan = plans.find((p) => p.id === planId);
  const canSave = customerId && planId;

  const handleAssign = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      await enrollCustomerInPlan({
        customerId,
        planId,
        amountPaid: amountPaid ? Number(amountPaid) : selectedPlan?.price,
      });
      toast.success("Membership / Package assigned to customer");
      onAssigned();
      onClose();
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    "w-full h-10 px-3.5 rounded-xl border border-gray-200 bg-white text-[13px] text-[#111118] outline-none focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/12";

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="p-0 gap-0 overflow-hidden rounded-2xl w-[min(95vw,28rem)] max-w-none [&>button:last-of-type]:hidden">
        <div className="bg-[#111118] px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={financeIconWrap}><User className="h-4 w-4 text-[#d4af37]" /></div>
            <div>
              <p className="text-white font-bold text-[14px] leading-tight">Assign to Customer</p>
              <p className="text-gray-500 text-[11px] mt-0.5">Purchase & enroll a customer in a plan</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="h-8 w-8 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] flex items-center justify-center text-gray-400 hover:text-white transition-all">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="px-6 py-5 space-y-3.5 bg-[#faf8f2]">
          <div className="space-y-1.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Customer <span className="text-[#d4af37]">*</span></p>
            <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} className={inputClass}>
              <option value="">Select customer</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.fullName} · {c.phone}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Plan <span className="text-[#d4af37]">*</span></p>
            <select value={planId} onChange={(e) => { setPlanId(e.target.value); setAmountPaid(""); }} className={inputClass}>
              <option value="">Select plan</option>
              {plans.filter((p) => p.isActive).map((p) => (
                <option key={p.id} value={p.id}>{p.name} ({p.planType}) · {fmt(p.price)}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Amount Paid (₹)</p>
            <input
              type="number"
              min={0}
              value={amountPaid}
              onChange={(e) => setAmountPaid(e.target.value)}
              placeholder={selectedPlan ? String(selectedPlan.price) : "Plan price"}
              className={inputClass}
            />
          </div>
        </div>
        <div className="px-6 py-4 border-t border-gray-100 bg-white flex items-center justify-end gap-2">
          <button type="button" onClick={onClose} className="h-10 px-5 rounded-xl border border-gray-200 text-[13px] font-semibold text-gray-600 hover:bg-gray-50 transition-all">Cancel</button>
          <button type="button" onClick={handleAssign} disabled={!canSave || saving}
            className="h-10 px-6 rounded-xl bg-gradient-to-r from-[#d4af37] to-[#b8962e] text-[13px] font-bold text-black disabled:opacity-40 transition-all">
            {saving ? "Assigning..." : "Assign Plan"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function MembershipTab({ onStatsChange }: { onStatsChange?: (stats: { active: number; exhausted: number; expired: number }) => void }) {
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
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9a9a9a] pointer-events-none" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search customer or package..."
          className="w-full h-10 pl-10 pr-4 rounded-xl border border-black/[0.07] text-[13px] bg-white shadow-sm focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/12 transition-all placeholder:text-[#9a9a9a]" />
      </div>

      <FinancePanel
        title="Membership / Package enrollments"
        subtitle={`${filtered.length} record${filtered.length !== 1 ? "s" : ""} · oldest first (FIFO)`}
      >
        {loading && (
          <div className="px-5 py-10 text-center text-[13px] text-[#9a9a9a]">Loading memberships...</div>
        )}
        {!loading && paginatedMemberships.length === 0 && (
          <div className="px-5 py-10 text-center text-[13px] text-[#9a9a9a]">
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
                      <p className="text-[11px] text-[#6b6b6b] truncate">{m.packageName} · {m.phone}</p>
                    </div>
                  </div>
                  <p className="text-[10px] text-[#9a9a9a] shrink-0">Exp {m.expiry}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="flex justify-between text-[11px] text-[#6b6b6b] mb-1">
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
                    <div className="flex justify-between text-[11px] text-[#6b6b6b] mb-1">
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
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[#9a9a9a]">Started</p>
                      <p className="text-[12px] font-semibold text-[#6b6b6b]">{m.startDate}</p>
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

/* ─────────────────────────────────────────────────────────
   MAIN RECEIPTS MODULE — 5 SUB-TABS
───────────────────────────────────────────────────────── */
const TABS = [
  { id:"sales"      as const, label:"Sales",                 icon:IndianRupee },
  { id:"refunds"    as const, label:"Refunds",               icon:RotateCcw  },
  { id:"pending"    as const, label:"Pending Payments",      icon:Clock      },
  { id:"advance"    as const, label:"Advance Payments",      icon:Wallet     },
  { id:"membership" as const, label:"Membership / Packages", icon:Package    },
] as const;

type ReceiptTab = typeof TABS[number]["id"];

export function FinanceReceiptsModule() {
  const [searchParams, setSearchParams] = useSearchParams();
  const dateParam = searchParams.get("date");
  const sectionParam = searchParams.get("section");

  const sectionFromUrl = (TABS.find((t) => t.id === sectionParam)?.id ?? "sales") as ReceiptTab;
  const [active, setActive] = useState<ReceiptTab>(sectionFromUrl);
  const { pendingPayments } = usePendingPayments();
  const { advances } = useAdvances();
  const [membershipStats, setMembershipStats] = useState({ active: 0, exhausted: 0, expired: 0 });
  const [pendingRefundCount, setPendingRefundCount] = useState(0);

  // Keep sub-tab in sync with ?section= (dashboard KPI drill-downs, deep links)
  useEffect(() => {
    if (dateParam) {
      setActive("sales");
      return;
    }
    if (sectionParam && TABS.some((t) => t.id === sectionParam)) {
      setActive(sectionParam as ReceiptTab);
    }
  }, [dateParam, sectionParam]);

  const handleTabChange = (id: ReceiptTab) => {
    setActive(id);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("tab", "receipts");
      next.set("section", id);
      if (id !== "sales") next.delete("date");
      return next;
    }, { replace: true });
  };

  const handleRefundsLoaded = useCallback((refunds: RefundRecord[]) => {
    setPendingRefundCount(refunds.filter((r) => r.status === "pending").length);
  }, []);

  const badges: Partial<Record<ReceiptTab, number>> = {
    refunds:    pendingRefundCount,
    pending:    pendingPayments.length,
    advance:    advances.length,
    membership: membershipStats.active,
  };

  return (
    <div className="space-y-4">
      <SegmentedPillNav
        items={TABS.map(({ id, label, icon }) => ({
          id,
          label,
          icon,
          badge: badges[id],
        }))}
        value={active}
        onChange={handleTabChange}
      />

      {active === "sales"      && <Receipts />}
      {active === "refunds"    && <RefundsTab onLoaded={handleRefundsLoaded} />}
      {active === "pending"    && <PendingTab />}
      {active === "advance"    && <AdvanceTab />}
      {active === "membership" && <MembershipTab onStatsChange={setMembershipStats} />}
    </div>
  );
}
