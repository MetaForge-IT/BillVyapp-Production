import { Badge } from "../../components/ui/badge";
import { Dialog, DialogContent } from "../../components/ui/dialog";
import type { PurchaseOrderRow } from "../../../lib/inventoryMappers";
import { formatInr } from "../../../lib/inventoryMappers";
import { ShoppingCart } from "lucide-react";
import { orderStatusConfig } from "./inventoryUi";

type ViewPurchaseOrderModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedPO: PurchaseOrderRow | null;
};

export function ViewPurchaseOrderModal({
  open, onOpenChange, selectedPO,
}: ViewPurchaseOrderModalProps) {
  const isViewPOOpen = open;
  const setIsViewPOOpen = onOpenChange;
  return (
        <Dialog open={isViewPOOpen} onOpenChange={setIsViewPOOpen}>
          <DialogContent className="w-[min(95vw,34rem)] max-w-none p-0 gap-0 overflow-hidden rounded-2xl [&>button:last-of-type]:hidden">
            {/* Header */}
            <div className="bg-[#111118] px-6 py-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-[#d4af37]/15 border border-[#d4af37]/20 flex items-center justify-center">
                  <ShoppingCart className="h-5 w-5 text-[#d4af37]" />
                </div>
                <div>
                  <p className="text-white font-bold text-[14px] leading-tight">Purchase Order Details</p>
                  <p className="text-gray-500 text-[11px] mt-0.5 font-mono">{selectedPO?.id}</p>
                </div>
              </div>
              <button onClick={() => setIsViewPOOpen(false)} className="h-8 w-8 rounded-lg bg-white/06 hover:bg-white/12 flex items-center justify-center text-gray-400 hover:text-white transition-all text-lg leading-none">×</button>
            </div>

            {selectedPO && (
              <div className="px-6 py-5 space-y-4 bg-[#faf8f2]">
                {/* Status + supplier hero */}
                <div className="flex items-center gap-4 p-4 rounded-xl bg-white border border-gray-200">
                  <div className="h-12 w-12 rounded-xl bg-[#111118] flex items-center justify-center shrink-0">
                    <ShoppingCart className="h-6 w-6 text-[#d4af37]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[15px] font-bold text-[#111118] truncate">{selectedPO.supplier}</p>
                    <p className="text-[12px] text-gray-500 mt-0.5">Ordered on {selectedPO.date}</p>
                  </div>
                  <Badge className={orderStatusConfig[selectedPO.status as keyof typeof orderStatusConfig].className}>
                    {orderStatusConfig[selectedPO.status as keyof typeof orderStatusConfig].label}
                  </Badge>
                </div>

                {/* Key stats */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 rounded-xl bg-white border border-gray-200 text-center">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Total Value</p>
                    <p className="text-[20px] font-black text-[#111118]">{selectedPO.total}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-white border border-gray-200 text-center">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Qty Ordered</p>
                    <p className="text-[20px] font-black text-[#111118]">{selectedPO.totalQuantity}</p>
                    {selectedPO.lineCount > 1 && (
                      <p className="text-[10px] text-gray-500 mt-0.5">{selectedPO.lineCount} product lines</p>
                    )}
                  </div>
                </div>

                {/* Details */}
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#b8962e] mb-3">Order Info</p>
                  <div className="rounded-xl bg-white border border-gray-200 divide-y divide-gray-100">
                    {[
                      { label: "Order ID", value: selectedPO.id, mono: true },
                      { label: "Supplier", value: selectedPO.supplier },
                      { label: "Date", value: selectedPO.date },
                      {
                        label: "Qty Ordered",
                        value: `${selectedPO.totalQuantity} unit${selectedPO.totalQuantity !== 1 ? "s" : ""}${selectedPO.lineCount > 1 ? ` (${selectedPO.lineCount} products)` : ""}`,
                      },
                      ...(selectedPO.isVendorBill ? [{ label: "Type", value: "Vendor Bill" }] : []),
                    ].map(({ label, value, mono }) => (
                      <div key={label} className="flex items-center justify-between px-4 py-2.5">
                        <span className="text-[12px] text-gray-500">{label}</span>
                        <span className={`text-[12px] font-semibold text-[#111118] ${mono ? "font-mono" : ""}`}>{value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Line items */}
                {selectedPO.raw.items.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#b8962e] mb-3">Products</p>
                    <div className="rounded-xl bg-white border border-gray-200 divide-y divide-gray-100 overflow-hidden">
                      {selectedPO.raw.items.map((item) => (
                        <div key={item.id} className="flex items-center justify-between gap-3 px-4 py-3">
                          <div className="min-w-0 flex-1">
                            <p className="text-[12px] font-semibold text-[#111118] truncate">{item.productName}</p>
                            <p className="text-[10px] text-gray-500 font-mono mt-0.5">{item.sku}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-[12px] font-bold text-[#111118]">× {item.quantity}</p>
                            <p className="text-[10px] text-gray-500 mt-0.5">{formatInr(item.unitCost)} each</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Status timeline */}
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#b8962e] mb-3">Status Timeline</p>
                  <div className="flex items-center gap-0">
                    {(["pending", "shipped", "delivered"] as const).map((step, i) => {
                      const cfg = orderStatusConfig[step];
                      const steps = ["pending", "shipped", "delivered"];
                      const currentIdx = steps.indexOf(selectedPO.status);
                      const stepIdx = steps.indexOf(step);
                      const done = stepIdx <= currentIdx;
                      return (
                        <div key={step} className="flex items-center flex-1 last:flex-none">
                          <div className="flex flex-col items-center gap-1">
                            <div className={`h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-bold border-2 transition-all ${done ? "bg-[#111118] border-[#111118] text-[#d4af37]" : "bg-white border-gray-200 text-gray-400"}`}>
                              {done ? "✓" : i + 1}
                            </div>
                            <p className={`text-[10px] font-semibold whitespace-nowrap ${done ? "text-[#111118]" : "text-gray-400"}`}>{cfg.label}</p>
                          </div>
                          {i < 2 && <div className={`flex-1 h-0.5 mb-4 mx-1 ${stepIdx < currentIdx ? "bg-[#111118]" : "bg-gray-200"}`} />}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-100 bg-white flex items-center justify-end">
              <button onClick={() => setIsViewPOOpen(false)}
                className="h-10 px-5 rounded-xl border border-gray-200 bg-white text-[13px] font-semibold text-gray-600 hover:bg-gray-50 transition-all">
                Close
              </button>
            </div>
          </DialogContent>
        </Dialog>
  );
}
