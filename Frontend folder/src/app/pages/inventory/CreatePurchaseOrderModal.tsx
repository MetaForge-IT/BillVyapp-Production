import type { Dispatch, SetStateAction } from "react";
import { Dialog, DialogContent, DialogTitle } from "../../components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Textarea } from "../../components/ui/textarea";
import type { Product } from "../../context/ProductsContext";
import type { VendorRecord } from "../../../api/vendors";
import { Package, Plus, ShoppingCart } from "lucide-react";

export type PoFormState = {
  vendorId: string; productId: string; quantity: string; unitCost: string; date: string; notes: string;
};

type CreatePurchaseOrderModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  poForm: PoFormState;
  setPoForm: Dispatch<SetStateAction<PoFormState>>;
  formErrors: Record<string, string>;
  vendors: VendorRecord[];
  products: Product[];
  saving: boolean;
  handleCreatePO: () => void | Promise<void>;
};

export function CreatePurchaseOrderModal({
  open, onOpenChange, poForm, setPoForm, formErrors,
  vendors, products, saving, handleCreatePO,
}: CreatePurchaseOrderModalProps) {
  const isCreatePOOpen = open;
  const setIsCreatePOOpen = onOpenChange;
  return (
        <Dialog open={isCreatePOOpen} onOpenChange={setIsCreatePOOpen}>
          <DialogContent className="w-[min(95vw,36rem)] max-w-none p-0 gap-0 overflow-hidden rounded-2xl [&>button:last-of-type]:hidden">
            {/* Header */}
            <div className="bg-[#111118] px-6 py-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-[#d4af37]/15 border border-[#d4af37]/20 flex items-center justify-center">
                  <ShoppingCart className="h-5 w-5 text-[#d4af37]" />
                </div>
                <div>
                  <DialogTitle className="text-white font-bold text-[14px] leading-tight">Create Purchase Order</DialogTitle>
                  <p className="text-gray-500 text-[11px] mt-0.5">Fill in the required fields to create a new PO</p>
                </div>
              </div>
              <button onClick={() => setIsCreatePOOpen(false)} className="h-8 w-8 rounded-lg bg-white/06 hover:bg-white/12 flex items-center justify-center text-gray-400 hover:text-white transition-all text-lg leading-none">×</button>
            </div>

            <div className="px-6 py-5 space-y-4">
              {/* Supplier */}
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Supplier <span className="text-[#d4af37]">*</span></p>
                <Select value={poForm.vendorId} onValueChange={v => setPoForm({ ...poForm, vendorId: v, productId: "" })}>
                  <SelectTrigger className="h-10 rounded-xl">
                    <SelectValue placeholder="Select supplier" />
                  </SelectTrigger>
                  <SelectContent>
                    {vendors.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                {vendors.length === 0 && (
                  <p className="text-[11px] text-amber-700">No vendors loaded — add one under the Vendors tab or click Refresh.</p>
                )}
                {formErrors.vendorId && <p className="text-[11px] text-red-500 mt-1">{formErrors.vendorId}</p>}
              </div>

              <div className="space-y-1.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Product <span className="text-[#d4af37]">*</span></p>
                <Select value={poForm.productId} onValueChange={v => setPoForm({ ...poForm, productId: v })}>
                  <SelectTrigger className="h-10 rounded-xl">
                    <SelectValue placeholder="Select product" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.length === 0 ? (
                      <SelectItem value="__none__" disabled>No products — add a product first</SelectItem>
                    ) : (
                      products.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}{p.supplier ? ` · ${p.supplier}` : ""}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {formErrors.productId && <p className="text-[11px] text-red-500 mt-1">{formErrors.productId}</p>}
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Quantity <span className="text-[#d4af37]">*</span></p>
                  <div className="relative">
                    <Package className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-300 pointer-events-none" />
                    <input type="number" value={poForm.quantity}
                      onChange={e => setPoForm({ ...poForm, quantity: e.target.value })}
                      placeholder="e.g. 5"
                      className="w-full h-10 pl-9 pr-3.5 rounded-xl border border-gray-200 bg-gray-50 text-[13px] text-[#111118] focus:outline-none focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/12 focus:bg-white transition-all placeholder:text-gray-300" />
                  </div>
                  {formErrors.quantity && <p className="text-[11px] text-red-500">{formErrors.quantity}</p>}
                </div>
                <div className="space-y-1.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Unit Cost (₹) <span className="text-[#d4af37]">*</span></p>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[13px] text-gray-400 pointer-events-none">₹</span>
                    <input value={poForm.unitCost}
                      onChange={e => setPoForm({ ...poForm, unitCost: e.target.value })}
                      placeholder="e.g. 620"
                      className="w-full h-10 pl-8 pr-3.5 rounded-xl border border-gray-200 bg-gray-50 text-[13px] font-semibold text-[#111118] focus:outline-none focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/12 focus:bg-white transition-all placeholder:font-normal placeholder:text-gray-300" />
                  </div>
                  {formErrors.unitCost && <p className="text-[11px] text-red-500">{formErrors.unitCost}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <div className="space-y-1.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Order Date <span className="text-[#d4af37]">*</span></p>
                  <input type="date" value={poForm.date}
                    onChange={e => setPoForm({ ...poForm, date: e.target.value })}
                    className="w-full h-10 px-3.5 rounded-xl border border-gray-200 bg-gray-50 text-[13px] text-[#111118] focus:outline-none focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/12 focus:bg-white transition-all" />
                  {formErrors.date && <p className="text-[11px] text-red-500">{formErrors.date}</p>}
                </div>
              </div>
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Notes</p>
                <Textarea value={poForm.notes} onChange={(e) => setPoForm({ ...poForm, notes: e.target.value })} placeholder="Optional purchase notes" className="min-h-[72px] rounded-xl" />
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/60 flex items-center justify-end gap-2">
              <button onClick={() => setIsCreatePOOpen(false)}
                className="h-10 px-5 rounded-xl border border-gray-200 bg-white text-[13px] font-semibold text-gray-600 hover:bg-gray-50 transition-all">
                Cancel
              </button>
              <button onClick={() => void handleCreatePO()} disabled={saving}
                className="h-10 px-6 rounded-xl bg-gradient-to-r from-[#d4af37] to-[#b8962e] text-[13px] font-bold text-black transition-all flex items-center gap-2 shadow-md shadow-[#d4af37]/20">
                <Plus className="h-4 w-4" /> {saving ? "Saving…" : "Create PO"}
              </button>
            </div>
          </DialogContent>
        </Dialog>
  );
}
