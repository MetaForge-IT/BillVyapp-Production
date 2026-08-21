import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Clock, Phone, MessageSquare, Calendar, AlertTriangle, CheckCircle2,
  IndianRupee, X, Send,
} from "lucide-react";
import { cn } from "../../../components/ui/utils";
import { Pagination } from "../../../components/shared/Pagination";
import { DEFAULT_PAGE_SIZE } from "../../../hooks/useTablePagination";
import { usePendingPayments, type PendingPayment } from "../../../context/PendingPaymentsContext";
import { useReceipts } from "../../../context/ReceiptsContext";
import { fetchPendingPaymentRecords } from "../../../lib/billingQueries";
import { queryKeys } from "../../../lib/queryKeys";
import { getApiErrorMessage } from "../../../../lib/api";
import { toast } from "../../../components/ui/hot-toast";
import { BRAND } from "../../../config/brand";
import { Badge } from "../../../components/ui/badge";
import { Dialog, DialogContent } from "../../../components/ui/dialog";
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
} from "../../../components/shared/PaymentMethodPicker";
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
} from "../finance-ui";
import {
  isOverdue, fmt, phoneForMessaging, hasValidPhone, defaultPaymentReminder,
} from "./helpers";

export function PendingTab() {
  const { collectPayment, refresh } = usePendingPayments();
  const { refresh: refreshReceipts } = useReceipts();
  const [listPage, setListPage] = useState(1);
  const [listPageSize, setListPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [collectTarget, setCollectTarget] = useState<PendingPayment | null>(null);
  const [collectAmount, setCollectAmount] = useState("");
  const [collectPay, setCollectPay] = useState<PaymentMethodValue>(createPaymentMethodValue());
  const [messageTarget, setMessageTarget] = useState<PendingPayment | null>(null);
  const [reminderMessage, setReminderMessage] = useState("");
  const [reminderPhone, setReminderPhone] = useState("");

  const pendingParams = { page: listPage, limit: listPageSize };
  const pendingQuery = useQuery({
    queryKey: queryKeys.billing.pending(pendingParams),
    queryFn: () => fetchPendingPaymentRecords(pendingParams),
  });
  const pendingPayments = pendingQuery.data?.items ?? [];
  const pendingTotal = pendingQuery.data?.total ?? 0;
  const loading = pendingQuery.isLoading || (pendingQuery.isFetching && !pendingQuery.data);
  const error = pendingQuery.error
    ? getApiErrorMessage(pendingQuery.error, "Failed to load pending payments")
    : null;

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(pendingTotal / listPageSize) || 1);
    if (listPage > maxPage) setListPage(maxPage);
  }, [pendingTotal, listPageSize, listPage]);

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

  const paginatedPending = pendingPayments;

  const openCollect = (payment: PendingPayment) => {
    setCollectTarget(payment);
    setCollectAmount(String(payment.due));
    setCollectPay(
      createPaymentMethodValue({
        method: "cash",
        cashReceived: String(payment.due),
      }),
    );
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
        badge={<span className={`${financeBadgeGold} px-2 py-0.5 rounded-full font-bold`}>{pendingTotal} unpaid</span>}
      >
        <div className="divide-y divide-gray-100">
          {loading ? (
            <div className="px-5 py-10 text-center text-[13px] text-[#9a9a9a]">Loading pending invoices…</div>
          ) : error ? (
            <div className="px-5 py-10 text-center space-y-3">
              <p className="text-[13px] text-red-600">{error}</p>
              <button type="button" className={financePrimaryBtn} onClick={() => void refresh()}>
                Retry
              </button>
            </div>
          ) : paginatedPending.length === 0 ? (
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
          page={listPage}
          pageSize={listPageSize}
          totalRecords={pendingTotal}
          onPageChange={setListPage}
          onPageSizeChange={(size) => {
            setListPageSize(size);
            setListPage(1);
          }}
        />
      </FinancePanel>

      <Dialog open={!!collectTarget} onOpenChange={(open) => !open && closeCollect()}>
        <DialogContent className="p-0 gap-0 overflow-hidden rounded-2xl w-[min(96vw,36rem)] max-w-none border border-black/[0.07] shadow-xl [&>button:last-of-type]:hidden">
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
                      <p className="text-gray-500 text-[11px] mt-0.5">Outstanding invoice · same cash / UPI layout as billing</p>
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

                <div className="px-6 py-5 space-y-4 bg-[#faf8f2] max-h-[min(70vh,36rem)] overflow-y-auto">
                  {/* Customer + bill summary */}
                  <div className="rounded-xl border border-black/[0.07] bg-white p-4 shadow-sm space-y-3">
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

                    {/* Bill line items */}
                    <div className="rounded-lg border border-black/[0.06] bg-[#faf9f7] overflow-hidden">
                      <div className="flex items-center justify-between border-b border-black/[0.05] px-3 py-2">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-[#9a9a9a]">Bill items</p>
                        <p className="text-[10px] font-semibold text-[#6b6b6b]">
                          {collectTarget.services.length || 0} line{collectTarget.services.length === 1 ? "" : "s"}
                        </p>
                      </div>
                      <ul className="divide-y divide-black/[0.04] max-h-36 overflow-y-auto">
                        {(collectTarget.services.length > 0
                          ? collectTarget.services
                          : ["Services on invoice"]
                        ).map((svc, idx) => (
                          <li key={`${svc}-${idx}`} className="flex items-center gap-2 px-3 py-2 text-[12px] text-[#111118]">
                            <span className="h-1.5 w-1.5 rounded-full bg-[#D4AF37] shrink-0" />
                            <span className="min-w-0 truncate">{svc}</span>
                          </li>
                        ))}
                      </ul>
                      <div className="flex items-center justify-between border-t border-black/[0.05] bg-white px-3 py-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#9a9a9a]">Invoice total</span>
                        <span className="text-[13px] font-black text-[#111118]">{fmt(collectTarget.total)}</span>
                      </div>
                    </div>

                    {collectTarget.paidAmount > 0 && (
                      <div className="pt-1 space-y-1.5">
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

                  {/* Payment method — collect layout (stacked cash fields) */}
                  <PaymentMethodPicker
                    amountDue={collectAmountNum > 0 ? collectAmountNum : collectTarget.due}
                    value={collectPay}
                    onChange={setCollectPay}
                    methods={BILL_PAY_METHODS}
                    amountFieldLabel="Collect Amount"
                    collectMode
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
