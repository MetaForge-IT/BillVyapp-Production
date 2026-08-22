import { ArrowLeft, Clock, Receipt, Scissors } from "lucide-react";
import { Button } from "../../components/ui/button";
import { cn } from "../../components/ui/utils";
import { formatDisplayPhone } from "../../../lib/phone";
import { BRAND } from "../../config/brand";
import {
  BILL_PAY_METHODS,
  PaymentMethodPicker,
  isPaymentMethodValid,
  type PaymentMethodValue,
} from "../../components/shared/PaymentMethodPicker";
import { ColHeader } from "./ColHeader";
import { DiscountsOffersPanel } from "./DiscountsOffersPanel";
import type { CouponApplied, DiscountTool, SelectedService } from "./types";
import { customerInitials } from "./utils";

interface BillStepProps {
  billValid: boolean;
  servicesValid: boolean;
  scanToPayFocus: boolean;
  onScanFocusChange: (focus: boolean) => void;
  customerName: string;
  phoneDigits: string;
  selectedServices: SelectedService[];
  estimatedDuration: number;
  total: number;
  payMethod: PaymentMethodValue;
  onPayMethodChange: (next: PaymentMethodValue) => void;
  submitting: boolean;
  onPay: () => void;
  onConfirmOnly: () => void;
  onCancel: () => void;
  // discounts
  discountTools: Record<DiscountTool, boolean>;
  onToggleTool: (tool: DiscountTool, enabled: boolean) => void;
  gstEnabled: boolean;
  onGstEnabledChange: (enabled: boolean) => void;
  gstRate: number;
  onGstRateChange: (rate: number) => void;
  customTaxMode: boolean;
  customTaxInput: string;
  onCustomTaxMode: (enabled: boolean) => void;
  onCustomTaxInputChange: (value: string) => void;
  couponInput: string;
  onCouponInputChange: (value: string) => void;
  couponApplied: CouponApplied | null;
  onClearCoupon: () => void;
  onApplyCoupon: () => void;
  billCouponDisc: number;
  loyaltyAvailable: number;
  loyaltyRedeem: number;
  onLoyaltyRedeemChange: (points: number) => void;
  discountMode: "pct" | "flat";
  onDiscountModeChange: (mode: "pct" | "flat") => void;
  discountPct: number;
  onDiscountPctChange: (value: number) => void;
  discountFlat: number;
  onDiscountFlatChange: (value: number) => void;
  discount: number;
  discountReason: string;
  onDiscountReasonChange: (value: string) => void;
  subtotal: number;
  afterDiscount: number;
  billLoyalty: number;
  gstAmount: number;
}

