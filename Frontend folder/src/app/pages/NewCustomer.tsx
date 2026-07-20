import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { motion } from "framer-motion";
import {
  ArrowLeft, UserPlus, Phone, Mail, User, MapPin, FileText,
  Calendar, Crown, CheckCircle2, Sparkles, Star,
} from "lucide-react";
import { createCustomer } from "../../api/customers";
import { getApiErrorMessage } from "../../lib/api";
import { clearFormDraft, readFormDraft, writeFormDraft } from "../../lib/formDraft";
import { toast } from "sonner";

const NEW_CUSTOMER_DRAFT_KEY = "new-customer";

const EMPTY_CUSTOMER_FORM = {
  name: "", phone: "", email: "", gender: "",
  birthday: "", membershipTier: "basic", address: "", notes: "",
};

const TIERS = [
  { value: "basic",    icon: "🔵", label: "Basic",    sub: "Entry level",    ring: "ring-blue-400",   border: "border-blue-400",   bg: "bg-blue-50",    text: "text-blue-600"   },
  { value: "silver",   icon: "🥈", label: "Silver",   sub: "Regular member", ring: "ring-gray-400",   border: "border-gray-400",   bg: "bg-gray-50",    text: "text-gray-600"   },
  { value: "gold",     icon: "🥇", label: "Gold",     sub: "Loyal customer", ring: "ring-[#d4af37]",  border: "border-[#d4af37]",  bg: "bg-[#fdf9ed]",  text: "text-[#b8962e]"  },
  { value: "platinum", icon: "👑", label: "Platinum", sub: "Top tier VIP",   ring: "ring-purple-400", border: "border-purple-400", bg: "bg-purple-50",  text: "text-purple-700" },
];

const GENDERS = [
  { value: "female", label: "Female", icon: "♀" },
  { value: "male",   label: "Male",   icon: "♂" },
  { value: "other",  label: "Other",  icon: "⚧" },
];

const fade = (i = 0) => ({
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0, transition: { delay: i * 0.07, duration: 0.45, ease: [0.22, 1, 0.36, 1] } },
});

function Field({ label, required, optional, children }: { label: string; required?: boolean; optional?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[12px] font-semibold text-gray-500 tracking-wide">
        {label}
        {required && <span className="text-red-400 ml-0.5">*</span>}
        {optional && <span className="text-gray-400 font-normal ml-1">(optional)</span>}
      </label>
      {children}
    </div>
  );
}

const inputCls = "w-full h-11 px-4 rounded-xl border border-gray-200 bg-white text-sm text-gray-800 placeholder:text-gray-400 outline-none transition-all focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/15 focus:bg-white";

