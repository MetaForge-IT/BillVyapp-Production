import { cn } from "../../../components/ui/utils";
import { Button } from "../../../components/ui/button";
import { Badge } from "../../../components/ui/badge";
import { Label } from "../../../components/ui/label";
import { Textarea } from "../../../components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../../components/ui/dialog";
import { MessageSquare, Phone, Send, AlertCircle } from "lucide-react";
import { toast } from "../../../components/ui/hot-toast";
import { customerInitials } from "./appointmentHelpers";
import { NOTIFY_TEMPLATES } from "./notifyTemplates";
import type { NotifyTarget } from "./boardTypes";

export type NotifyCustomerDialogProps = {
  notifyOpen: boolean;
  setNotifyOpen: (open: boolean) => void;
  notifyTarget: NotifyTarget | null;
  notifyMsg: string;
  setNotifyMsg: (msg: string) => void;
};

export function NotifyCustomerDialog({
  notifyOpen,
  setNotifyOpen,
  notifyTarget,
  notifyMsg,
  setNotifyMsg,
}: NotifyCustomerDialogProps) {
  return (
    <Dialog open={notifyOpen} onOpenChange={setNotifyOpen}>
      <DialogContent aria-describedby={undefined} className="gap-0 overflow-hidden rounded-2xl border-black/[0.08] p-0 sm:max-w-md">
        <div className="relative border-b border-black/[0.06] bg-[#111118] px-6 py-5">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#D4AF37]/70 to-transparent" />
          <DialogHeader className="space-y-1 text-left">
            <DialogTitle className="flex items-center gap-2.5 text-[16px] font-bold text-white">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#D4AF37]/25 bg-[#D4AF37]/15">
                <MessageSquare className="h-4 w-4 text-[#D4AF37]" />
              </div>
              {notifyTarget?.context === "staff" ? "Notify Staff" : "Notify Customer"}
            </DialogTitle>
            <p className="text-[12px] text-white/50">
              Send a WhatsApp or SMS message via BillVyapp
            </p>
          </DialogHeader>
        </div>

        {notifyTarget && (
          <div className="space-y-4 bg-[#f4f2ed] p-6">
            {/* Recipient card */}
            <div className="flex items-center gap-3 rounded-xl border border-[#D4AF37]/25 bg-[#FFFBEB] p-3.5 shadow-[0_2px_12px_rgba(212,175,55,0.08)]">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#C9A227] text-[12px] font-bold text-[#111118]">
                {customerInitials(notifyTarget.name)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-bold text-[#111118]">{notifyTarget.name}</p>
                <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-[#9a9a9a]">
                  <Phone className="h-3 w-3 shrink-0 text-[#D4AF37]" />
                  {notifyTarget.phone || "No phone number on file"}
                </p>
              </div>
              <Badge className={cn(
                "shrink-0 border text-[9px] font-bold",
                notifyTarget.context === "staff"
                  ? "border-black/[0.08] bg-black/[0.06] text-[#6b6b6b]"
                  : "border-[#D4AF37]/25 bg-[#D4AF37]/10 text-[#B8962E]",
              )}>
                {notifyTarget.context === "staff" ? "Staff" : "Customer"}
              </Badge>
            </div>

            {/* Quick templates */}
            {notifyTarget.context === "customer" && (
              <div>
                <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.12em] text-[#9a9a9a]">Quick templates</p>
                <div className="flex flex-wrap gap-1.5">
                  {NOTIFY_TEMPLATES.map(t => {
                    const active = notifyMsg === t.text(notifyTarget.name);
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setNotifyMsg(t.text(notifyTarget.name))}
                        className={cn(
                          "rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition-all",
                          active
                            ? "border-[#D4AF37]/50 bg-[#111118] text-[#D4AF37] shadow-sm"
                            : "border-black/[0.08] bg-white text-[#6b6b6b] hover:border-[#D4AF37]/35 hover:bg-[#FFFBEB] hover:text-[#111118]",
                        )}
                      >
                        {t.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Message */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <Label className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#9a9a9a]">Message</Label>
                <span className={cn(
                  "text-[10px] tabular-nums font-semibold",
                  notifyMsg.length > 280 ? "text-[#E07A5F]" : "text-[#c0c0c0]",
                )}>
                  {notifyMsg.length}/320
                </span>
              </div>
              <Textarea
                rows={4}
                maxLength={320}
                value={notifyMsg}
                onChange={e => setNotifyMsg(e.target.value)}
                placeholder="Write your message…"
                className="resize-none rounded-xl border-black/[0.08] bg-white text-[13px] leading-relaxed text-[#111118] placeholder:text-[#c0c0c0] focus:border-[#D4AF37]/40 focus:ring-[#D4AF37]/10"
              />
            </div>

            {/* Live preview — chat-style bubble */}
            {notifyMsg.trim() && (
              <div>
                <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.12em] text-[#9a9a9a]">Preview</p>
                <div className="rounded-xl bg-[#e9f8ef] p-3">
                  <div className="ml-auto max-w-[85%] rounded-2xl rounded-tr-sm bg-white px-3.5 py-2.5 shadow-sm">
                    <p className="whitespace-pre-wrap text-[12.5px] leading-relaxed text-[#111118]">{notifyMsg}</p>
                    <p className="mt-1 text-right text-[9px] text-[#9a9a9a]">Now</p>
                  </div>
                </div>
              </div>
            )}

            {/* Send actions */}
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <Button
                disabled={!notifyMsg.trim() || !notifyTarget.phone}
                className="h-11 rounded-xl bg-[#111118] text-[13px] font-bold text-[#D4AF37] hover:bg-[#1e1e1e] disabled:opacity-40"
                onClick={() => {
                  toast.success("WhatsApp sent", { description: `Message delivered to ${notifyTarget.name}` });
                  setNotifyOpen(false);
                }}
              >
                <Send className="mr-2 h-4 w-4" />
                WhatsApp
              </Button>
              <Button
                variant="outline"
                disabled={!notifyMsg.trim() || !notifyTarget.phone}
                className="h-11 rounded-xl border-black/[0.1] bg-white text-[13px] font-semibold text-[#111118] hover:border-[#D4AF37]/35 hover:bg-[#FFFBEB] disabled:opacity-40"
                onClick={() => {
                  toast.success("SMS sent", { description: `Message delivered to ${notifyTarget.name}` });
                  setNotifyOpen(false);
                }}
              >
                <Phone className="mr-2 h-4 w-4 text-[#D4AF37]" />
                Send SMS
              </Button>
            </div>

            {!notifyTarget.phone && (
              <p className="flex items-center gap-1.5 text-center text-[11px] text-[#9a9a9a]">
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
