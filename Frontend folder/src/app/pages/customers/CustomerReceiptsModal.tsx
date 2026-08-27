import { useEffect, useMemo, useState } from "react";
import { Check, Download, Loader2, Mail, Receipt, Send, User } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "../../components/ui/dialog";
import { ReceiptPreviewDialog, type ReceiptPreviewData } from "../../components/shared/ReceiptPreviewDialog";
import { useReceiptShopInfo } from "../../components/shared/SalonReceiptBrand";
import { toast } from "../../components/ui/hot-toast";
import { getApiErrorMessage } from "../../../lib/api";
import { requestRefund } from "../../../api/billing";
import { fetchCustomerVisits, type Customer } from "../../../api/customers";
import { BRAND } from "../../config/brand";
import { financeGoldBtn } from "../finance/finance-ui";
import {
  downloadCustomerReceipt,
  rowToPreviewData,
  visitToReceiptRow,
  type CustomerReceiptRow,
} from "./customerReceiptUtils";

type CustomerReceiptsModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: Customer | null;
};

export function CustomerReceiptsModal({
  open,
  onOpenChange,
  customer,
}: CustomerReceiptsModalProps) {
  const shopInfo = useReceiptShopInfo();
  const [loading, setLoading] = useState(false);
  const [visits, setVisits] = useState<Awaited<ReturnType<typeof fetchCustomerVisits>>>([]);
  const [previewReceipt, setPreviewReceipt] = useState<ReceiptPreviewData | null>(null);
  const [emailReceipt, setEmailReceipt] = useState<ReceiptPreviewData | null>(null);
  const [emailTo, setEmailTo] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailMessage, setEmailMessage] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const [refundReceipt, setRefundReceipt] = useState<ReceiptPreviewData | null>(null);
  const [refundReason, setRefundReason] = useState("");
  const [refundSubmitting, setRefundSubmitting] = useState(false);

  useEffect(() => {
    if (!open || !customer) {
      setVisits([]);
      setPreviewReceipt(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    fetchCustomerVisits(customer.id)
      .then((rows) => {
        if (!cancelled) setVisits(rows);
      })
      .catch((error) => {
        if (!cancelled) {
          setVisits([]);
          toast.error(getApiErrorMessage(error, "Could not load receipts"));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, customer?.id]);

  const receipts = useMemo(() => {
    const rows = visits
      .map((visit) => ({ visit, row: visitToReceiptRow(visit) }))
      .filter(
        (
          entry,
        ): entry is {
          visit: (typeof visits)[number];
          row: CustomerReceiptRow;
        } => entry.row !== null,
      )
      .sort((a, b) => new Date(b.visit.date).getTime() - new Date(a.visit.date).getTime())
      .map((entry) => entry.row);
    return rows;
  }, [visits]);

  const suggestEmail = (name: string) => name.toLowerCase().replace(/\s+/g, ".") + "@email.com";

  const handleDownload = (receiptNo: string) => {
    if (!customer) return;
    const row = receipts.find((r) => r.receiptNo === receiptNo);
    if (!row?.downloadable) return;

    const ok = downloadCustomerReceipt(row.downloadable, customer, shopInfo);
    if (!ok) {
      toast.error("Could not download the receipt bill");
      return;
    }
    toast.success(`${receiptNo} downloaded — use Save as PDF in the print dialog`);
  };

  const handlePreviewDownload = (preview: ReceiptPreviewData) => {
    handleDownload(preview.receiptNo);
  };

  const openPreview = (row: CustomerReceiptRow) => {
    if (!customer) return;
    setPreviewReceipt(rowToPreviewData(row, customer));
  };

  const openEmail = (preview: ReceiptPreviewData) => {
    setEmailReceipt(preview);
    setEmailTo(suggestEmail(preview.customer));
    setEmailSubject(`Receipt ${preview.receiptNo} — ${BRAND.clientName}`);
    setEmailMessage(
      `Dear ${preview.customer},\n\nThank you for visiting ${BRAND.clientName}! Please find your receipt ${preview.receiptNo} attached.\n\nTotal Paid: ₹${preview.total.toLocaleString()} via ${preview.paymentMethod ?? "payment"}\n\nWe look forward to seeing you again!\n\n${BRAND.clientName} Team`,
    );
    setEmailSent(false);
  };

  const openRefundRequest = (preview: ReceiptPreviewData) => {
    setRefundReceipt(preview);
    setRefundReason("");
  };

  const submitRefundRequest = async () => {
    if (!refundReceipt?.id || refundReason.trim().length < 3) {
      toast.error("Please enter a refund reason (at least 3 characters)");
      return;
    }
    setRefundSubmitting(true);
    try {
      await requestRefund(refundReceipt.id, { reason: refundReason.trim() });
      toast.success("Refund request submitted for manager approval");
      setRefundReceipt(null);
      setPreviewReceipt(null);
      setRefundReason("");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to submit refund request"));
    } finally {
      setRefundSubmitting(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="gap-0 overflow-hidden rounded-2xl p-0 sm:max-w-lg [&>button:last-of-type]:hidden">
          <div className="flex items-center justify-between bg-[#111118] px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#d4af37]/20 bg-[#d4af37]/15">
                <Receipt className="h-4 w-4 text-[#D4AF37]" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-[15px] font-bold leading-tight text-white">
                  Customer Receipts
                </DialogTitle>
                <p className="mt-0.5 truncate text-[11px] text-white/45">
                  {customer?.name ?? "Customer"}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/6 text-lg leading-none text-gray-400 transition-all hover:bg-white/12 hover:text-white"
            >
              ×
            </button>
          </div>

          <div className="max-h-[min(60vh,420px)] overflow-y-auto overscroll-contain bg-[#faf8f2]">
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-14 text-sm text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                Loading receipts…
              </div>
            ) : receipts.length === 0 ? (
              <div className="px-6 py-14 text-center">
                <Receipt className="mx-auto h-10 w-10 text-[#d4af37]/35" />
                <p className="mt-3 text-sm font-semibold text-[#111118]">No receipts yet</p>
                <p className="mt-1 text-[12px] text-[#52525b]">
                  Paid bills for this customer will appear here with date and download.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-black/[0.06]">
                {receipts.map((row) => (
                  <li key={row.id} className="flex items-center gap-3 px-5 py-4">
                    <div className="min-w-0 flex-1">
                      <button
                        type="button"
                        onClick={() => openPreview(row)}
                        className="font-mono text-[13px] font-bold text-[#9a7d20] underline-offset-2 transition-colors hover:text-[#D4AF37] hover:underline"
                      >
                        {row.receiptNo}
                      </button>
                      <p className="mt-0.5 text-[11px] text-[#52525b]">
                        {row.dateStr}
                        {row.timeStr ? ` · ${row.timeStr}` : ""}
                      </p>
                      {row.services.length > 0 && (
                        <p className="mt-1 truncate text-[11px] text-[#3f3f46]">
                          {row.services.join(", ")}
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-2">
                      <p className="text-sm font-bold text-[#111118]">
                        ₹{row.amount.toLocaleString("en-IN")}
                      </p>
                      <button
                        type="button"
                        onClick={() => handleDownload(row.receiptNo)}
                        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#D4AF37]/30 bg-white px-2.5 text-[11px] font-semibold text-[#9a7d20] transition-all hover:border-[#D4AF37]/50 hover:bg-[#FFFBEB]"
                      >
                        <Download className="h-3.5 w-3.5" />
                        Download
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="border-t border-black/[0.06] bg-white px-6 py-3 text-center text-[11px] text-[#52525b]">
            {receipts.length > 0
              ? `${receipts.length} receipt${receipts.length === 1 ? "" : "s"} for ${customer?.name}`
              : "Receipts are generated when a bill is paid"}
          </div>
        </DialogContent>
      </Dialog>

      <ReceiptPreviewDialog
        open={!!previewReceipt}
        onOpenChange={(next) => !next && setPreviewReceipt(null)}
        receipt={previewReceipt}
        onDownload={handlePreviewDownload}
        onEmail={openEmail}
        onRequestRefund={openRefundRequest}
      />

      <Dialog open={!!refundReceipt} onOpenChange={(next) => !next && setRefundReceipt(null)}>
        <DialogContent className="gap-0 overflow-hidden rounded-2xl border border-black/[0.07] bg-white p-0 shadow-2xl sm:max-w-[400px]">
          {refundReceipt && (
            <>
              <div className="bg-[#111118] px-5 py-4 text-left">
                <DialogTitle className="text-[14px] font-bold text-white">Request Refund</DialogTitle>
                <DialogDescription className="mt-1 text-[11px] text-white/50">
                  {refundReceipt.receiptNo} · {refundReceipt.customer} · ₹
                  {refundReceipt.total.toLocaleString()}
                </DialogDescription>
              </div>
              <div className="space-y-3 bg-[#faf9f7] px-5 py-4">
                <p className="text-[11px] text-[#3f3f46]">
                  This sends the refund for manager approval. The receipt will be removed from sales
                  once submitted.
                </p>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[#b8962e]">
                    Reason for refund
                  </label>
                  <textarea
                    value={refundReason}
                    onChange={(e) => setRefundReason(e.target.value)}
                    rows={4}
                    placeholder="e.g. Customer dissatisfied with service, duplicate charge..."
                    className="w-full resize-none rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-[13px] focus:border-[#d4af37] focus:outline-none focus:ring-2 focus:ring-[#d4af37]/12"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 border-t border-black/[0.06] bg-white px-4 py-3">
                <button
                  type="button"
                  onClick={() => setRefundReceipt(null)}
                  disabled={refundSubmitting}
                  className="rounded-xl border border-black/[0.08] px-4 py-2 text-[13px] font-semibold text-[#3f3f46]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void submitRefundRequest()}
                  disabled={refundSubmitting || refundReason.trim().length < 3}
                  className={`${financeGoldBtn} px-4 py-2`}
                >
                  {refundSubmitting ? "Submitting..." : "Submit Request"}
                </button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!emailReceipt} onOpenChange={(next) => !next && setEmailReceipt(null)}>
        <DialogContent className="gap-0 overflow-hidden rounded-2xl border-0 p-0 shadow-2xl sm:max-w-lg [&>button]:hidden">
          {emailSent ? (
            <div className="relative overflow-hidden">
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#D4AF37]/60 to-transparent" />
              <div className="bg-gradient-to-br from-[#FAF8F2] via-white to-[#FAF8F2] px-8 py-14 text-center">
                <div className="relative mx-auto mb-5 w-fit">
                  <div className="absolute inset-0 scale-150 rounded-full bg-[#D4AF37]/25 blur-2xl" />
                  <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-[#D4AF37] to-[#B8962E] shadow-[0_8px_28px_rgba(212,175,55,0.4)]">
                    <Check className="h-10 w-10 text-[#0d0d14]" strokeWidth={2.5} />
                  </div>
                </div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#D4AF37]">
                  Delivered
                </p>
                <p className="mt-1 text-xl font-bold text-[#111118]">Email Sent Successfully</p>
                <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-[#3f3f46]">
                  Receipt{" "}
                  <span className="font-mono font-bold text-[#b8962e]">{emailReceipt?.receiptNo}</span>{" "}
                  was sent to <span className="font-semibold text-[#111118]">{emailTo}</span>
                </p>
              </div>
              <div className="flex justify-center border-t border-black/[0.06] bg-white px-6 py-4">
                <button
                  type="button"
                  onClick={() => setEmailReceipt(null)}
                  className={`${financeGoldBtn} px-10`}
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            emailReceipt && (
              <>
                <div className="relative overflow-hidden bg-[#111118] px-6 py-5">
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_100%_0%,rgba(212,175,55,0.12),transparent)]" />
                  <div className="relative flex items-start gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#D4AF37]/25 bg-[#D4AF37]/15">
                      <Mail className="h-5 w-5 text-[#D4AF37]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#D4AF37]">
                        Send Receipt
                      </p>
                      <DialogTitle className="mt-0.5 text-[16px] font-bold leading-tight text-white">
                        Email {emailReceipt.receiptNo}
                      </DialogTitle>
                      <DialogDescription className="mt-1 text-[12px] text-white/50">
                        to{" "}
                        <span className="font-semibold text-white/90">{emailReceipt.customer}</span>
                      </DialogDescription>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEmailReceipt(null)}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10 transition-colors hover:bg-white/20"
                      aria-label="Close"
                    >
                      ×
                    </button>
                  </div>
                </div>
                <div className="max-h-[70vh] space-y-4 overflow-y-auto bg-[#FAF8F2] px-6 py-5">
                  <div className="flex items-center gap-3.5 rounded-xl border border-black/[0.07] bg-white p-3.5 shadow-sm">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#B8962E] shadow-md shadow-[#D4AF37]/20">
                      <User className="h-5 w-5 text-[#0d0d14]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-bold text-[#111118]">
                        {emailReceipt.customer}
                      </p>
                      <p className="mt-0.5 text-[11px] text-[#52525b]">{emailReceipt.phone}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-[15px] font-black tabular-nums text-[#111118]">
                        ₹{emailReceipt.total.toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-[#3f3f46]">Recipient</label>
                      <input
                        type="email"
                        value={emailTo}
                        onChange={(e) => setEmailTo(e.target.value)}
                        className="h-10 w-full rounded-xl border border-black/[0.08] bg-white px-3.5 text-[13px] focus:border-[#d4af37] focus:outline-none focus:ring-2 focus:ring-[#d4af37]/12"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-[#3f3f46]">Subject</label>
                      <input
                        type="text"
                        value={emailSubject}
                        onChange={(e) => setEmailSubject(e.target.value)}
                        className="h-10 w-full rounded-xl border border-black/[0.08] bg-white px-3.5 text-[13px] focus:border-[#d4af37] focus:outline-none focus:ring-2 focus:ring-[#d4af37]/12"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-[#3f3f46]">Message</label>
                      <textarea
                        rows={5}
                        value={emailMessage}
                        onChange={(e) => setEmailMessage(e.target.value)}
                        className="w-full resize-none rounded-xl border border-black/[0.08] bg-white px-3.5 py-3 text-[13px] leading-relaxed text-[#111118] focus:border-[#d4af37] focus:outline-none focus:ring-2 focus:ring-[#d4af37]/12"
                      />
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2.5 border-t border-black/[0.06] bg-white px-6 py-4">
                  <button
                    type="button"
                    onClick={() => setEmailReceipt(null)}
                    className="h-10 flex-1 rounded-xl border border-black/[0.08] bg-white text-[13px] font-semibold text-[#3f3f46] transition-all hover:border-[#D4AF37]/20 hover:bg-[#FAF8F2]"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => setEmailSent(true)}
                    disabled={!emailTo.trim()}
                    className={`${financeGoldBtn} inline-flex flex-1 items-center justify-center gap-2`}
                  >
                    <Send className="h-4 w-4" />
                    Send Email
                  </button>
                </div>
              </>
            )
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
