import { motion } from "framer-motion";
import { Check, Loader2, Phone, User, UserPlus } from "lucide-react";
import { Badge } from "../../components/ui/badge";
import { Input } from "../../components/ui/input";
import { cn } from "../../components/ui/utils";
import { formatDisplayPhone } from "../../../lib/phone";
import type { Customer } from "../../../api/customers";
import { ColHeader } from "./ColHeader";
import type { CustomerGender, LookupStatus } from "./types";
import { digitsOnly, last10 } from "./utils";

interface CustomerStepProps {
  servicesValid: boolean;
  phoneDigits: string;
  onPhoneChange: (digits: string) => void;
  phoneError?: string | null;
  lookupStatus: LookupStatus;
  phoneMatches: Customer[];
  onSelectMatch: (customer: Customer) => void;
  isPhoneDebouncing?: boolean;
  customerName: string;
  onCustomerNameChange: (name: string) => void;
  customerGender: CustomerGender;
  onCustomerGenderChange: (gender: Exclude<CustomerGender, "">) => void;
  customerTier: string;
  stylistName: string;
  onStylistNameChange: (name: string) => void;
}

export function CustomerStep({
  servicesValid,
  phoneDigits,
  onPhoneChange,
  phoneError,
  lookupStatus,
  phoneMatches,
  onSelectMatch,
  isPhoneDebouncing = false,
  customerName,
  onCustomerNameChange,
  customerGender,
  onCustomerGenderChange,
  customerTier,
  stylistName,
  onStylistNameChange,
}: CustomerStepProps) {
  const showSuggestions =
    lookupStatus !== "found" &&
    lookupStatus !== "new" &&
    phoneDigits.length >= 4 &&
    phoneDigits.length < 10 &&
    phoneMatches.length > 0;

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
      <ColHeader num="02" icon={User} title="Customer" desc="Lookup by mobile — searches after you pause" />
      <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
        <div>
          <p className="mb-2 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[#52525b]">
            Mobile number <span className="text-[#D4AF37]">*</span>
          </p>
          <div className="flex gap-2">
            <span className="inline-flex shrink-0 items-center rounded-xl border border-black/[0.08] bg-gray-50 px-2.5 text-[12px] text-gray-500">
              +91
            </span>
            <div className="relative flex-1">
              <Phone className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#52525b]" />
              <Input
                inputMode="numeric"
                maxLength={10}
                value={phoneDigits}
                onChange={(e) => onPhoneChange(digitsOnly(e.target.value).slice(0, 10))}
                placeholder="Type mobile number…"
                aria-invalid={Boolean(phoneError)}
                autoComplete="off"
                className={cn(
                  "h-11 rounded-xl border-black/[0.08] bg-white pl-9 text-[13px] focus:border-[#D4AF37]/40",
                  phoneError && "border-red-400 focus:border-red-400",
                )}
              />
              {showSuggestions && (
                <div className="absolute inset-x-0 top-full z-30 mt-1 max-h-48 overflow-y-auto rounded-xl border border-black/[0.08] bg-white py-1 shadow-lg">
                  {phoneMatches.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => onSelectMatch(c)}
                      className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left hover:bg-[#FFFBEB]"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-[12.5px] font-semibold text-[#111118]">
                          {c.name}
                        </span>
                        <span className="block text-[11px] text-[#52525b]">
                          {formatDisplayPhone(last10(c.phone))}
                        </span>
                      </span>
                      <Badge className="shrink-0 border border-[#D4AF37]/25 bg-[#D4AF37]/10 text-[9px] font-bold text-[#9a7a1e]">
                        {c.membershipTier || "Regular"}
                      </Badge>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          {phoneError && (
            <p className="mt-2 text-[11px] font-medium text-red-500">{phoneError}</p>
          )}
          {!phoneError && (lookupStatus === "loading" || isPhoneDebouncing) && phoneDigits.length >= 4 && (
            <p className="mt-2 flex items-center gap-1.5 text-[11px] text-[#52525b]">
              <Loader2 className="h-3 w-3 animate-spin" /> Searching customers…
            </p>
          )}
          {!phoneError && !isPhoneDebouncing && lookupStatus === "idle" && phoneDigits.length > 0 && phoneDigits.length < 4 && (
            <p className="mt-2 text-[11px] text-[#52525b]">Enter at least 4 digits to search</p>
          )}
          {!phoneError && !isPhoneDebouncing && lookupStatus === "idle" && phoneDigits.length >= 4 && phoneDigits.length < 10 && phoneMatches.length === 0 && (
            <p className="mt-2 text-[11px] text-[#52525b]">No match yet — keep typing the full number</p>
          )}
          {!phoneError && lookupStatus === "found" && (
            <p className="mt-2 flex items-center gap-1.5 text-[11px] font-semibold text-[#9a7a1e]">
              <Check className="h-3.5 w-3.5 text-[#D4AF37]" /> Returning customer found
            </p>
          )}
          {!phoneError && lookupStatus === "new" && (
            <p className="mt-2 flex items-center gap-1.5 text-[11px] font-semibold text-[#3f3f46]">
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
                <span className="text-[11px] text-[#52525b]">{formatDisplayPhone(phoneDigits)}</span>
              </div>
            )}
            <div>
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#52525b]">
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
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#52525b]">
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
                        : "border-black/[0.08] bg-white text-[#52525b]",
                    )}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#52525b]">
                Stylist name{" "}
                <span className="font-medium normal-case tracking-normal text-[#52525b]/80">(optional)</span>
              </p>
              <Input
                value={stylistName}
                onChange={(e) => onStylistNameChange(e.target.value)}
                placeholder="e.g. Rahul"
                maxLength={200}
                className="h-10 rounded-xl border-black/[0.08] bg-white text-[12.5px] focus:border-[#D4AF37]/40"
              />
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
