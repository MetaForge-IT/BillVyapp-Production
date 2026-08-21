import { AnimatePresence, motion } from "framer-motion";
import {
  Search, User, Calendar, Clock, Phone, Mail, UserPlus, StickyNote, Check,
} from "lucide-react";
import { toast } from "../../components/ui/hot-toast";
import { Input } from "../../components/ui/input";
import { Badge } from "../../components/ui/badge";
import { cn } from "../../components/ui/utils";
import { ColHeader } from "../walkInBilling/ColHeader";
import {
  APPOINTMENT_PAST_DAYS_LIMIT,
  isAppointmentSlotDateAllowed,
} from "../../../lib/appointmentSlotDate";
import type { AppointmentCustomer } from "./appointmentData";
import type { ServiceTab } from "./newAppointmentDraft";
import { Label, initials, tierBadge } from "./newAppointmentUi";

export type BookingCustomerColumnProps = {
  isWalkInPage: boolean;
  apptNewMode: boolean;
  setApptNewMode: React.Dispatch<React.SetStateAction<boolean>>;
  newCustName: string;
  setNewCustName: (v: string) => void;
  newCustPhone: string;
  setNewCustPhone: (v: string) => void;
  newCustGender: "Male" | "Female" | "Other" | "";
  setNewCustGender: (v: "Male" | "Female" | "Other" | "") => void;
  customerSearch: string;
  setCustomerSearch: (v: string) => void;
  selectedCustomer: AppointmentCustomer | null;
  setSelectedCustomer: (c: AppointmentCustomer | null) => void;
  filteredCustomers: AppointmentCustomer[];
  walkInMode: "new" | "search";
  setWalkInMode: (v: "new" | "search") => void;
  walkInSearch: string;
  setWalkInSearch: (v: string) => void;
  walkInName: string;
  setWalkInName: (v: string) => void;
  walkInPhone: string;
  setWalkInPhone: (v: string) => void;
  walkInGender: "Male" | "Female" | "Other" | "";
  setWalkInGender: (v: "Male" | "Female" | "Other" | "") => void;
  filteredWalkIn: AppointmentCustomer[];
  date: string;
  setDate: (v: string) => void;
  time: string;
  setTime: (v: string) => void;
  duration: string;
  setDuration: (v: string) => void;
  notes: string;
  setNotes: (v: string) => void;
  slotMinDate: string;
  slotCustomerKind: "returning" | "new";
  setServiceTab: (tab: ServiceTab) => void;
  setServiceListPage: (page: number) => void;
};

