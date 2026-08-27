import { useState, useEffect } from "react";
import { Package, Plus, X } from "lucide-react";
import {
  createSalonPlan,
  type NamePreset,
  type PlanType,
  type SalonServiceOption,
} from "../../../../api/plans";
import { getApiErrorMessage } from "../../../../lib/api";
import { toast } from "../../../components/ui/hot-toast";
import { Dialog, DialogContent } from "../../../components/ui/dialog";
import { financeIconWrap } from "../finance-ui";
import { fmt } from "./helpers";

const NAME_PRESET_OPTIONS: { value: NamePreset; label: string }[] = [
  { value: "basic", label: "Basic" },
  { value: "silver", label: "Silver" },
  { value: "gold", label: "Gold" },
  { value: "platinum", label: "Platinum" },
  { value: "custom", label: "Custom" },
];

const EMPTY_PLAN_FORM = {
  namePreset: "gold" as NamePreset,
  customName: "",
  planType: "membership" as PlanType,
  price: "",
  walletAmount: "",
  validityDays: "365",
  serviceLimit: "",
  discountPercent: "",
  description: "",
  isActive: true,
  selectedServices: [] as string[],
};

export function CreatePlanModal({
  open,
  onClose,
  onCreated,
  services,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  services: SalonServiceOption[];
}) {
  const [form, setForm] = useState(EMPTY_PLAN_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) setForm(EMPTY_PLAN_FORM);
  }, [open]);

  if (!open) return null;

  const canSave =
    form.price &&
    Number(form.price) >= 0 &&
    form.validityDays &&
    Number(form.validityDays) > 0 &&
    (form.namePreset !== "custom" || form.customName.trim());

  const toggleService = (serviceId: string) => {
    setForm((prev) => ({
      ...prev,
      selectedServices: prev.selectedServices.includes(serviceId)
        ? prev.selectedServices.filter((id) => id !== serviceId)
        : [...prev.selectedServices, serviceId],
    }));
  };

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      await createSalonPlan({
        namePreset: form.namePreset,
        customName: form.namePreset === "custom" ? form.customName.trim() : undefined,
        planType: form.planType,
        price: Number(form.price),
        walletAmount: form.walletAmount ? Number(form.walletAmount) : null,
        validityDays: Number(form.validityDays),
        serviceLimit: form.serviceLimit ? Number(form.serviceLimit) : null,
        discountPercent: form.discountPercent ? Number(form.discountPercent) : null,
        description: form.description.trim() || null,
        isActive: form.isActive,
        includedServices: form.selectedServices.map((serviceId) => ({ serviceId, quantity: 1 })),
      });
      toast.success("Membership / Package plan created");
      onCreated();
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
      <DialogContent className="p-0 gap-0 overflow-hidden rounded-2xl w-[min(95vw,36rem)] max-w-none max-h-[92vh] flex flex-col [&>button:last-of-type]:hidden">
        <div className="bg-[#111118] px-6 py-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className={financeIconWrap}><Package className="h-4 w-4 text-[#d4af37]" /></div>
            <div>
              <p className="text-white font-bold text-[14px] leading-tight">Create Membership / Package</p>
              <p className="text-gray-500 text-[11px] mt-0.5">Define a new plan for your salon</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="h-8 w-8 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] flex items-center justify-center text-gray-400 hover:text-white transition-all">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-3.5 bg-[#faf8f2] overflow-y-auto flex-1">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Plan Name <span className="text-[#d4af37]">*</span></p>
              <select
                value={form.namePreset}
                onChange={(e) => setForm({ ...form, namePreset: e.target.value as NamePreset })}
                className={inputClass}
              >
                {NAME_PRESET_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Type <span className="text-[#d4af37]">*</span></p>
              <select
                value={form.planType}
                onChange={(e) => setForm({ ...form, planType: e.target.value as PlanType })}
                className={inputClass}
              >
                <option value="membership">Membership</option>
                <option value="package">Package</option>
              </select>
            </div>
          </div>

          {form.namePreset === "custom" && (
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Custom Name <span className="text-[#d4af37]">*</span></p>
              <input
                value={form.customName}
                onChange={(e) => setForm({ ...form, customName: e.target.value })}
                placeholder="e.g. Bridal Bliss Bundle"
                className={inputClass}
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Price (₹) <span className="text-[#d4af37]">*</span></p>
              <input type="number" min={0} value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="5000" className={inputClass} />
            </div>
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Wallet Amount (₹)</p>
              <input type="number" min={0} value={form.walletAmount} onChange={(e) => setForm({ ...form, walletAmount: e.target.value })} placeholder="Optional" className={inputClass} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Validity (days) <span className="text-[#d4af37]">*</span></p>
              <input type="number" min={1} value={form.validityDays} onChange={(e) => setForm({ ...form, validityDays: e.target.value })} className={inputClass} />
            </div>
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Service Limit</p>
              <input type="number" min={0} value={form.serviceLimit} onChange={(e) => setForm({ ...form, serviceLimit: e.target.value })} placeholder="Optional" className={inputClass} />
            </div>
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Discount (%)</p>
              <input type="number" min={0} max={100} value={form.discountPercent} onChange={(e) => setForm({ ...form, discountPercent: e.target.value })} placeholder="Optional" className={inputClass} />
            </div>
          </div>

          <div className="space-y-1.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Status</p>
            <select
              value={form.isActive ? "active" : "inactive"}
              onChange={(e) => setForm({ ...form, isActive: e.target.value === "active" })}
              className={inputClass}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Description</p>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={2}
              placeholder="Optional plan details..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white text-[13px] text-[#111118] outline-none focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/12 resize-none"
            />
          </div>

          <div className="space-y-1.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Included Services</p>
            <div className="max-h-36 overflow-y-auto rounded-xl border border-gray-200 bg-white p-2 space-y-1">
              {services.length === 0 ? (
                <p className="text-[12px] text-[#52525b] px-2 py-3 text-center">No services found in catalog</p>
              ) : services.map((svc) => (
                <label key={svc.id} className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-[#faf8f2] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.selectedServices.includes(svc.id)}
                    onChange={() => toggleService(svc.id)}
                    className="rounded border-gray-300 text-[#d4af37] focus:ring-[#d4af37]/30"
                  />
                  <span className="text-[12px] text-[#111118] flex-1">{svc.name}</span>
                  <span className="text-[10px] text-[#52525b]">{fmt(svc.price)}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 bg-white flex items-center justify-end gap-2 shrink-0">
          <button type="button" onClick={onClose} className="h-10 px-5 rounded-xl border border-gray-200 text-[13px] font-semibold text-gray-600 hover:bg-gray-50 transition-all">Cancel</button>
          <button type="button" onClick={handleSave} disabled={!canSave || saving}
            className="h-10 px-6 rounded-xl bg-gradient-to-r from-[#d4af37] to-[#b8962e] text-[13px] font-bold text-black disabled:opacity-40 transition-all flex items-center gap-2">
            <Plus className="h-4 w-4" /> {saving ? "Saving..." : "Create Plan"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
