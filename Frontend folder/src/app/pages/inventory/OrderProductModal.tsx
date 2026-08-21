import type { Dispatch, SetStateAction } from "react";
import { Dialog, DialogContent } from "../../components/ui/dialog";
import type { Product } from "../../context/ProductsContext";
import { Package, ShoppingCart, AlertTriangle } from "lucide-react";

export type OrderFormState = { quantity: string; notes: string };

type SharedOrderProps = {
  selectedProduct: Product | null;
  orderForm: OrderFormState;
  setOrderForm: Dispatch<SetStateAction<OrderFormState>>;
  formErrors: Record<string, string>;
  saving: boolean;
  handleOrderProduct: () => void | Promise<void>;
};

type OrderProductModalProps = SharedOrderProps & {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function OrderProductModal({
  open, onOpenChange, selectedProduct, orderForm, setOrderForm,
  formErrors, saving, handleOrderProduct,
}: OrderProductModalProps) {
  const isOrderProductOpen = open;
  const setIsOrderProductOpen = onOpenChange;
  return (
        <Dialog open={isOrderProductOpen} onOpenChange={setIsOrderProductOpen}>
          <DialogContent className="w-[min(95vw,34rem)] max-w-none p-0 gap-0 overflow-hidden rounded-2xl [&>button:last-of-type]:hidden">
            {/* Header */}
            <div className="bg-[#111118] px-6 py-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-[#d4af37]/15 border border-[#d4af37]/20 flex items-center justify-center">
                  <ShoppingCart className="h-5 w-5 text-[#d4af37]" />
                </div>
                <div>
                  <p className="text-white font-bold text-[14px] leading-tight">Reorder Product</p>
                  <p className="text-gray-500 text-[11px] mt-0.5">{selectedProduct?.supplier}</p>
                </div>
              </div>
              <button onClick={() => setIsOrderProductOpen(false)} className="h-8 w-8 rounded-lg bg-white/06 hover:bg-white/12 flex items-center justify-center text-gray-400 hover:text-white transition-all text-lg leading-none">×</button>
            </div>

            <div className="px-6 py-5 space-y-4 bg-[#faf8f2]">
              {/* Product info card */}
              {selectedProduct && (
                <div className="flex items-center gap-4 p-4 rounded-xl bg-white border border-gray-200">
                  <div className="h-11 w-11 rounded-xl bg-[#111118] flex items-center justify-center shrink-0">
                    <Package className="h-5 w-5 text-[#d4af37]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-bold text-[#111118] truncate">{selectedProduct.name}</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">{selectedProduct.category} · SKU: {selectedProduct.sku}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-0.5">In Stock</p>
                    <p className={`text-[22px] font-black leading-none ${selectedProduct.stock === 0 ? "text-red-600" : selectedProduct.stock < selectedProduct.minStock ? "text-orange-500" : "text-emerald-600"}`}>{selectedProduct.stock}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">Min: {selectedProduct.minStock}</p>
                  </div>
                </div>
              )}

              {/* Suggested qty hint */}
              {selectedProduct && selectedProduct.stock < selectedProduct.minStock && (
                <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-amber-50 border border-amber-200">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                  <p className="text-[11px] text-amber-700 font-medium">Suggested reorder: <span className="font-bold">{Math.max(selectedProduct.minStock * 2 - selectedProduct.stock, 10)} units</span> to restore safe stock levels</p>
                </div>
              )}

              {/* Quantity */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#b8962e] mb-3">Order Details</p>
                <div className="space-y-1.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Quantity <span className="text-[#d4af37]">*</span></p>
                  <div className="relative">
                    <ShoppingCart className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-300 pointer-events-none" />
                    <input
                      type="number"
                      value={orderForm.quantity}
                      onChange={e => setOrderForm({ ...orderForm, quantity: e.target.value })}
                      placeholder="Enter quantity to order"
                      className="w-full h-10 pl-9 pr-3.5 rounded-xl border border-gray-200 bg-white text-[13px] font-semibold text-[#111118] focus:outline-none focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/12 transition-all placeholder:font-normal placeholder:text-gray-300"
                    />
                  </div>
                  {formErrors.quantity && <p className="text-[11px] text-red-500">{formErrors.quantity}</p>}
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Notes <span className="text-gray-400 normal-case font-normal">optional</span></p>
                <textarea
                  value={orderForm.notes}
                  onChange={e => setOrderForm({ ...orderForm, notes: e.target.value })}
                  placeholder="Add any special instructions for this order..."
                  rows={2}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white text-[13px] text-[#111118] resize-none focus:outline-none focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/12 transition-all placeholder:text-gray-300"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-100 bg-white flex items-center justify-end gap-2">
              <button onClick={() => setIsOrderProductOpen(false)}
                className="h-10 px-5 rounded-xl border border-gray-200 bg-white text-[13px] font-semibold text-gray-600 hover:bg-gray-50 transition-all">
                Cancel
              </button>
              <button onClick={() => void handleOrderProduct()} disabled={saving}
                className="h-10 px-6 rounded-xl bg-gradient-to-r from-[#d4af37] to-[#b8962e] text-[13px] font-bold text-black transition-all flex items-center gap-2 shadow-md shadow-[#d4af37]/20">
                <ShoppingCart className="h-4 w-4" /> Place Order
              </button>
            </div>
          </DialogContent>
        </Dialog>
  );
}

type StockAlertOrderModalProps = SharedOrderProps & {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function StockAlertOrderModal({
  open, onOpenChange, selectedProduct, orderForm, setOrderForm,
  formErrors, saving, handleOrderProduct,
}: StockAlertOrderModalProps) {
  const isStockAlertOpen = open;
  const setIsStockAlertOpen = onOpenChange;
  return (
        <Dialog open={isStockAlertOpen} onOpenChange={setIsStockAlertOpen}>
          <DialogContent className="w-[min(95vw,34rem)] max-w-none p-0 gap-0 overflow-hidden rounded-2xl [&>button:last-of-type]:hidden">
            {/* Header */}
            <div className="bg-[#111118] px-6 py-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-red-500/15 border border-red-500/20 flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-red-400" />
                </div>
                <div>
                  <p className="text-white font-bold text-[14px] leading-tight">Stock Alert — Reorder</p>
                  <p className="text-gray-500 text-[11px] mt-0.5">Place an urgent restock order</p>
                </div>
              </div>
              <button onClick={() => setIsStockAlertOpen(false)} className="h-8 w-8 rounded-lg bg-white/06 hover:bg-white/12 flex items-center justify-center text-gray-400 hover:text-white transition-all text-lg leading-none">×</button>
            </div>

            <div className="px-6 py-5 space-y-4">
              {/* Product info card */}
              {selectedProduct && (
                <div className="flex items-center gap-4 p-4 rounded-xl bg-red-50 border border-red-100">
                  <div className="h-11 w-11 rounded-xl bg-[#111118] flex items-center justify-center shrink-0">
                    <Package className="h-5 w-5 text-[#d4af37]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-bold text-[#111118] truncate">{selectedProduct.name}</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">{selectedProduct.supplier} · {selectedProduct.category}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-red-500 mb-0.5">Current Stock</p>
                    <p className="text-[22px] font-black text-red-600 leading-none">{selectedProduct.stock}</p>
                    <p className="text-[10px] text-red-400 mt-0.5">Min: {selectedProduct.minStock}</p>
                  </div>
                </div>
              )}

              {/* Quantity */}
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Order Quantity <span className="text-[#d4af37]">*</span></p>
                <div className="relative">
                  <ShoppingCart className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-300 pointer-events-none" />
                  <input type="number" value={orderForm.quantity}
                    onChange={e => setOrderForm({ ...orderForm, quantity: e.target.value })}
                    placeholder="Enter quantity to order"
                    className="w-full h-10 pl-9 pr-3.5 rounded-xl border border-gray-200 bg-gray-50 text-[13px] font-semibold text-[#111118] focus:outline-none focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/12 focus:bg-white transition-all placeholder:font-normal placeholder:text-gray-300" />
                </div>
                {formErrors.quantity && <p className="text-[11px] text-red-500">{formErrors.quantity}</p>}
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Notes <span className="text-gray-400 normal-case font-normal">optional</span></p>
                <textarea value={orderForm.notes}
                  onChange={e => setOrderForm({ ...orderForm, notes: e.target.value })}
                  placeholder="Urgent reorder — add any special instructions..."
                  rows={2}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-[13px] text-[#111118] resize-none focus:outline-none focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/12 focus:bg-white transition-all placeholder:text-gray-300" />
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/60 flex items-center justify-end gap-2">
              <button onClick={() => setIsStockAlertOpen(false)}
                className="h-10 px-5 rounded-xl border border-gray-200 bg-white text-[13px] font-semibold text-gray-600 hover:bg-gray-50 transition-all">
                Cancel
              </button>
              <button onClick={() => void handleOrderProduct()} disabled={saving}
                className="h-10 px-6 rounded-xl bg-gradient-to-r from-red-600 to-red-500 text-[13px] font-bold text-white transition-all flex items-center gap-2 shadow-md shadow-red-500/20 hover:from-red-700 hover:to-red-600">
                <AlertTriangle className="h-4 w-4" /> Place Urgent Order
              </button>
            </div>
          </DialogContent>
        </Dialog>
  );
}