export function BookingCustomerColumn({
  isWalkInPage,
  apptNewMode,
  setApptNewMode,
  newCustName,
  setNewCustName,
  newCustPhone,
  setNewCustPhone,
  newCustGender,
  setNewCustGender,
  customerSearch,
  setCustomerSearch,
  selectedCustomer,
  setSelectedCustomer,
  filteredCustomers,
  walkInMode,
  setWalkInMode,
  walkInSearch,
  setWalkInSearch,
  walkInName,
  setWalkInName,
  walkInPhone,
  setWalkInPhone,
  walkInGender,
  setWalkInGender,
  filteredWalkIn,
  date,
  setDate,
  time,
  setTime,
  duration,
  setDuration,
  notes,
  setNotes,
  slotMinDate,
  slotCustomerKind,
  setServiceTab,
  setServiceListPage,
}: BookingCustomerColumnProps) {
  return (
    <div className="responsive-panel flex flex-col overflow-hidden border-b border-black/[0.08] bg-[#f4f2ed] lg:border-b-0 lg:border-r">
      <ColHeader num="01" icon={User} title="Customer" desc="Who's coming in?" />

      <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
        {!isWalkInPage ? (
          <div>
            <div className="mb-3 flex items-center justify-between">
              <Label>{apptNewMode ? "New Customer" : "Search Customer"}</Label>
              <button
                type="button"
                onClick={() => {
                  setApptNewMode((v) => !v);
                  setSelectedCustomer(null);
                  setCustomerSearch("");
                  setNewCustName("");
                  setNewCustPhone("");
                  setNewCustGender("");
                }}
                className="flex items-center gap-1 text-[10px] font-semibold text-[#D4AF37] transition-colors hover:text-[#C9A227]"
              >
                {apptNewMode ? (
                  <>
                    <Search className="h-3 w-3" /> Search existing
                  </>
                ) : (
                  <>
                    <UserPlus className="h-3 w-3" /> New customer
                  </>
                )}
              </button>
            </div>

            <AnimatePresence mode="wait">
              {apptNewMode ? (
                <motion.div
                  key="new-form"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="space-y-2.5"
                >
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#9a9a9a]" />
                    <Input
                      placeholder="Full name *"
                      value={newCustName}
                      onChange={(e) => setNewCustName(e.target.value)}
                      className="h-10 rounded-xl border-black/[0.08] bg-white pl-9 text-[12.5px] focus:border-[#D4AF37]/40"
                    />
                  </div>
                  <div className="flex gap-2">
                    <span className="inline-flex shrink-0 items-center rounded-xl border border-black/[0.08] bg-gray-50 px-2.5 text-[12px] text-gray-500">
                      +91
                    </span>
                    <Input
                      placeholder="98765 00000"
                      value={newCustPhone.replace(/^\+91\s?/, "")}
                      onChange={(e) => setNewCustPhone("+91 " + e.target.value)}
                      className="h-10 flex-1 rounded-xl border-black/[0.08] bg-white text-[12.5px] focus:border-[#D4AF37]/40"
                    />
                  </div>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#9a9a9a]" />
                    <Input
                      placeholder="Email (optional)"
                      className="h-10 rounded-xl border-black/[0.08] bg-white pl-9 text-[12.5px] focus:border-[#D4AF37]/40"
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
                          onClick={() => {
                            setNewCustGender(g);
                            setServiceTab(g === "Other" ? "Others" : g);
                            setServiceListPage(1);
                          }}
                          className={cn(
                            "rounded-xl border py-2 text-[11px] font-semibold transition-all",
                            newCustGender === g
                              ? "border-[#111118] bg-[#111118] text-[#D4AF37]"
                              : "border-black/[0.08] bg-white text-[#9a9a9a] hover:border-[#D4AF37]/30",
                          )}
                        >
                          {g}
                        </button>
                      ))}
                    </div>
                  </div>
                  {newCustName.trim() && (
                    <div className="flex items-center gap-2 rounded-xl border border-[#D4AF37]/20 bg-[#D4AF37]/06 px-3 py-2">
                      <Check className="h-3.5 w-3.5 shrink-0 text-[#D4AF37]" />
                      <p className="text-[11px] font-semibold text-[#9a7a1e]">
                        Will be added as a new customer on save
                      </p>
                    </div>
                  )}
                </motion.div>
              ) : (
                <motion.div
                  key="search-form"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                >
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#9a9a9a]" />
                    <Input
                      placeholder="Name or phone…"
                      value={customerSearch}
                      onChange={(e) => {
                        setCustomerSearch(e.target.value);
                        setSelectedCustomer(null);
                      }}
                      className="h-10 rounded-xl border-black/[0.08] bg-white pl-9 text-[12.5px] focus:border-[#D4AF37]/40"
                    />
                  </div>
                  <AnimatePresence>
                    {customerSearch.trim().length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -3 }}
                        className="mt-1 max-h-44 overflow-y-auto rounded-xl border border-black/[0.07] bg-white shadow-lg"
                      >
                        {filteredCustomers.length === 0 ? (
                          <div className="px-4 py-4 text-center">
                            <p className="mb-2 text-[11.5px] text-[#9a9a9a]">No match found</p>
                            <button
                              type="button"
                              onClick={() => {
                                setApptNewMode(true);
                                setNewCustName(customerSearch);
                                setCustomerSearch("");
                              }}
                              className="mx-auto flex items-center gap-1.5 text-[11px] font-bold text-[#D4AF37] transition-colors hover:text-[#C9A227]"
                            >
                              <UserPlus className="h-3.5 w-3.5" /> Create &ldquo;{customerSearch}&rdquo; as
                              new
                            </button>
                          </div>
                        ) : (
                          filteredCustomers.map((c) => (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => {
                                setSelectedCustomer(c);
                                setCustomerSearch("");
                                if (c.gender === "Male" || c.gender === "Female") setServiceTab(c.gender);
                                else if (c.gender === "Other") setServiceTab("Others");
                                setServiceListPage(1);
                              }}
                              className="flex w-full items-center gap-3 border-b border-black/[0.04] px-3 py-2.5 text-left last:border-0 hover:bg-[#f4f2ed]"
                            >
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#D4AF37] to-[#C9A227] text-[10px] font-bold text-[#111118]">
                                {initials(c.name)}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-[12px] font-semibold text-[#111118]">
                                  {c.name}
                                </p>
                                <p className="text-[10.5px] text-[#9a9a9a]">{c.phone}</p>
                              </div>
                              <Badge
                                className={cn("border px-1.5 text-[8px] font-bold", tierBadge[c.tier])}
                              >
                                {c.tier}
                              </Badge>
                            </button>
                          ))
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                  {selectedCustomer && customerSearch === "" && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="mt-2 flex items-center gap-3 rounded-xl border border-[#D4AF37]/30 bg-white p-3"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#C9A227] text-[11px] font-bold text-[#111118]">
                        {initials(selectedCustomer.name)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <p className="text-[13px] font-bold text-[#111118]">
                            {selectedCustomer.name}
                          </p>
                          <Badge
                            className={cn(
                              "border px-1.5 text-[8px] font-bold",
                              tierBadge[selectedCustomer.tier],
                            )}
                          >
                            {selectedCustomer.tier}
                          </Badge>
                        </div>
                        <span className="mt-0.5 flex items-center gap-1 text-[10.5px] text-[#6b6b6b]">
                          <Phone className="h-3 w-3" />
                          {selectedCustomer.phone}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedCustomer(null)}
                        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-black/[0.1] text-[#9a9a9a] hover:text-[#111118]"
                      >
                        <Check className="h-3 w-3 text-[#D4AF37]" strokeWidth={2.5} />
                      </button>
                    </motion.div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ) : (
          <div>
            <div className="mb-3">
              <Label>Customer</Label>
              <div
                className="inline-flex w-full items-center gap-0.5 rounded-xl border border-black/[0.08] bg-[#FAF8F2]/60 p-1"
                role="tablist"
                aria-label="Walk-in customer type"
              >
                {(
                  [
                    { value: "search" as const, label: "Returning", icon: Search },
                    { value: "new" as const, label: "New customer", icon: UserPlus },
                  ] as const
                ).map(({ value, label, icon: Icon }) => {
                  const isActive = walkInMode === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      onClick={() => {
                        setWalkInMode(value);
                        setSelectedCustomer(null);
                        setWalkInSearch("");
                        setWalkInName("");
                        setWalkInPhone("");
                        setWalkInGender("");
                      }}
                      className={cn(
                        "flex h-11 flex-1 items-center justify-center gap-1.5 rounded-lg px-3 text-[13px] font-semibold transition-all",
                        isActive
                          ? "border border-[#D4AF37]/35 bg-[#D4AF37]/15 text-[#9a7d20]"
                          : "border border-transparent text-[#6b6b6b] hover:bg-black/[0.04]",
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            <AnimatePresence mode="wait">
              {walkInMode === "search" ? (
                <motion.div
                  key="walkin-search"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                >
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#9a9a9a]" />
                    <Input
                      placeholder="Search by name or phone…"
                      value={walkInSearch}
                      onChange={(e) => {
                        setWalkInSearch(e.target.value);
                        setSelectedCustomer(null);
                      }}
                      className="h-10 rounded-xl border-black/[0.08] bg-white pl-9 text-[12.5px] focus:border-[#D4AF37]/40"
                    />
                  </div>
                  <AnimatePresence>
                    {walkInSearch.trim().length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -3 }}
                        className="mt-1 max-h-44 overflow-y-auto rounded-xl border border-black/[0.07] bg-white shadow-lg"
                      >
                        {filteredWalkIn.length === 0 ? (
                          <div className="px-4 py-4 text-center">
                            <p className="mb-2 text-[11.5px] text-[#9a9a9a]">No match found</p>
                            <button
                              type="button"
                              onClick={() => {
                                setWalkInMode("new");
                                setWalkInName(walkInSearch);
                                setWalkInSearch("");
                              }}
                              className="mx-auto flex items-center gap-1.5 text-[11px] font-bold text-[#D4AF37] transition-colors hover:text-[#C9A227]"
                            >
                              <UserPlus className="h-3.5 w-3.5" /> Add as new customer
                            </button>
                          </div>
                        ) : (
                          filteredWalkIn.map((c) => (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => {
                                setSelectedCustomer(c);
                                setWalkInSearch("");
                                if (c.gender === "Male" || c.gender === "Female") setServiceTab(c.gender);
                                else if (c.gender === "Other") setServiceTab("Others");
                                setServiceListPage(1);
                              }}
                              className="flex w-full items-center gap-3 border-b border-black/[0.04] px-3 py-2.5 text-left last:border-0 hover:bg-[#f4f2ed]"
                            >
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#D4AF37] to-[#C9A227] text-[10px] font-bold text-[#111118]">
                                {initials(c.name)}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-[12px] font-semibold text-[#111118]">
                                  {c.name}
                                </p>
                                <p className="text-[10.5px] text-[#9a9a9a]">{c.phone}</p>
                              </div>
                              <Badge
                                className={cn("border px-1.5 text-[8px] font-bold", tierBadge[c.tier])}
                              >
                                {c.tier}
                              </Badge>
                            </button>
                          ))
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                  {selectedCustomer && walkInSearch === "" && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="mt-2 flex items-center gap-3 rounded-xl border border-[#D4AF37]/30 bg-white p-3"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#C9A227] text-[11px] font-bold text-[#111118]">
                        {initials(selectedCustomer.name)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-bold text-[#111118]">
                          {selectedCustomer.name}
                        </p>
                        <span className="mt-0.5 flex items-center gap-1 text-[10.5px] text-[#6b6b6b]">
                          <Phone className="h-3 w-3" />
                          {selectedCustomer.phone}
                        </span>
                      </div>
                      <Check className="h-4 w-4 shrink-0 text-[#D4AF37]" strokeWidth={2.5} />
                    </motion.div>
                  )}
                </motion.div>
              ) : (
                <motion.div
                  key="walkin-new"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="space-y-2.5"
                >
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#9a9a9a]" />
                    <Input
                      placeholder="Full name *"
                      value={walkInName}
                      onChange={(e) => setWalkInName(e.target.value)}
                      className="h-10 rounded-xl border-black/[0.08] bg-white pl-9 text-[12.5px] focus:border-[#D4AF37]/40"
                    />
                  </div>
                  <div className="flex gap-2">
                    <span className="inline-flex shrink-0 items-center rounded-xl border border-black/[0.08] bg-gray-50 px-2.5 text-[12px] text-gray-500">
                      +91
                    </span>
                    <Input
                      placeholder="98765 00000"
                      value={walkInPhone.replace(/^\+91\s?/, "")}
                      onChange={(e) => setWalkInPhone("+91 " + e.target.value)}
                      className="h-10 flex-1 rounded-xl border-black/[0.08] bg-white text-[12.5px] focus:border-[#D4AF37]/40"
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
                          onClick={() => {
                            setWalkInGender(g);
                            setServiceTab(g === "Other" ? "Others" : g);
                            setServiceListPage(1);
                          }}
                          className={cn(
                            "rounded-xl border py-2 text-[11px] font-semibold transition-all",
                            walkInGender === g
                              ? "border-[#111118] bg-[#111118] text-[#D4AF37]"
                              : "border-black/[0.08] bg-white text-[#9a9a9a] hover:border-[#D4AF37]/30",
                          )}
                        >
                          {g}
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        <div>
          <Label>Slot Details</Label>
          <div className="space-y-2">
            <div className="relative">
              <Calendar className="pointer-events-none absolute left-3 top-1/2 z-10 h-3.5 w-3.5 -translate-y-1/2 text-[#9a9a9a]" />
              <Input
                type="date"
                value={date}
                min={slotMinDate}
                onChange={(e) => {
                  const next = e.target.value;
                  if (next && !isAppointmentSlotDateAllowed(next, slotCustomerKind)) {
                    toast.error(
                      slotCustomerKind === "new"
                        ? "New customers cannot book previous dates"
                        : `Past dates limited to the last ${APPOINTMENT_PAST_DAYS_LIMIT} days`,
                    );
                    setDate(slotMinDate);
                    return;
                  }
                  setDate(next);
                }}
                className="h-10 rounded-xl border-black/[0.08] bg-white pl-9 text-[12.5px] focus:border-[#D4AF37]/40"
              />
            </div>
            <p className="text-[10px] text-[#9a9a9a]">
              {slotCustomerKind === "new"
                ? "Today and upcoming dates only — previous dates not allowed"
                : `Past dates: last ${APPOINTMENT_PAST_DAYS_LIMIT} days only · Future: any day`}
            </p>
            <div className="grid grid-cols-2 gap-2">
              <div className="relative">
                <Clock className="pointer-events-none absolute left-3 top-1/2 z-10 h-3.5 w-3.5 -translate-y-1/2 text-[#9a9a9a]" />
                <Input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="h-10 rounded-xl border-black/[0.08] bg-white pl-9 text-[12.5px] focus:border-[#D4AF37]/40"
                />
              </div>
              <div className="relative">
                <Clock className="pointer-events-none absolute left-3 top-1/2 z-10 h-3.5 w-3.5 -translate-y-1/2 text-[#9a9a9a]" />
                <Input
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  placeholder="Duration"
                  className="h-10 rounded-xl border-black/[0.08] bg-white pl-9 text-[12.5px] focus:border-[#D4AF37]/40"
                />
              </div>
            </div>
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center gap-1.5">
            <StickyNote className="h-3 w-3 text-[#9a9a9a]" />
            <Label>Notes (Optional)</Label>
          </div>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Special requests or preferences…"
            maxLength={200}
            className="h-20 w-full resize-none rounded-xl border border-black/[0.08] bg-white px-3.5 py-3 text-[12.5px] text-[#111118] placeholder:text-[#c0c0c0] focus:border-[#D4AF37]/40 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/10"
          />
          <p className="mt-1 text-right text-[9.5px] tabular-nums text-[#c0c0c0]">
            {notes.length}/200
          </p>
        </div>
      </div>
    </div>
  );
}
