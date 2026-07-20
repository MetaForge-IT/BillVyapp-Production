import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Badge } from "../components/ui/badge";
import { Plus, Search, Upload, AlertCircle, TrendingDown, Tag, IndianRupee, Hash } from "lucide-react";

const CATEGORIES = ["Staff Salaries","Rent & Utilities","Product Purchase","Equipment","Marketing","Miscellaneous"];
const PAYMENT_METHODS = ["Cash","Card","UPI","Bank Transfer"];
const FREQUENCIES = ["Regular","Once"];

interface Expense {
  id: number; description: string; amount: number; category: string;
  paymentMethod: string; date: string; time: string; frequency: string;
  source: string; nature: string;
}

const MOCK_EXPENSES: Expense[] = [];

export function AccountingExpenses() {
  const [expenses] = useState<Expense[]>(MOCK_EXPENSES);
  const [form, setForm] = useState({ nature:"Operational Expense", source:"Salon Petty Cash", frequency:"Regular", amount:"", category:"", subCategory:"", paymentMethod:"Cash", date:"2026-06-05", time:"16:11", description:"" });
  const [view, setView] = useState<"daily"|"weekly"|"monthly">("daily");
  const [filterCategory, setFilterCategory] = useState("All Categories");
  const [filterFreq, setFilterFreq] = useState("All Frequencies");
  const [dateFrom, setDateFrom] = useState("2026-06-05");
  const [dateTo, setDateTo] = useState("2026-06-30");

  const totalToday   = expenses.reduce((s,e)=>s+e.amount,0);
  const highest      = Math.max(...expenses.map(e=>e.amount),0);
  const mostCat      = expenses.length > 0 ? expenses[0].category : "N/A";
  const fmt = (n: number) => `₹${n.toLocaleString("en-IN",{minimumFractionDigits:2})}`;

  return (
    <div className="space-y-5">
      {/* Header + filters */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-[17px] font-bold text-[#111118]">Expense Dashboard</h2>
          <p className="text-[12px] text-gray-500 mt-0.5">Today's expense summary and history.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-40 h-9 rounded-xl border-gray-200 text-[12px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="All Categories">All Categories</SelectItem>
              {CATEGORIES.map(c=><SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterFreq} onValueChange={setFilterFreq}>
            <SelectTrigger className="w-40 h-9 rounded-xl border-gray-200 text-[12px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="All Frequencies">All Frequencies</SelectItem>
              {FREQUENCIES.map(f=><SelectItem key={f} value={f}>{f}</SelectItem>)}
            </SelectContent>
          </Select>
          <input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)}
            className="h-9 px-3 rounded-xl border border-gray-200 text-[12px] bg-white focus:outline-none focus:border-[#d4af37] transition-all" />
          <input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)}
            className="h-9 px-3 rounded-xl border border-gray-200 text-[12px] bg-white focus:outline-none focus:border-[#d4af37] transition-all" />
          <button className="h-9 px-4 rounded-xl bg-[#111118] text-[#d4af37] text-[12px] font-bold hover:bg-[#1a1a1a] transition-all">
            Fetch
          </button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Spent Today",     val: fmt(totalToday), icon: TrendingDown, color: "text-red-600",    bg: "bg-red-50 border-red-100" },
          { label: "Number of Expenses",    val: String(expenses.length), icon: Hash,      color: "text-blue-600",  bg: "bg-blue-50 border-blue-100" },
          { label: "Highest Expense",       val: fmt(highest),    icon: IndianRupee,  color: "text-orange-600",bg: "bg-orange-50 border-orange-100" },
          { label: "Most Common Category",  val: mostCat,         icon: Tag,          color: "text-[#b8962e]", bg: "bg-[#fffbea] border-[#d4af37]/20" },
        ].map(k => (
          <div key={k.label} className={`rounded-2xl border p-4 ${k.bg}`}>
            <div className="flex items-start justify-between mb-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">{k.label}</p>
              <k.icon className={`h-4 w-4 ${k.color} shrink-0`} />
            </div>
            <p className={`text-[18px] font-black leading-none ${k.color}`}>{k.val}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Add Expense Form */}
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="bg-[#111118] px-5 py-4 flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-[#d4af37]/15 flex items-center justify-center">
              <Plus className="h-4 w-4 text-[#d4af37]" />
            </div>
            <div>
              <p className="text-[13px] font-bold text-white">Add New Expense</p>
              <p className="text-[10px] text-gray-500">Record a new expense entry</p>
            </div>
          </div>
          <div className="px-5 py-5 space-y-4">
            {/* Transaction Nature */}
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#b8962e]">Transaction Nature</p>
              <div className="flex gap-1.5">
                {["Operational Expense","Internal Transfer"].map(n => (
                  <button key={n} onClick={() => setForm(f=>({...f,nature:n}))}
                    className={`h-8 px-3 rounded-lg text-[11px] font-semibold border transition-all ${form.nature===n ? "bg-[#111118] text-[#d4af37] border-[#111118]" : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"}`}>
                    {n}
                  </button>
                ))}
              </div>
            </div>

            {/* Paid From Source */}
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#b8962e]">Paid From Source</p>
              <div className="flex gap-1.5">
                {["Salon Petty Cash","Owner / Accounts"].map(s => (
                  <button key={s} onClick={() => setForm(f=>({...f,source:s}))}
                    className={`h-8 px-3 rounded-lg text-[11px] font-semibold border transition-all ${form.source===s ? "bg-gradient-to-r from-[#d4af37] to-[#b8962e] text-black border-transparent" : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"}`}>
                    {s}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-gray-400">Affects Cash 💵 / P&L 📊 / Budget 📋</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Frequency */}
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#b8962e]">Frequency</p>
                <div className="flex gap-1.5">
                  {FREQUENCIES.map(f => (
                    <button key={f} onClick={() => setForm(fr=>({...fr,frequency:f}))}
                      className={`flex-1 h-8 rounded-lg text-[11px] font-semibold border transition-all ${form.frequency===f ? "bg-[#111118] text-[#d4af37] border-[#111118]" : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"}`}>
                      {f}
                    </button>
                  ))}
                </div>
              </div>
              {/* Amount */}
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#b8962e]">Amount</p>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[13px] text-gray-400 pointer-events-none">₹</span>
                  <input type="number" min="0" value={form.amount} onChange={e=>setForm(f=>({...f,amount:e.target.value}))}
                    placeholder="0.00"
                    className="w-full h-9 pl-8 pr-3.5 rounded-xl border border-gray-200 bg-gray-50 text-[13px] font-bold focus:outline-none focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/12 focus:bg-white transition-all placeholder:font-normal placeholder:text-gray-300" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#b8962e]">Budget Category</p>
                <Select value={form.category} onValueChange={v=>setForm(f=>({...f,category:v}))}>
                  <SelectTrigger className="h-9 rounded-xl border-gray-200 text-[12px]"><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map(c=><SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#b8962e]">Sub-Category</p>
                <input placeholder="e.g., Office Snacks" value={form.subCategory} onChange={e=>setForm(f=>({...f,subCategory:e.target.value}))}
                  className="w-full h-9 px-3.5 rounded-xl border border-gray-200 bg-gray-50 text-[12px] focus:outline-none focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/12 focus:bg-white transition-all placeholder:text-gray-300" />
              </div>
            </div>

            <div className="space-y-1.5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#b8962e]">Payment Method</p>
              <Select value={form.paymentMethod} onValueChange={v=>setForm(f=>({...f,paymentMethod:v}))}>
                <SelectTrigger className="h-9 rounded-xl border-gray-200 text-[12px]"><SelectValue /></SelectTrigger>
                <SelectContent>{PAYMENT_METHODS.map(m=><SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
              </Select>
              <p className="text-[10px] text-gray-400">Payment method is locked to Cash for this transaction type.</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#b8962e]">Date</p>
                <input type="date" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))}
                  className="w-full h-9 px-3.5 rounded-xl border border-gray-200 bg-gray-50 text-[12px] focus:outline-none focus:border-[#d4af37] transition-all" />
              </div>
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#b8962e]">Time</p>
                <input type="time" value={form.time} onChange={e=>setForm(f=>({...f,time:e.target.value}))}
                  className="w-full h-9 px-3.5 rounded-xl border border-gray-200 bg-gray-50 text-[12px] focus:outline-none focus:border-[#d4af37] transition-all" />
              </div>
            </div>

            <p className="text-[10px] text-gray-400">Petty cash expenses must be recorded on the same day for reconciliation.</p>

            <div className="space-y-1.5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#b8962e]">Description (Optional)</p>
              <input placeholder="e.g., Lunch meeting with client" value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))}
                className="w-full h-9 px-3.5 rounded-xl border border-gray-200 bg-gray-50 text-[12px] focus:outline-none focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/12 focus:bg-white transition-all placeholder:text-gray-300" />
            </div>

            {/* File upload */}
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#b8962e]">Attach Bill (Optional)</p>
              <div className="border-2 border-dashed border-gray-200 rounded-xl p-5 text-center cursor-pointer hover:border-[#d4af37]/40 hover:bg-[#fffbea]/30 transition-all">
                <Upload className="h-5 w-5 mx-auto mb-1.5 text-gray-300" />
                <p className="text-[12px] font-semibold text-[#d4af37]">Click to upload a file</p>
                <p className="text-[10px] text-gray-400 mt-0.5">PNG, JPG, PDF up to 10MB</p>
              </div>
            </div>

            <button className="w-full h-10 rounded-xl bg-gradient-to-r from-[#111118] to-[#1a1a1a] text-[13px] font-bold text-[#d4af37] border border-[#d4af37]/20 hover:border-[#d4af37]/50 transition-all shadow-md">
              Submit Expense
            </button>
          </div>
        </div>

        {/* History */}
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="bg-[#111118] px-5 py-4 flex items-center justify-between">
            <div>
              <p className="text-[13px] font-bold text-white">Expense History & Cash Movements</p>
              <p className="text-[10px] text-gray-500 mt-0.5">All recorded expense transactions</p>
            </div>
            <div className="flex gap-1 p-1 rounded-xl bg-white/10">
              {(["daily","weekly","monthly"] as const).map(v => (
                <button key={v} onClick={() => setView(v)}
                  className={`h-7 px-3 rounded-lg text-[11px] font-bold transition-all capitalize ${view===v ? "bg-[#d4af37] text-black" : "text-gray-400 hover:text-white"}`}>
                  {v.charAt(0).toUpperCase()+v.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <div className="px-5 py-4">
            {expenses.length === 0 ? (
              <div className="text-center py-16">
                <AlertCircle className="h-10 w-10 mx-auto mb-3 text-gray-200" />
                <p className="text-[13px] text-gray-400">No records found</p>
                <p className="text-[11px] text-gray-300 mt-1">Try adjusting your filters or add a new expense.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {expenses.map(e => (
                  <div key={e.id} className="flex items-center justify-between p-4 rounded-xl border border-gray-100 bg-[#faf8f2] hover:border-[#d4af37]/20 transition-all">
                    <div>
                      <p className="text-[13px] font-semibold text-[#111]">{e.description}</p>
                      <p className="text-[11px] text-gray-500 mt-0.5">{e.category} · {e.date} · {e.time}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[14px] font-black text-red-600">−{fmt(e.amount)}</p>
                      <Badge variant="outline" className="text-[10px] mt-1 border-gray-200">{e.paymentMethod}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
