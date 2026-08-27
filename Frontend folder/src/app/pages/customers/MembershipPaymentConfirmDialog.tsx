import { useMemo, useState, useEffect } from "react";
import { CheckCircle2, X, Crown } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "../../components/ui/dialog";
import { formatInr } from "../../../lib/inventoryMappers";
import {
  PaymentMethodPicker,
  createPaymentMethodValue,
  paymentMethodLabel,
  paymentMethodReference,
  isPaymentMethodValid,
  type PaymentMethodValue,
  type PayMethod,
} from "../../components/shared/PaymentMethodPicker";

export type MembershipPayMethod = PayMethod;

export interface MembershipPaymentDetails {
  method: MembershipPayMethod;
  amount: number;
  label: string;
  cashReceived?: number;
  cardType?: "debit" | "credit";
  walletProvider?: string;
  reference?: string;
  splitRows?: { method: string; amount: number; ref: string }[];
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerName: string;
  tier: string;
  amount: number;
  durationLabel: string;
  saving?: boolean;
  onConfirm: (details: MembershipPaymentDetails) => void;
}

export function MembershipPaymentConfirmDialog({
  open,
  onOpenChange,
  customerName,
  tier,
  amount,
  durationLabel,
  saving = false,
  onConfirm,
}: Props) {
  const [pay, setPay] = useState<PaymentMethodValue>(createPaymentMethodValue());

  useEffect(() => {
    if (!open) return;
    setPay(createPaymentMethodValue());
  }, [open, tier, amount]);

  const canConfirm = useMemo(
    () => isPaymentMethodValid(pay, amount) && amount > 0,
    [pay, amount],
  );

  const handleConfirm = () => {
    if (!canConfirm || saving) return;
    onConfirm({
      method: pay.method,
      amount,
      label: paymentMethodLabel(pay, amount),
      cashReceived: pay.method === "cash" ? parseFloat(pay.cashReceived) || 0 : undefined,
      cardType: pay.method === "card" ? pay.cardType : undefined,
      walletProvider: pay.method === "wallet" ? pay.walletProvider : undefined,
      reference: paymentMethodReference(pay),
      splitRows:
        pay.method === "split"
          ? pay.splitRows
              .filter((r) => parseFloat(r.amount) > 0)
              .map((r) => ({
                method: r.method,
                amount: parseFloat(r.amount),
                ref: r.ref,
              }))
          : undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!saving) onOpenChange(v); }}>
      <DialogContent className="gap-0 overflow-hidden rounded-2xl border-0 p-0 shadow-2xl sm:max-w-[440px] [&>button]:hidden">
        <DialogTitle className="sr-only">Confirm membership payment</DialogTitle>

        <div className="relative overflow-hidden bg-gradient-to-br from-[#111118] via-[#16161f] to-[#0d0d14] px-5 py-5">
          <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-[#D4AF37]/10 blur-2xl" />
          <div className="relative flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#D4AF37]/30 bg-[#D4AF37]/15">
                <Crown className="h-5 w-5 text-[#D4AF37]" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#D4AF37]/80">
                  Membership payment
                </p>
                <p className="text-[16px] font-black text-white">Confirm payment</p>
                <p className="mt-0.5 text-[12px] text-white/45">{customerName}</p>
              </div>
            </div>
            <button
              type="button"
              disabled={saving}
              onClick={() => onOpenChange(false)}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.06] text-white/50 transition-colors hover:bg-white/[0.12] hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="relative mt-4 flex items-end justify-between rounded-xl border border-[#D4AF37]/25 bg-[#D4AF37]/[0.08] px-4 py-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">Plan</p>
              <p className="text-[14px] font-bold capitalize text-white">{tier}</p>
              <p className="text-[11px] text-white/40">{durationLabel}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#D4AF37]/70">Amount due</p>
              <p className="text-[22px] font-black tabular-nums text-[#D4AF37]">{formatInr(amount)}</p>
            </div>
          </div>
        </div>

        <div className="bg-[#faf9f7] px-4 py-4">
          <PaymentMethodPicker
            amountDue={amount}
            value={pay}
            onChange={setPay}
            amountFieldLabel="Plan Amount"
            upiNote={`${tier} membership — ${customerName}`}
          />
          <p className="mt-3 text-center text-[11px] text-[#52525b]">
            Confirm only after collecting {formatInr(amount)}. This activates the membership and records payment.
          </p>
        </div>

        <div className="flex gap-2.5 border-t border-black/[0.06] bg-white px-4 py-3.5">
          <button
            type="button"
            disabled={saving}
            onClick={() => onOpenChange(false)}
            className="h-11 flex-1 rounded-xl border border-black/[0.08] text-[13px] font-semibold text-[#3f3f46] transition-all hover:bg-[#faf9f7] disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!canConfirm || saving}
            onClick={handleConfirm}
            className="flex h-11 flex-[1.6] items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#C9A227] text-[13px] font-black text-[#111118] shadow-lg shadow-[#D4AF37]/20 transition-all hover:from-[#C9A227] hover:to-[#B8922E] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {saving ? (
              "Saving..."
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                Payment received — Activate
              </>
            )}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
