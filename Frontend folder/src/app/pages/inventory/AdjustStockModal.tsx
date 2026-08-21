import { Button } from "../../components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import type { Product } from "../../context/ProductsContext";
import {
  SlidersHorizontal, CheckCircle2, ArrowUpCircle, Minus as MinusIcon,
} from "lucide-react";

type AdjustStockModalProps = {
  adjustTarget: Product | null;
  setAdjustTarget: (p: Product | null) => void;
  adjustMode: "set" | "add" | "subtract";
  setAdjustMode: (m: "set" | "add" | "subtract") => void;
  adjustValue: string;
  setAdjustValue: (v: string) => void;
  adjustReason: string;
  setAdjustReason: (v: string) => void;
  adjustNote: string;
  setAdjustNote: (v: string) => void;
  adjustReasons: string[];
  saving: boolean;
  handleAdjustConfirm: () => void | Promise<void>;
};

export function AdjustStockModal({
  adjustTarget, setAdjustTarget, adjustMode, setAdjustMode,
  adjustValue, setAdjustValue, adjustReason, setAdjustReason,
  adjustNote, setAdjustNote, adjustReasons, saving, handleAdjustConfirm,
}: AdjustStockModalProps) {
  return (
        <Dialog open={!!adjustTarget} onOpenChange={open => { if (!open) setAdjustTarget(null); }}>
          <DialogContent className="w-[min(100%,28rem)] max-w-[calc(100%-1rem)] rounded-2xl p-0 overflow-hidden border-0 shadow-2xl max-sm:dialog-mobile-sheet">
            <div className="bg-gradient-to-br from-[#111118] to-[#2a2a2a] px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-[#d4af37]/15 border border-[#d4af37]/30 flex items-center justify-center shrink-0">
                  <SlidersHorizontal className="h-4.5 w-4.5 text-[#d4af37]" />
                </div>
                <div>
                  <DialogTitle className="text-[15px] font-bold text-white">Adjust Stock</DialogTitle>
                  <p className="text-[11px] text-white/45 mt-0.5 truncate max-w-[260px]">{adjustTarget?.name}</p>
                </div>
              </div>
            </div>
            <div className="p-6 space-y-4">
              {/* Current stock display */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-[#fafaf8] border border-gray-100">
                <span className="text-[12px] text-gray-500 font-medium">Current Stock</span>
                <span className="text-[18px] font-bold text-[#1a1a1a]">{adjustTarget?.stock ?? 0}</span>
              </div>

              {/* Mode selector */}
              <div className="grid grid-cols-3 gap-2">
                {([
                  { mode: "set" as const, label: "Set to", icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
                  { mode: "add" as const, label: "Add", icon: <ArrowUpCircle className="h-3.5 w-3.5" /> },
                  { mode: "subtract" as const, label: "Remove", icon: <MinusIcon className="h-3.5 w-3.5" /> },
                ]).map(({ mode, label, icon }) => (
                  <button key={mode} onClick={() => { setAdjustMode(mode); setAdjustValue(""); }}
                    className={`flex flex-col items-center gap-1.5 p-2.5 rounded-xl border text-[11px] font-bold transition-all ${adjustMode === mode ? "bg-[#1a1a1a] border-[#1a1a1a] text-[#d4af37]" : "border-gray-200 text-gray-500 hover:border-gray-300"}`}>
                    {icon} {label}
                  </button>
                ))}
              </div>

              {/* Value input */}
              <div className="space-y-1.5">
                <Label className="text-[12px] font-semibold text-[#1a1a1a]">
                  {adjustMode === "set" ? "New Stock Quantity" : adjustMode === "add" ? "Quantity to Add" : "Quantity to Remove"}
                </Label>
                <Input
                  type="number"
                  min="0"
                  value={adjustValue}
                  onChange={e => setAdjustValue(e.target.value)}
                  placeholder="Enter quantity"
                  className="h-10 rounded-xl border-gray-200 focus:border-[#d4af37] focus:ring-[#d4af37]"
                />
                {adjustValue && !isNaN(parseInt(adjustValue)) && adjustTarget && (
                  <p className="text-[11px] text-gray-400">
                    Stock will change: <span className="font-bold text-[#1a1a1a]">{adjustTarget.stock}</span> →{" "}
                    <span className="font-bold text-[#d4af37]">
                      {adjustMode === "set" ? parseInt(adjustValue)
                        : adjustMode === "add" ? adjustTarget.stock + parseInt(adjustValue)
                        : Math.max(0, adjustTarget.stock - parseInt(adjustValue))}
                    </span>
                  </p>
                )}
              </div>

              {/* Reason */}
              <div className="space-y-1.5">
                <Label className="text-[12px] font-semibold text-[#1a1a1a]">Reason</Label>
                <Select value={adjustReason} onValueChange={setAdjustReason}>
                  <SelectTrigger className="h-10 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {adjustReasons.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* Note */}
              <div className="space-y-1.5">
                <Label className="text-[12px] font-semibold text-[#1a1a1a]">Note <span className="text-gray-400 font-normal">(optional)</span></Label>
                <Input
                  value={adjustNote}
                  onChange={e => setAdjustNote(e.target.value)}
                  placeholder="e.g. Physical count mismatch, supplier return..."
                  className="h-10 rounded-xl border-gray-200 focus:border-[#d4af37] focus:ring-[#d4af37]"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2.5 px-6 py-4 border-t border-gray-100">
              <Button variant="outline" className="h-9 px-4 rounded-xl text-[13px]" onClick={() => setAdjustTarget(null)}>Cancel</Button>
              <button
                onClick={() => void handleAdjustConfirm()}
                disabled={saving || !adjustValue || Number.isNaN(parseInt(adjustValue, 10)) || parseInt(adjustValue, 10) < 0}
                className="h-9 px-5 rounded-xl bg-gradient-to-r from-[#d4af37] to-[#b8962e] text-[13px] font-bold text-black disabled:opacity-40 hover:shadow-lg transition-all"
              >
                Confirm Adjustment
              </button>
            </div>
          </DialogContent>
        </Dialog>
  );
}
