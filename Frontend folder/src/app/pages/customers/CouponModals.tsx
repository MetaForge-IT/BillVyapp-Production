import { Cake, Gift } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import type { Coupon } from "../../context/CouponsContext";
import type { Customer } from "../../../api/customers";
import { SendCouponModal } from "./CustomersCommModals";

export function CouponModals({
  singleCouponOpen,
  setSingleCouponOpen,
  couponTarget,
  selectedCouponId,
  setSelectedCouponId,
  coupons,
  onSendSingle,
  bulkCouponOpen,
  setBulkCouponOpen,
  selectedCount,
  recipientNames,
  bulkCouponId,
  setBulkCouponId,
  onSendBulk,
  bdayCouponOpen,
  setBdayCouponOpen,
  todayBirthdays,
  onSendBirthdayCoupons,
}: {
  singleCouponOpen: boolean;
  setSingleCouponOpen: (open: boolean) => void;
  couponTarget: Customer | null;
  selectedCouponId: string;
  setSelectedCouponId: (id: string) => void;
  coupons: Coupon[];
  onSendSingle: (channel: "whatsapp" | "sms") => void;
  bulkCouponOpen: boolean;
  setBulkCouponOpen: (open: boolean) => void;
  selectedCount: number;
  recipientNames: string[];
  bulkCouponId: string;
  setBulkCouponId: (id: string) => void;
  onSendBulk: (channel: "whatsapp" | "sms") => void;
  bdayCouponOpen: boolean;
  setBdayCouponOpen: (open: boolean) => void;
  todayBirthdays: Customer[];
  onSendBirthdayCoupons: () => void;
}) {
  return (
    <>
      <SendCouponModal
        open={singleCouponOpen}
        onOpenChange={setSingleCouponOpen}
        title="Send Coupon"
        subtitle={couponTarget ? `Deliver to ${couponTarget.name}` : undefined}
        customer={couponTarget}
        selectedCouponId={selectedCouponId}
        onSelectCoupon={setSelectedCouponId}
        coupons={coupons}
        onSend={onSendSingle}
      />

      <SendCouponModal
        open={bulkCouponOpen}
        onOpenChange={setBulkCouponOpen}
        title="Send Coupon"
        subtitle={`Bulk send to ${selectedCount} selected`}
        customer={null}
        recipientNames={recipientNames}
        selectedCouponId={bulkCouponId}
        onSelectCoupon={setBulkCouponId}
        coupons={coupons}
        onSend={onSendBulk}
      />

      <Dialog open={bdayCouponOpen} onOpenChange={setBdayCouponOpen}>
        <DialogContent className="gap-0 overflow-hidden rounded-2xl border-black/[0.08] p-0 sm:max-w-md">
          <div className="relative border-b border-black/[0.06] bg-[#111118] px-6 py-5">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#D4AF37]/70 to-transparent" />
            <DialogHeader className="space-y-1 text-left">
              <DialogTitle className="flex items-center gap-2.5 text-[16px] font-bold text-white">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#D4AF37]/25 bg-[#D4AF37]/15">
                  <Cake className="h-4 w-4 text-[#D4AF37]" />
                </div>
                Birthday Coupons
              </DialogTitle>
              <p className="text-[12px] text-white/50">Celebrate customers with a special offer today</p>
            </DialogHeader>
          </div>
          <div className="space-y-4 bg-[#f4f2ed] p-6">
            <p className="text-[13px] text-[#3f3f46]">
              {todayBirthdays.length} customer{todayBirthdays.length !== 1 ? "s have" : " has"} a birthday today.
            </p>
            <div className="max-h-40 space-y-2 overflow-y-auto rounded-xl border border-black/[0.06] bg-white p-3">
              {todayBirthdays.map((c) => (
                <div key={c.id} className="flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-[#faf9f7]">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#D4AF37] to-[#C9A227] text-[10px] font-bold text-[#111118]">
                    {c.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .slice(0, 2)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12px] font-semibold text-[#111118]">{c.name}</p>
                    <p className="text-[10px] text-[#52525b]">
                      {c.phone} · {c.membershipTier}
                    </p>
                  </div>
                  <Gift className="h-3.5 w-3.5 shrink-0 text-[#D4AF37]" />
                </div>
              ))}
              {todayBirthdays.length === 0 && (
                <p className="py-4 text-center text-[12px] text-[#52525b]">No birthdays today</p>
              )}
            </div>
            <div className="flex gap-2.5 pt-1">
              <Button
                className="h-11 flex-1 rounded-xl bg-[#111118] text-[13px] font-bold text-[#D4AF37] hover:bg-[#1e1e1e] disabled:opacity-40"
                onClick={onSendBirthdayCoupons}
                disabled={todayBirthdays.length === 0}
              >
                <Gift className="mr-2 h-4 w-4" />
                Send to all
              </Button>
              <Button
                variant="outline"
                className="h-11 rounded-xl border-black/[0.1] bg-white text-[13px] font-semibold text-[#3f3f46] hover:border-[#D4AF37]/30"
                onClick={() => setBdayCouponOpen(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
