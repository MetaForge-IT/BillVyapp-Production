import type { Dispatch, SetStateAction } from "react";
import { Dialog, DialogContent, DialogTitle } from "../../components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { cn } from "../../components/ui/utils";
import type { Product } from "../../context/ProductsContext";
import type { ProductCategory } from "../../../api/product-categories";
import type { VendorRecord } from "../../../api/vendors";
import { Package, Plus, X } from "lucide-react";

export type ProductFormState = {
  name: string; sku: string; categoryId: string; brand: string; stock: string; minStock: string;
  price: string; costPrice: string; vendorId: string; barcode: string; unit: string; gstRate: string;
};

type AddProductModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingProduct: Product | null;
  newProduct: ProductFormState;
  setNewProduct: Dispatch<SetStateAction<ProductFormState>>;
  formErrors: Record<string, string>;
  productCategories: ProductCategory[];
  vendors: VendorRecord[];
  saving: boolean;
  handleSaveProduct: () => void | Promise<void>;
};

export function AddProductModal({
  open, onOpenChange, editingProduct, newProduct, setNewProduct,
  formErrors, productCategories, vendors, saving, handleSaveProduct,
}: AddProductModalProps) {
  const isAddProductOpen = open;
  const setIsAddProductOpen = onOpenChange;
  return (
        <Dialog open={isAddProductOpen} onOpenChange={setIsAddProductOpen}>
          <DialogContent className="w-[min(100%,42rem)] max-w-[calc(100%-1rem)] p-0 overflow-hidden rounded-2xl border-0 shadow-2xl max-h-[95dvh] max-sm:dialog-mobile-sheet [&>button:last-of-type]:hidden">

            {/* Header */}
            <div className="relative bg-gradient-to-br from-[#1a1a1a] via-[#222] to-[#2d2d2d] px-4 pt-6 pb-5 sm:px-7 sm:pt-7 sm:pb-6">
              <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: "radial-gradient(circle at 70% 30%, #d4af37 0%, transparent 60%)" }} />
              <div className="relative flex items-start gap-3 sm:gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#d4af37]/15 border border-[#d4af37]/30 sm:h-12 sm:w-12">
                  <Package className="h-5 w-5 text-[#d4af37] sm:h-6 sm:w-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <DialogTitle className="text-lg font-bold text-white tracking-tight sm:text-xl">{editingProduct ? "Edit Product" : "Add New Product"}</DialogTitle>
                  <p className="text-xs text-white/50 mt-0.5 sm:text-sm">{editingProduct ? "Update product details in inventory" : "Fill in all required fields to add a product to inventory"}</p>
                </div>
                <button onClick={() => setIsAddProductOpen(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-white/50 hover:text-white transition-all">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="overflow-y-auto max-h-[calc(95dvh-200px)] px-4 py-5 sm:px-7 sm:py-6 bg-[#fafaf8] space-y-5">

              {/* Section: Identity */}
              <div>
                <p className="text-[11px] font-bold uppercase tracking-widest text-[#d4af37] mb-3">Product Identity</p>
                <div className="form-grid-2 gap-4">
                  <div className="sm:col-span-2 space-y-1.5">
                    <label className="text-[12px] font-semibold text-[#333]">Product Name <span className="text-red-500">*</span></label>
                    <input value={newProduct.name} onChange={e => setNewProduct({ ...newProduct, name: e.target.value })}
                      placeholder="e.g. L'Oreal Professional Shampoo"
                      className={`w-full h-10 px-3.5 rounded-xl border text-[13px] text-[#111] bg-white outline-none transition-all focus:ring-2 focus:ring-[#d4af37]/20 focus:border-[#d4af37]/60 placeholder:text-gray-400 ${formErrors.name ? "border-red-400 bg-red-50" : "border-gray-200 hover:border-gray-300"}`} />
                    {formErrors.name && <p className="text-[11px] text-red-500 flex items-center gap-1"><span>⚠</span>{formErrors.name}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[12px] font-semibold text-[#333]">SKU <span className="text-red-500">*</span></label>
                    <input value={newProduct.sku} onChange={e => setNewProduct({ ...newProduct, sku: e.target.value })}
                      placeholder="e.g. LPS-001"
                      className={`w-full h-10 px-3.5 rounded-xl border text-[13px] text-[#111] bg-white outline-none transition-all focus:ring-2 focus:ring-[#d4af37]/20 focus:border-[#d4af37]/60 placeholder:text-gray-400 font-mono ${formErrors.sku ? "border-red-400 bg-red-50" : "border-gray-200 hover:border-gray-300"}`} />
                    {formErrors.sku && <p className="text-[11px] text-red-500 flex items-center gap-1"><span>⚠</span>{formErrors.sku}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[12px] font-semibold text-[#333]">Brand <span className="text-red-500">*</span></label>
                    <input value={newProduct.brand} onChange={e => setNewProduct({ ...newProduct, brand: e.target.value })}
                      placeholder="e.g. L'Oreal"
                      className={`w-full h-10 px-3.5 rounded-xl border text-[13px] text-[#111] bg-white outline-none transition-all focus:ring-2 focus:ring-[#d4af37]/20 focus:border-[#d4af37]/60 placeholder:text-gray-400 ${formErrors.brand ? "border-red-400 bg-red-50" : "border-gray-200 hover:border-gray-300"}`} />
                    {formErrors.brand && <p className="text-[11px] text-red-500 flex items-center gap-1"><span>⚠</span>{formErrors.brand}</p>}
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-200" />

              {/* Section: Classification */}
              <div>
                <p className="text-[11px] font-bold uppercase tracking-widest text-[#d4af37] mb-3">Classification</p>
                <div className="form-grid-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[12px] font-semibold text-[#333]">Category <span className="text-red-500">*</span></label>
                    <Select value={newProduct.categoryId} onValueChange={v => setNewProduct({ ...newProduct, categoryId: v })}>
                      <SelectTrigger className={cn("h-10 rounded-xl", formErrors.categoryId ? "border-red-400 bg-red-50" : "")}>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {productCategories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    {formErrors.categoryId && <p className="text-[11px] text-red-500 flex items-center gap-1"><span>⚠</span>{formErrors.categoryId}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[12px] font-semibold text-[#333]">Supplier <span className="text-red-500">*</span></label>
                    <Select value={newProduct.vendorId} onValueChange={v => setNewProduct({ ...newProduct, vendorId: v })}>
                      <SelectTrigger className={cn("h-10 rounded-xl", formErrors.vendorId ? "border-red-400 bg-red-50" : "")}>
                        <SelectValue placeholder="Select supplier" />
                      </SelectTrigger>
                      <SelectContent>
                        {vendors.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    {formErrors.vendorId && <p className="text-[11px] text-red-500 flex items-center gap-1"><span>⚠</span>{formErrors.vendorId}</p>}
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-200" />

              {/* Section: Stock */}
              <div>
                <p className="text-[11px] font-bold uppercase tracking-widest text-[#d4af37] mb-3">Stock Levels</p>
                <div className="form-grid-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[12px] font-semibold text-[#333]">Current Stock {!editingProduct && <span className="text-red-500">*</span>}</label>
                    <div className="relative">
                      <input type="number" value={newProduct.stock} onChange={e => setNewProduct({ ...newProduct, stock: e.target.value })}
                        placeholder="e.g. 45"
                        disabled={!!editingProduct}
                        className={`w-full h-10 px-3.5 pr-12 rounded-xl border text-[13px] text-[#111] bg-white outline-none transition-all focus:ring-2 focus:ring-[#d4af37]/20 focus:border-[#d4af37]/60 placeholder:text-gray-400 ${formErrors.stock ? "border-red-400 bg-red-50" : "border-gray-200 hover:border-gray-300"} ${editingProduct ? "opacity-60" : ""}`} />
                      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-gray-400">units</span>
                    </div>
                    {formErrors.stock && <p className="text-[11px] text-red-500 flex items-center gap-1"><span>⚠</span>{formErrors.stock}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[12px] font-semibold text-[#333]">Minimum Stock <span className="text-red-500">*</span>
                      <span className="ml-1 text-[10px] font-normal text-gray-400">(reorder alert)</span>
                    </label>
                    <div className="relative">
                      <input type="number" value={newProduct.minStock} onChange={e => setNewProduct({ ...newProduct, minStock: e.target.value })}
                        placeholder="e.g. 20"
                        className={`w-full h-10 px-3.5 pr-12 rounded-xl border text-[13px] text-[#111] bg-white outline-none transition-all focus:ring-2 focus:ring-[#d4af37]/20 focus:border-[#d4af37]/60 placeholder:text-gray-400 ${formErrors.minStock ? "border-red-400 bg-red-50" : "border-gray-200 hover:border-gray-300"}`} />
                      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-gray-400">units</span>
                    </div>
                    {formErrors.minStock && <p className="text-[11px] text-red-500 flex items-center gap-1"><span>⚠</span>{formErrors.minStock}</p>}
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-200" />

              {/* Section: Pricing */}
              <div>
                <p className="text-[11px] font-bold uppercase tracking-widest text-[#d4af37] mb-3">Pricing</p>
                <div className="form-grid-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[12px] font-semibold text-[#333]">Selling Price <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[13px] font-bold text-[#d4af37]">₹</span>
                      <input value={newProduct.price} onChange={e => setNewProduct({ ...newProduct, price: e.target.value })}
                        placeholder="850"
                        className={`w-full h-10 pl-8 pr-3.5 rounded-xl border text-[13px] text-[#111] bg-white outline-none transition-all focus:ring-2 focus:ring-[#d4af37]/20 focus:border-[#d4af37]/60 placeholder:text-gray-400 ${formErrors.price ? "border-red-400 bg-red-50" : "border-gray-200 hover:border-gray-300"}`} />
                    </div>
                    {formErrors.price && <p className="text-[11px] text-red-500 flex items-center gap-1"><span>⚠</span>{formErrors.price}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[12px] font-semibold text-[#333]">Cost Price <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[13px] font-bold text-gray-400">₹</span>
                      <input value={newProduct.costPrice} onChange={e => setNewProduct({ ...newProduct, costPrice: e.target.value })}
                        placeholder="620"
                        className={`w-full h-10 pl-8 pr-3.5 rounded-xl border text-[13px] text-[#111] bg-white outline-none transition-all focus:ring-2 focus:ring-[#d4af37]/20 focus:border-[#d4af37]/60 placeholder:text-gray-400 ${formErrors.costPrice ? "border-red-400 bg-red-50" : "border-gray-200 hover:border-gray-300"}`} />
                    </div>
                    {formErrors.costPrice && <p className="text-[11px] text-red-500 flex items-center gap-1"><span>⚠</span>{formErrors.costPrice}</p>}
                    {newProduct.price && newProduct.costPrice && !isNaN(Number(newProduct.price)) && !isNaN(Number(newProduct.costPrice)) && Number(newProduct.costPrice) > 0 && (
                      <p className="text-[11px] text-emerald-600 font-semibold">
                        Margin: {Math.round(((Number(newProduct.price) - Number(newProduct.costPrice)) / Number(newProduct.price)) * 100)}%
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="inventory-dialog-footer px-4 py-4 sm:px-7 bg-white border-t border-gray-100">
              <p className="text-[11px] text-gray-400 text-center sm:text-left"><span className="text-red-400">*</span> Required fields</p>
              <div className="inventory-dialog-footer-actions">
                <button onClick={() => setIsAddProductOpen(false)}
                  className="h-10 px-5 rounded-xl border border-gray-200 text-[13px] font-semibold text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-all">
                  Cancel
                </button>
                <button onClick={() => void handleSaveProduct()} disabled={saving}
                  className="h-10 px-6 rounded-xl bg-gradient-to-r from-[#d4af37] to-[#b8962e] text-[13px] font-bold text-black hover:from-[#c9a42e] hover:to-[#a8862a] shadow-[0_2px_12px_rgba(212,175,55,0.35)] hover:shadow-[0_4px_16px_rgba(212,175,55,0.45)] transition-all flex items-center justify-center gap-2">
                  <Plus className="h-4 w-4" /> {saving ? "Saving…" : editingProduct ? "Save Changes" : "Add Product"}
                </button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
  );
}
