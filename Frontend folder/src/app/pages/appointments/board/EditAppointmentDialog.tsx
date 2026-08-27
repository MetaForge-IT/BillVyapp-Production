import { cn } from "../../../components/ui/utils";
import { Button } from "../../../components/ui/button";
import { Badge } from "../../../components/ui/badge";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../../components/ui/dialog";
import {
  Calendar as CalendarIcon,
  Clock,
  Edit,
  Phone,
  User,
  Scissors,
  Check,
  Plus,
  Timer,
  CheckCircle,
} from "lucide-react";
import { formatInr } from "../../../../lib/inventoryMappers";
import { getApiErrorMessage } from "../../../../lib/api";
import { toast } from "../../../components/ui/hot-toast";
import type { CatalogService } from "../../../../lib/serviceCatalog";
import {
  appointmentServiceNames,
  customerInitials,
  totalDurationForServices,
} from "./appointmentHelpers";
import { statusColors, type Appointment, type AppointmentStatus } from "./boardTypes";

export type EditAppointmentDialogProps = {
  editAppt: Appointment | null;
  setEditAppt: React.Dispatch<React.SetStateAction<Appointment | null>>;
  serviceCatalog: CatalogService[];
  persistAppointmentEdit: (params: {
    id: string;
    customer: string;
    phone: string;
    services: string[];
    status?: AppointmentStatus;
  }) => Promise<void>;
};

