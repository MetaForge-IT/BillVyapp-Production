import { useState, useEffect } from "react";
import { User, X } from "lucide-react";
import {
  enrollCustomerInPlan,
  type SalonPlan,
  type CustomerOption,
} from "../../../../api/plans";
import { getApiErrorMessage } from "../../../../lib/api";
import { toast } from "../../../components/ui/hot-toast";
import { Dialog, DialogContent } from "../../../components/ui/dialog";
import { financeIconWrap } from "../finance-ui";
import { fmt } from "./helpers";

export function AssignPlanModal({
  open,
  onClose,
  onAssigned,
  plans,
  customers,
}: {
  open: boolean;
  onClose: () => void;
  onAssigned: () => void;
  plans: SalonPlan[];
  customers: CustomerOption[];
}) {
  const [customerId, setCustomerId] = useState("");
  const [planId, setPlanId] = useState("");
  const [amountPaid, setAmountPaid] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) {
      setCustomerId("");
      setPlanId("");
      setAmountPaid("");
    }
  }, [open]);

  const selectedPlan = plans.find((p) => p.id === planId);
  const canSave = customerId && planId;

  const handleAssign = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      await enrollCustomerInPlan({
        customerId,
        planId,
        amountPaid: amountPaid ? Number(amountPaid) : selectedPlan?.price,
      });
      toast.success("Membership / Package assigned to customer");
      onAssigned();
      onClose();
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    "w-full h-10 px-3.5 rounded-xl border border-gray-200 bg-white text-[13px] text-[#111118] outline-none focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/12";

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="p-0 gap-0 overflow-hidden rounded-2xl w-[min(95vw,28rem)] max-w-none [&>button:last-of-type]:hidden">
        <div className="bg-[#111118] px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={financeIconWrap}><User className="h-4 w-4 text-[#d4af37]" /></div>
            <div>
              <p className="text-white font-bold text-[14px] leading-tight">Assign to Customer</p>
              <p className="text-gray-500 text-[11px] mt-0.5">Purchase & enroll a customer in a plan</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="h-8 w-8 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] flex items-center justify-center text-gray-400 hover:text-white transition-all">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="px-6 py-5 space-y-3.5 bg-[#faf8f2]">
          <div className="space-y-1.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Customer <span className="text-[#d4af37]">*</span></p>
            <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} className={inputClass}>
              <option value="">Select customer</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.fullName} · {c.phone}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Plan <span className="text-[#d4af37]">*</span></p>
            <select value={planId} onChange={(e) => { setPlanId(e.target.value); setAmountPaid(""); }} className={inputClass}>
              <option value="">Select plan</option>
              {plans.filter((p) => p.isActive).map((p) => (
                <option key={p.id} value={p.id}>{p.name} ({p.planType}) · {fmt(p.price)}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Amount Paid (₹)</p>
            <input
              type="number"
              min={0}
              value={amountPaid}
              onChange={(e) => setAmountPaid(e.target.value)}
              placeholder={selectedPlan ? String(selectedPlan.price) : "Plan price"}
              className={inputClass}
            />
          </div>
        </div>
        <div className="px-6 py-4 border-t border-gray-100 bg-white flex items-center justify-end gap-2">
          <button type="button" onClick={onClose} className="h-10 px-5 rounded-xl border border-gray-200 text-[13px] font-semibold text-gray-600 hover:bg-gray-50 transition-all">Cancel</button>
          <button type="button" onClick={handleAssign} disabled={!canSave || saving}
            className="h-10 px-6 rounded-xl bg-gradient-to-r from-[#d4af37] to-[#b8962e] text-[13px] font-bold text-black disabled:opacity-40 transition-all">
            {saving ? "Assigning..." : "Assign Plan"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