export function NewCustomer() {
  const navigate = useNavigate();
  const [form, setForm] = useState(() => readFormDraft(NEW_CUSTOMER_DRAFT_KEY, EMPTY_CUSTOMER_FORM));

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    writeFormDraft(NEW_CUSTOMER_DRAFT_KEY, form);
  }, [form]);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));
  const canSubmit = form.name.trim() && form.phone.trim() && !submitting;
  const initials = form.name.trim()
    ? form.name.trim().split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()
    : null;

  const selectedTier = TIERS.find(t => t.value === form.membershipTier)!;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await createCustomer({
        fullName: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim() || undefined,
        gender: (form.gender as "male" | "female" | "other") || undefined,
        dateOfBirth: form.birthday || undefined,
        address: form.address.trim() || undefined,
        notes: form.notes.trim() || undefined,
        status: "active",
      });
      clearFormDraft(NEW_CUSTOMER_DRAFT_KEY);
      toast.success("Customer added successfully");
      navigate("/customers");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to add customer"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f2ed]">

      {/* ── Hero Banner ── */}
      <div className="bg-[#111118] border-b border-white/5">
        <div className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="h-9 w-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors shrink-0 group"
            >
              <ArrowLeft className="h-4 w-4 text-white/70 group-hover:-translate-x-0.5 transition-transform" />
            </button>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-[#d4af37]/15 border border-[#d4af37]/25 flex items-center justify-center shrink-0">
                <UserPlus className="h-5 w-5 text-[#d4af37]" />
              </div>
              <div>
                <h1 className="text-[17px] font-bold text-white leading-tight">Add New Customer</h1>
                <p className="text-xs text-white/40 mt-0.5">Fill in the details below to register a new customer</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-2xl px-4 py-2.5">
            <Sparkles className="h-4 w-4 text-[#d4af37]" />
            <span className="text-xs text-white/60 font-medium">Auto-enrolled in loyalty program</span>
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="max-w-6xl mx-auto px-6 py-7 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">

        {/* Left */}
        <div className="space-y-5">

          {/* Contact */}
          <motion.div {...fade(0)} className="bg-white rounded-2xl border border-black/[0.06] shadow-sm overflow-hidden">
            <div className="flex items-center gap-2.5 px-5 py-4 border-b border-gray-100">
              <div className="h-7 w-7 rounded-lg bg-[#d4af37]/12 flex items-center justify-center">
                <Phone className="h-3.5 w-3.5 text-[#d4af37]" />
              </div>
              <span className="text-[11px] font-bold uppercase tracking-widest text-gray-400">Contact Information</span>
            </div>
            <div className="p-5 space-y-4">
              <Field label="Full Name" required>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                  <input autoFocus placeholder="e.g. Priya Sharma" value={form.name} onChange={e => set("name", e.target.value)}
                    className={inputCls + " pl-10"} />
                </div>
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Phone Number" required>
                  <div className="flex h-11 rounded-xl border border-gray-200 bg-white overflow-hidden focus-within:border-[#d4af37] focus-within:ring-2 focus-within:ring-[#d4af37]/15 transition-all">
                    <span className="flex items-center px-3.5 text-xs font-bold text-[#d4af37] bg-[#111118] border-r border-gray-200 shrink-0 select-none">+91</span>
                    <input placeholder="98765 00000"
                      value={form.phone.replace(/^\+91\s?/, "")}
                      onChange={e => set("phone", "+91 " + e.target.value)}
                      className="flex-1 px-3.5 text-sm bg-transparent outline-none placeholder:text-gray-400 text-gray-800" />
                  </div>
                </Field>
                <Field label="Email Address" optional>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                    <input type="email" placeholder="email@example.com" value={form.email} onChange={e => set("email", e.target.value)}
                      className={inputCls + " pl-10"} />
                  </div>
                </Field>
              </div>
            </div>
          </motion.div>

          {/* Personal */}
          <motion.div {...fade(1)} className="bg-white rounded-2xl border border-black/[0.06] shadow-sm overflow-hidden">
            <div className="flex items-center gap-2.5 px-5 py-4 border-b border-gray-100">
              <div className="h-7 w-7 rounded-lg bg-[#d4af37]/12 flex items-center justify-center">
                <User className="h-3.5 w-3.5 text-[#d4af37]" />
              </div>
              <span className="text-[11px] font-bold uppercase tracking-widest text-gray-400">Personal Details</span>
            </div>
            <div className="p-5 space-y-4">
              <Field label="Gender">
                <div className="flex gap-2">
                  {GENDERS.map(g => (
                    <button key={g.value} type="button"
                      onClick={() => set("gender", form.gender === g.value ? "" : g.value)}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all ${
                        form.gender === g.value
                          ? "bg-[#111118] text-[#d4af37] border-[#111118] shadow-sm"
                          : "bg-gray-50 text-gray-500 border-gray-200 hover:border-gray-300 hover:bg-gray-100"
                      }`}
                    >
                      <span className="text-base leading-none">{g.icon}</span>
                      {g.label}
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="Date of Birth" optional>
                <div className="relative">
                  <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                  <input type="date" value={form.birthday} onChange={e => set("birthday", e.target.value)}
                    className={inputCls + " pl-10"} />
                </div>
              </Field>
            </div>
          </motion.div>

          {/* Location & Notes */}
          <motion.div {...fade(2)} className="bg-white rounded-2xl border border-black/[0.06] shadow-sm overflow-hidden">
            <div className="flex items-center gap-2.5 px-5 py-4 border-b border-gray-100">
              <div className="h-7 w-7 rounded-lg bg-[#d4af37]/12 flex items-center justify-center">
                <MapPin className="h-3.5 w-3.5 text-[#d4af37]" />
              </div>
              <span className="text-[11px] font-bold uppercase tracking-widest text-gray-400">Location & Notes</span>
            </div>
            <div className="p-5 space-y-4">
              <Field label="Address" optional>
                <div className="relative">
                  <MapPin className="absolute left-3.5 top-3.5 h-4 w-4 text-gray-400 pointer-events-none" />
                  <input placeholder="Street, City, Pincode" value={form.address} onChange={e => set("address", e.target.value)}
                    className={inputCls + " pl-10"} />
                </div>
              </Field>
              <Field label="Notes / Allergies" optional>
                <div className="relative">
                  <FileText className="absolute left-3.5 top-3.5 h-4 w-4 text-gray-400 pointer-events-none" />
                  <textarea rows={3} placeholder="Allergies, preferences, special care notes…"
                    value={form.notes} onChange={e => set("notes", e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 bg-white text-sm text-gray-800 placeholder:text-gray-400 outline-none transition-all focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/15 resize-none" />
                </div>
              </Field>
            </div>
          </motion.div>
        </div>

        {/* Right */}
        <div className="space-y-5">

          {/* Profile Preview */}
          <motion.div {...fade(0)} className="bg-white rounded-2xl border border-black/[0.06] shadow-sm overflow-hidden">
            <div className="bg-[#111118] px-5 py-3.5 flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-[#d4af37]" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#d4af37]/80">Profile Preview</span>
            </div>
            <div className="p-5">
              <div className="flex flex-col items-center text-center gap-3">
                <div className="relative">
                  <div className="h-20 w-20 rounded-full bg-gradient-to-br from-[#d4af37] to-[#b8962e] flex items-center justify-center shadow-lg shadow-[#d4af37]/20">
                    {initials
                      ? <span className="text-2xl font-black text-black">{initials}</span>
                      : <User className="h-8 w-8 text-black/40" />
                    }
                  </div>
                  <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-white border-2 border-white shadow flex items-center justify-center text-sm">
                    {selectedTier.icon}
                  </div>
                </div>
                <div>
                  <p className="font-bold text-[#111118] text-base leading-tight">
                    {form.name || <span className="text-gray-400 font-normal text-sm italic">Customer name</span>}
                  </p>
                  {form.phone && <p className="text-xs text-gray-500 mt-0.5">+91 {form.phone.replace(/^\+91\s?/, "")}</p>}
                  {form.email && <p className="text-[11px] text-gray-400 mt-0.5 truncate max-w-[200px]">{form.email}</p>}
                  {!form.phone && !form.email && <p className="text-xs text-gray-400 mt-0.5">No contact info yet</p>}
                </div>
                <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold border ${selectedTier.bg} ${selectedTier.border} ${selectedTier.text}`}>
                  {selectedTier.icon} {selectedTier.label} Member
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-3 gap-2 text-center">
                {[["0", "Visits"], ["0", "Points"], ["₹0", "Spend"]].map(([val, lbl]) => (
                  <div key={lbl}>
                    <p className="text-lg font-black text-[#111118]">{val}</p>
                    <p className="text-[10px] text-gray-400 font-medium">{lbl}</p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Membership Tier */}
          <motion.div {...fade(1)} className="bg-white rounded-2xl border border-black/[0.06] shadow-sm overflow-hidden">
            <div className="flex items-center gap-2.5 px-5 py-4 border-b border-gray-100">
              <div className="h-7 w-7 rounded-lg bg-[#d4af37]/12 flex items-center justify-center">
                <Crown className="h-3.5 w-3.5 text-[#d4af37]" />
              </div>
              <span className="text-[11px] font-bold uppercase tracking-widest text-gray-400">Membership Tier</span>
            </div>
            <div className="p-4 grid grid-cols-2 gap-2.5">
              {TIERS.map(t => (
                <button key={t.value} type="button" onClick={() => set("membershipTier", t.value)}
                  className={`flex flex-col items-center gap-1.5 py-4 rounded-xl border-2 transition-all ${
                    form.membershipTier === t.value
                      ? `${t.bg} ${t.border} ring-2 ${t.ring}/40 shadow-sm`
                      : "border-gray-200 bg-gray-50 hover:border-gray-300"
                  }`}
                >
                  <span className="text-2xl">{t.icon}</span>
                  <span className={`text-xs font-bold ${form.membershipTier === t.value ? t.text : "text-gray-600"}`}>{t.label}</span>
                  <span className="text-[10px] text-gray-400">{t.sub}</span>
                </button>
              ))}
            </div>
          </motion.div>

          {/* CTA */}
          <motion.div {...fade(2)} className="space-y-2">
            <button
              disabled={!canSubmit}
              onClick={() => void handleSubmit()}
              className="w-full h-12 rounded-xl text-sm font-bold flex items-center justify-center gap-2 bg-gradient-to-r from-[#d4af37] to-[#b8962e] text-black shadow-md hover:opacity-90 disabled:opacity-35 disabled:cursor-not-allowed transition-all"
            >
              <CheckCircle2 className="h-4 w-4" />
              {submitting ? "Saving..." : "Add Customer"}
            </button>
            <button
              onClick={() => navigate(-1)}
              className="w-full h-11 rounded-xl text-sm font-semibold text-gray-600 border border-gray-200 bg-white hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            {!canSubmit && (
              <p className="text-[11px] text-center text-gray-400 mt-1">Name & phone number are required</p>
            )}
            {canSubmit && (
              <p className="text-[11px] text-center text-emerald-600 font-medium mt-1 flex items-center justify-center gap-1">
                <Star className="h-3 w-3 fill-emerald-500 text-emerald-500" /> Ready to add
              </p>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
