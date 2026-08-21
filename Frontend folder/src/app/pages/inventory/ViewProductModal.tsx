import { Badge } from "../../components/ui/badge";
import { Dialog, DialogContent } from "../../components/ui/dialog";
import type { Product } from "../../context/ProductsContext";
import { Package, ShoppingCart, Pencil, Trash2 } from "lucide-react";
import { statusConfig } from "./inventoryUi";

type ViewProductModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedProduct: Product | null;
  saving: boolean;
  handleDeleteProduct: (product: Product) => void | Promise<void>;
  openEditProduct: (product: Product) => void;
  openOrderModal: (product: Product) => void;
};

export function ViewProductModal({
  open, onOpenChange, selectedProduct, saving,
  handleDeleteProduct, openEditProduct, openOrderModal,
}: ViewProductModalProps) {
  const isViewProductOpen = open;
  const setIsViewProductOpen = onOpenChange;
  return (
        <Dialog open={isViewProductOpen} onOpenChange={setIsViewProductOpen}>
          <DialogContent className="w-[min(95vw,34rem)] max-w-none p-0 gap-0 overflow-hidden rounded-2xl [&>button:last-of-type]:hidden">
            {/* Header */}
            <div className="bg-[#111118] px-6 py-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-[#d4af37]/15 border border-[#d4af37]/20 flex items-center justify-center">
                  <Package className="h-5 w-5 text-[#d4af37]" />
                </div>
                <div>
                  <p className="text-white font-bold text-[14px] leading-tight">Product Details</p>
                  <p className="text-gray-500 text-[11px] mt-0.5">{selectedProduct?.category} · SKU {selectedProduct?.sku}</p>
                </div>
              </div>
              <button onClick={() => setIsViewProductOpen(false)} className="h-8 w-8 rounded-lg bg-white/06 hover:bg-white/12 flex items-center justify-center text-gray-400 hover:text-white transition-all text-lg leading-none">×</button>
            </div>

            {selectedProduct && (
              <div className="max-h-[calc(100dvh-11rem)] space-y-4 overflow-y-auto bg-[#faf8f2] px-4 py-5 sm:px-6">
                {/* Hero card */}
                <div className="flex items-center gap-4 p-4 rounded-xl bg-white border border-gray-200">
                  <div className="h-12 w-12 rounded-xl bg-[#111118] flex items-center justify-center shrink-0">
                    <Package className="h-6 w-6 text-[#d4af37]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[15px] font-bold text-[#111118] truncate">{selectedProduct.name}</p>
                    <p className="text-[12px] text-gray-500 mt-0.5">{selectedProduct.brand} · {selectedProduct.supplier}</p>
                  </div>
                  <Badge className={statusConfig[selectedProduct.status as keyof typeof statusConfig].className}>
                    {statusConfig[selectedProduct.status as keyof typeof statusConfig].label}
                  </Badge>
                </div>

                {/* Stock bar */}
                <div className="p-4 rounded-xl bg-white border border-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#b8962e]">Stock Level</p>
                    <p className={`text-[13px] font-black ${selectedProduct.stock === 0 ? "text-red-600" : selectedProduct.stock < selectedProduct.minStock ? "text-orange-500" : "text-emerald-600"}`}>
                      {selectedProduct.stock} <span className="text-[11px] font-normal text-gray-400">/ min {selectedProduct.minStock}</span>
                    </p>
                  </div>
                  <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${selectedProduct.stock === 0 ? "bg-red-500" : selectedProduct.stock < selectedProduct.minStock ? "bg-orange-400" : "bg-emerald-500"}`}
                      style={{ width: `${Math.min(100, (selectedProduct.stock / (selectedProduct.minStock * 2)) * 100)}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1.5">Last ordered: {selectedProduct.lastOrder}</p>
                </div>

                {/* Pricing */}
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#b8962e] mb-3">Pricing</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-xl bg-white border border-gray-200 text-center">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Selling Price</p>
                      <p className="text-[18px] font-black text-[#111118]">{selectedProduct.price}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-white border border-gray-200 text-center">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Cost Price</p>
                      <p className="text-[18px] font-black text-[#111118]">{selectedProduct.costPrice}</p>
                    </div>
                  </div>
                </div>

                {/* Details */}
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#b8962e] mb-3">Details</p>
                  <div className="rounded-xl bg-white border border-gray-200 divide-y divide-gray-100">
                    {[
                      { label: "Category", value: selectedProduct.category },
                      { label: "Brand", value: selectedProduct.brand },
                      { label: "Supplier", value: selectedProduct.supplier },
                      { label: "SKU", value: selectedProduct.sku, mono: true },
                    ].map(({ label, value, mono }) => (
                      <div key={label} className="flex items-center justify-between px-4 py-2.5">
                        <span className="text-[12px] text-gray-500">{label}</span>
                        <span className={`text-[12px] font-semibold text-[#111118] ${mono ? "font-mono" : ""}`}>{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="flex flex-col items-stretch gap-2 border-t border-gray-100 bg-white px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <button onClick={() => selectedProduct && void handleDeleteProduct(selectedProduct)} disabled={saving}
                className="h-10 px-4 rounded-xl border border-red-200 text-red-600 text-[13px] font-semibold hover:bg-red-50 transition-all flex items-center gap-2">
                <Trash2 className="h-4 w-4" /> Delete
              </button>
              <div className="flex flex-wrap items-center justify-end gap-2">
              <button onClick={() => setIsViewProductOpen(false)}
                className="h-10 px-5 rounded-xl border border-gray-200 bg-white text-[13px] font-semibold text-gray-600 hover:bg-gray-50 transition-all">
                Close
              </button>
              <button onClick={() => { if (selectedProduct) { setIsViewProductOpen(false); openEditProduct(selectedProduct); } }}
                className="h-10 px-5 rounded-xl border border-gray-200 bg-white text-[13px] font-semibold text-gray-600 hover:bg-gray-50 transition-all flex items-center gap-2">
                <Pencil className="h-4 w-4" /> Edit
              </button>
              {(selectedProduct?.status === "low" || selectedProduct?.status === "critical" || selectedProduct?.status === "out") && (
                <button onClick={() => { setIsViewProductOpen(false); setTimeout(() => openOrderModal(selectedProduct), 200); }}
                  className="h-10 px-6 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 text-[13px] font-bold text-white transition-all flex items-center gap-2 shadow-md shadow-orange-500/20">
                  <ShoppingCart className="h-4 w-4" /> Reorder
                </button>
              )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
  );
}
