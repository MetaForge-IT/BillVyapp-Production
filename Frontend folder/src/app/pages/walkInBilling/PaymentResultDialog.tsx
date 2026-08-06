import { useState } from "react";
import { useNavigate } from "react-router";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Clock, Phone, Send, Star } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "../../components/ui/dialog";
import { cn } from "../../components/ui/utils";
import { toast } from "../../components/ui/hot-toast";
import { BRAND } from "../../config/brand";
import { createFeedback } from "../../../api/feedback";
import { getApiErrorMessage } from "../../../lib/api";
import { formatInr } from "../../../lib/inventoryMappers";

export interface WalkInReceiptData {
  invoiceNo: string;
  customer: string;
  date: string;
  items: Array<{ name: string; qty: number; rate: number; total: number }>;
  subtotal: number;
  gst: number;
  grandTotal: number;
  paymentMethod: string;
  loyaltyEarned: number;
  appointmentId?: string;
}

export type ReceiptStep = "success" | "pending";

interface PaymentResultDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  step: ReceiptStep;
  receipt: WalkInReceiptData | null;
  onDone: () => void;
}

export function PaymentResultDialog({
  open,
  onOpenChange,
  step,
  receipt,
  onDone,
}: PaymentResultDialogProps) {
  const navigate = useNavigate();
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackHover, setFeedbackHover] = useState(0);
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);

  const resetFeedback = () => {
    setFeedbackRating(0);
    setFeedbackHover(0);
    setFeedbackSubmitting(false);
  };

  const handleClose = (next: boolean) => {
    if (!next) resetFeedback();
    onOpenChange(next);
  };

  const finishWithoutFeedback = () => {
    resetFeedback();
    onOpenChange(false);
    onDone();
    navigate("/dashboard");
  };

  const submitFeedbackAndFinish = async () => {
    if (!receipt) return;

    const hasRating = feedbackRating >= 1 && feedbackRating <= 5;
    if (!hasRating) {
      finishWithoutFeedback();
      return;
    }

    if (!receipt.appointmentId) {
      // Rating chosen but no appointment to attach — still allow exit
      toast.error("Unable to save feedback — appointment not found");
      finishWithoutFeedback();
      return;
    }

    setFeedbackSubmitting(true);
    try {
      await createFeedback({
        appointmentId: receipt.appointmentId,
        rating: feedbackRating,
        source: "app",
      });
      toast.success("Thanks for the feedback!");
      finishWithoutFeedback();
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to save feedback"));
    } finally {
      setFeedbackSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="overflow-hidden rounded-2xl border-0 bg-white p-0 shadow-2xl sm:max-w-[400px]">
        <DialogTitle className="sr-only">
          {step === "pending" ? "Bill confirmed" : "Payment successful"}
        </DialogTitle>
        <DialogDescription className="sr-only">
          {step === "pending"
            ? "The invoice was created with an outstanding balance."
            : "Checkout completed. You can optionally rate this visit."}
        </DialogDescription>

        <AnimatePresence mode="wait">
          {step === "pending" && receipt && (
            <motion.div
              key="pending"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.25 }}
              className="relative flex flex-col items-center gap-4 overflow-hidden bg-gradient-to-br from-[#FFFBEB] via-white to-[#faf9f7] px-6 py-8"
            >
              <div className="relative flex h-20 w-20 items-center justify-center rounded-full border-2 border-[#D4AF37]/35 bg-[#D4AF37]/15">
                <Clock className="h-9 w-9 text-[#B8962E]" />
              </div>
              <div className="text-center">
                <h2 className="text-xl font-black text-[#111118]">Bill Confirmed</h2>
                <p className="mt-1 text-sm text-[#6b6b6b]">Invoice generated with outstanding balance</p>
              </div>
              <div className="w-full rounded-2xl bg-gradient-to-br from-[#111118] to-[#1e1e2a] p-5 shadow-2xl">
                <div className="mb-3 flex items-center justify-between border-b border-white/10 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full border border-[#D4AF37]/30 bg-[#D4AF37]/10">
                      <img src={BRAND.clientLogo} alt="" className="h-5 w-5 object-contain" />
                    </div>
                    <span className="text-[14px] font-black text-[#d4af37]">{BRAND.clientName}</span>
                  </div>
                  <span className="font-mono text-[11px] text-[#d4af37]/70">{receipt.invoiceNo}</span>
                </div>
                <div className="space-y-2 text-[13px]">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Customer</span>
                    <span className="font-semibold text-white">{receipt.customer}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Payment Status</span>
                    <span className="font-semibold text-amber-300">Pending</span>
                  </div>
                  <div className="mt-1 flex items-center justify-between border-t border-white/10 pt-3">
                    <span className="text-[14px] font-bold text-gray-300">Balance Due</span>
                    <span className="text-2xl font-black text-[#d4af37]">
                      ₹{receipt.grandTotal.toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>
              </div>
              <p className="text-center text-[12px] text-[#6b6b6b]">
                Added to Pending Payments. Collect the balance anytime from Finance.
              </p>
              <button
                type="button"
                onClick={() => {
                  handleClose(false);
                  onDone();
                }}
                className="h-11 w-full rounded-xl bg-[#111118] text-[13px] font-bold text-[#D4AF37] transition-colors hover:bg-[#1a1a1a]"
              >
                Done
              </button>
            </motion.div>
          )}

          {step === "success" && receipt && (
            <motion.div
              key="success"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.25 }}
              className="relative flex flex-col items-center gap-4 overflow-hidden bg-gradient-to-br from-gray-50 via-white to-gray-100 px-6 py-8"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ duration: 1.2 }}
                className="pointer-events-none absolute -left-20 -top-20 h-64 w-64 rounded-full bg-green-200/40 blur-3xl"
              />
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ duration: 1.2, delay: 0.1 }}
                className="pointer-events-none absolute -bottom-20 -right-20 h-64 w-64 rounded-full bg-[#d4af37]/20 blur-3xl"
              />

              <motion.div
                className="relative"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 380, damping: 16, delay: 0.05 }}
              >
                <motion.div
                  className="absolute inset-0 rounded-full bg-green-400/35"
                  animate={{ scale: [1, 1.75, 1], opacity: [0.6, 0, 0.6] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
                <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-green-400 to-green-600 shadow-2xl shadow-green-400/50">
                  <CheckCircle2 className="h-12 w-12 text-white drop-shadow-lg" />
                </div>
              </motion.div>

              <div className="relative z-10 text-center">
                <h2 className="text-2xl font-black text-green-600">Payment Successful!</h2>
                <p className="mt-1 text-sm text-gray-400">Transaction completed successfully</p>
              </div>

              <div className="relative z-10 w-full rounded-2xl bg-gradient-to-br from-[#111118] to-[#1e1e2a] p-5 shadow-2xl shadow-black/25">
                <div className="mb-3 flex items-center justify-between border-b border-white/10 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full border border-[#D4AF37]/30 bg-[#D4AF37]/10">
                      <img src={BRAND.clientLogo} alt="" className="h-5 w-5 object-contain" />
                    </div>
                    <span className="text-[15px] font-black tracking-wide text-[#d4af37]">
                      {BRAND.clientName}
                    </span>
                  </div>
                  <span className="font-mono text-[11px] text-[#d4af37]/70">{receipt.invoiceNo}</span>
                </div>
                <div className="space-y-2 text-[13px]">
                  {[
                    ["Customer", receipt.customer],
                    [
                      "Items",
                      `${receipt.items.length} item${receipt.items.length !== 1 ? "s" : ""}`,
                    ],
                    ["Payment via", receipt.paymentMethod],
                  ].map(([label, value]) => (
                    <div key={label} className="flex justify-between">
                      <span className="text-gray-400">{label}</span>
                      <span className="font-semibold capitalize text-white">{value}</span>
                    </div>
                  ))}
                  <div className="mt-1 flex items-center justify-between border-t border-white/10 pt-3">
                    <span className="text-[14px] font-bold text-gray-300">Amount Paid</span>
                    <span className="text-2xl font-black text-[#d4af37]">
                      {formatInr(receipt.grandTotal)}
                    </span>
                  </div>
                </div>
              </div>

              {receipt.loyaltyEarned > 0 && (
                <div className="relative z-10 flex w-full items-center gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-green-100">
                    <Star className="h-4 w-4 fill-green-500 text-green-600" />
                  </div>
                  <p className="text-[13px] font-semibold text-green-700">
                    +{receipt.loyaltyEarned} loyalty points earned for {receipt.customer}!
                  </p>
                </div>
              )}

              <div className="relative z-10 w-full rounded-xl border border-[#D4AF37]/25 bg-[#fffdf7] px-4 py-4">
                <p className="text-center text-[11px] font-bold uppercase tracking-widest text-gray-400">
                  How was the experience?{" "}
                  <span className="font-medium normal-case tracking-normal text-[#9a9a9a]">
                    (optional)
                  </span>
                </p>
                <p className="mt-1 text-center text-[13px] font-semibold text-[#111118]">
                  Rate this visit for {receipt.customer}{" "}
                  <span className="font-medium text-[#9a9a9a]">(optional)</span>
                </p>
                <div
                  className="mt-3 flex items-center justify-center gap-2"
                  onMouseLeave={() => setFeedbackHover(0)}
                >
                  {[1, 2, 3, 4, 5].map((star) => {
                    const active = star <= (feedbackHover || feedbackRating);
                    return (
                      <button
                        key={star}
                        type="button"
                        aria-label={`${star} star${star === 1 ? "" : "s"}`}
                        disabled={feedbackSubmitting}
                        onMouseEnter={() => setFeedbackHover(star)}
                        onClick={() => setFeedbackRating(star)}
                        className="rounded-lg p-1 transition-transform hover:scale-110 disabled:opacity-60"
                      >
                        <Star
                          className={cn(
                            "h-8 w-8 transition-colors",
                            active ? "fill-[#D4AF37] text-[#D4AF37]" : "fill-none text-gray-300",
                          )}
                        />
                      </button>
                    );
                  })}
                </div>
                {feedbackRating > 0 && (
                  <p className="mt-2 text-center text-[12px] font-medium text-[#9a7d20]">
                    {feedbackRating} / 5 selected
                  </p>
                )}
              </div>

              <div className="relative z-10 w-full space-y-2.5">
                <p className="text-center text-[10px] font-bold uppercase tracking-widest text-gray-400">
                  Send Receipt to Customer
                </p>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      const msg = encodeURIComponent(
                        `Dear ${receipt.customer}, ${formatInr(receipt.grandTotal)} received at ${BRAND.clientName}. Invoice: ${receipt.invoiceNo}. Thank you!`,
                      );
                      window.open(`sms:?body=${msg}`, "_blank");
                    }}
                    className="flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 text-[13px] font-bold text-white shadow-lg shadow-blue-200 transition-colors hover:bg-blue-700"
                  >
                    <Phone className="h-4 w-4" /> Send via SMS
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const msg = encodeURIComponent(
                        `Hi ${receipt.customer} 👋\n\nYour payment of *${formatInr(receipt.grandTotal)}* at *${BRAND.clientName}* has been received.\n\n🧾 Invoice: ${receipt.invoiceNo}\n\nThank you for visiting us! ✨`,
                      );
                      window.open(`https://wa.me/?text=${msg}`, "_blank");
                    }}
                    className="flex h-11 items-center justify-center gap-2 rounded-xl text-[13px] font-bold text-white shadow-lg shadow-green-200"
                    style={{ background: "linear-gradient(135deg, #25D366, #128C7E)" }}
                  >
                    <Send className="h-4 w-4" /> WhatsApp
                  </button>
                </div>
                <button
                  type="button"
                  disabled={feedbackSubmitting}
                  onClick={() => void submitFeedbackAndFinish()}
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#1a1a1a] to-[#2d2d2d] text-[13px] font-bold text-white transition-all hover:shadow-xl disabled:opacity-60"
                >
                  {feedbackSubmitting ? "Saving feedback…" : "Done"}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
