import { useState, useMemo } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Dialog, DialogContent } from "../components/ui/dialog";
import { Badge } from "../components/ui/badge";
import { IndianRupee, Plus, Coins } from "lucide-react";
import { Pagination } from "../components/shared/Pagination";
import { useTablePagination } from "../hooks/useTablePagination";

const DENOMINATIONS = [
  { label:"₹500", value:500 }, { label:"₹200", value:200 }, { label:"₹100", value:100 },
  { label:"₹50",  value:50  }, { label:"₹20",  value:20  }, { label:"₹10",  value:10  },
  { label:"₹5",   value:5   }, { label:"₹2",   value:2   }, { label:"₹1",   value:1   },
];

interface DenomRecord { id: number; date: string; expected: number; counted: number; diff: number; by: string; }

export function AccountingCashDenomination() {
  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];
  const [showDialog, setShowDialog] = useState(false);
  const [counts, setCounts]     = useState<Record<number,string>>({});
  const [remarks, setRemarks]   = useState("");
  const [from, setFrom]         = useState(todayStr.replace(/\d{2}$/, "01"));
  const [to, setTo]             = useState(todayStr);
  const [records, setRecords]   = useState<DenomRecord[]>([]);

  const expectedCash  = 80;
  const totalCounted  = DENOMINATIONS.reduce((s,d)=>s+(Number(counts[d.value]||0)*d.value), 0);

  const filteredRecords = useMemo(
    () => records.filter((r) => r.date >= from && r.date <= to),
    [records, from, to],
  );
  const { page, setPage, pageSize, setPageSize, paginate } = useTablePagination(
    filteredRecords.length,
    [from, to],
  );
  const paginatedRecords = useMemo(() => paginate(filteredRecords), [filteredRecords, paginate]);

  const saveDenomination = () => {
    setRecords(prev => [...prev, {
      id: Date.now(), date: todayStr, expected: expectedCash, counted: totalCounted,
      diff: totalCounted - expectedCash, by: "Admin",
    }]);
    setShowDialog(false);
    setCounts({});
    setRemarks("");
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-[#d4af37]/15 flex items-center justify-center">
            <Coins className="h-4.5 w-4.5 text-[#d4af37]" />
          </div>
          <div>
            <h2 className="text-[17px] font-bold text-[#111118]">Cash Denomination</h2>
            <p className="text-[11px] text-gray-500 mt-0.5">Day-end style petty cash counts — history shows who counted and note breakdown.</p>
          </div>
        </div>
        <button onClick={() => setShowDialog(true)}
          className="flex items-center gap-1.5 h-9 px-4 rounded-xl bg-gradient-to-r from-[#d4af37] to-[#b8962e] text-[12px] font-bold text-black shadow-md shadow-[#d4af37]/20 hover:shadow-[#d4af37]/30 transition-all">
          <Plus className="h-3.5 w-3.5" /> Start Denomination
        </button>
      </div>

      {/* Closing history */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50/60 flex items-center justify-between flex-wrap gap-3">
          <p className="text-[13px] font-bold text-[#111118]">Closing History</p>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-gray-500">From</span>
            <input type="date" value={from} onChange={e=>setFrom(e.target.value)}
              className="h-8 px-3 rounded-xl border border-gray-200 text-[11px] bg-white focus:outline-none focus:border-[#d4af37] transition-all" />
            <span className="text-[11px] text-gray-500">To</span>
            <input type="date" value={to} onChange={e=>setTo(e.target.value)}
              className="h-8 px-3 rounded-xl border border-gray-200 text-[11px] bg-white focus:outline-none focus:border-[#d4af37] transition-all" />
          </div>
        </div>

        {records.length === 0 ? (
          <div className="py-16 text-center">
            <IndianRupee className="h-10 w-10 mx-auto mb-3 text-gray-200" />
            <p className="text-[13px] text-gray-400">No denomination records yet.</p>
            <p className="text-[11px] text-gray-300 mt-1">Click "Start Denomination" to record your first cash count.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-[#faf8f2]">
                <TableHead className="text-[12px] font-bold text-[#111]">Date</TableHead>
                <TableHead className="text-right text-[12px] font-bold text-[#111]">Expected Cash</TableHead>
                <TableHead className="text-right text-[12px] font-bold text-[#111]">Physical Count</TableHead>
                <TableHead className="text-right text-[12px] font-bold text-[#111]">Difference</TableHead>
                <TableHead className="text-[12px] font-bold text-[#111]">Recorded By</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedRecords.map(r => (
                <TableRow key={r.id} className="hover:bg-gray-50/50">
                  <TableCell className="text-[13px] text-[#111]">{r.date}</TableCell>
                  <TableCell className="text-right text-[13px]">₹{r.expected}</TableCell>
                  <TableCell className="text-right text-[13px]">₹{r.counted}</TableCell>
                  <TableCell className="text-right">
                    <Badge className={`text-[10px] ${r.diff===0?"bg-emerald-100 text-emerald-700 border-emerald-200":r.diff>0?"bg-blue-100 text-blue-700 border-blue-200":"bg-red-100 text-red-700 border-red-200"}`}>
                      {r.diff>=0?"+":""}₹{r.diff}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-[13px] text-gray-500">{r.by}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Pagination
            page={page}
            pageSize={pageSize}
            totalRecords={filteredRecords.length}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        )}
      </div>

      {/* Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="p-0 gap-0 overflow-hidden rounded-2xl w-[min(95vw,28rem)] max-w-none [&>button]:top-4 [&>button]:right-4 [&>button]:bg-white/20 [&>button]:text-white [&>button]:rounded-lg [&>button]:opacity-100 [&>button]:hover:bg-white/30">
          {/* Header */}
          <div className="bg-[#111118] px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-[#d4af37]/15 flex items-center justify-center">
                <Coins className="h-4.5 w-4.5 text-[#d4af37]" />
              </div>
              <div>
                <p className="text-white font-bold text-[14px] leading-tight">Record Cash Denomination</p>
                <p className="text-gray-500 text-[11px] mt-0.5">Count notes and coins in the drawer</p>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="bg-[#faf8f2] px-6 py-5 space-y-4">
            <p className="text-[11px] text-gray-500 leading-relaxed">
              Expected cash = opening balance + today's cash sales − cash-affecting expenses.
            </p>

            {/* System summary */}
            <div className="rounded-xl bg-white border border-gray-200 shadow-sm overflow-hidden">
              {[
                { label:"Date",                        val:todayStr },
                { label:"Opening cash",                val:"₹0.00" },
                { label:"Cash from sales (today)",     val:"₹80.00" },
                { label:"Expenses (affects cash today)",val:"₹0.00" },
              ].map(({ label, val }) => (
                <div key={label} className="flex justify-between px-4 py-2.5 text-[12px] border-b border-gray-100 last:border-0">
                  <span className="text-gray-500">{label}</span><span className="font-semibold text-[#111]">{val}</span>
                </div>
              ))}
              <div className="flex justify-between px-4 py-3 bg-[#fffbea] text-[13px] font-bold">
                <span className="text-[#111]">Expected cash</span>
                <span className="text-[#b8962e]">₹{expectedCash}.00</span>
              </div>
            </div>

            {/* Denomination grid */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#b8962e] mb-2">Physical Cash Count</p>
              <div className="grid grid-cols-3 gap-2">
                {DENOMINATIONS.map(d => (
                  <div key={d.value} className="rounded-xl border border-gray-200 bg-white p-2.5">
                    <p className="text-[10px] font-bold text-gray-500 mb-1.5">{d.label}</p>
                    <input type="number" min="0" placeholder="0"
                      value={counts[d.value]||""}
                      onChange={e=>setCounts(p=>({...p,[d.value]:e.target.value}))}
                      className="w-full h-8 px-2.5 rounded-lg border border-gray-200 text-[12px] font-bold text-center focus:outline-none focus:border-[#d4af37] transition-all placeholder:font-normal placeholder:text-gray-300" />
                    <p className="text-[10px] text-[#b8962e] mt-1 text-center font-semibold">
                      = ₹{((Number(counts[d.value])||0)*d.value).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>

              <div className="flex justify-between font-bold text-[13px] mt-3 pt-3 border-t border-gray-200">
                <span className="text-[#111]">Total counted:</span>
                <span className="text-[#b8962e]">₹{totalCounted.toFixed(2)}</span>
              </div>
              {totalCounted !== expectedCash && totalCounted > 0 && (
                <p className={`text-[11px] mt-1 font-semibold ${totalCounted>expectedCash?"text-blue-500":"text-red-500"}`}>
                  Difference: {totalCounted>expectedCash?"+":""}₹{(totalCounted-expectedCash).toFixed(2)}
                </p>
              )}
            </div>

            {/* Remarks */}
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#b8962e]">Remarks (Optional)</p>
              <input placeholder="Optional notes" value={remarks} onChange={e=>setRemarks(e.target.value)}
                className="w-full h-9 px-3.5 rounded-xl border border-gray-200 bg-white text-[13px] focus:outline-none focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/12 transition-all placeholder:text-gray-300" />
            </div>

            <div className="flex justify-end gap-2">
              <button onClick={() => setShowDialog(false)}
                className="h-9 px-4 rounded-xl border border-gray-200 text-[12px] font-semibold text-gray-600 hover:bg-gray-100 transition-all">
                Cancel
              </button>
              <button onClick={saveDenomination}
                className="h-9 px-5 rounded-xl bg-gradient-to-r from-[#d4af37] to-[#b8962e] text-[12px] font-bold text-black shadow-md shadow-[#d4af37]/20 transition-all">
                Save Denomination
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