export function EditAppointmentDialog({
  editAppt,
  setEditAppt,
  serviceCatalog,
  persistAppointmentEdit,
}: EditAppointmentDialogProps) {
  return (
    <Dialog open={!!editAppt} onOpenChange={open => !open && setEditAppt(null)}>
      <DialogContent aria-describedby={undefined} className="gap-0 overflow-hidden rounded-2xl border-black/[0.08] p-0 sm:max-w-lg [&>button:last-of-type]:absolute [&>button:last-of-type]:right-4 [&>button:last-of-type]:top-4 [&>button:last-of-type]:text-white/50 [&>button:last-of-type]:hover:text-white">
        <div className="relative border-b border-black/[0.06] bg-[#111118] px-6 py-5">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#D4AF37]/70 to-transparent" />
          <DialogHeader className="space-y-1 text-left">
            <DialogTitle className="flex items-center gap-2.5 text-[16px] font-bold text-white">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#D4AF37]/25 bg-[#D4AF37]/15">
                <Edit className="h-4 w-4 text-[#D4AF37]" />
              </div>
              Edit Appointment
            </DialogTitle>
            <p className="text-[12px] text-white/50">Update booking details or status</p>
          </DialogHeader>
        </div>

        {editAppt && (
          <div className="space-y-4 bg-[#f4f2ed] p-6">
            {/* Customer summary */}
            <div className="flex items-center gap-3 rounded-xl border border-[#D4AF37]/25 bg-[#FFFBEB] p-3.5 shadow-[0_2px_12px_rgba(212,175,55,0.08)]">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#C9A227] text-[12px] font-bold text-[#111118]">
                {customerInitials(editAppt.customer || "?")}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-bold text-[#111118]">{editAppt.customer || "Unnamed customer"}</p>
                <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-[#52525b]">
                  <Phone className="h-3 w-3 shrink-0 text-[#D4AF37]" />
                  {editAppt.phone || "No phone number on file"}
                </p>
              </div>
              <Badge className={cn("shrink-0 border text-[9px] font-bold capitalize", statusColors[editAppt.status])}>
                {editAppt.status}
              </Badge>
            </div>

            {/* Schedule snapshot */}
            <div className="grid grid-cols-3 gap-2.5">
              {[
                { icon: CalendarIcon, label: "Date", value: editAppt.date ?? "Today" },
                { icon: Clock, label: "Time", value: editAppt.time },
                {
                  icon: Timer,
                  label: "Duration",
                  value: `${totalDurationForServices(serviceCatalog, appointmentServiceNames(editAppt)) || editAppt.duration} min`,
                },
              ].map(({ icon: Icon, label, value }) => (
                <div
                  key={label}
                  className="rounded-xl border border-black/[0.06] bg-white px-3 py-2.5 text-center shadow-sm"
                >
                  <Icon className="mx-auto mb-1 h-3.5 w-3.5 text-[#D4AF37]" />
                  <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-[#52525b]">{label}</p>
                  <p className="mt-0.5 truncate text-[12px] font-semibold text-[#111118]">{value}</p>
                </div>
              ))}
            </div>

            {/* Contact */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <Label className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#52525b]">Customer Name</Label>
                <div className="relative mt-1.5">
                  <User className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#52525b]" />
                  <Input
                    value={editAppt.customer}
                    onChange={e => setEditAppt(a => a ? { ...a, customer: e.target.value } : a)}
                    className="h-10 rounded-xl border-black/[0.08] bg-white pl-9 focus:border-[#D4AF37]/40 focus:ring-[#D4AF37]/10"
                  />
                </div>
              </div>
              <div>
                <Label className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#52525b]">Phone</Label>
                <div className="relative mt-1.5">
                  <Phone className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#52525b]" />
                  <Input
                    value={editAppt.phone}
                    onChange={e => setEditAppt(a => a ? { ...a, phone: e.target.value } : a)}
                    className="h-10 rounded-xl border-black/[0.08] bg-white pl-9 focus:border-[#D4AF37]/40 focus:ring-[#D4AF37]/10"
                  />
                </div>
              </div>
            </div>

            {/* Services — multi-select */}
            <div className="space-y-3 rounded-xl border border-black/[0.06] bg-white p-3.5">
              <div className="flex items-center justify-between gap-2">
                <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[#52525b]">
                  <Scissors className="h-3 w-3 text-[#D4AF37]" />
                  Services
                </p>
                <span className="text-[10px] font-semibold text-[#D4AF37]">
                  {appointmentServiceNames(editAppt).length} selected ·{" "}
                  {totalDurationForServices(serviceCatalog, appointmentServiceNames(editAppt))} min
                </span>
              </div>
              <div className="max-h-52 space-y-1.5 overflow-y-auto pr-0.5">
                {serviceCatalog.length === 0 && (
                  <p className="py-4 text-center text-[12px] italic text-[#c0c0c0]">No services loaded</p>
                )}
                {serviceCatalog.map((s) => {
                  const selected = appointmentServiceNames(editAppt).includes(s.name);
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() =>
                        setEditAppt((a) => {
                          if (!a) return a;
                          const current = appointmentServiceNames(a);
                          const next = selected
                            ? current.filter((n) => n !== s.name)
                            : [...current, s.name];
                          if (next.length === 0) return a;
                          return {
                            ...a,
                            services: next,
                            service: next.join(", "),
                            duration: totalDurationForServices(serviceCatalog, next),
                          };
                        })
                      }
                      className={cn(
                        "flex w-full items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-all",
                        selected
                          ? "border-[#D4AF37]/40 bg-[#FFFBEB] shadow-sm"
                          : "border-black/[0.07] bg-[#faf9f7] hover:border-[#D4AF37]/25 hover:bg-white",
                      )}
                    >
                      <div
                        className={cn(
                          "flex h-5 w-5 shrink-0 items-center justify-center rounded-md",
                          selected
                            ? "bg-[#D4AF37] text-[#111118]"
                            : "border border-black/[0.08] bg-white text-[#c0c0c0]",
                        )}
                      >
                        {selected ? <Check className="h-3 w-3" strokeWidth={3} /> : <Plus className="h-3 w-3" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[12.5px] font-semibold text-[#111118]">{s.name}</p>
                        <p className="mt-0.5 text-[10px] text-[#52525b]">
                          {s.duration} min · {formatInr(s.price)}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Status */}
            <div className="rounded-xl border border-black/[0.06] bg-white p-3.5">
              <p className="mb-2.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[#52525b]">Appointment Status</p>
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    { value: "pending", label: "Pending" },
                    { value: "confirmed", label: "Confirmed" },
                    { value: "in-progress", label: "In Progress" },
                    { value: "completed", label: "Completed" },
                    { value: "cancelled", label: "Cancelled" },
                  ] as const
                ).map(({ value, label }) => {
                  const active = editAppt.status === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setEditAppt(a => a ? { ...a, status: value } : a)}
                      className={cn(
                        "rounded-lg border px-3 py-1.5 text-[11px] font-semibold capitalize transition-all",
                        active
                          ? "border-[#D4AF37]/40 bg-[#FFFBEB] text-[#9a7a1e] shadow-sm ring-1 ring-[#D4AF37]/20"
                          : "border-black/[0.08] bg-[#faf9f7] text-[#3f3f46] hover:border-[#D4AF37]/25 hover:bg-white",
                      )}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 border-t border-black/[0.06] bg-white px-6 py-4">
          <Button
            variant="outline"
            className="h-10 flex-1 rounded-xl border-black/[0.1] text-[13px] font-semibold sm:flex-none"
            onClick={() => setEditAppt(null)}
          >
            Cancel
          </Button>
          <Button
            className="h-10 flex-1 rounded-xl bg-[#111118] text-[13px] font-semibold text-[#D4AF37] hover:bg-[#1a1a1a] sm:flex-none"
            onClick={() => {
              if (!editAppt) return;
              void (async () => {
                try {
                  await persistAppointmentEdit({
                    id: editAppt.id,
                    customer: editAppt.customer,
                    phone: editAppt.phone,
                    services: appointmentServiceNames(editAppt),
                    status: editAppt.status,
                  });
                  setEditAppt(null);
                  toast.success("Appointment updated", {
                    description: `${editAppt.customer} · ${appointmentServiceNames(editAppt).length} service(s) · ${editAppt.time}`,
                  });
                } catch (error) {
                  toast.error(getApiErrorMessage(error, "Failed to save appointment"));
                }
              })();
            }}
          >
            <CheckCircle className="mr-1.5 h-3.5 w-3.5" />
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
