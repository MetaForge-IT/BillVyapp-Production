import { useState } from "react";
import { Wallet, Phone, Calendar, IndianRupee, Plus, X, User } from "lucide-react";
import { useAdvances } from "../../../context/AdvancesContext";
import { toast } from "../../../components/ui/hot-toast";
import { Dialog, DialogContent } from "../../../components/ui/dialog";
import { financeIconWrap } from "../finance-ui";
import { fmt } from "./helpers";

export function CollectAdvanceModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { addAdvance } = useAdvances();
  const [customer, setCustomer] = useState("");
  const [phone, setPhone] = useState("");
  const [service, setService] = useState("");
  const [amount, setAmount] = useState("");
  const [bookedFor, setBookedFor] = useState("");

  if (!open) return null;

  const canSave = customer.trim() && phone.trim() && service.trim() && Number(amount) > 0 && bookedFor;

  function reset() {
    setCustomer(""); setPhone(""); setService(""); setAmount(""); setBookedFor("");
  }

  function handleSave() {
    if (!canSave) return;
    void addAdvance({
      customer: customer.trim(),
      phone: phone.trim(),
      service: service.trim(),
      amount: Number(amount),
      bookedFor,
    }).then((created) => {
      if (!created) return;
      toast.success("Advance collected", { description: `${fmt(Number(amount))} recorded for ${customer.trim()}` });
      reset();
      onClose();
    });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { reset(); onClose(); } }}>
      <DialogContent className="p-0 gap-0 overflow-hidden rounded-2xl w-[min(95vw,28rem)] max-w-none [&>button:last-of-type]:hidden">
        <div className="bg-[#111118] px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={financeIconWrap}><Wallet className="h-4 w-4 text-[#d4af37]" /></div>
            <div>
              <p className="text-white font-bold text-[14px] leading-tight">Collect Advance Payment</p>
              <p className="text-gray-500 text-[11px] mt-0.5">Record a deposit against a future booking</p>
            </div>
          </div>
          <button onClick={() => { reset(); onClose(); }} className="h-8 w-8 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] flex items-center justify-center text-gray-400 hover:text-white transition-all">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="px-6 py-5 space-y-3.5 bg-[#faf8f2]">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Customer Name <span className="text-[#d4af37]">*</span></p>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                <input value={customer} onChange={e => setCustomer(e.target.value)} placeholder="e.g. Ritu Sharma"
                  className="w-full h-10 pl-9 pr-3 rounded-xl border border-gray-200 bg-white text-[13px] text-[#111118] outline-none focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/12" />
              </div>
            </div>
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Phone <span className="text-[#d4af37]">*</span></p>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91 98765 43210"
                  className="w-full h-10 pl-9 pr-3 rounded-xl border border-gray-200 bg-white text-[13px] text-[#111118] outline-none focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/12" />
              </div>
            </div>
          </div>
          <div className="space-y-1.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Service Booked For <span className="text-[#d4af37]">*</span></p>
            <input value={service} onChange={e => setService(e.target.value)} placeholder="e.g. Bridal Makeup Package"
              className="w-full h-10 px-3.5 rounded-xl border border-gray-200 bg-white text-[13px] text-[#111118] outline-none focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/12" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Advance Amount (₹) <span className="text-[#d4af37]">*</span></p>
              <div className="relative">
                <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                <input type="number" min={1} value={amount} onChange={e => setAmount(e.target.value)} placeholder="5000"
                  className="w-full h-10 pl-9 pr-3 rounded-xl border border-gray-200 bg-white text-[13px] font-semibold text-[#111118] outline-none focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/12" />
              </div>
            </div>
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Booked For <span className="text-[#d4af37]">*</span></p>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
                <input type="date" value={bookedFor} onChange={e => setBookedFor(e.target.value)}
                  className="w-full h-10 pl-9 pr-3 rounded-xl border border-gray-200 bg-white text-[13px] text-[#111118] outline-none focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/12" />
              </div>
            </div>
          </div>
          <p className="text-[10.5px] text-gray-400 flex items-center gap-1.5 pt-1">
            <IndianRupee className="h-3 w-3 shrink-0" /> Recorded as a CAPITAL transaction — cash-in-hand, not revenue until applied to a bill.
          </p>
        </div>
        <div className="px-6 py-4 border-t border-gray-100 bg-white flex items-center justify-end gap-2">
          <button onClick={() => { reset(); onClose(); }} className="h-10 px-5 rounded-xl border border-gray-200 text-[13px] font-semibold text-gray-600 hover:bg-gray-50 transition-all">Cancel</button>
          <button onClick={handleSave} disabled={!canSave}
            className="h-10 px-6 rounded-xl bg-gradient-to-r from-[#d4af37] to-[#b8962e] text-[13px] font-bold text-black disabled:opacity-40 transition-all flex items-center gap-2">
            <Plus className="h-4 w-4" /> Collect Advance
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
