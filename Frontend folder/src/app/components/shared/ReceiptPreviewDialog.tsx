import { Download, Mail, Printer, RotateCcw, X } from "lucide-react";
import { Dialog, DialogContent } from "../ui/dialog";
import { RECEIPT_FOOTER } from "../../config/brand";
import { SalonReceiptBrandHeader, SalonReceiptPaper } from "./SalonReceiptBrand";
import { financeGoldBtn } from "../../pages/finance/finance-ui";
import {
  receiptLinesForDisplay,
  type ReceiptLineItem,
} from "../../lib/receiptLineItems";

export type ReceiptPreviewData = {
  id?: string;
  receiptNo: string;
  date: string;
  time: string;
  customer: string;
  phone?: string;
  services: string[];
  lineItems?: ReceiptLineItem[];
  subtotal: number;
  discount: number;
  gst: number;
  total: number;
  paymentMethod?: string;
  canRequestRefund?: boolean;
};

const methodLabel: Record<string, string> = {
  cash: "Cash",
  card: "Card",
  upi: "UPI",
  wallet: "Wallet",
  none: "Unpaid",
};

export function paymentMethodLabel(method: string | undefined): string {
  if (!method) return "Unknown";
  return methodLabel[method] ?? method.charAt(0).toUpperCase() + method.slice(1);
}

type ReceiptPreviewDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  receipt: ReceiptPreviewData | null;
  onDownload: (receipt: ReceiptPreviewData) => void;
  onEmail?: (receipt: ReceiptPreviewData) => void;
  onRequestRefund?: (receipt: ReceiptPreviewData) => void;
};

