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
import { Edit, Phone, User, Scissors, Check, Plus } from "lucide-react";
import { formatInr } from "../../../../lib/inventoryMappers";
import { getApiErrorMessage } from "../../../../lib/api";
import { toast } from "../../../components/ui/hot-toast";
import type { CatalogService } from "../../../../lib/serviceCatalog";
import { appointmentServiceNames, customerInitials } from "./appointmentHelpers";
import { statusColors, type Walkin } from "./boardTypes";

export type EditWalkinDialogProps = {
  editWalkin: Walkin | null;
  setEditWalkin: React.Dispatch<React.SetStateAction<Walkin | null>>;
  serviceCatalog: CatalogService[];
  persistAppointmentEdit: (params: {
    id: string;
    customer: string;
    phone: string;
    services: string[];
  }) => Promise<void>;
};

export function EditWalkinDialog({
  editWalkin,
  setEditWalkin,
  serviceCatalog,
  persistAppointmentEdit,
}: EditWalkinDialogProps) {
  return (
    <Dialog open={!!editWalkin} onOpenChange={open => !open && setEditWalkin(null)}>
      <DialogContent aria-describedby={undefined} className="gap-0 overflow-hidden rounded-2xl border-black/[0.08] p-0 sm:max-w-lg">
        <div className="relative border-b border-black/[0.06] bg-[#111118] px-6 py-5">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#D4AF37]/70 to-transparent" />
          <DialogHeader className="space-y-1 text-left">
            <DialogTitle className="flex items-center gap-2.5 text-[16px] font-bold text-white">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#D4AF37]/25 bg-[#D4AF37]/15">
                <Edit className="h-4 w-4 text-[#D4AF37]" />
              </div>
              Edit Walk-In
            </DialogTitle>
            <p className="text-[12px] text-white/50">Update details for this walk-in visit</p>
          </DialogHeader>
        </div>
        {editWalkin && (
          <div className="space-y-4 bg-[#f4f2ed] p-6">
            {/* Recipient summary card */}
            <div className="flex items-center gap-3 rounded-xl border border-[#D4AF37]/25 bg-[#FFFBEB] p-3.5 shadow-[0_2px_12px_rgba(212,175,55,0.08)]">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#C9A227] text-[12px] font-bold text-[#111118]">
                {customerInitials(editWalkin.customer || "?")}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-bold text-[#111118]">{editWalkin.customer || "Unnamed walk-in"}</p>
                <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-[#9a9a9a]">
                  <Phone className="h-3 w-3 shrink-0 text-[#D4AF37]" />
                  {editWalkin.phone || "No phone number on file"}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <Badge className="border border-black/[0.08] bg-black/[0.06] text-[9px] font-bold text-[#6b6b6b]">
                  {editWalkin.token}
                </Badge>
                <Badge className={cn("border text-[9px] font-bold capitalize", statusColors[editWalkin.status])}>
                  {editWalkin.status}
                </Badge>
              </div>
            </div>

            {/* Contact fields */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#9a9a9a]">Customer Name</Label>
                <div className="relative mt-1.5">
                  <User className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#9a9a9a]" />
                  <Input
                    value={editWalkin.customer}
                    onChange={e => setEditWalkin(w => w ? { ...w, customer: e.target.value } : w)}
                    className="h-10 rounded-xl border-black/[0.08] bg-white pl-9 focus:border-[#D4AF37]/40 focus:ring-[#D4AF37]/10"
                  />
                </div>
              </div>
              <div>
                <Label className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#9a9a9a]">Phone</Label>
                <div className="relative mt-1.5">
                  <Phone className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#9a9a9a]" />
                  <Input
                    value={editWalkin.phone}
                    onChange={e => setEditWalkin(w => w ? { ...w, phone: e.target.value } : w)}
                    className="h-10 rounded-xl border-black/[0.08] bg-white pl-9 focus:border-[#D4AF37]/40 focus:ring-[#D4AF37]/10"
                  />
                </div>
              </div>
            </div>

            {/* Service assignment — multi-select */}
            <div className="rounded-xl border border-black/[0.06] bg-white p-3.5 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[#9a9a9a]">
                  <Scissors className="h-3 w-3 text-[#D4AF37]" /> Services
                </p>
                <span className="text-[10px] font-semibold text-[#D4AF37]">
                  {appointmentServiceNames(editWalkin).length} selected
                </span>
              </div>
              <div className="max-h-48 space-y-1.5 overflow-y-auto pr-0.5">
                {serviceCatalog.map((s) => {
                  const selected = appointmentServiceNames(editWalkin).includes(s.name);
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() =>
                        setEditWalkin((w) => {
                          if (!w) return w;
                          const current = appointmentServiceNames(w);
                          const next = selected
                            ? current.filter((n) => n !== s.name)
                            : [...current, s.name];
                          if (next.length === 0) return w;
                          return {
                            ...w,
                            services: next,
                            service: next.join(", "),
                          };
                        })
                      }
                      className={cn(
                        "flex w-full items-center gap-2.5 rounded-xl border px-3 py-2 text-left transition-all",
                        selected
                          ? "border-[#D4AF37]/40 bg-[#FFFBEB] shadow-sm"
                          : "border-black/[0.07] bg-[#faf9f7] hover:border-[#D4AF37]/25",
                      )}
                    >
                      <div
                        className={cn(
                          "flex h-5 w-5 shrink-0 items-center justify-center rounded-md",
                          selected ? "bg-[#D4AF37] text-[#111118]" : "bg-white text-[#c0c0c0] border border-black/[0.08]",
                        )}
                      >
                        {selected ? <Check className="h-3 w-3" strokeWidth={3} /> : <Plus className="h-3 w-3" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[12.5px] font-semibold text-[#111118]">{s.name}</p>
                        <p className="text-[10px] text-[#9a9a9a]">{s.duration} min · {formatInr(s.price)}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
        <DialogFooter className="border-t border-black/[0.06] bg-white px-6 py-4 gap-2">
          <Button variant="outline" className="rounded-xl" onClick={() => setEditWalkin(null)}>Cancel</Button>
          <Button
            className="rounded-xl bg-[#111118] text-[#D4AF37] hover:bg-[#1a1a1a]"
            onClick={() => {
              if (!editWalkin) return;
              void (async () => {
                try {
                  await persistAppointmentEdit({
                    id: editWalkin.id,
                    customer: editWalkin.customer,
                    phone: editWalkin.phone,
                    services: appointmentServiceNames(editWalkin),
                  });
                  setEditWalkin(null);
                  toast.success("Walk-in updated");
                } catch (error) {
                  toast.error(getApiErrorMessage(error, "Failed to save walk-in"));
                }
              })();
            }}
          >
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
