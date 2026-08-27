import {
  Search,
  User,
  UserPlus,
  Phone,
  Mail,
  Calendar,
  Clock,
  ChevronRight,
  StickyNote,
} from "lucide-react";
import { Input } from "../../components/ui/input";
import { Badge } from "../../components/ui/badge";
import { cn } from "../../components/ui/utils";
import {
  type AppointmentCustomer,
  type AppointmentType,
} from "./appointmentData";

const tierStyles: Record<AppointmentCustomer["tier"], string> = {
  VIP: "bg-[#111118] text-[#D4AF37] border-[#D4AF37]/30",
  Gold: "bg-amber-50 text-amber-700 border-amber-200",
  Silver: "bg-slate-100 text-slate-600 border-slate-200",
  Regular: "bg-[#f4f2ed] text-[#3f3f46] border-black/[0.08]",
};

function SectionHeader({
  icon: Icon,
  title,
  action,
}: {
  icon: typeof User;
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-2 mb-4">
      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#D4AF37]/10 border border-[#D4AF37]/20">
          <Icon className="h-3.5 w-3.5 text-[#D4AF37]" />
        </div>
        <h3 className="text-sm font-semibold text-[#111118] tracking-[-0.01em]">{title}</h3>
      </div>
      {action}
    </div>
  );
}

