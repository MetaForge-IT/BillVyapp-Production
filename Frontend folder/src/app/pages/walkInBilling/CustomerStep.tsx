import { motion } from "framer-motion";
import { Check, Loader2, Phone, User, UserPlus } from "lucide-react";
import { Badge } from "../../components/ui/badge";
import { Input } from "../../components/ui/input";
import { cn } from "../../components/ui/utils";
import { formatDisplayPhone } from "../../../lib/phone";
import { ColHeader } from "./ColHeader";
import type { CustomerGender, LookupStatus } from "./types";
import { digitsOnly } from "./utils";

interface CustomerStepProps {
  servicesValid: boolean;
  phoneDigits: string;
  onPhoneChange: (digits: string) => void;
  phoneError?: string | null;
  lookupStatus: LookupStatus;
  customerName: string;
  onCustomerNameChange: (name: string) => void;
  customerGender: CustomerGender;
  onCustomerGenderChange: (gender: Exclude<CustomerGender, "">) => void;
  customerTier: string;
}

export function CustomerStep({
  servicesValid,
  phoneDigits,
  onPhoneChange,
  phoneError,
  lookupStatus,
  customerName,
  onCustomerNameChange,
  customerGender,
  onCustomerGenderChange,
  customerTier,
}: CustomerStepProps) {
  return (
    <div
      className={cn(
        "responsive-panel relative flex flex-col overflow-hidden border-b border-black/[0.08] bg-[#f4f2ed] lg:border-b-0 lg:border-r",
        !servicesValid && "pointer-events-none select-none",
      )}
    >
      {!servicesValid && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-[#f4f2ed]/70 backdrop-blur-[1px]">
          <p className="text-[12px] font-bold text-[#111118]/30">Select services first</p>
        </div>
      )}
      <ColHeader num="02" icon={User} title="Customer" desc="Lookup by mobile number" />
      <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
        <div>
          <p className="mb-2 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[#9a9a9a]">
            Mobile number <span className="text-[#D4AF37]">*</span>
          </p>
          <div className="flex gap-2">
            <span className="inline-flex shrink-0 items-center rounded-xl border border-black/[0.08] bg-gray-50 px-2.5 text-[12px] text-gray-500">
              +91
            </span>
            <div className="relative flex-1">
              <Phone className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#9a9a9a]" />
              <Input
                inputMode="numeric"
                maxLength={10}
                value={phoneDigits}
                onChange={(e) => onPhoneChange(digitsOnly(e.target.value).slice(0, 10))}
                placeholder="98765 43210"
                aria-invalid={Boolean(phoneError)}
                className={cn(
                  "h-11 rounded-xl border-black/[0.08] bg-white pl-9 text-[13px] focus:border-[#D4AF37]/40",
                  phoneError && "border-red-400 focus:border-red-400",
                )}
              />
            </div>
          </div>
          {phoneError && (
            <p className="mt-2 text-[11px] font-medium text-red-500">{phoneError}</p>
          )}
          {!phoneError && lookupStatus === "loading" && (
            <p className="mt-2 flex items-center gap-1.5 text-[11px] text-[#9a9a9a]">
              <Loader2 className="h-3 w-3 animate-spin" /> Checking customer…
            </p>
          )}
          {!phoneError && lookupStatus === "found" && (
            <p className="mt-2 flex items-center gap-1.5 text-[11px] font-semibold text-[#9a7a1e]">
              <Check className="h-3.5 w-3.5 text-[#D4AF37]" /> Returning customer found
            </p>
          )}
          {!phoneError && lookupStatus === "new" && (
            <p className="mt-2 flex items-center gap-1.5 text-[11px] font-semibold text-[#6b6b6b]">
              <UserPlus className="h-3.5 w-3.5 text-[#D4AF37]" /> New customer — enter details below
            </p>
          )}
        </div>

        {(lookupStatus === "found" || lookupStatus === "new") && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3 rounded-2xl border border-black/[0.07] bg-white p-4"
          >
            {lookupStatus === "found" && (
              <div className="mb-1 flex items-center gap-2">
                <Badge className="border border-[#D4AF37]/25 bg-[#D4AF37]/10 text-[9px] font-bold text-[#9a7a1e]">
                  {customerTier}
                </Badge>
                <span className="text-[11px] text-[#9a9a9a]">{formatDisplayPhone(phoneDigits)}</span>
              </div>
            )}
            <div>
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#9a9a9a]">
                Full name <span className="text-[#D4AF37]">*</span>
              </p>
              <Input
                value={customerName}
                onChange={(e) => onCustomerNameChange(e.target.value)}
                readOnly={lookupStatus === "found"}
                placeholder="Customer name"
                className={cn(
                  "h-10 rounded-xl border-black/[0.08] text-[12.5px]",
                  lookupStatus === "found" && "bg-[#faf9f7]",
                )}
              />
            </div>
            <div>
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#9a9a9a]">
                Gender
              </p>
              <div className="grid grid-cols-3 gap-1.5">
                {(["Male", "Female", "Other"] as const).map((g) => (
                  <button
                    key={g}
                    type="button"
                    disabled={lookupStatus === "found"}
                    onClick={() => onCustomerGenderChange(g)}
                    className={cn(
                      "rounded-xl border py-2 text-[11px] font-semibold transition-all",
                      customerGender === g
                        ? "border-[#111118] bg-[#111118] text-[#D4AF37]"
                        : "border-black/[0.08] bg-white text-[#9a9a9a]",
                    )}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
