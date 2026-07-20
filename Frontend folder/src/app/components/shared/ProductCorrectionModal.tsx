import { useState } from "react";
import { motion } from "framer-motion";
import { X, CheckCircle2, AlertTriangle, FlaskConical, RotateCcw } from "lucide-react";
import { createStockAdjustment } from "../../../api/stock-adjustments";
import { getApiErrorMessage } from "../../../lib/api";
import { useProducts } from "../../context/ProductsContext";
import { useServiceProducts } from "../../context/ServiceProductsContext";

interface CorrectionRow {
  sku: string;
  productName: string;
  unit: string;
  recorded: number;        // qty deducted when appointment was completed
  actual: number;          // what staff enters now
  mode: "qty" | "remainder"; // qty = enter how much used, remainder = enter what's left in bottle
  remainderInput: string;
  currentStock: number;    // live stock after original deduction
}

interface Props {
  open: boolean;
  onClose: () => void;
  appointmentId: number;
  serviceName: string;       // comma-joined service names
  serviceIds?: string[];     // if available from context appointment
}

export function ProductCorrectionModal({ open, onClose, appointmentId, serviceName, serviceIds }: Props) {
  const { products, stockLog, refresh } = useProducts();
  const { getLinks } = useServiceProducts();

  // Build correction rows from the original deduction log for this appointment
  const ref = `APT-${appointmentId}`;

  // Find all products deducted for this appointment from the log
  const originalDeductions = stockLog.filter(l => l.ref === ref && l.type === "Service Used");

  // Fallback: derive from service names + links if log is empty (e.g. seed appointments)
  function buildRows(): CorrectionRow[] {
    const rows: CorrectionRow[] = [];
    const seen = new Set<string>();

    // From log entries (most accurate)
    for (const log of originalDeductions) {
      if (seen.has(log.sku)) continue;
      seen.add(log.sku);
      const p = products.find(p => p.sku === log.sku);
      rows.push({
        sku: log.sku,
        productName: log.productName,
        unit: "application",
        recorded: Math.abs(log.qtyChange),
        actual: Math.abs(log.qtyChange),
        mode: "qty",
        remainderInput: "",
        currentStock: p?.stock ?? log.stockAfter,
      });
    }

    // From service links (fallback)
    const names = serviceName.split(",").map(s => s.trim());
    const ids = serviceIds ?? [];

    for (const id of ids) {
      const links = getLinks(id);
      for (const link of links) {
        if (seen.has(link.sku)) continue;
        seen.add(link.sku);
        const p = products.find(p => p.sku === link.sku);
        rows.push({
          sku: link.sku,
          productName: link.name,
          unit: link.unit,
          recorded: link.defaultQty,
          actual: link.defaultQty,
          mode: "qty",
          remainderInput: "",
          currentStock: p?.stock ?? 0,
        });
      }
    }

    return rows;
  }

  const [rows, setRows] = useState<CorrectionRow[]>(buildRows);
  const [note, setNote] = useState("");
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);

  function updateRow(sku: string, updates: Partial<CorrectionRow>) {
    setRows(prev => prev.map(r => r.sku === sku ? { ...r, ...updates } : r));
  }

  function getActualForRow(row: CorrectionRow): number {
    if (row.mode === "remainder") {
      const rem = parseFloat(row.remainderInput);
      if (isNaN(rem)) return row.actual;
      // actual used = (stock before deduction) - (current stock + rem)
      // stock before = currentStock + recorded
      const stockBefore = row.currentStock + row.recorded;
      return Math.max(0, stockBefore - (row.currentStock + rem));
    }
    return row.actual;
  }

  async function handleConfirm() {
    if (saving) return;
    setSaving(true);
    try {
      for (const row of rows) {
        const actualUsed = getActualForRow(row);
        const delta = actualUsed - row.recorded;
        if (Math.abs(delta) < 0.01) continue;

        const product = products.find((p) => p.sku === row.sku);
        if (!product) continue;

        const quantityChange = -delta;
        const correctionNote =
          delta > 0
            ? `Correction: ${row.recorded}${row.unit} → ${actualUsed.toFixed(1)}${row.unit}${note ? ` · ${note}` : ""}`
            : `Stock correction: over-recorded ${Math.abs(delta).toFixed(1)}${row.unit}${note ? ` · ${note}` : ""}`;

        await createStockAdjustment({
          productId: product.id,
          quantityChange,
          movementType: delta > 0 ? "service_used" : "manual_adjustment",
          note: `${correctionNote} · CORR-${ref}`,
        });
      }
      await refresh();
      setDone(true);
    } catch (error) {
      console.error(getApiErrorMessage(error, "Failed to apply correction"));
    } finally {
      setSaving(false);
    }
  }

  const changedRows = rows.filter(r => {
    const actual = getActualForRow(r);
    return Math.abs(actual - r.recorded) >= 0.01;
  });

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh]"
      >
        {/* Header */}
        <div className="bg-gradient-to-br from-[#111118] to-[#2a2a2a] px-6 py-5 shrink-0">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 rounded-xl bg-[#d4af37]/15 border border-[#d4af37]/30 flex items-center justify-center shrink-0">
              <FlaskConical className="h-4.5 w-4.5 text-[#d4af37]" />
            </div>
            <div className="flex-1">
              <h2 className="text-[16px] font-bold text-white">Correct Product Usage</h2>
              <p className="text-[11px] text-white/45 mt-0.5 truncate max-w-[280px]">{serviceName} · Appt #{appointmentId}</p>
            </div>
            <button onClick={onClose} className="h-8 w-8 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-white/50 hover:text-white flex items-center justify-center transition-all">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {done ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 p-10 text-center">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 280, damping: 18 }}>
              <div className="h-16 w-16 rounded-full bg-green-50 border-2 border-green-200 flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
            </motion.div>
            <div>
              <p className="text-[16px] font-bold text-[#1a1a1a]">Correction Applied</p>
              <p className="text-[12px] text-gray-500 mt-1">Stock levels updated and logged in Usage History</p>
            </div>
            <button onClick={onClose}
              className="h-9 px-6 rounded-xl bg-[#1a1a1a] text-[#d4af37] text-[13px] font-bold hover:bg-[#2a2a2a] transition-all">
              Done
            </button>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {rows.length === 0 && (
                <div className="flex flex-col items-center gap-3 py-10 text-center">
                  <AlertTriangle className="h-8 w-8 text-gray-300" />
                  <p className="text-[13px] text-gray-400">No product records found for this appointment.</p>
                  <p className="text-[11px] text-gray-400">Products are only tracked for appointments that were completed after linking services to products.</p>
                </div>
              )}

              {rows.map(row => {
                const actual = getActualForRow(row);
                const delta = actual - row.recorded;
                const hasChange = Math.abs(delta) >= 0.01;

                return (
                  <div key={row.sku} className={`rounded-xl border p-4 space-y-3 transition-all ${hasChange ? "border-[#d4af37]/40 bg-[#d4af37]/03" : "border-gray-200 bg-white"}`}>
                    {/* Product info */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-[13px] font-bold text-[#1a1a1a]">{row.productName}</p>
                        <p className="text-[11px] font-mono text-gray-400 mt-0.5">{row.sku}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[10px] text-gray-400">Recorded</p>
                        <p className="text-[13px] font-bold text-[#1a1a1a]">{row.recorded} {row.unit}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">{row.currentStock} in stock now</p>
                      </div>
                    </div>

                    {/* Mode toggle */}
                    <div className="flex rounded-xl overflow-hidden border border-gray-200">
                      <button onClick={() => updateRow(row.sku, { mode: "qty" })}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-[11px] font-bold transition-all ${row.mode === "qty" ? "bg-[#1a1a1a] text-[#d4af37]" : "bg-white text-gray-400 hover:bg-gray-50"}`}>
                        <FlaskConical className="h-3 w-3" /> Actual qty used
                      </button>
                      <button onClick={() => updateRow(row.sku, { mode: "remainder" })}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-[11px] font-bold transition-all ${row.mode === "remainder" ? "bg-[#1a1a1a] text-[#d4af37]" : "bg-white text-gray-400 hover:bg-gray-50"}`}>
                        <RotateCcw className="h-3 w-3" /> Bottle remainder
                      </button>
                    </div>

                    {row.mode === "qty" ? (
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-gray-500">How much was actually used ({row.unit})?</label>
                        <input
                          type="number" min="0" step="0.1"
                          value={row.actual}
                          onChange={e => updateRow(row.sku, { actual: parseFloat(e.target.value) || 0 })}
                          className="w-full h-10 rounded-xl border border-gray-200 px-3 text-[14px] font-bold focus:outline-none focus:border-[#d4af37]"
                        />
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-gray-500">How much is left in the bottle ({row.unit})?</label>
                        <input
                          type="number" min="0" step="0.1"
                          value={row.remainderInput}
                          onChange={e => updateRow(row.sku, { remainderInput: e.target.value })}
                          placeholder={`e.g. 5 (if 5${row.unit} remains)`}
                          className="w-full h-10 rounded-xl border border-gray-200 px-3 text-[14px] font-bold focus:outline-none focus:border-[#d4af37] placeholder:text-gray-300 placeholder:font-normal"
                        />
                        {row.remainderInput && !isNaN(parseFloat(row.remainderInput)) && (
                          <p className="text-[11px] text-[#b8962e] font-medium">
                            → System calculates: <strong>{actual.toFixed(1)} {row.unit}</strong> actually used
                          </p>
                        )}
                      </div>
                    )}

                    {/* Delta indicator */}
                    {hasChange && (
                      <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-[11px] font-semibold ${delta > 0 ? "bg-red-50 text-red-600" : "bg-green-50 text-green-700"}`}>
                        {delta > 0
                          ? <><AlertTriangle className="h-3.5 w-3.5 shrink-0" /> {delta.toFixed(1)} {row.unit} more used than recorded — will deduct {delta.toFixed(1)} more from stock</>
                          : <><CheckCircle2 className="h-3.5 w-3.5 shrink-0" /> {Math.abs(delta).toFixed(1)} {row.unit} less used — will return {Math.abs(delta).toFixed(1)} to stock</>
                        }
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Note */}
              {rows.length > 0 && (
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">Correction Note <span className="text-gray-400 font-normal">(optional)</span></label>
                  <input value={note} onChange={e => setNote(e.target.value)}
                    placeholder="e.g. Physical check after service, thick hair required extra color..."
                    className="w-full h-10 rounded-xl border border-gray-200 px-3 text-[12px] focus:outline-none focus:border-[#d4af37]" />
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="shrink-0 flex items-center justify-between gap-3 px-5 py-4 border-t border-gray-100">
              <p className="text-[11px] text-gray-400">
                {changedRows.length > 0 ? `${changedRows.length} correction${changedRows.length > 1 ? "s" : ""} to apply` : "No changes yet"}
              </p>
              <div className="flex gap-2.5">
                <button onClick={onClose} className="h-9 px-4 rounded-xl border border-gray-200 text-[13px] font-semibold text-gray-600 hover:bg-gray-50 transition-all">
                  Cancel
                </button>
                <button onClick={() => void handleConfirm()} disabled={changedRows.length === 0 || rows.length === 0 || saving}
                  className="h-9 px-5 rounded-xl bg-gradient-to-r from-[#d4af37] to-[#b8962e] text-[13px] font-bold text-black disabled:opacity-40 hover:shadow-lg transition-all">
                  Apply {changedRows.length > 0 ? `${changedRows.length} Correction${changedRows.length > 1 ? "s" : ""}` : "Corrections"}
                </button>
              </div>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}
