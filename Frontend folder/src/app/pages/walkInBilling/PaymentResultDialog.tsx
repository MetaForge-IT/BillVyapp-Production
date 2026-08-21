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
      <DialogContent className="overflow-hidden rounded-2xl border-0 bg-white p-0 shadow-2xl sm:max-w-[380px] [&>button:last-of-type]:z-20">
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
              className="relative flex flex-col items-center gap-3 overflow-hidden bg-gradient-to-br from-[#FFFBEB] via-white to-[#faf9f7] px-5 py-5"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-[#D4AF37]/35 bg-[#D4AF37]/15">
                <Clock className="h-7 w-7 text-[#B8962E]" />
              </div>
              <div className="text-center">
                <h2 className="text-lg font-black text-[#111118]">Bill Confirmed</h2>
                <p className="mt-0.5 text-[12px] text-[#6b6b6b]">Outstanding balance recorded</p>
              </div>
              <div className="w-full rounded-xl bg-gradient-to-br from-[#111118] to-[#1e1e2a] p-4 shadow-xl">
                <div className="mb-2 flex items-center justify-between border-b border-white/10 pb-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#D4AF37]/30 bg-[#D4AF37]/10">
                      <img src={BRAND.clientLogo} alt="" className="h-4 w-4 object-contain" />
                    </div>
                    <span className="truncate text-[13px] font-black text-[#d4af37]">{BRAND.clientName}</span>
                  </div>
                  <span className="shrink-0 font-mono text-[10px] text-[#d4af37]/70">{receipt.invoiceNo}</span>
                </div>
                <div className="space-y-1.5 text-[12px]">
                  <div className="flex justify-between gap-2">
                    <span className="text-gray-400">Customer</span>
                    <span className="truncate font-semibold text-white">{receipt.customer}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Status</span>
                    <span className="font-semibold text-amber-300">Pending</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-white/10 pt-2">
                    <span className="font-bold text-gray-300">Balance Due</span>
                    <span className="text-xl font-black text-[#d4af37]">
                      ₹{receipt.grandTotal.toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>
              </div>
              <p className="text-center text-[11px] text-[#6b6b6b]">
                Collect anytime from Pending Payments.
              </p>
              <button
                type="button"
                onClick={() => {
                  handleClose(false);
                  onDone();
                }}
                className="h-10 w-full rounded-xl bg-[#111118] text-[13px] font-bold text-[#D4AF37] transition-colors hover:bg-[#1a1a1a]"
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
              className="relative flex flex-col items-center gap-2.5 overflow-hidden bg-gradient-to-br from-gray-50 via-white to-gray-100 px-5 py-5"
            >
              <div className="pointer-events-none absolute -left-16 -top-16 h-40 w-40 rounded-full bg-green-200/35 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-16 -right-16 h-40 w-40 rounded-full bg-[#d4af37]/15 blur-3xl" />

              <motion.div
                className="relative"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 380, damping: 16, delay: 0.05 }}
              >
                <div className="relative flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-green-400 to-green-600 shadow-lg shadow-green-400/40">
                  <CheckCircle2 className="h-7 w-7 text-white" />
                </div>
              </motion.div>

              <div className="relative z-10 text-center">
                <h2 className="text-lg font-black text-green-600">Payment Successful!</h2>
              </div>

              <div className="relative z-10 w-full rounded-xl bg-gradient-to-br from-[#111118] to-[#1e1e2a] p-3.5 shadow-xl">
                <div className="mb-2 flex items-center justify-between border-b border-white/10 pb-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#D4AF37]/30 bg-[#D4AF37]/10">
                      <img src={BRAND.clientLogo} alt="" className="h-4 w-4 object-contain" />
                    </div>
                    <span className="truncate text-[13px] font-black text-[#d4af37]">{BRAND.clientName}</span>
                  </div>
                  <span className="shrink-0 font-mono text-[10px] text-[#d4af37]/70">{receipt.invoiceNo}</span>
                </div>
                <div className="space-y-1.5 text-[12px]">
                  {[
                    ["Customer", receipt.customer],
                    ["Payment", receipt.paymentMethod],
                  ].map(([label, value]) => (
                    <div key={label} className="flex justify-between gap-2">
                      <span className="shrink-0 text-gray-400">{label}</span>
                      <span className="truncate font-semibold capitalize text-white">{value}</span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between border-t border-white/10 pt-2">
                    <span className="font-bold text-gray-300">Paid</span>
                    <span className="text-xl font-black text-[#d4af37]">{formatInr(receipt.grandTotal)}</span>
                  </div>
                </div>
              </div>

              {receipt.loyaltyEarned > 0 && (
                <div className="relative z-10 flex w-full items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2">
                  <Star className="h-3.5 w-3.5 shrink-0 fill-green-500 text-green-600" />
                  <p className="truncate text-[11px] font-semibold text-green-700">
                    +{receipt.loyaltyEarned} loyalty pts for {receipt.customer}
                  </p>
                </div>
              )}

              <div className="relative z-10 w-full rounded-xl border border-[#D4AF37]/25 bg-[#fffdf7] px-3 py-2.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] font-semibold text-[#111118]">
                    Rate visit <span className="font-medium text-[#9a9a9a]">(optional)</span>
                  </p>
                  <p className="min-w-[2.5rem] text-right text-[11px] font-medium text-[#9a7d20]">
                    {feedbackRating > 0 ? `${feedbackRating}/5` : ""}
                  </p>
                </div>
                <div
                  className="mt-1.5 flex items-center justify-center gap-1"
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
                        className="rounded-md p-0.5 transition-transform hover:scale-110 disabled:opacity-60"
                      >
                        <Star
                          className={cn(
                            "h-7 w-7 transition-colors",
                            active ? "fill-[#D4AF37] text-[#D4AF37]" : "fill-none text-gray-300",
                          )}
                        />
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="relative z-10 w-full space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const msg = encodeURIComponent(
                        `Dear ${receipt.customer}, ${formatInr(receipt.grandTotal)} received at ${BRAND.clientName}. Invoice: ${receipt.invoiceNo}. Thank you!`,
                      );
                      window.open(`sms:?body=${msg}`, "_blank");
                    }}
                    className="flex h-9 items-center justify-center gap-1.5 rounded-xl bg-blue-600 text-[12px] font-bold text-white transition-colors hover:bg-blue-700"
                  >
                    <Phone className="h-3.5 w-3.5" /> SMS
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const msg = encodeURIComponent(
                        `Hi ${receipt.customer} 👋\n\nYour payment of *${formatInr(receipt.grandTotal)}* at *${BRAND.clientName}* has been received.\n\n🧾 Invoice: ${receipt.invoiceNo}\n\nThank you for visiting us! ✨`,
                      );
                      window.open(`https://wa.me/?text=${msg}`, "_blank");
                    }}
                    className="flex h-9 items-center justify-center gap-1.5 rounded-xl text-[12px] font-bold text-white"
                    style={{ background: "linear-gradient(135deg, #25D366, #128C7E)" }}
                  >
                    <Send className="h-3.5 w-3.5" /> WhatsApp
                  </button>
                </div>
                <button
                  type="button"
                  disabled={feedbackSubmitting}
                  onClick={() => void submitFeedbackAndFinish()}
                  className="flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#1a1a1a] to-[#2d2d2d] text-[13px] font-bold text-white transition-all hover:shadow-lg disabled:opacity-60"
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
