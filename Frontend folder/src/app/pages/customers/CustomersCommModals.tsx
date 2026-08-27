import { Gift, MessageSquare, Phone, Send, Star, Crown, Tag, Users, AlertCircle } from "lucide-react";
import { toast } from "../../components/ui/hot-toast";
import type { Coupon } from "../../context/CouponsContext";
import type { Customer } from "../../../api/customers";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { cn } from "../../components/ui/utils";

const CUSTOMER_TIER_BADGE: Record<string, string> = {
  platinum: "bg-[#111118] text-[#D4AF37] border-transparent",
  gold: "bg-[#D4AF37]/15 text-[#B8962E] border-[#D4AF37]/20",
  silver: "bg-black/[0.06] text-[#3f3f46] border-black/[0.08]",
  basic: "bg-black/[0.04] text-[#52525b] border-black/[0.05]",
};

function customerInitials(name: string) {
  return name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
}

const NOTIFY_TEMPLATES = [
  {
    label: "Appointment",
    msg: (c: Customer) =>
      `Hi ${c.name}, your appointment at BillVyapp is coming up! Reply to confirm.`,
  },
  {
    label: "Loyalty offer",
    msg: (c: Customer) =>
      `Dear ${c.name}, you have ${c.loyaltyPoints} loyalty points! Redeem them on your next visit at BillVyapp.`,
  },
  {
    label: "Birthday",
    msg: (c: Customer) =>
      `Happy Birthday ${c.name}! Enjoy a special 20% discount on your next visit at BillVyapp.`,
  },
  {
    label: "Thank you",
    msg: (c: Customer) =>
      `Thank you for visiting BillVyapp, ${c.name}! We hope you loved your experience. Book again anytime.`,
  },
] as const;

