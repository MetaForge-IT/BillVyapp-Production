import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Badge } from "../components/ui/badge";
import { Download, FileText, Search, TrendingDown, TrendingUp } from "lucide-react";
import { istDateKey, istDateParts } from "../../lib/istDate";

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const YEARS  = ["2024","2025","2026"];

export function AccountingBackoffice() {
  const todayStr = istDateKey();
  const { year: istYear } = istDateParts();

  const [subTab, setSubTab] = useState<"daily"|"history"|"profitloss"|"comparison">("daily");
  const [reconcileDate, setReconcileDate] = useState(todayStr);
  const [gpayInBank, setGpayInBank]       = useState("");
  const [cardInBank, setCardInBank]       = useState("");
  const [bankRemarks, setBankRemarks]     = useState("");
  const [cashDeposited, setCashDeposited] = useState("");
  const [cashExpenses, setCashExpenses]   = useState("");
  const [internalTransfer, setInternalTransfer] = useState("");
  const [ownerAccounts, setOwnerAccounts] = useState("");
  const [physicalClosing, setPhysicalClosing]   = useState("");
  const [cashRemarks, setCashRemarks]     = useState("");
  const [saved, setSaved] = useState(false);
  const [historyFrom, setHistoryFrom]   = useState("2026-06-01");
  const [historyTo, setHistoryTo]       = useState(todayStr);
  const [plMonth, setPlMonth]           = useState(MONTHS[now.getMonth()]);
  const [plYear, setPlYear]             = useState(String(istYear));

  const soft = { services:80, productSales:0, openingBalance:0, cashFromSales:80, totalCash:80, gpayUPI:0, card:42, sumUp:0, totalCollection:42 };
  const fmt = (n: number) => `₹${n.toLocaleString("en-IN",{minimumFractionDigits:2})}`;

  const TABS = [
    { id:"daily"       as const, label:"Daily Entry" },
    { id:"history"     as const, label:"History Report" },
    { id:"profitloss"  as const, label:"Profit & Loss" },
    { id:"comparison"  as const, label:"P&L Comparison" },
  ];

  return (
    <div className="space-y-5">
      {/* Sub-tab bar */}
      <div className="flex gap-1.5 flex-wrap">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setSubTab(t.id)}
            className={`h-9 px-4 rounded-xl text-[12px] font-semibold border transition-all ${
              subTab===t.id ? "bg-[#111118] text-[#d4af37] border-[#111118]" : "bg-white text-gray-500 border-gray-200 hover:border-[#d4af37]/40 hover:text-[#111]"
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── DAILY ENTRY ── */}
      {subTab === "daily" && (
        <div className="space-y-5">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="text-[17px] font-bold text-[#111118]">Daily Financial Reconciliation</h2>
            </div>
            <div className="flex items-center gap-2">
              <input type="date" value={reconcileDate} onChange={e=>setReconcileDate(e.target.value)}
                className="h-9 px-3.5 rounded-xl border border-gray-200 text-[12px] bg-white focus:outline-none focus:border-[#d4af37] transition-all" />
              <button className="h-9 w-9 rounded-xl bg-[#111118] flex items-center justify-center text-[#d4af37] hover:bg-[#1a1a1a] transition-all">
                <Search className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Software data */}
            <div className="rounded-2xl border border-[#d4af37]/20 bg-white shadow-sm overflow-hidden">
              <div className="bg-[#111118] px-5 py-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#d4af37]">Data from Software</p>
              </div>
              <div className="px-5 py-4 space-y-2 text-[13px]">
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">Revenue from New Payments</p>
                {[
                  ["Services (Cash/Card Sales)",  soft.services],
                  ["Product Sales",               soft.productSales],
                  ["Opening Cash Balance",         soft.openingBalance],
                  ["Cash From Today's Sales",      soft.cashFromSales],
                ].map(([l,v]) => (
                  <div key={String(l)} className="flex justify-between text-[12px]">
                    <span className="text-gray-500">{l}</span>
                    <span className="font-semibold text-[#111]">₹{v}</span>
                  </div>
                ))}
                <div className="flex justify-between text-[12px] font-bold pt-2 border-t border-gray-100">
                  <span>Total Cash to Account For:</span><span className="text-[#b8962e]">₹{soft.totalCash}</span>
                </div>
                <div className="pt-1 space-y-1.5">
                  {[["Gpay/UPI",soft.gpayUPI],["Card",soft.card],["SumUp",soft.sumUp]].map(([l,v]) => (
                    <div key={String(l)} className="flex justify-between text-[12px] text-gray-500">
                      <span>{l}</span><span>₹{v}</span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between text-[12px] font-bold pt-2 border-t border-gray-100">
                  <span>Total Collection:</span><span className="text-emerald-600">₹{soft.totalCollection}</span>
                </div>
              </div>
            </div>

            {/* Bank deposit */}
            <div className="rounded-2xl border border-orange-200 bg-white shadow-sm overflow-hidden">
              <div className="bg-orange-500 px-5 py-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-white">Data from Bank Deposit</p>
              </div>
              <div className="px-5 py-4 space-y-3">
                {[
                  { label:"GPay (UPI) in Bank", val:gpayInBank, set:setGpayInBank, diff: gpayInBank ? Number(gpayInBank)-soft.gpayUPI : null, diffLabel:"Gpay Diff" },
                  { label:"Card in Bank",        val:cardInBank, set:setCardInBank, diff: cardInBank ? Number(cardInBank)-soft.card : null,    diffLabel:"Card Diff" },
                ].map(({ label, val, set, diff, diffLabel }) => (
                  <div key={label} className="space-y-1.5">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">{label}</p>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[12px] text-gray-400 pointer-events-none">₹</span>
                      <input value={val} onChange={e=>set(e.target.value)} placeholder="0"
                        className="w-full h-9 pl-8 pr-3.5 rounded-xl border border-gray-200 bg-gray-50 text-[13px] font-bold focus:outline-none focus:border-orange-400 focus:bg-white transition-all placeholder:font-normal placeholder:text-gray-300" />
                    </div>
                    {diff !== null && (
                      <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${diff===0?"bg-emerald-100 text-emerald-700":"bg-red-100 text-red-600"}`}>
                        {diffLabel}: {diff>=0?"+":""}₹{diff} {diff===0?"✓":"⚠"}
                      </span>
                    )}
                  </div>
                ))}
                <div className="space-y-1.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Remarks</p>
                  <input value={bankRemarks} onChange={e=>setBankRemarks(e.target.value)} placeholder="Explain any differences here..."
                    className="w-full h-9 px-3.5 rounded-xl border border-gray-200 bg-gray-50 text-[12px] focus:outline-none focus:border-orange-400 focus:bg-white transition-all placeholder:text-gray-300" />
                </div>
              </div>
            </div>

            {/* Cash reconciliation */}
            <div className="rounded-2xl border border-emerald-200 bg-white shadow-sm overflow-hidden">
              <div className="bg-emerald-600 px-5 py-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-white">Cash Reconciliation</p>
              </div>
              <div className="px-5 py-4 space-y-2.5">
                {[
                  { label:"Cash Deposited in Bank",               val:cashDeposited, set:setCashDeposited },
                  { label:"Cash Expenses",                        val:cashExpenses,  set:setCashExpenses },
                  { label:"Internal Cash Transfer (info only)",   val:internalTransfer, set:setInternalTransfer },
                  { label:"Owner / Accounts (info only)",         val:ownerAccounts, set:setOwnerAccounts },
                  { label:"Physical Closing Cash",                val:physicalClosing, set:setPhysicalClosing },
                ].map(({ label, val, set }) => (
                  <div key={label} className="space-y-1">
                    <p className="text-[10px] font-semibold text-gray-500">{label}</p>
                    <input value={val} onChange={e=>set(e.target.value)} placeholder="0"
                      className="w-full h-8 px-3.5 rounded-xl border border-gray-200 bg-emerald-50 text-[12px] focus:outline-none focus:border-emerald-400 focus:bg-white transition-all placeholder:text-gray-300" />
                  </div>
                ))}
                <div className="space-y-1">
                  <p className="text-[10px] font-semibold text-gray-500">Remarks</p>
                  <input value={cashRemarks} onChange={e=>setCashRemarks(e.target.value)} placeholder="Explain any differences here..."
                    className="w-full h-8 px-3.5 rounded-xl border border-gray-200 bg-gray-50 text-[12px] focus:outline-none focus:border-emerald-400 focus:bg-white transition-all placeholder:text-gray-300" />
                </div>
                <div className="flex justify-between font-bold text-[12px] pt-2 border-t border-emerald-100">
                  <span>Cash Diff:</span><span className="text-emerald-600">₹0</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-center">
            <button onClick={() => setSaved(true)}
              className="h-10 px-10 rounded-xl bg-gradient-to-r from-[#d4af37] to-[#b8962e] text-[13px] font-bold text-black shadow-md shadow-[#d4af37]/20 hover:shadow-[#d4af37]/30 transition-all">
              {saved ? "✓ Report Saved" : "Save Reconciliation Report"}
            </button>
          </div>
        </div>
      )}

      {/* ── HISTORY ── */}
      {subTab === "history" && (
        <div className="space-y-4">
          <h2 className="text-[17px] font-bold text-[#111118]">Reconciliation History</h2>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[12px] text-gray-500">From</span>
            <input type="date" value={historyFrom} onChange={e=>setHistoryFrom(e.target.value)}
              className="h-9 px-3.5 rounded-xl border border-gray-200 text-[12px] bg-white focus:outline-none focus:border-[#d4af37] transition-all" />
            <span className="text-[12px] text-gray-500">To</span>
            <input type="date" value={historyTo} onChange={e=>setHistoryTo(e.target.value)}
              className="h-9 px-3.5 rounded-xl border border-gray-200 text-[12px] bg-white focus:outline-none focus:border-[#d4af37] transition-all" />
            <button className="h-9 px-4 rounded-xl bg-[#111118] text-[#d4af37] text-[12px] font-bold hover:bg-[#1a1a1a] transition-all">Apply Filter</button>
            <button className="h-9 px-3.5 rounded-xl border border-gray-200 text-[12px] font-semibold text-gray-600 flex items-center gap-1.5 hover:bg-gray-50 transition-all">
              <Download className="h-3.5 w-3.5" /> Excel
            </button>
            <button className="h-9 px-3.5 rounded-xl border border-red-200 text-[12px] font-semibold text-red-600 flex items-center gap-1.5 hover:bg-red-50 transition-all">
              <Download className="h-3.5 w-3.5" /> PDF
            </button>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="py-16 text-center">
              <FileText className="h-10 w-10 mx-auto mb-3 text-gray-200" />
              <p className="text-[13px] text-gray-400">No reports found for the selected date range.</p>
            </div>
          </div>
        </div>
      )}

      {/* ── PROFIT & LOSS ── */}
      {subTab === "profitloss" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h2 className="text-[17px] font-bold text-[#111118]">Profit & Loss Summary</h2>
            <div className="flex gap-2">
              <Select value={plMonth} onValueChange={setPlMonth}>
                <SelectTrigger className="w-36 h-9 rounded-xl border-gray-200 text-[12px]"><SelectValue /></SelectTrigger>
                <SelectContent>{MONTHS.map(m=><SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={plYear} onValueChange={setPlYear}>
                <SelectTrigger className="w-24 h-9 rounded-xl border-gray-200 text-[12px]"><SelectValue /></SelectTrigger>
                <SelectContent>{YEARS.map(y=><SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {[
              { label:"Total Gross Revenue", val:"₹770.00",  sub:"Includes +₹0.00 Round Off", color:"text-emerald-600", bg:"bg-emerald-50 border-emerald-200", icon:TrendingUp },
              { label:"Total Expenses",      val:"₹0.00",    sub:"",                           color:"text-red-600",    bg:"bg-red-50 border-red-200",           icon:TrendingDown },
              { label:"Net Profit / Loss",   val:"₹740.50",  sub:"",                           color:"text-[#b8962e]", bg:"bg-[#fffbea] border-[#d4af37]/20",    icon:TrendingUp },
            ].map(k => (
              <div key={k.label} className={`rounded-2xl border p-5 ${k.bg}`}>
                <div className="flex items-start justify-between mb-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">{k.label}</p>
                  <k.icon className={`h-4 w-4 ${k.color}`} />
                </div>
                <p className={`text-[22px] font-black leading-none ${k.color}`}>{k.val}</p>
                {k.sub && <p className="text-[10px] text-gray-400 mt-1">{k.sub}</p>}
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">Taxes Collected (GST)</p>
            <p className="text-[22px] font-black text-[#111]">₹29.50</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/60">
                <p className="text-[13px] font-bold text-[#111]">Revenue Breakdown (Gross)</p>
              </div>
              <div className="px-5 py-3">
                <div className="flex justify-between text-[13px] py-2 border-b border-gray-100 last:border-0">
                  <span className="text-gray-500">From Services</span><span className="font-bold text-[#111]">₹740.00</span>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/60">
                <p className="text-[13px] font-bold text-[#111]">Expenses Breakdown</p>
              </div>
              <div className="px-5 py-3">
                <p className="text-[12px] text-gray-400 py-2">No data for this period.</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/60">
              <p className="text-[13px] font-bold text-[#111]">Discounts & Adjustments</p>
            </div>
            <div className="px-5 py-3 space-y-2 text-[13px]">
              {[["Line Item Discounts","−₹0.00"],["Manual Invoice Discounts","−₹0.00"]].map(([l,v])=>(
                <div key={l} className="flex justify-between py-1.5 border-b border-gray-100 last:border-0">
                  <span className="text-gray-500">{l}</span><span className="text-red-500 font-semibold">{v}</span>
                </div>
              ))}
              <div className="flex justify-between py-1.5 font-bold">
                <span>Total Discounts</span><span className="text-red-500">−₹0.00</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── P&L COMPARISON ── */}
      {subTab === "comparison" && (
        <div className="space-y-4">
          <h2 className="text-[17px] font-bold text-[#111118]">Monthly P&L Comparison</h2>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[12px] text-gray-500">From:</span>
            <input defaultValue="April 2026"
              className="h-9 px-3.5 rounded-xl border border-gray-200 text-[12px] bg-white focus:outline-none focus:border-[#d4af37] transition-all w-36" />
            <span className="text-[12px] text-gray-500">To:</span>
            <input defaultValue="June 2026"
              className="h-9 px-3.5 rounded-xl border border-gray-200 text-[12px] bg-white focus:outline-none focus:border-[#d4af37] transition-all w-36" />
            <button className="h-9 px-4 rounded-xl bg-gradient-to-r from-[#d4af37] to-[#b8962e] text-[12px] font-bold text-black shadow-md shadow-[#d4af37]/20">Generate Report</button>
            <button className="h-9 px-3.5 rounded-xl border border-emerald-200 text-[12px] font-semibold text-emerald-600 flex items-center gap-1.5 hover:bg-emerald-50 transition-all">
              <Download className="h-3.5 w-3.5" /> Excel
            </button>
            <button className="h-9 px-3.5 rounded-xl border border-red-200 text-[12px] font-semibold text-red-600 flex items-center gap-1.5 hover:bg-red-50 transition-all">
              <Download className="h-3.5 w-3.5" /> PDF
            </button>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-[#faf8f2]">
                  <TableHead className="text-[12px] font-bold text-[#111]">Metric</TableHead>
                  <TableHead className="text-right text-[12px] font-bold text-[#111]">May 2026</TableHead>
                  <TableHead className="text-right text-[12px] font-bold text-[#111]">June 2026</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[
                  ["Total Revenue",    "₹39,516.53", "₹740.50",  false],
                  ["Total Expenses",   "₹0.00",      "₹0.00",    false],
                  ["Net Profit / Loss","₹39,516.53", "₹740.50",  true],
                ].map(([m,may,jun,bold]) => (
                  <TableRow key={String(m)} className="hover:bg-gray-50/50">
                    <TableCell className={`text-[13px] ${bold ? "font-bold text-[#111]" : "text-gray-500"}`}>{m}</TableCell>
                    <TableCell className={`text-right text-[13px] ${bold ? "font-black text-emerald-600" : "text-[#111]"}`}>{may}</TableCell>
                    <TableCell className={`text-right text-[13px] ${bold ? "font-black text-emerald-600" : "text-[#111]"}`}>{jun}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}