export function BillStep(props: BillStepProps) {
  const {
    billValid,
    servicesValid,
    scanToPayFocus,
    onScanFocusChange,
    customerName,
    phoneDigits,
    selectedServices,
    estimatedDuration,
    total,
    payMethod,
    onPayMethodChange,
    submitting,
    onPay,
    onConfirmOnly,
    onCancel,
  } = props;

  const upiNote = `${BRAND.appName} walk-in${customerName ? ` — ${customerName}` : ""}`;

  return (
    <div
      className={cn(
        "responsive-panel relative flex flex-col overflow-hidden bg-[#f4f2ed]",
        !billValid && "pointer-events-none select-none",
      )}
    >
      {!billValid && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-[#f4f2ed]/70 backdrop-blur-[1px]">
          <p className="text-[12px] font-bold text-[#111118]/30">
            {!servicesValid ? "Select services first" : "Add customer details first"}
          </p>
        </div>
      )}
      {!scanToPayFocus && (
        <ColHeader num="03" icon={Receipt} title="Bill" desc="Pay or confirm without pay" />
      )}
      <div
        className={cn(
          "flex min-h-0 flex-1 flex-col overflow-y-auto px-5 py-5",
          scanToPayFocus && "bg-white md:overflow-hidden",
        )}
      >
        {scanToPayFocus ? (
          <div className="flex min-h-0 flex-1 flex-col gap-3">
            <div className="flex shrink-0 items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => onScanFocusChange(false)}
                className="flex h-9 items-center gap-1.5 rounded-lg border border-black/[0.08] bg-white px-3 text-[12px] font-bold text-[#111118] transition-colors hover:border-[#D4AF37]/40 hover:bg-[#FFFBEB]"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to bill
              </button>
              <span className="text-[11px] font-semibold text-[#9a9a9a]">
                Grand total{" "}
                <span className="font-black tabular-nums text-[#111118]">
                  ₹{total.toLocaleString("en-IN")}
                </span>
              </span>
            </div>
            <PaymentMethodPicker
              amountDue={total}
              value={payMethod}
              onChange={(next) => {
                if (next.method !== payMethod.method) onScanFocusChange(false);
                onPayMethodChange(next);
              }}
              methods={BILL_PAY_METHODS}
              showHeader={false}
              hideMethodTabs
              qrOnly
              fluid
              className="md:min-h-0 md:flex-1"
              upiNote={upiNote}
            />
            <Button
              disabled={!billValid || submitting || (total > 0 && !isPaymentMethodValid(payMethod, total))}
              onClick={onPay}
              className="h-12 shrink-0 rounded-2xl bg-gradient-to-r from-[#D4AF37] to-[#C9A227] text-[13px] font-bold text-[#111118] shadow-lg shadow-[#D4AF37]/20 disabled:opacity-30"
            >
              {submitting ? "Paying…" : `Pay ₹${total.toLocaleString("en-IN")}`}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-2xl border border-[#D4AF37]/25 bg-white p-4">
              <p className="mb-3 text-[9.5px] font-bold uppercase tracking-[0.15em] text-[#9a9a9a]">
                Customer
              </p>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#C9A227] text-[11px] font-bold text-[#111118]">
                  {customerInitials(customerName)}
                </div>
                <div>
                  <p className="text-[13px] font-bold text-[#111118]">{customerName || "—"}</p>
                  <p className="text-[11px] text-[#9a9a9a]">{formatDisplayPhone(phoneDigits)}</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-black/[0.07] bg-white p-4">
              <p className="mb-3 flex items-center gap-1.5 text-[9.5px] font-bold uppercase tracking-[0.15em] text-[#9a9a9a]">
                <Scissors className="h-3 w-3 text-[#D4AF37]" /> Services
              </p>
              <div className="space-y-2">
                {selectedServices.map((s) => (
                  <div key={s.id} className="flex items-center justify-between gap-2">
                    <span className="truncate text-[11.5px] text-[#111118]">
                      {s.displayName || s.name}
                      {s.qty > 1 ? ` ×${s.qty}` : ""}
                    </span>
                    <span className="shrink-0 text-[11px] font-bold text-[#111118]">
                      ₹{(s.price * s.qty).toLocaleString("en-IN")}
                    </span>
                  </div>
                ))}
                {estimatedDuration > 0 && (
                  <div className="flex items-center justify-between border-t border-black/[0.04] pt-2 text-[10.5px] text-[#9a9a9a]">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3 text-[#D4AF37]" /> Est. duration
                    </span>
                    <span className="font-semibold text-[#111118]">~{estimatedDuration} min</span>
                  </div>
                )}
              </div>
            </div>

            <DiscountsOffersPanel
              discountTools={props.discountTools}
              onToggleTool={props.onToggleTool}
              gstEnabled={props.gstEnabled}
              onGstEnabledChange={props.onGstEnabledChange}
              gstRate={props.gstRate}
              onGstRateChange={props.onGstRateChange}
              customTaxMode={props.customTaxMode}
              customTaxInput={props.customTaxInput}
              onCustomTaxMode={props.onCustomTaxMode}
              onCustomTaxInputChange={props.onCustomTaxInputChange}
              couponInput={props.couponInput}
              onCouponInputChange={props.onCouponInputChange}
              couponApplied={props.couponApplied}
              onClearCoupon={props.onClearCoupon}
              onApplyCoupon={props.onApplyCoupon}
              billCouponDisc={props.billCouponDisc}
              loyaltyAvailable={props.loyaltyAvailable}
              loyaltyRedeem={props.loyaltyRedeem}
              onLoyaltyRedeemChange={props.onLoyaltyRedeemChange}
              discountMode={props.discountMode}
              onDiscountModeChange={props.onDiscountModeChange}
              discountPct={props.discountPct}
              onDiscountPctChange={props.onDiscountPctChange}
              discountFlat={props.discountFlat}
              onDiscountFlatChange={props.onDiscountFlatChange}
              discount={props.discount}
              discountReason={props.discountReason}
              onDiscountReasonChange={props.onDiscountReasonChange}
              subtotal={props.subtotal}
              afterDiscount={props.afterDiscount}
              billLoyalty={props.billLoyalty}
              gstAmount={props.gstAmount}
              total={total}
            />

            <div>
              <PaymentMethodPicker
                amountDue={total}
                value={payMethod}
                onChange={(next) => {
                  if (next.method === "upi" && payMethod.method !== "upi") {
                    onPayMethodChange(next);
                    onScanFocusChange(true);
                    return;
                  }
                  if (next.method !== payMethod.method) onScanFocusChange(false);
                  onPayMethodChange(next);
                }}
                methods={BILL_PAY_METHODS}
                onOpenQr={() => onScanFocusChange(true)}
                upiNote={upiNote}
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <Button
                variant="outline"
                disabled={!billValid || submitting}
                onClick={onConfirmOnly}
                className="h-12 rounded-2xl border-[#D4AF37]/45 text-[13px] font-bold text-[#111118] disabled:opacity-30"
              >
                {submitting ? "Saving…" : "Confirm without pay"}
              </Button>
              <Button
                disabled={!billValid || submitting || (total > 0 && !isPaymentMethodValid(payMethod, total))}
                onClick={onPay}
                className="h-12 rounded-2xl bg-gradient-to-r from-[#D4AF37] to-[#C9A227] text-[13px] font-bold text-[#111118] shadow-lg shadow-[#D4AF37]/20 disabled:opacity-30"
              >
                {submitting ? "Paying…" : `Pay ₹${total.toLocaleString("en-IN")}`}
              </Button>
            </div>
            <Button
              variant="outline"
              onClick={onCancel}
              className="h-10 w-full rounded-xl border-black/[0.1] text-[13px] font-medium text-[#9a9a9a]"
            >
              Cancel
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
