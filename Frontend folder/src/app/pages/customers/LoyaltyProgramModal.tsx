import {
  Crown, Calendar, Send, CheckCircle, Sparkles, IndianRupee,
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { type Customer } from "../../../api/customers";
import { type PlanEnrollment } from "../../../api/plans";
import { type MembershipBenefitInfo } from "./customerHelpers";

export function LoyaltyProgramModal({
  open,
  onOpenChange,
  loyaltyCustomer,
  membershipBenefits,
  activeEnrollment,
  buyTier,
  setBuyTier,
  redeemPoints,
  setRedeemPoints,
  redeeming,
  onRedeem,
  onOpenMembershipPayment,
  showQuickActions = false,
  onSendOffer,
  onBookAppointment,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loyaltyCustomer: Customer | null;
  membershipBenefits: Record<string, MembershipBenefitInfo>;
  activeEnrollment: PlanEnrollment | null;
  buyTier: string;
  setBuyTier: (tier: string) => void;
  redeemPoints: number;
  setRedeemPoints: (pts: number) => void;
  redeeming: boolean;
  onRedeem: () => void;
  onOpenMembershipPayment: () => void;
  /** List view includes Send Offer / Book buttons; detail view omits them. */
  showQuickActions?: boolean;
  onSendOffer?: () => void;
  onBookAppointment?: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Crown className="h-6 w-6 text-[#d4af37]" />
            {loyaltyCustomer?.membershipTier.toUpperCase()} Loyalty — {loyaltyCustomer?.name}
          </DialogTitle>
        </DialogHeader>
        {loyaltyCustomer &&
          (() => {
            const b = membershipBenefits[loyaltyCustomer.membershipTier];
            return (
              <div className="space-y-4">
                <div className="bg-gradient-to-br from-[#1a1a1a] to-[#2d2d2d] rounded-xl p-5 text-white">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-sm text-[#d4af37]">Available Points</p>
                      <p className="text-4xl font-bold text-[#d4af37]">{loyaltyCustomer.loyaltyPoints}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-400">Multiplier</p>
                      <p className="text-2xl font-bold">{b.pointsMultiplier}×</p>
                      <p className="text-xs text-gray-400">on all spends</p>
                    </div>
                  </div>
                  <div className="w-full bg-white/20 rounded-full h-2 mb-1">
                    <div
                      className="bg-[#d4af37] h-2 rounded-full"
                      style={{ width: `${Math.min((loyaltyCustomer.loyaltyPoints / 5000) * 100, 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-400">
                    {Math.max(0, 5000 - loyaltyCustomer.loyaltyPoints)} pts to next tier
                  </p>
                </div>
                <div>
                  <p className="font-semibold text-sm mb-2 flex items-center gap-1">
                    <Sparkles className="h-4 w-4 text-[#d4af37]" />
                    Member Benefits
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {b.benefits.map((bx) => (
                      <div key={bx} className="flex items-start gap-2 bg-amber-50 rounded-lg p-2">
                        <CheckCircle className="h-4 w-4 text-[#D4AF37] shrink-0 mt-0.5" />
                        <p className="text-xs">{bx}</p>
                      </div>
                    ))}
                  </div>
                </div>
                {b.freeServices.length > 0 && (
                  <div>
                    <p className="font-semibold text-sm mb-2">Complimentary Services</p>
                    <div className="flex gap-2 flex-wrap">
                      {b.freeServices.map((fs) => (
                        <Badge key={fs} className="bg-[#D4AF37]/10 text-[#9a7d20] border-[#D4AF37]/25">
                          {fs} — FREE
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {b.discount > 0 && (
                  <div className="bg-[#FFFBEB] border border-[#D4AF37]/20 rounded-xl p-3">
                    <p className="text-sm font-semibold text-[#9a7d20]">
                      {b.discount}% discount applied automatically on all services
                    </p>
                  </div>
                )}
                {activeEnrollment && (
                  <div className="rounded-xl border border-[#D4AF37]/30 bg-[#111118] p-4 text-white">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#d4af37]">Payment recorded</p>
                    <p className="mt-1 text-sm font-semibold capitalize">{activeEnrollment.packageName} membership</p>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-[12px]">
                      <div>
                        <p className="text-white/40">Amount paid</p>
                        <p className="font-bold text-[#d4af37]">
                          ₹{activeEnrollment.amountPaid.toLocaleString("en-IN")}
                        </p>
                      </div>
                      <div>
                        <p className="text-white/40">Valid until</p>
                        <p className="font-semibold">
                          {new Date(activeEnrollment.expiry).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </p>
                      </div>
                    </div>
                    <p className="mt-2 text-[11px] text-white/40">Also listed under Finance → Membership / Packages</p>
                  </div>
                )}
                <div className="bg-gradient-to-br from-amber-50 to-white border-2 border-[#d4af37]/30 rounded-xl p-4">
                  <p className="font-semibold text-sm mb-2 flex items-center gap-1">
                    <Crown className="h-4 w-4 text-[#d4af37]" />
                    Buy / Upgrade Membership
                  </p>
                  <p className="text-xs text-muted-foreground mb-3">
                    Collect payment at the counter first, then confirm below. Activation records the amount as paid.
                  </p>
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    {Object.entries(membershipBenefits)
                      .filter(([k]) => k !== "basic")
                      .map(([tier, info]) => (
                        <button
                          key={tier}
                          onClick={() => setBuyTier(tier)}
                          className={`text-left rounded-lg border-2 p-2 transition-all ${
                            buyTier === tier ? "border-[#d4af37] bg-[#d4af37]/10" : "border-black/[0.08] hover:border-[#d4af37]/40"
                          } ${loyaltyCustomer.membershipTier === tier ? "opacity-60" : ""}`}
                          disabled={loyaltyCustomer.membershipTier === tier}
                        >
                          <p className="text-xs font-semibold capitalize">
                            {tier}
                            {loyaltyCustomer.membershipTier === tier ? " (Current)" : ""}
                          </p>
                          <p className="text-sm font-bold text-[#1a1a1a]">
                            ₹{info.price.toLocaleString("en-IN")}
                            <span className="text-[10px] text-muted-foreground font-normal"> / {info.durationLabel}</span>
                          </p>
                        </button>
                      ))}
                  </div>
                  <Button
                    className="w-full bg-gradient-to-r from-[#1a1a1a] to-[#2d2d2d]"
                    disabled={!buyTier || buyTier === loyaltyCustomer.membershipTier}
                    onClick={onOpenMembershipPayment}
                  >
                    <IndianRupee className="h-4 w-4 mr-1" />
                    {buyTier
                      ? `Collect ₹${membershipBenefits[buyTier]?.price.toLocaleString("en-IN")} & Confirm Payment`
                      : "Select a plan to purchase"}
                  </Button>
                </div>
                <div>
                  <Label className="font-semibold">Redeem Points (discounts only)</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      type="number"
                      placeholder="Points to redeem"
                      min={0}
                      max={loyaltyCustomer.loyaltyPoints}
                      value={redeemPoints || ""}
                      onChange={(e) => setRedeemPoints(Number(e.target.value))}
                      className="w-40"
                    />
                    <span className="flex items-center text-sm text-muted-foreground">
                      = ₹{Math.floor(redeemPoints / 10)} value
                    </span>
                    <Button
                      disabled={redeeming || redeemPoints <= 0 || redeemPoints > loyaltyCustomer.loyaltyPoints}
                      onClick={onRedeem}
                    >
                      Redeem
                    </Button>
                  </div>
                </div>
                {showQuickActions && (
                  <div className="flex gap-2">
                    <Button
                      className="flex-1 bg-[#121212] hover:bg-[#1a1a1a] text-[#D4AF37]"
                      onClick={onSendOffer}
                    >
                      <Send className="h-4 w-4 mr-1" />
                      Send Member Offer
                    </Button>
                    <Button variant="outline" className="flex-1" onClick={onBookAppointment}>
                      <Calendar className="h-4 w-4 mr-1" />
                      Book Appointment
                    </Button>
                  </div>
                )}
              </div>
            );
          })()}
      </DialogContent>
    </Dialog>
  );
}
