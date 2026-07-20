import { useState } from "react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Plus, Trash2, Download, BarChart3, TrendingUp, TrendingDown, Wallet } from "lucide-react";

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const YEARS = ["2024","2025","2026","2027"];

interface BudgetItem { id: number; name: string; amount: string; }

export function AccountingBudget() {
  const now = new Date();
  const [subTab, setSubTab] = useState<"setup"|"tracker">("setup");
  const [month, setMonth] = useState(MONTHS[now.getMonth()]);
  const [year, setYear] = useState(String(now.getFullYear()));
  const [fixedItems, setFixedItems] = useState<BudgetItem[]>([]);
  const [variableItems, setVariableItems] = useState<BudgetItem[]>([]);
  const [saved, setSaved] = useState(false);

  const addItem = (type: "fixed"|"variable") => {
    const item = { id: Date.now(), name: "", amount: "" };
    if (type === "fixed") setFixedItems(p => [...p, item]);
    else setVariableItems(p => [...p, item]);
    setSaved(false);
  };
  const updateItem = (type: "fixed"|"variable", id: number, field: "name"|"amount", value: string) => {
    const fn = (items: BudgetItem[]) => items.map(i => i.id === id ? { ...i, [field]: value } : i);
    if (type === "fixed") setFixedItems(fn); else setVariableItems(fn);
    setSaved(false);
  };
  const removeItem = (type: "fixed"|"variable", id: number) => {
    if (type === "fixed") setFixedItems(p => p.filter(i => i.id !== id));
    else setVariableItems(p => p.filter(i => i.id !== id));
    setSaved(false);
  };

  const totalFixed    = fixedItems.reduce((s,i)   => s + (parseFloat(i.amount)||0), 0);
  const totalVariable = variableItems.reduce((s,i) => s + (parseFloat(i.amount)||0), 0);
  const grandTotal    = totalFixed + totalVariable;
  const fmt = (n: number) => `₹${n.toLocaleString("en-IN",{minimumFractionDigits:2})}`;

  return (
    <div className="space-y-5">
      {/* Sub-tab */}
      <div className="flex gap-1.5">
        {(["setup","tracker"] as const).map(t => (
          <button key={t} onClick={() => setSubTab(t)}
            className={`h-9 px-5 rounded-xl text-[12px] font-semibold border transition-all capitalize ${
              subTab === t ? "bg-[#111118] text-[#d4af37] border-[#111118]" : "bg-white text-gray-500 border-gray-200 hover:border-[#d4af37]/40 hover:text-[#111]"
            }`}>
            Budget {t.charAt(0).toUpperCase()+t.slice(1)}
          </button>
        ))}
      </div>

      {subTab === "setup" && (
        <div className="space-y-5">
          {/* Header row */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="text-[17px] font-bold text-[#111118]">Budget Setup</h2>
              <p className="text-[12px] text-gray-500 mt-0.5">Select a month and year to manage your budget.</p>
            </div>
            <div className="flex gap-2">
              <Select value={month} onValueChange={setMonth}>
                <SelectTrigger className="w-36 h-9 rounded-xl border-gray-200 text-[12px]"><SelectValue /></SelectTrigger>
                <SelectContent>{MONTHS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={year} onValueChange={setYear}>
                <SelectTrigger className="w-24 h-9 rounded-xl border-gray-200 text-[12px]"><SelectValue /></SelectTrigger>
                <SelectContent>{YEARS.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          {/* Stat cards */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Total Fixed Expenses",    val: fmt(totalFixed),    icon: TrendingDown, gradient: "from-[#111118] to-[#1e1e2e]", accent: "#d4af37" },
              { label: "Total Variable Expenses",  val: fmt(totalVariable), icon: TrendingUp,   gradient: "from-[#1a1a1a] to-[#222]",   accent: "#a3e635" },
              { label: "Grand Total Budget",       val: fmt(grandTotal),    icon: Wallet,       gradient: "from-[#b8962e] to-[#d4af37]", accent: "#fff" },
            ].map(({ label, val, icon: Icon, gradient, accent }) => (
              <div key={label} className={`rounded-2xl bg-gradient-to-br ${gradient} p-5 shadow-md`}>
                <div className="flex items-start justify-between mb-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest opacity-60" style={{ color: accent }}>{label}</p>
                  <Icon className="h-4 w-4 opacity-50" style={{ color: accent }} />
                </div>
                <p className="text-[24px] font-black leading-none" style={{ color: accent }}>{val}</p>
              </div>
            ))}
          </div>

          {/* Fixed Expenses card */}
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50/60 flex items-center justify-between">
              <p className="text-[13px] font-bold text-[#111118]">Fixed Expenses</p>
              <p className="text-[12px] text-gray-500">Total: <span className="font-bold text-[#111]">{fmt(totalFixed)}</span></p>
            </div>
            <div className="px-5 py-4 space-y-2.5">
              {fixedItems.length === 0 && (
                <p className="text-[12px] text-gray-400 py-2">No fixed expenses added yet.</p>
              )}
              {fixedItems.map(item => (
                <div key={item.id} className="flex gap-2.5 items-center">
                  <input placeholder="Expense name" value={item.name}
                    onChange={e => updateItem("fixed", item.id, "name", e.target.value)}
                    className="flex-1 h-9 px-3.5 rounded-xl border border-gray-200 bg-gray-50 text-[13px] focus:outline-none focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/12 focus:bg-white transition-all placeholder:text-gray-300" />
                  <div className="relative w-40">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[13px] text-gray-400 pointer-events-none">₹</span>
                    <input placeholder="0.00" value={item.amount} type="number" min="0"
                      onChange={e => updateItem("fixed", item.id, "amount", e.target.value)}
                      className="w-full h-9 pl-8 pr-3.5 rounded-xl border border-gray-200 bg-gray-50 text-[13px] focus:outline-none focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/12 focus:bg-white transition-all placeholder:text-gray-300" />
                  </div>
                  <button onClick={() => removeItem("fixed", item.id)}
                    className="h-9 w-9 rounded-xl border border-gray-200 flex items-center justify-center text-gray-300 hover:text-red-500 hover:border-red-200 transition-all">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              <button onClick={() => addItem("fixed")}
                className="flex items-center gap-1.5 text-[12px] font-semibold text-[#d4af37] hover:text-[#b8962e] transition-colors mt-1">
                <Plus className="h-3.5 w-3.5" /> Add Item
              </button>
            </div>
          </div>

          {/* Variable Expenses card */}
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50/60 flex items-center justify-between">
              <p className="text-[13px] font-bold text-[#111118]">Variable Expenses</p>
              <p className="text-[12px] text-gray-500">Total: <span className="font-bold text-[#111]">{fmt(totalVariable)}</span></p>
            </div>
            <div className="px-5 py-4 space-y-2.5">
              {variableItems.length === 0 && (
                <p className="text-[12px] text-gray-400 py-2">No variable expenses added yet.</p>
              )}
              {variableItems.map(item => (
                <div key={item.id} className="flex gap-2.5 items-center">
                  <input placeholder="Expense name" value={item.name}
                    onChange={e => updateItem("variable", item.id, "name", e.target.value)}
                    className="flex-1 h-9 px-3.5 rounded-xl border border-gray-200 bg-gray-50 text-[13px] focus:outline-none focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/12 focus:bg-white transition-all placeholder:text-gray-300" />
                  <div className="relative w-40">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[13px] text-gray-400 pointer-events-none">₹</span>
                    <input placeholder="0.00" value={item.amount} type="number" min="0"
                      onChange={e => updateItem("variable", item.id, "amount", e.target.value)}
                      className="w-full h-9 pl-8 pr-3.5 rounded-xl border border-gray-200 bg-gray-50 text-[13px] focus:outline-none focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/12 focus:bg-white transition-all placeholder:text-gray-300" />
                  </div>
                  <button onClick={() => removeItem("variable", item.id)}
                    className="h-9 w-9 rounded-xl border border-gray-200 flex items-center justify-center text-gray-300 hover:text-red-500 hover:border-red-200 transition-all">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              <button onClick={() => addItem("variable")}
                className="flex items-center gap-1.5 text-[12px] font-semibold text-[#d4af37] hover:text-[#b8962e] transition-colors mt-1">
                <Plus className="h-3.5 w-3.5" /> Add Item
              </button>
            </div>
          </div>

          {fixedItems.length === 0 && variableItems.length === 0 && (
            <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-[#fffbea] border border-[#d4af37]/25 text-[12px] text-[#b8962e]">
              <span className="text-base">ℹ</span> No budget found for this period. Add items above to get started.
            </div>
          )}

          <div className="flex justify-end">
            <button onClick={() => setSaved(true)}
              className="h-10 px-8 rounded-xl bg-gradient-to-r from-[#111118] to-[#1a1a1a] text-[13px] font-bold text-[#d4af37] border border-[#d4af37]/20 hover:border-[#d4af37]/50 transition-all shadow-md">
              {saved ? "✓ Budget Saved" : "Save Budget"}
            </button>
          </div>
        </div>
      )}

      {subTab === "tracker" && (
        <div className="space-y-5">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="text-[17px] font-bold text-[#111118]">Budget Tracker</h2>
              <p className="text-[12px] text-gray-500 mt-0.5">Review your budget performance and download reports.</p>
            </div>
            <div className="flex gap-2">
              <Select value={month} onValueChange={setMonth}>
                <SelectTrigger className="w-36 h-9 rounded-xl border-gray-200 text-[12px]"><SelectValue /></SelectTrigger>
                <SelectContent>{MONTHS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={year} onValueChange={setYear}>
                <SelectTrigger className="w-24 h-9 rounded-xl border-gray-200 text-[12px]"><SelectValue /></SelectTrigger>
                <SelectContent>{YEARS.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
              </Select>
              <button className="h-9 px-3.5 rounded-xl border border-gray-200 text-[12px] font-semibold text-gray-600 flex items-center gap-1.5 hover:bg-gray-50 transition-all">
                <Download className="h-3.5 w-3.5" /> CSV
              </button>
              <button className="h-9 px-3.5 rounded-xl border border-red-200 text-[12px] font-semibold text-red-600 flex items-center gap-1.5 hover:bg-red-50 transition-all">
                <Download className="h-3.5 w-3.5" /> PDF
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Total Budget",     val: fmt(grandTotal),    color: "text-[#b8962e]",  bg: "bg-[#fffbea] border-[#d4af37]/20" },
              { label: "Fixed Spent",      val: "₹0.00",            color: "text-red-600",    bg: "bg-red-50 border-red-100" },
              { label: "Variable Spent",   val: "₹0.00",            color: "text-orange-600", bg: "bg-orange-50 border-orange-100" },
              { label: "Remaining Budget", val: fmt(grandTotal),    color: "text-emerald-600",bg: "bg-emerald-50 border-emerald-100" },
            ].map(k => (
              <div key={k.label} className={`rounded-2xl border p-4 ${k.bg}`}>
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">{k.label}</p>
                <p className={`text-[20px] font-black leading-none mt-1.5 ${k.color}`}>{k.val}</p>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="py-16 text-center">
              <BarChart3 className="h-10 w-10 mx-auto mb-3 text-gray-200" />
              <p className="text-[13px] text-gray-400">No data available for the selected period.</p>
              <p className="text-[11px] text-gray-300 mt-1">Set up your budget first, then track spending here.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
