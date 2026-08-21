import type { Dispatch, SetStateAction } from "react";
import { UserPlus, X } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { Dialog, DialogContent, DialogTitle } from "../../components/ui/dialog";

export type NewCustomerForm = {
  name: string;
  phone: string;
  email: string;
  gender: "male" | "female" | "other" | "";
  membershipTier: string;
  birthday: string;
  address: string;
  notes: string;
};

export const EMPTY_NEW_CUSTOMER: NewCustomerForm = {
  name: "",
  phone: "",
  email: "",
  gender: "",
  membershipTier: "basic",
  birthday: "",
  address: "",
  notes: "",
};

export function AddCustomerModal({
  open,
  onOpenChange,
  newCustomer,
  setNewCustomer,
  onAdd,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  newCustomer: NewCustomerForm;
  setNewCustomer: Dispatch<SetStateAction<NewCustomerForm>>;
  onAdd: () => void;
}) {
  const resetAndClose = () => {
    onOpenChange(false);
    setNewCustomer(EMPTY_NEW_CUSTOMER);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) setNewCustomer(EMPTY_NEW_CUSTOMER);
      }}
    >
      <DialogContent className="sm:max-w-xl p-0 gap-0 overflow-hidden rounded-2xl [&>button:last-of-type]:hidden">
        {/* Dark header */}
        <div className="bg-[#111118] px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-[#d4af37]/15 border border-[#d4af37]/20 flex items-center justify-center shrink-0">
              <UserPlus className="h-4.5 w-4.5 text-[#d4af37]" style={{ height: 18, width: 18 }} />
            </div>
            <div>
              <DialogTitle className="text-[15px] font-bold text-white leading-tight">Add New Customer</DialogTitle>
              <p className="text-[11px] text-white/40 mt-0.5">
                Fields marked <span className="text-red-400">*</span> are required
              </p>
            </div>
          </div>
          <button
            onClick={resetAndClose}
            className="h-7 w-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors shrink-0"
          >
            <X className="h-3.5 w-3.5 text-white/70" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto max-h-[70vh] bg-[#faf8f2] px-6 py-5 space-y-5">
          {/* Contact Information */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#b8962e] mb-3">Contact Information</p>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-600">
                  Full Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  autoFocus
                  placeholder="e.g. Priya Sharma"
                  value={newCustomer.name}
                  onChange={(e) => setNewCustomer((d) => ({ ...d, name: e.target.value }))}
                  className="h-10 px-3.5 rounded-xl border border-black/[0.08] bg-white focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/12 focus:bg-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-600">
                    Phone <span className="text-red-500">*</span>
                  </Label>
                  <div className="flex h-10 rounded-xl border border-black/[0.08] bg-white overflow-hidden focus-within:border-[#d4af37] focus-within:ring-2 focus-within:ring-[#d4af37]/12">
                    <span className="flex items-center px-3 text-xs font-bold text-white bg-[#111118] border-r border-black/[0.08] shrink-0">
                      +91
                    </span>
                    <input
                      placeholder="98765 00000"
                      value={newCustomer.phone.replace(/^\+91\s?/, "")}
                      onChange={(e) => setNewCustomer((d) => ({ ...d, phone: "+91 " + e.target.value }))}
                      className="flex-1 px-3 text-sm bg-transparent outline-none placeholder:text-gray-400"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-600">
                    Email <span className="text-[10px] text-gray-400 font-normal">(optional)</span>
                  </Label>
                  <Input
                    type="email"
                    placeholder="email@example.com"
                    value={newCustomer.email}
                    onChange={(e) => setNewCustomer((d) => ({ ...d, email: e.target.value }))}
                    className="h-10 px-3.5 rounded-xl border border-black/[0.08] bg-white focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/12"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-[#d4af37]/10" />

          {/* Personal Details */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#b8962e] mb-3">Personal Details</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-600">Gender</Label>
                <div className="flex gap-1.5">
                  {(
                    [
                      { v: "female" as const, l: "♀ Female" },
                      { v: "male" as const, l: "♂ Male" },
                      { v: "other" as const, l: "⚧ Other" },
                    ] as const
                  ).map((g) => (
                    <button
                      key={g.v}
                      type="button"
                      onClick={() =>
                        setNewCustomer((d) => ({
                          ...d,
                          gender: d.gender === g.v ? "" : g.v,
                        }))
                      }
                      className={`flex-1 py-2 rounded-lg text-[11px] font-semibold border transition-all ${
                        newCustomer.gender === g.v
                          ? "bg-[#111118] text-[#d4af37] border-[#111118]"
                          : "bg-white text-gray-500 border-black/[0.08] hover:border-gray-300"
                      }`}
                    >
                      {g.l}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-600">
                  Birthday <span className="text-[10px] text-gray-400 font-normal">(optional)</span>
                </Label>
                <Input
                  type="date"
                  value={newCustomer.birthday}
                  onChange={(e) => setNewCustomer((d) => ({ ...d, birthday: e.target.value }))}
                  className="h-10 px-3.5 rounded-xl border border-black/[0.08] bg-white focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/12"
                />
              </div>
            </div>
          </div>

          <div className="border-t border-[#d4af37]/10" />

          {/* Location & Notes */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#b8962e] mb-3">Location & Notes</p>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-600">
                  Address <span className="text-[10px] text-gray-400 font-normal">(optional)</span>
                </Label>
                <Input
                  placeholder="Street, City"
                  value={newCustomer.address}
                  onChange={(e) => setNewCustomer((d) => ({ ...d, address: e.target.value }))}
                  className="h-10 px-3.5 rounded-xl border border-black/[0.08] bg-white focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/12"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-600">
                  Notes / Allergies <span className="text-[10px] text-gray-400 font-normal">(optional)</span>
                </Label>
                <Textarea
                  rows={2}
                  placeholder="Allergies, preferences, special notes…"
                  value={newCustomer.notes}
                  onChange={(e) => setNewCustomer((d) => ({ ...d, notes: e.target.value }))}
                  className="px-3.5 py-2.5 rounded-xl border border-black/[0.08] bg-white focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/12 resize-none text-sm"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-gray-100 bg-white">
          <p className="text-[11px] text-gray-400">
            {newCustomer.name && newCustomer.phone ? (
              <span className="text-emerald-600 font-medium">✓ Ready to add</span>
            ) : (
              "Name & phone required"
            )}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl h-9 text-sm">
              Cancel
            </Button>
            <Button
              onClick={onAdd}
              disabled={!newCustomer.name || !newCustomer.phone}
              className="rounded-xl h-9 text-sm bg-gradient-to-r from-[#d4af37] to-[#b8962e] text-black font-bold hover:opacity-90 disabled:opacity-40 px-5"
            >
              <UserPlus className="h-3.5 w-3.5 mr-1.5" />
              Add Customer
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
