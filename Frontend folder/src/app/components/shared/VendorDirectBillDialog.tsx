import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Package,
  Plus,
  Receipt,
  Search,
  Truck,
  X,
} from "lucide-react";
import { toast } from "../ui/hot-toast";
import { createStockPurchase, type StockPurchase } from "../../../api/stock-purchases";
import type { VendorRecord } from "../../../api/vendors";
import { getApiErrorMessage } from "../../../lib/api";
import { istDateKey } from "../../../lib/istDate";
import { formatInr, parseInr, purchaseTotalQuantity } from "../../../lib/inventoryMappers";
import type { Product } from "../../context/ProductsContext";
import { Dialog, DialogContent } from "../ui/dialog";
import { Input } from "../ui/input";
import { cn } from "../ui/utils";

type BillLine = {
  productId: string;
  name: string;
  sku: string;
  qty: number;
  unitCost: number;
};

type BillResult = {
  poNumber: string;
  vendorName: string;
  total: number;
  totalQuantity: number;
  lineCount: number;
  paymentMethod: string;
};

function initials(name: string) {
  return (
    name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "?"
  );
}

export function VendorDirectBillDialog({
  open,
  onOpenChange,
  vendors,
  products,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vendors: VendorRecord[];
  products: Product[];
  onSuccess?: (purchase: StockPurchase) => void;
}) {
  const [vendorSearch, setVendorSearch] = useState("");
  const [vendorSelected, setVendorSelected] = useState(false);
  const [vendor, setVendor] = useState<VendorRecord | null>(null);
  const [items, setItems] = useState<BillLine[]>([]);
  const [itemSearch, setItemSearch] = useState("");
  const [notes, setNotes] = useState("");
  const [paymentNote, setPaymentNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<BillResult | null>(null);

  useEffect(() => {
    if (!open) return;
    setVendorSearch("");
    setVendorSelected(false);
    setVendor(null);
    setItems([]);
    setItemSearch("");
    setNotes("");
    setPaymentNote("");
    setSubmitting(false);
    setResult(null);
  }, [open]);

  const activeVendors = useMemo(
    () => vendors.filter((v) => v.status === "active"),
    [vendors],
  );

  const vendorMatches = useMemo(() => {
    const q = vendorSearch.trim().toLowerCase();
    if (!q || vendorSelected) return [];
    return activeVendors
      .filter(
        (v) =>
          v.name.toLowerCase().includes(q) ||
          v.contactPerson.toLowerCase().includes(q) ||
          v.phone.includes(q),
      )
      .slice(0, 8);
  }, [activeVendors, vendorSearch, vendorSelected]);

  const productMatches = useMemo(() => {
    const q = itemSearch.trim().toLowerCase();
    if (!q) return [];
    return products
      .filter((p) => p.activeStatus !== "inactive")
      .filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          p.brand.toLowerCase().includes(q),
      )
      .slice(0, 10);
  }, [itemSearch, products]);

  const subtotal = items.reduce((sum, row) => sum + row.qty * row.unitCost, 0);
  const canSubmit =
    !!vendor &&
    items.length > 0 &&
    items.every((row) => row.qty > 0 && row.unitCost >= 0);

  function pickVendor(next: VendorRecord) {
    setVendor(next);
    setVendorSearch(next.name);
    setVendorSelected(true);
  }

  function clearVendor() {
    setVendor(null);
    setVendorSearch("");
    setVendorSelected(false);
  }

  function addProduct(product: Product) {
    const cost = parseInr(product.costPrice);
    setItems((prev) => {
      const existing = prev.find((row) => row.productId === product.id);
      if (existing) {
        return prev.map((row) =>
          row.productId === product.id ? { ...row, qty: row.qty + 1 } : row,
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          sku: product.sku,
          qty: 1,
          unitCost: cost,
        },
      ];
    });
    setItemSearch("");
  }

  function updateLine(productId: string, patch: Partial<BillLine>) {
    setItems((prev) =>
      prev.map((row) => (row.productId === productId ? { ...row, ...patch } : row)),
    );
  }

  function removeLine(productId: string) {
    setItems((prev) => prev.filter((row) => row.productId !== productId));
  }

  async function submit() {
    if (!vendor || !canSubmit || submitting) return;

    setSubmitting(true);
    try {
      const payLabel = paymentNote.trim() || "Not specified";
      const purchase = await createStockPurchase({
        vendorId: vendor.id,
        orderDate: istDateKey(),
        notes: [
          notes.trim() || null,
          `Vendor direct bill · Paid via ${payLabel}`,
        ]
          .filter(Boolean)
          .join(" · "),
        items: items.map((row) => ({
          productId: row.productId,
          quantity: row.qty,
          unitCost: row.unitCost,
        })),
      });

      onSuccess?.(purchase);
      const totalQuantity = purchaseTotalQuantity(purchase);
      setResult({
        poNumber: purchase.poNumber,
        vendorName: purchase.vendorName,
        total: purchase.totalAmount,
        totalQuantity,
        lineCount: purchase.items.length,
        paymentMethod: payLabel,
      });
      toast.success("Vendor bill recorded", {
        description: `${purchase.poNumber} · ${totalQuantity} unit${totalQuantity !== 1 ? "s" : ""} · stock updated`,
      });
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to record vendor bill"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] w-[min(960px,100%)] max-w-[calc(100%-0.5rem)] overflow-hidden border-0 bg-transparent p-0 shadow-none max-sm:dialog-mobile-sheet sm:rounded-2xl">
        <div className="flex h-full max-h-[92dvh] flex-col overflow-hidden rounded-2xl border border-black/[0.08] bg-[#faf9f7] shadow-2xl max-sm:h-dvh max-sm:max-h-dvh max-sm:rounded-none">
          {result ? (
            <div className="space-y-5 p-6 sm:p-8">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#00C896]/15 text-[#00C896]">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-[15px] font-bold text-[#111118]">Vendor bill saved</p>
                  <p className="text-[12px] text-[#6b6b6b]">
                    Purchase order created and inventory stock updated
                  </p>
                </div>
              </div>
              <div className="space-y-2 rounded-2xl border border-black/[0.07] bg-white p-4 text-[13px]">
                <div className="flex justify-between gap-3">
                  <span className="text-[#9a9a9a]">PO number</span>
                  <span className="font-bold text-[#111118]">{result.poNumber}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-[#9a9a9a]">Vendor</span>
                  <span className="font-semibold text-[#111118]">{result.vendorName}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-[#9a9a9a]">Qty</span>
                  <span className="font-semibold text-[#111118]">
                    {result.totalQuantity}
                    {result.lineCount > 1 ? ` (${result.lineCount} products)` : ""}
                  </span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-[#9a9a9a]">Payment</span>
                  <span className="font-semibold text-[#111118]">{result.paymentMethod}</span>
                </div>
                <div className="flex justify-between gap-3 border-t border-black/[0.06] pt-2">
                  <span className="font-bold text-[#111118]">Total</span>
                  <span className="font-black text-[#9a7d20]">{formatInr(result.total)}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="h-11 w-full rounded-xl bg-[#111118] text-[13px] font-bold text-[#D4AF37]"
              >
                Done
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between bg-[#111118] px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#D4AF37]/25 bg-[#D4AF37]/15">
                    <Receipt className="h-5 w-5 text-[#D4AF37]" />
                  </div>
                  <div>
                    <p className="text-[14px] font-bold text-white">Vendor Direct Bill</p>
                    <p className="text-[11px] text-white/55">
                      Bill a supplier and restock inventory
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onOpenChange(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-white/60 hover:bg-white/10 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="grid max-h-[calc(92dvh-72px)] min-h-0 flex-1 gap-0 overflow-y-auto lg:grid-cols-[1.1fr_0.9fr]">
                <div className="space-y-4 border-b border-black/[0.06] p-4 sm:p-5 lg:border-b-0 lg:border-r">
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#9a9a9a]">
                      Vendor
                    </p>
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9a9a9a]" />
                      <Input
                        value={vendorSearch}
                        onChange={(e) => {
                          setVendorSearch(e.target.value);
                          setVendorSelected(false);
                          setVendor(null);
                        }}
                        placeholder="Search vendor name, contact, or phone"
                        className="h-11 rounded-xl border-black/[0.08] bg-white pl-10"
                      />
                    </div>
                    {activeVendors.length === 0 && (
                      <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-semibold text-amber-800">
                        No vendors found — add one under Inventory → Vendors first.
                      </p>
                    )}
                    {vendorMatches.length > 0 && (
                      <div className="overflow-hidden rounded-xl border border-black/[0.08] bg-white shadow-sm">
                        {vendorMatches.map((row) => (
                          <button
                            key={row.id}
                            type="button"
                            onClick={() => pickVendor(row)}
                            className="flex w-full items-center gap-3 border-b border-black/[0.05] px-3 py-2.5 text-left last:border-b-0 hover:bg-[#FAF8F2]"
                          >
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#111118] text-[11px] font-bold text-[#D4AF37]">
                              {initials(row.name)}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-[13px] font-bold text-[#111118]">{row.name}</p>
                              <p className="truncate text-[11px] text-[#9a9a9a]">
                                {row.contactPerson || "—"} · {row.phone || "No phone"}
                              </p>
                            </div>
                            <Truck className="h-4 w-4 shrink-0 text-[#D4AF37]" />
                          </button>
                        ))}
                      </div>
                    )}
                    {vendorSelected && vendor && (
                      <div className="flex items-center justify-between rounded-xl border border-[#D4AF37]/25 bg-[#FFFBEB] px-3 py-2.5">
                        <div>
                          <p className="text-[13px] font-bold text-[#111118]">{vendor.name}</p>
                          <p className="text-[11px] text-[#9a7d20]">
                            {vendor.contactPerson || "Vendor"} · {vendor.phone || "No phone"}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={clearVendor}
                          className="text-[11px] font-bold text-[#9a7d20] hover:underline"
                        >
                          Change
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#9a9a9a]">
                      Products to restock
                    </p>
                    <div className="relative">
                      <Package className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9a9a9a]" />
                      <Input
                        value={itemSearch}
                        onChange={(e) => setItemSearch(e.target.value)}
                        placeholder={
                          products.length === 0
                            ? "Add products in Inventory first"
                            : vendor
                              ? "Search products to add to this bill"
                              : "Select a vendor first, then search products"
                        }
                        disabled={!vendor || products.length === 0}
                        className="h-11 rounded-xl border-black/[0.08] bg-white pl-10 disabled:opacity-50"
                      />
                    </div>
                    {products.length === 0 && (
                      <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-semibold text-amber-800">
                        No products in inventory — add a product before creating a vendor bill.
                      </p>
                    )}
                    {productMatches.length > 0 && (
                      <div className="overflow-hidden rounded-xl border border-black/[0.08] bg-white shadow-sm">
                        {productMatches.map((product) => (
                          <button
                            key={product.id}
                            type="button"
                            onClick={() => addProduct(product)}
                            className="flex w-full items-center justify-between gap-3 border-b border-black/[0.05] px-3 py-2.5 text-left last:border-b-0 hover:bg-[#FAF8F2]"
                          >
                            <div className="min-w-0">
                              <p className="truncate text-[13px] font-bold text-[#111118]">{product.name}</p>
                              <p className="text-[11px] text-[#9a9a9a]">
                                {product.sku} · Stock {product.stock} · Cost {product.costPrice}
                              </p>
                            </div>
                            <Plus className="h-4 w-4 shrink-0 text-[#D4AF37]" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    {items.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-black/[0.1] bg-white px-4 py-8 text-center text-[12px] text-[#9a9a9a]">
                        Add products purchased from this vendor
                      </div>
                    ) : (
                      items.map((row) => (
                        <div
                          key={row.productId}
                          className="rounded-xl border border-black/[0.07] bg-white p-3"
                        >
                          <div className="mb-2 flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="truncate text-[13px] font-bold text-[#111118]">{row.name}</p>
                              <p className="text-[11px] text-[#9a9a9a]">{row.sku}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeLine(row.productId)}
                              className="text-[#9a9a9a] hover:text-red-500"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <label className="space-y-1">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-[#9a9a9a]">
                                Qty
                              </span>
                              <Input
                                type="number"
                                min={1}
                                value={row.qty}
                                onChange={(e) =>
                                  updateLine(row.productId, {
                                    qty: Math.max(1, Number(e.target.value) || 1),
                                  })
                                }
                                className="h-9 rounded-lg"
                              />
                            </label>
                            <label className="space-y-1">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-[#9a9a9a]">
                                Unit cost
                              </span>
                              <Input
                                type="number"
                                min={0}
                                step="any"
                                value={row.unitCost}
                                onChange={(e) =>
                                  updateLine(row.productId, {
                                    unitCost: Math.max(0, Number(e.target.value) || 0),
                                  })
                                }
                                className="h-9 rounded-lg"
                              />
                            </label>
                          </div>
                          <p className="mt-2 text-right text-[12px] font-bold text-[#9a7d20]">
                            {formatInr(row.qty * row.unitCost)}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="space-y-4 bg-white p-4 sm:p-5">
                  <div className="rounded-2xl border border-black/[0.07] bg-[#FAF8F2] p-4">
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#9a9a9a]">
                      Bill total
                    </p>
                    <p className="mt-1 text-3xl font-black tabular-nums text-[#111118]">
                      {formatInr(subtotal)}
                    </p>
                    <p className="mt-1 text-[11px] text-[#6b6b6b]">
                      {items.length} line{items.length === 1 ? "" : "s"} · stock increases on save
                    </p>
                  </div>

                  <label className="block space-y-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#9a9a9a]">
                      Notes (optional)
                    </span>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={3}
                      placeholder="Invoice number, delivery note, etc."
                      className="w-full rounded-xl border border-black/[0.08] bg-[#FAF8F2]/60 px-3 py-2 text-[13px] outline-none focus:border-[#D4AF37]/50 focus:ring-2 focus:ring-[#D4AF37]/12"
                    />
                  </label>

                  <label className="block space-y-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#9a9a9a]">
                      Payment (optional)
                    </span>
                    <Input
                      value={paymentNote}
                      onChange={(e) => setPaymentNote(e.target.value)}
                      placeholder="e.g. Cash, UPI, credit terms"
                      className="h-10 rounded-xl border-black/[0.08] bg-[#FAF8F2]/60"
                    />
                  </label>

                  <button
                    type="button"
                    disabled={!canSubmit || submitting}
                    onClick={() => void submit()}
                    className={cn(
                      "flex h-12 w-full items-center justify-center gap-2 rounded-2xl text-[13px] font-bold transition-all",
                      canSubmit && !submitting
                        ? "bg-gradient-to-r from-[#D4AF37] to-[#C9A227] text-[#111118] shadow-lg shadow-[#D4AF37]/20"
                        : "bg-black/[0.06] text-[#9a9a9a]",
                    )}
                  >
                    {submitting ? "Saving…" : `Save vendor bill · ${formatInr(subtotal)}`}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