function CouponPreview({ coupon }: { coupon: Coupon | undefined }) {
  if (!coupon) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-black/[0.1] bg-[#faf9f7] px-4 py-10 text-center">
        <Gift className="mb-2 h-8 w-8 text-[#D4AF37]/35" />
        <p className="text-[13px] font-medium text-[#52525b]">Select a coupon to preview</p>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-xl border border-[#D4AF37]/25 bg-[#111118] p-5 text-center shadow-[0_8px_24px_rgba(17,17,24,0.12)]">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#D4AF37]/70 to-transparent" />
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#D4AF37]/80">BillVyapp</p>
      <p className="mt-3 font-mono text-3xl font-bold tracking-[0.2em] text-white">{coupon.code}</p>
      <p className="mt-2 text-xl font-bold text-[#D4AF37]">
        {coupon.type === "percentage" ? `${coupon.value}% OFF` : `₹${coupon.value} OFF`}
      </p>
      <p className="mt-2 text-[11px] text-white/45">
        Valid till {coupon.validTill} · {coupon.description || "All services"}
      </p>
    </div>
  );
}

export function NotifyCustomerModal({
  open,
  onOpenChange,
  target,
  message,
  onMessageChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: Customer | null;
  message: string;
  onMessageChange: (msg: string) => void;
}) {
  const send = (channel: "whatsapp" | "sms") => {
    if (!target?.phone) return;
    toast.success(channel === "whatsapp" ? "WhatsApp sent" : "SMS sent", {
      description: `Message delivered to ${target.name}`,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden rounded-2xl border-black/[0.08] p-0 sm:max-w-md">
        <div className="relative border-b border-black/[0.06] bg-[#111118] px-6 py-5">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#D4AF37]/70 to-transparent" />
          <DialogHeader className="space-y-1 text-left">
            <DialogTitle className="flex items-center gap-2.5 text-[16px] font-bold text-white">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#D4AF37]/25 bg-[#D4AF37]/15">
                <MessageSquare className="h-4 w-4 text-[#D4AF37]" />
              </div>
              Notify Customer
            </DialogTitle>
            <p className="text-[12px] text-white/50">Send a WhatsApp or SMS from BillVyapp</p>
          </DialogHeader>
        </div>

        {target && (
          <div className="space-y-4 bg-[#f4f2ed] p-6">
            <div className="flex items-center gap-3 rounded-xl border border-[#D4AF37]/25 bg-[#FFFBEB] p-3.5 shadow-[0_2px_12px_rgba(212,175,55,0.08)]">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#C9A227] text-[12px] font-bold text-[#111118]">
                {customerInitials(target.name)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-bold text-[#111118]">{target.name}</p>
                <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-[#52525b]">
                  <Phone className="h-3 w-3 shrink-0 text-[#D4AF37]" />
                  {target.phone || "No phone on file"}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <Badge className={cn("border text-[9px] font-bold capitalize", CUSTOMER_TIER_BADGE[target.membershipTier] ?? CUSTOMER_TIER_BADGE.basic)}>
                    <Crown className="mr-1 h-2.5 w-2.5" />
                    {target.membershipTier}
                  </Badge>
                  <Badge className="border-[#D4AF37]/20 bg-[#D4AF37]/10 text-[9px] font-bold text-[#B8962E]">
                    <Star className="mr-1 h-2.5 w-2.5 fill-current" />
                    {target.loyaltyPoints} pts
                  </Badge>
                </div>
              </div>
            </div>

            <div>
              <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.12em] text-[#52525b]">Quick templates</p>
              <div className="flex flex-wrap gap-1.5">
                {NOTIFY_TEMPLATES.map(t => (
                  <button
                    key={t.label}
                    type="button"
                    onClick={() => onMessageChange(t.msg(target))}
                    className="rounded-lg border border-black/[0.08] bg-white px-2.5 py-1.5 text-[11px] font-semibold text-[#3f3f46] transition-all hover:border-[#D4AF37]/35 hover:bg-[#FFFBEB] hover:text-[#111118]"
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <Label className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#52525b]">Message</Label>
                <span className="text-[10px] tabular-nums text-[#c0c0c0]">{message.length}/320</span>
              </div>
              <Textarea
                rows={4}
                maxLength={320}
                value={message}
                onChange={e => onMessageChange(e.target.value)}
                placeholder="Write your message…"
                className="resize-none rounded-xl border-black/[0.08] bg-white text-[13px] leading-relaxed text-[#111118] placeholder:text-[#c0c0c0] focus:border-[#D4AF37]/40 focus:ring-[#D4AF37]/10"
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <Button
                disabled={!message.trim() || !target.phone}
                className="h-11 rounded-xl bg-[#111118] text-[13px] font-bold text-[#D4AF37] hover:bg-[#1e1e1e] disabled:opacity-40"
                onClick={() => send("whatsapp")}
              >
                <Send className="mr-2 h-4 w-4" />
                WhatsApp
              </Button>
              <Button
                variant="outline"
                disabled={!message.trim() || !target.phone}
                className="h-11 rounded-xl border-black/[0.1] bg-white text-[13px] font-semibold text-[#111118] hover:border-[#D4AF37]/35 hover:bg-[#FFFBEB] disabled:opacity-40"
                onClick={() => send("sms")}
              >
                <Phone className="mr-2 h-4 w-4 text-[#D4AF37]" />
                Send SMS
              </Button>
            </div>

            {!target.phone && (
              <p className="flex items-center justify-center gap-1.5 text-[11px] text-[#52525b]">
                <AlertCircle className="h-3.5 w-3.5 shrink-0 text-[#D4AF37]" />
                Add a phone number to send notifications
              </p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function SendCouponModal({
  open,
  onOpenChange,
  title,
  subtitle,
  customer,
  recipientNames,
  selectedCouponId,
  onSelectCoupon,
  coupons,
  onSend,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  subtitle?: string;
  customer: Customer | null;
  recipientNames?: string[];
  selectedCouponId: string;
  onSelectCoupon: (id: string) => void;
  coupons: Coupon[];
  onSend: (channel: "whatsapp" | "sms") => void;
}) {
  const activeCoupons = coupons.filter(c => c.status === "active" && new Date(c.validTill) >= new Date());
  const selected = activeCoupons.find(c => c.id === selectedCouponId);
  const isBulk = Boolean(recipientNames?.length);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden rounded-2xl border-black/[0.08] p-0 sm:max-w-md">
        <div className="relative border-b border-black/[0.06] bg-[#111118] px-6 py-5">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#D4AF37]/70 to-transparent" />
          <DialogHeader className="space-y-1 text-left">
            <DialogTitle className="flex items-center gap-2.5 text-[16px] font-bold text-white">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#D4AF37]/25 bg-[#D4AF37]/15">
                <Gift className="h-4 w-4 text-[#D4AF37]" />
              </div>
              {title}
            </DialogTitle>
            {subtitle && <p className="text-[12px] text-white/50">{subtitle}</p>}
          </DialogHeader>
        </div>

        <div className="space-y-4 bg-[#f4f2ed] p-6">
          {customer && !isBulk && (
            <div className="flex items-center gap-3 rounded-xl border border-black/[0.06] bg-white p-3.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#C9A227] text-[11px] font-bold text-[#111118]">
                {customerInitials(customer.name)}
              </div>
              <div className="min-w-0">
                <p className="truncate text-[13px] font-bold text-[#111118]">{customer.name}</p>
                <p className="text-[11px] text-[#52525b]">{customer.phone}</p>
              </div>
            </div>
          )}

          {isBulk && recipientNames && (
            <div className="rounded-xl border border-[#D4AF37]/20 bg-[#FFFBEB] p-3.5">
              <div className="mb-1.5 flex items-center gap-2">
                <Users className="h-3.5 w-3.5 text-[#D4AF37]" />
                <p className="text-[11px] font-bold text-[#B8962E]">
                  Sending to {recipientNames.length} customer{recipientNames.length !== 1 ? "s" : ""}
                </p>
              </div>
              <p className="line-clamp-2 text-[11px] text-[#52525b]">{recipientNames.join(", ")}</p>
            </div>
          )}

          <div>
            <Label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.12em] text-[#52525b]">
              Select coupon
            </Label>
            <Select value={selectedCouponId} onValueChange={onSelectCoupon}>
              <SelectTrigger className="h-11 rounded-xl border-black/[0.08] bg-white focus:border-[#D4AF37]/40">
                <SelectValue placeholder="Choose a coupon" />
              </SelectTrigger>
              <SelectContent>
                {activeCoupons.map(c => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.code} — {c.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="mt-1.5 flex items-center gap-1 text-[10px] text-[#52525b]">
              <Tag className="h-3 w-3 text-[#D4AF37]" />
              Manage coupons in Services → Coupons
            </p>
          </div>

          <CouponPreview coupon={selected} />

          <div className="grid grid-cols-2 gap-2.5 pt-1">
            <Button
              disabled={!selectedCouponId}
              className="h-11 rounded-xl bg-[#111118] text-[13px] font-bold text-[#D4AF37] hover:bg-[#1e1e1e] disabled:opacity-40"
              onClick={() => onSend("whatsapp")}
            >
              <Send className="mr-2 h-4 w-4" />
              {isBulk ? "WhatsApp all" : "WhatsApp"}
            </Button>
            <Button
              variant="outline"
              disabled={!selectedCouponId}
              className="h-11 rounded-xl border-black/[0.1] bg-white text-[13px] font-semibold text-[#111118] hover:border-[#D4AF37]/35 hover:bg-[#FFFBEB] disabled:opacity-40"
              onClick={() => onSend("sms")}
            >
              <Phone className="mr-2 h-4 w-4 text-[#D4AF37]" />
              {isBulk ? "SMS all" : "Send SMS"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