function FieldLabel({ children, required }: { children: string; required?: boolean }) {
  return (
    <label className="text-xs font-medium text-[#3f3f46] mb-1.5 block">
      {children}
      {required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  );
}

interface CustomerDetailsPanelProps {
  customerSearch: string;
  onCustomerSearchChange: (value: string) => void;
  filteredCustomers: AppointmentCustomer[];
  selectedCustomer: AppointmentCustomer | null;
  onSelectCustomer: (customer: AppointmentCustomer) => void;
  visitType: AppointmentType;
  onVisitTypeChange: (type: AppointmentType) => void;
  walkInName: string;
  onWalkInNameChange: (value: string) => void;
  walkInPhone: string;
  onWalkInPhoneChange: (value: string) => void;
  walkInEmail: string;
  onWalkInEmailChange: (value: string) => void;
  date: string;
  onDateChange: (value: string) => void;
  time: string;
  onTimeChange: (value: string) => void;
  duration: string;
  onDurationChange: (value: string) => void;
  notes: string;
  onNotesChange: (value: string) => void;
  onNewCustomer?: () => void;
}

export function CustomerDetailsPanel({
  customerSearch,
  onCustomerSearchChange,
  filteredCustomers,
  selectedCustomer,
  onSelectCustomer,
  visitType,
  onVisitTypeChange,
  walkInName,
  onWalkInNameChange,
  walkInPhone,
  onWalkInPhoneChange,
  walkInEmail,
  onWalkInEmailChange,
  date,
  onDateChange,
  time,
  onTimeChange,
  duration,
  onDurationChange,
  notes,
  onNotesChange,
  onNewCustomer,
}: CustomerDetailsPanelProps) {
  const showSearchResults = customerSearch.trim().length > 0 && visitType === "Appointment";

  const customerInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();

  return (
    <div className="p-6 space-y-7">
      {/* ── Customer Details ── */}
      <section className="rounded-2xl border border-black/[0.06] bg-gradient-to-b from-white to-[#faf9f7]/80 p-5 shadow-[0_2px_12px_rgba(17,17,24,0.04)]">
        <SectionHeader
          icon={User}
          title="Customer Details"
          action={
            <button
              type="button"
              onClick={onNewCustomer}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#D4AF37] hover:text-[#C9A227] transition-colors"
            >
              <UserPlus className="h-3.5 w-3.5" />
              New Customer
            </button>
          }
        />

        <div className="relative mb-4">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#52525b]" />
          <Input
            placeholder="Search by name or phone number"
            value={customerSearch}
            onChange={(e) => onCustomerSearchChange(e.target.value)}
            className="pl-10 h-11 rounded-xl bg-white border-black/[0.08] focus:border-[#D4AF37]/40 focus:ring-2 focus:ring-[#D4AF37]/10 text-sm"
          />
        </div>

        {showSearchResults && (
          <div className="mb-4 rounded-xl border border-black/[0.06] bg-white shadow-lg overflow-hidden max-h-44 overflow-y-auto">
            {filteredCustomers.length === 0 ? (
              <p className="px-4 py-3 text-xs text-[#52525b]">No customers found</p>
            ) : (
              filteredCustomers.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    onSelectCustomer(c);
                    onCustomerSearchChange("");
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[#f4f2ed]/80 transition-colors border-b border-black/[0.04] last:border-0"
                >
                  <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#B8962E] text-[#111118] text-xs font-bold flex items-center justify-center shrink-0">
                    {customerInitials(c.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-[#111118] truncate">{c.name}</p>
                    <p className="text-xs text-[#52525b] truncate">{c.phone}</p>
                  </div>
                  <Badge className={cn("text-[9px] shrink-0 border", tierStyles[c.tier])}>{c.tier}</Badge>
                </button>
              ))
            )}
          </div>
        )}

        {visitType === "Appointment" && selectedCustomer && !showSearchResults && (
          <button
            type="button"
            onClick={() => onCustomerSearchChange(selectedCustomer.name)}
            className="w-full flex items-center gap-3 rounded-xl border border-[#D4AF37]/25 bg-white p-4 mb-4 text-left hover:border-[#D4AF37]/45 hover:shadow-sm transition-all group"
          >
            <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#B8962E] text-[#111118] text-sm font-bold flex items-center justify-center shrink-0 shadow-sm">
              {customerInitials(selectedCustomer.name)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-semibold text-[#111118]">{selectedCustomer.name}</p>
                <Badge className={cn("text-[9px] border", tierStyles[selectedCustomer.tier])}>
                  {selectedCustomer.tier}
                </Badge>
              </div>
              <p className="text-xs text-[#3f3f46] mt-1 flex items-center gap-1.5">
                <Phone className="h-3 w-3 shrink-0" />
                {selectedCustomer.phone}
              </p>
              <p className="text-xs text-[#52525b] mt-0.5 flex items-center gap-1.5 truncate">
                <Mail className="h-3 w-3 shrink-0" />
                {selectedCustomer.email}
              </p>
            </div>
            <ChevronRight className="h-4 w-4 text-[#52525b] group-hover:text-[#D4AF37] transition-colors shrink-0" />
          </button>
        )}

        <div>
          <FieldLabel>Visit Type</FieldLabel>
          <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-[#f4f2ed]">
            {(["Appointment", "Walk-in"] as AppointmentType[]).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => onVisitTypeChange(type)}
                className={cn(
                  "rounded-lg py-2.5 text-sm font-semibold transition-all duration-200",
                  visitType === type
                    ? "bg-white text-[#111118] shadow-sm ring-1 ring-[#D4AF37]/35"
                    : "text-[#3f3f46] hover:text-[#111118]",
                )}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {visitType === "Walk-in" && (
          <div className="mt-4 space-y-3 pt-4 border-t border-black/[0.06]">
            <div>
              <FieldLabel required>Full Name</FieldLabel>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#52525b]" />
                <Input
                  placeholder="Enter customer name"
                  value={walkInName}
                  onChange={(e) => onWalkInNameChange(e.target.value)}
                  className="pl-10 h-11 rounded-xl bg-white border-black/[0.08]"
                />
              </div>
            </div>
            <div>
              <FieldLabel>Phone Number</FieldLabel>
              <div className="flex gap-2">
                <span className="inline-flex items-center px-3 rounded-xl border border-black/[0.08] bg-gray-50 text-sm text-gray-500 shrink-0">+91</span>
                <Input
                  placeholder="98765 00000"
                  value={walkInPhone.replace(/^\+91\s?/,"")}
                  onChange={(e) => onWalkInPhoneChange("+91 " + e.target.value)}
                  className="flex-1 h-11 rounded-xl bg-white border-black/[0.08]"
                />
              </div>
            </div>
            <div>
              <FieldLabel>Email Address</FieldLabel>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#52525b]" />
                <Input
                  placeholder="customer@email.com"
                  value={walkInEmail}
                  onChange={(e) => onWalkInEmailChange(e.target.value)}
                  className="pl-10 h-11 rounded-xl bg-white border-black/[0.08]"
                />
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ── Appointment Details ── */}
      <section className="rounded-2xl border border-black/[0.06] bg-white p-5 shadow-[0_2px_12px_rgba(17,17,24,0.04)]">
        <SectionHeader icon={Calendar} title="Appointment Details" />

        <div className="grid grid-cols-2 gap-3">
          <div>
            <FieldLabel>Date</FieldLabel>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#52525b] pointer-events-none" />
              <Input
                type="date"
                value={date}
                onChange={(e) => onDateChange(e.target.value)}
                className="pl-10 h-11 rounded-xl bg-[#faf9f7] border-black/[0.08] text-sm"
              />
            </div>
          </div>
          <div>
            <FieldLabel>Time</FieldLabel>
            <div className="relative">
              <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#52525b] pointer-events-none" />
              <Input
                type="time"
                value={time}
                onChange={(e) => onTimeChange(e.target.value)}
                className="pl-10 h-11 rounded-xl bg-[#faf9f7] border-black/[0.08] text-sm"
              />
            </div>
          </div>
        </div>

        <div className="mt-3">
          <FieldLabel>Duration</FieldLabel>
          <div className="relative">
            <Clock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#52525b]" />
            <Input
              value={duration}
              onChange={(e) => onDurationChange(e.target.value)}
              placeholder="e.g. 1 hr, 30 min"
              className="pl-10 h-11 rounded-xl bg-[#faf9f7] border-black/[0.08] text-sm"
            />
          </div>
        </div>
      </section>

      {/* ── Additional Details ── */}
      <section className="rounded-2xl border border-black/[0.06] bg-white p-5 shadow-[0_2px_12px_rgba(17,17,24,0.04)]">
        <SectionHeader icon={StickyNote} title="Additional Details" />

        <div>
          <FieldLabel>Notes (Optional)</FieldLabel>
          <textarea
            value={notes}
            onChange={(e) => onNotesChange(e.target.value)}
            placeholder="Add any special requests or preferences…"
            maxLength={200}
            className="w-full h-24 rounded-xl border border-black/[0.08] bg-[#faf9f7] px-3.5 py-3 text-sm text-[#111118] placeholder:text-[#52525b] resize-none focus:outline-none focus:border-[#D4AF37]/40 focus:ring-2 focus:ring-[#D4AF37]/10"
          />
          <p className="text-[10px] text-[#52525b] text-right mt-1.5 tabular-nums">{notes.length}/200</p>
        </div>
      </section>
    </div>
  );
}
