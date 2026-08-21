import { useState, useMemo } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Badge } from "../components/ui/badge";
import { Calendar, CheckCircle2, History, Lock } from "lucide-react";
import { Pagination } from "../components/shared/Pagination";
import { useTablePagination } from "../hooks/useTablePagination";
import { istDateKey } from "../../lib/istDate";

interface ClosingRecord { id: number; date: string; status: string; closedAt: string; by: string; }

export function AccountingDayEnd() {
  const todayStr = istDateKey();
  const [closingDate, setClosingDate] = useState(todayStr);
  const [started, setStarted] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [history] = useState<ClosingRecord[]>([
    { id:1, date:"2026-06-04", status:"Completed", closedAt:"11:45 PM", by:"Admin" },
    { id:2, date:"2026-06-03", status:"Completed", closedAt:"11:30 PM", by:"Manager" },
  ]);

  const { page, setPage, pageSize, setPageSize, paginate } = useTablePagination(history.length);
  const paginatedHistory = useMemo(() => paginate(history), [history, paginate]);

  const formatDate = (d: string) => new Date(d).toLocaleDateString("en-IN",{day:"numeric",month:"long"});

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-[17px] font-bold text-[#111118]">Day-end Closing</h2>
          <p className="text-[12px] text-gray-500 mt-0.5">Reconcile and confirm the day's financial transactions.</p>
        </div>
        <button onClick={() => setShowHistory(!showHistory)}
          className="flex items-center gap-1.5 h-9 px-4 rounded-xl border border-gray-200 text-[12px] font-semibold text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-all">
          <History className="h-3.5 w-3.5" /> View Closing History
        </button>
      </div>

      {/* History table */}
      {showHistory && (
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="bg-[#111118] px-5 py-3.5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#d4af37]">Closing History</p>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="bg-[#faf8f2]">
                <TableHead className="text-[12px] font-bold text-[#111]">Date</TableHead>
                <TableHead className="text-[12px] font-bold text-[#111]">Status</TableHead>
                <TableHead className="text-[12px] font-bold text-[#111]">Closed At</TableHead>
                <TableHead className="text-[12px] font-bold text-[#111]">By</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedHistory.map(h => (
                <TableRow key={h.id} className="hover:bg-gray-50/50">
                  <TableCell className="text-[13px] text-[#111]">{h.date}</TableCell>
                  <TableCell><Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-[10px]">{h.status}</Badge></TableCell>
                  <TableCell className="text-[13px] text-gray-500">{h.closedAt}</TableCell>
                  <TableCell className="text-[13px] text-gray-500">{h.by}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Pagination
            page={page}
            pageSize={pageSize}
            totalRecords={history.length}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </div>
      )}

      {/* Confirmed state */}
      {confirmed && !showHistory && (
        <div className="flex flex-col items-center justify-center py-16 gap-5">
          <div className="h-16 w-16 rounded-full bg-emerald-100 flex items-center justify-center">
            <Lock className="h-8 w-8 text-emerald-600" />
          </div>
          <div className="text-center">
            <p className="text-[18px] font-black text-[#111]">Day Closed for {formatDate(closingDate)}</p>
            <p className="text-[13px] text-gray-500 mt-1">All records locked · Closing confirmed successfully</p>
          </div>
          <button onClick={() => { setConfirmed(false); setStarted(false); }}
            className="h-9 px-6 rounded-xl border border-gray-200 text-[12px] font-semibold text-gray-600 hover:bg-gray-50 transition-all">
            Close Another Day
          </button>
        </div>
      )}

      {/* Start state */}
      {!confirmed && !showHistory && !started && (
        <div className="max-w-md mx-auto mt-6">
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="bg-[#111118] px-6 py-5 text-center">
              <div className="h-12 w-12 rounded-2xl bg-[#d4af37]/15 flex items-center justify-center mx-auto mb-3">
                <Calendar className="h-6 w-6 text-[#d4af37]" />
              </div>
              <p className="text-[15px] font-bold text-white">Start the Closing Process</p>
            </div>
            <div className="px-6 py-5 space-y-4">
              <p className="text-[12px] text-gray-500 text-center leading-relaxed">
                Select the date for which you want to reconcile the accounts. This process will compare system-recorded sales with your physical counts.
              </p>
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#b8962e]">Select Closing Date</p>
                <input type="date" value={closingDate} onChange={e=>setClosingDate(e.target.value)}
                  className="w-full h-10 px-3.5 rounded-xl border border-gray-200 bg-gray-50 text-[13px] focus:outline-none focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/12 focus:bg-white transition-all" />
              </div>
              <button onClick={() => setStarted(true)}
                className="w-full h-10 rounded-xl bg-gradient-to-r from-[#111118] to-[#1a1a1a] text-[13px] font-bold text-[#d4af37] border border-[#d4af37]/20 hover:border-[#d4af37]/50 transition-all shadow-md">
                Start Day-End Process for {formatDate(closingDate)}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Started state */}
      {!confirmed && !showHistory && started && (
        <div className="space-y-5">
          <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-50 border border-emerald-200">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            <div>
              <p className="text-[13px] font-bold text-emerald-700">Day-End Process Started for {formatDate(closingDate)}</p>
              <p className="text-[12px] text-emerald-600">Review the summary below and confirm to close the day.</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {[
              { label:"Total Sales",        val:"₹770.00",   color:"text-emerald-600", bg:"bg-emerald-50 border-emerald-100" },
              { label:"Total Expenses",     val:"₹1,210.50", color:"text-red-600",     bg:"bg-red-50 border-red-100" },
              { label:"Net Cash Position",  val:"−₹440.50",  color:"text-red-600",     bg:"bg-red-50 border-red-100" },
            ].map(k => (
              <div key={k.label} className={`rounded-2xl border p-5 ${k.bg}`}>
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">{k.label}</p>
                <p className={`text-[22px] font-black leading-none mt-1.5 ${k.color}`}>{k.val}</p>
              </div>
            ))}
          </div>

          <div className="flex gap-3 justify-center">
            <button onClick={() => setStarted(false)}
              className="h-10 px-6 rounded-xl border border-gray-200 text-[12px] font-semibold text-gray-600 hover:bg-gray-50 transition-all">
              Back
            </button>
            <button onClick={() => setConfirmed(true)}
              className="h-10 px-8 rounded-xl bg-gradient-to-r from-[#d4af37] to-[#b8962e] text-[13px] font-bold text-black flex items-center gap-2 shadow-md shadow-[#d4af37]/20 hover:shadow-[#d4af37]/30 transition-all">
              <CheckCircle2 className="h-4 w-4" /> Confirm Day-End Closing
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
