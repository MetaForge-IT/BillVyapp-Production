import { Bell, Tag, X } from "lucide-react";
import { cn } from "../../components/ui/utils";
import type { CouponApplied, DiscountTool } from "./types";

interface DiscountsOffersPanelProps {
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
  total: number;
}

export function DiscountsOffersPanel(props: DiscountsOffersPanelProps) {
  const {
    discountTools,
    onToggleTool,
    gstEnabled,
    onGstEnabledChange,
    gstRate,
    onGstRateChange,
    customTaxMode,
    customTaxInput,
    onCustomTaxMode,
    onCustomTaxInputChange,
    couponInput,
    onCouponInputChange,
    couponApplied,
    onClearCoupon,
    onApplyCoupon,
    billCouponDisc,
    loyaltyAvailable,
    loyaltyRedeem,
    onLoyaltyRedeemChange,
    discountMode,
    onDiscountModeChange,
    discountPct,
    onDiscountPctChange,
    discountFlat,
    onDiscountFlatChange,
    discount,
    discountReason,
    onDiscountReasonChange,
    subtotal,
    afterDiscount,
    billLoyalty,
    gstAmount,
    total,
  } = props;

  return (
    <div className="space-y-3 rounded-2xl border border-black/[0.07] bg-white p-4">
      <h4 className="text-[11px] font-bold uppercase tracking-[0.12em] text-gray-500">
        Discounts &amp; Offers
      </h4>

      <div className="flex flex-wrap gap-1.5">
        {([
          { id: "coupon" as const, label: "Coupon" },
          { id: "loyalty" as const, label: "Loyalty" },
          { id: "manual" as const, label: "Manual discount" },
        ]).map((tool) => {
          const enabled = discountTools[tool.id];
          return (
            <button
              key={tool.id}
              type="button"
              onClick={() => onToggleTool(tool.id, !enabled)}
              aria-pressed={enabled}
              className={cn(
                "flex h-9 items-center gap-2 rounded-full border px-3.5 text-[12px] font-bold transition-all",
                enabled
                  ? "border-[#d4af37] bg-[#111] text-[#d4af37]"
                  : "border-gray-200 bg-white text-gray-500 hover:border-[#d4af37]/40 hover:text-[#111]",
              )}
            >
              <span
                className={cn(
                  "relative h-3.5 w-7 rounded-full transition-colors",
                  enabled ? "bg-[#d4af37]" : "bg-gray-300",
                )}
              >
                <span
                  className={cn(
                    "absolute top-0.5 h-2.5 w-2.5 rounded-full bg-white shadow transition-all",
                    enabled ? "right-0.5" : "left-0.5",
                  )}
                />
              </span>
              {tool.label}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => onGstEnabledChange(!gstEnabled)}
          aria-pressed={gstEnabled}
          className={cn(
            "flex h-9 items-center gap-2 rounded-full border px-3.5 text-[12px] font-bold transition-all",
            gstEnabled
              ? "border-[#d4af37] bg-[#111] text-[#d4af37]"
              : "border-gray-200 bg-white text-gray-500 hover:border-[#d4af37]/40 hover:text-[#111]",
          )}
        >
          <span
            className={cn(
              "relative h-3.5 w-7 rounded-full transition-colors",
              gstEnabled ? "bg-[#d4af37]" : "bg-gray-300",
            )}
          >
            <span
              className={cn(
                "absolute top-0.5 h-2.5 w-2.5 rounded-full bg-white shadow transition-all",
                gstEnabled ? "right-0.5" : "left-0.5",
              )}
            />
          </span>
          GST
        </button>
      </div>

      <div className="space-y-2">
        {gstEnabled && (
          <div className="space-y-2 rounded-xl border border-[#d4af37]/25 bg-[#FFFBEB] p-2">
            <div className="flex gap-1.5">
              {[5, 12, 18].map((rate) => (
                <button
                  key={rate}
                  type="button"
                  onClick={() => {
                    onGstRateChange(rate);
                    onCustomTaxMode(false);
                    onCustomTaxInputChange("");
                  }}
                  className={cn(
                    "h-9 flex-1 rounded-lg border text-[12px] font-bold transition-all",
                    !customTaxMode && gstRate === rate
                      ? "border-[#111] bg-[#111] text-[#d4af37]"
                      : "border-gray-200 bg-white text-gray-500 hover:border-gray-300",
                  )}
                >
                  {rate}%
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  onCustomTaxMode(true);
                  onCustomTaxInputChange(String(gstRate));
                }}
                className={cn(
                  "h-9 flex-1 rounded-lg border text-[12px] font-bold transition-all",
                  customTaxMode
                    ? "border-[#111] bg-[#111] text-[#d4af37]"
                    : "border-gray-200 bg-white text-gray-500 hover:border-gray-300",
                )}
              >
                Custom
              </button>
            </div>
            {customTaxMode && (
              <div className="relative">
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={customTaxInput}
                  onChange={(event) => {
                    const value = event.target.value;
                    onCustomTaxInputChange(value);
                    const rate = parseFloat(value);
                    if (!Number.isNaN(rate) && rate >= 0 && rate <= 100) onGstRateChange(rate);
                  }}
                  placeholder="Enter tax %"
                  className="h-9 w-full rounded-lg border border-[#d4af37] bg-white pl-3 pr-8 text-[13px] font-bold text-[#111] outline-none"
                  autoFocus
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[12px] font-bold text-gray-400">
                  %
                </span>
              </div>
            )}
          </div>
        )}

        {couponApplied ? (
          <div className="flex h-10 items-center justify-between gap-2 rounded-xl border border-[#d4af37]/30 bg-[#FFFBEB] px-3">
            <div className="flex min-w-0 items-center gap-2">
              <Tag className="h-3.5 w-3.5 shrink-0 text-[#d4af37]" />
              <span className="truncate text-[12px] font-black tracking-wider text-[#9a7a1e]">
                {couponApplied.code}
              </span>
              <span className="shrink-0 text-[10px] text-gray-400">applied</span>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span className="text-[11px] font-black tabular-nums text-[#9a7a1e]">
                -₹{billCouponDisc.toLocaleString("en-IN")}
              </span>
              <button
                type="button"
                onClick={onClearCoupon}
                className="text-gray-400 transition-colors hover:text-gray-700"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ) : (
          discountTools.coupon && (
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Tag className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#d4af37]" />
                <input
                  value={couponInput}
                  onChange={(e) => onCouponInputChange(e.target.value.toUpperCase())}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") onApplyCoupon();
                  }}
                  placeholder="Coupon code"
                  autoFocus
                  className="h-10 w-full rounded-xl border border-gray-200 bg-white pl-9 pr-3 text-[12px] font-medium uppercase outline-none transition-colors placeholder:font-normal placeholder:normal-case placeholder:text-gray-400 focus:border-[#d4af37]"
                />
              </div>
              <button
                type="button"
                onClick={onApplyCoupon}
                className="h-10 shrink-0 rounded-xl bg-[#111] px-4 text-[11px] font-bold text-[#d4af37] transition-colors hover:bg-[#2a2a2a]"
              >
                Apply
              </button>
            </div>
          )
        )}

        {(discountTools.loyalty || loyaltyRedeem > 0 || discountTools.manual || discount > 0) && (
          <div className="grid gap-2 sm:grid-cols-2">
            {(discountTools.loyalty || loyaltyRedeem > 0) && (
              <div className="rounded-xl border border-gray-200 bg-white px-3 py-2">
                <div className="mb-1 flex items-center justify-between gap-1">
                  <span className="flex items-center gap-1.5 text-[11px] font-semibold text-[#111]">
                    <Bell className="h-3 w-3 text-[#d4af37]" />
                    Loyalty
                  </span>
                  <span className="shrink-0 text-[10px] text-gray-400">{loyaltyAvailable} pts</span>
                </div>
                <input
                  type="number"
                  min={0}
                  max={Math.min(loyaltyAvailable, Math.floor(afterDiscount / 0.5) + loyaltyRedeem)}
                  value={loyaltyRedeem || ""}
                  onChange={(e) =>
                    onLoyaltyRedeemChange(
                      Math.min(
                        Math.min(loyaltyAvailable, Math.floor((subtotal - billCouponDisc) / 0.5)),
                        Math.max(0, Number(e.target.value)),
                      ),
                    )
                  }
                  placeholder="0"
                  aria-label="Loyalty points to redeem"
                  className="h-9 w-full rounded-lg border border-gray-200 px-2.5 text-right text-[13px] font-medium tabular-nums outline-none transition-colors focus:border-[#d4af37]"
                />
                {loyaltyRedeem > 0 && (
                  <p className="mt-1 text-right text-[10px] font-semibold text-[#9a7a1e]">
                    = ₹{Math.round(loyaltyRedeem * 0.5).toLocaleString("en-IN")} off
                  </p>
                )}
              </div>
            )}
            {(discountTools.manual || discount > 0) && (
              <div className="rounded-xl border border-gray-200 bg-white px-3 py-2">
                <div className="mb-1 flex items-center justify-between gap-1">
                  <span className="text-[11px] font-semibold text-[#111]">Manual discount</span>
                  <div className="flex shrink-0 overflow-hidden rounded-md border border-gray-200">
                    {(["pct", "flat"] as const).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => onDiscountModeChange(mode)}
                        className={cn(
                          "h-6 w-7 text-[11px] font-bold transition-colors",
                          discountMode === mode
                            ? "bg-[#111] text-[#d4af37]"
                            : "bg-white text-gray-400 hover:text-[#111]",
                        )}
                      >
                        {mode === "pct" ? "%" : "₹"}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="relative">
                  {discountMode === "pct" ? (
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={0.5}
                      value={discountPct || ""}
                      onChange={(e) => {
                        const next = Math.min(100, Math.max(0, Number(e.target.value) || 0));
                        onDiscountPctChange(next);
                        if (next <= 0) onDiscountReasonChange("");
                      }}
                      placeholder="0"
                      aria-label="Manual discount percent"
                      className="h-9 w-full rounded-lg border border-gray-200 pl-2.5 pr-7 text-right text-[13px] font-medium tabular-nums outline-none transition-colors focus:border-[#d4af37]"
                    />
                  ) : (
                    <input
                      type="number"
                      min={0}
                      max={subtotal}
                      step={10}
                      value={discountFlat || ""}
                      onChange={(e) => {
                        const next = Math.min(subtotal, Math.max(0, Number(e.target.value) || 0));
                        onDiscountFlatChange(next);
                        if (next <= 0) onDiscountReasonChange("");
                      }}
                      placeholder="0"
                      aria-label="Manual discount amount"
                      className="h-9 w-full rounded-lg border border-gray-200 pl-2.5 pr-7 text-right text-[13px] font-medium tabular-nums outline-none transition-colors focus:border-[#d4af37]"
                    />
                  )}
                  <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-gray-400">
                    {discountMode === "pct" ? "%" : "₹"}
                  </span>
                </div>
                {discount > 0 && (
                  <p className="mt-1 text-right text-[10px] font-semibold text-[#9a7a1e]">
                    -₹{discount.toLocaleString("en-IN")}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {discount > 0 && (
          <input
            value={discountReason}
            onChange={(e) => onDiscountReasonChange(e.target.value)}
            placeholder="Reason for the manual discount (required, saved for audit)"
            className="h-10 w-full rounded-xl border border-[#d4af37]/40 bg-[#FFFBEB] px-3 text-[12px] outline-none transition-colors placeholder:text-gray-400 focus:border-[#d4af37]"
          />
        )}
      </div>

      <div className="space-y-1 border-t border-black/[0.05] pt-3 text-[12px]">
        <div className="flex justify-between">
          <span className="text-[#52525b]">Subtotal</span>
          <span className="font-semibold">₹{subtotal.toLocaleString("en-IN")}</span>
        </div>
        {billCouponDisc > 0 && (
          <div className="flex justify-between text-[#9a7a1e]">
            <span>Coupon</span>
            <span>−₹{billCouponDisc.toLocaleString("en-IN")}</span>
          </div>
        )}
        {billLoyalty > 0 && (
          <div className="flex justify-between text-[#9a7a1e]">
            <span>Loyalty</span>
            <span>−₹{Math.round(billLoyalty).toLocaleString("en-IN")}</span>
          </div>
        )}
        {discount > 0 && (
          <div className="flex justify-between text-[#9a7a1e]">
            <span>Discount</span>
            <span>−₹{discount.toLocaleString("en-IN")}</span>
          </div>
        )}
        {gstEnabled && (
          <div className="flex justify-between">
            <span className="text-[#52525b]">GST ({gstRate}%)</span>
            <span className="font-semibold">₹{gstAmount.toLocaleString("en-IN")}</span>
          </div>
        )}
        <div className="flex justify-between border-t border-black/[0.05] pt-2 text-[14px] font-bold">
          <span>Total</span>
          <span>₹{total.toLocaleString("en-IN")}</span>
        </div>
      </div>
    </div>
  );
}