export function ReceiptPreviewDialog({
  open,
  onOpenChange,
  receipt,
  onDownload,
  onEmail,
  onRequestRefund,
}: ReceiptPreviewDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[380px] gap-0 overflow-hidden rounded-2xl border border-black/[0.07] bg-white p-0 shadow-2xl [&>button]:hidden">
        {receipt && (
          <>
            <div className="relative flex items-center justify-between bg-[#111118] px-5 py-4">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_100%_0%,rgba(212,175,55,0.12),transparent)]" />
              <div className="relative min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#D4AF37]">
                  Receipt Preview
                </p>
                <p className="mt-0.5 font-mono text-[14px] font-bold text-white">{receipt.receiptNo}</p>
                <p className="mt-0.5 text-[11px] text-white/50">
                  {receipt.customer} · {paymentMethodLabel(receipt.paymentMethod)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10 transition-colors hover:bg-white/20"
                aria-label="Close"
              >
                <X className="h-4 w-4 text-white/70" />
              </button>
            </div>

            <div className="max-h-[62vh] overflow-y-auto bg-[#faf9f7] p-4">
              <SalonReceiptPaper>
                <SalonReceiptBrandHeader />
                <div className="mb-3 space-y-0.5 border-b border-dashed border-[#D4AF37]/25 pb-3">
                  {(
                    [
                      ["Receipt No.", receipt.receiptNo],
                      ["Date", `${receipt.date}  ${receipt.time}`],
                      ["Customer", receipt.customer],
                      ["Payment", paymentMethodLabel(receipt.paymentMethod).toUpperCase()],
                    ] as [string, string][]
                  ).map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-3 text-[11px]">
                      <span className="text-[#52525b]">{k}</span>
                      <span className="text-right font-bold">{v}</span>
                    </div>
                  ))}
                </div>
                <div className="mb-3 border-b border-dashed border-[#D4AF37]/25 pb-3">
                  <div className="mb-2 flex border-b border-black/[0.08] pb-1 text-[10px] font-bold uppercase tracking-wider text-[#52525b]">
                    <span className="flex-1">Description</span>
                    <span className="w-16 text-right">Amount</span>
                  </div>
                  {receiptLinesForDisplay(receipt.lineItems, receipt.services, receipt.subtotal).map(
                    (line, i) => (
                      <div key={i} className="flex py-0.5 text-[11px]">
                        <span className="flex-1 pr-2 font-semibold uppercase">{line.name}</span>
                        <span className="w-16 text-right">&#x20b9;{line.amount.toLocaleString()}</span>
                      </div>
                    ),
                  )}
                </div>
                <div className="mb-3 space-y-0.5 border-b border-dashed border-[#D4AF37]/25 pb-3">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-[#52525b]">Subtotal</span>
                    <span>&#x20b9;{receipt.subtotal.toLocaleString()}</span>
                  </div>
                  {receipt.discount > 0 && (
                    <div className="flex justify-between text-[11px]">
                      <span className="text-[#52525b]">Discount</span>
                      <span className="font-bold text-[#9a7d20]">
                        -&#x20b9;{receipt.discount.toLocaleString()}
                      </span>
                    </div>
                  )}
                  {receipt.gst > 0 && (
                    <div className="flex justify-between text-[11px]">
                      <span className="text-[#52525b]">GST</span>
                      <span>+&#x20b9;{receipt.gst.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="mt-1 flex justify-between border-t border-[#D4AF37]/30 pt-1.5 text-[13px] font-black">
                    <span>GRAND TOTAL</span>
                    <span className="text-[#9a7d20]">&#x20b9;{receipt.total.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-[11px] font-semibold">
                    <span className="text-[#52525b]">
                      Paid ({paymentMethodLabel(receipt.paymentMethod)})
                    </span>
                    <span>&#x20b9;{receipt.total.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-[#52525b]">Balance Due</span>
                    <span className="font-bold">&#x20b9;0.00</span>
                  </div>
                </div>
                <div className="mb-3 border-b border-dashed border-[#D4AF37]/25 pb-3">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-[#52525b]">Loyalty Points Earned</span>
                    <span className="font-bold text-[#9a7d20]">
                      +{Math.floor(receipt.total / 10)} pts
                    </span>
                  </div>
                  <div className="flex justify-between text-[9px] text-[#52525b]">
                    <span>Redeem on next visit</span>
                    <span>1 pt = &#x20b9;0.50</span>
                  </div>
                </div>
                <div className="space-y-1 text-center">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#D4AF37]">
                    {RECEIPT_FOOTER.thankYou}
                  </p>
                  <p className="text-[9px] text-[#52525b]">{RECEIPT_FOOTER.revisit}</p>
                  <div className="mx-auto mt-2 h-px w-16 bg-gradient-to-r from-transparent via-[#D4AF37]/40 to-transparent" />
                </div>
              </SalonReceiptPaper>
            </div>

            <div
              className={`grid border-t border-black/[0.06] bg-white ${
                onEmail ? "grid-cols-3" : "grid-cols-2"
              }`}
            >
              {[
                { Icon: Printer, label: "Print", action: () => onDownload(receipt) },
                ...(onEmail
                  ? [{ Icon: Mail, label: "Email", action: () => onEmail(receipt) }]
                  : []),
                { Icon: Download, label: "Download", action: () => onDownload(receipt) },
              ].map(({ Icon, label, action }) => (
                <button
                  key={label}
                  type="button"
                  onClick={action}
                  className="flex flex-col items-center gap-1 border-r border-black/[0.06] py-3 text-[11px] font-semibold text-[#3f3f46] transition-colors last:border-r-0 hover:bg-[#faf9f7] hover:text-[#9a7d20]"
                >
                  <Icon className="h-4 w-4 text-[#D4AF37]" />
                  {label}
                </button>
              ))}
            </div>

            <div className="space-y-2 border-t border-black/[0.06] bg-white px-4 py-3">
              {receipt.canRequestRefund && onRequestRefund && (
                <button
                  type="button"
                  onClick={() => onRequestRefund(receipt)}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 py-2.5 text-[12px] font-bold text-red-700 transition-colors hover:bg-red-100"
                >
                  <RotateCcw className="h-4 w-4" />
                  Request Refund
                </button>
              )}
              <button type="button" onClick={() => onOpenChange(false)} className={`${financeGoldBtn} w-full`}>
                Close
              </button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
