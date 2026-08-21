import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { cn } from "../../components/ui/utils";
import { Pagination } from "../../components/shared/Pagination";
import type { StockLog } from "../../context/ProductsContext";
import {
  History, ShoppingCart, SlidersHorizontal, RefreshCw, Scissors,
  ArrowDownCircle, ArrowUpCircle,
} from "lucide-react";
import { TABLE_ROW } from "./inventoryUi";

export type UsageLogTabPagination = {
  page: number;
  pageSize: number;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
};

type LogFilter = "all" | "Service Used" | "Retail Sale" | "Manual Adjustment" | "Restock";

type UsageLogTabProps = {
  logFilter: LogFilter;
  setLogFilter: (f: LogFilter) => void;
  filteredLog: StockLog[];
  paginatedLog: StockLog[];
  logPagination: UsageLogTabPagination;
};

export function UsageLogTab({
  logFilter, setLogFilter, filteredLog, paginatedLog, logPagination,
}: UsageLogTabProps) {
  return (
    <>
            <Card className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-black/[0.07] shadow-sm">
              <CardHeader className="shrink-0 pb-3">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <CardTitle className="text-[15px] font-bold text-[#1a1a1a] flex items-center gap-2">
                    <History className="h-4 w-4 text-[#d4af37]" /> Stock Usage Log
                  </CardTitle>
                  <div className="flex max-w-full items-center gap-2 overflow-x-auto pb-1">
                    {(["all", "Service Used", "Retail Sale", "Manual Adjustment"] as const).map(f => (
                      <button key={f} onClick={() => setLogFilter(f)}
                        className={`h-7 shrink-0 whitespace-nowrap px-3 rounded-full text-[11px] font-semibold transition-all ${logFilter === f ? "bg-[#121212] text-[#D4AF37]" : "bg-[#FAF8F2] text-[#6b6b6b] hover:bg-[#f4f2ed] border border-black/[0.06]"}`}>
                        {f === "all" ? "All" : f}
                      </button>
                    ))}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex min-h-0 flex-1 flex-col overflow-hidden p-0">
                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
                {filteredLog.length === 0 ? (
                  <div className="flex flex-col items-center gap-3 py-16 text-center">
                    <History className="h-10 w-10 text-gray-200" />
                    <p className="text-[13px] font-semibold text-gray-400">No stock movements yet</p>
                    <p className="text-[11px] text-gray-400">Movements appear here when appointments are completed, products are sold, or stock is adjusted manually.</p>
                  </div>
                ) : (
                  <>
                  <div className="divide-y divide-black/[0.06] lg:hidden">
                    {paginatedLog.map((log) => (
                      <article key={log.id} className="space-y-3 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-[14px] font-bold text-[#111118]">{log.productName}</p>
                            <p className="mt-0.5 font-mono text-[10px] text-[#9a9a9a]">{log.sku}</p>
                          </div>
                          <span className={cn(
                            "inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-bold",
                            log.type === "Service Used" ? "border-black/[0.08] bg-[#FAF8F2] text-[#111118]"
                              : log.type === "Retail Sale" ? "border-[#D4AF37]/20 bg-[#FFFBEB] text-[#9a7d20]"
                                : log.type === "Manual Adjustment" ? "border-[#D4AF37]/25 bg-[#D4AF37]/10 text-[#9a7d20]"
                                  : "border-black/[0.08] bg-[#f4f2ed] text-[#6b6b6b]",
                          )}>
                            {log.type}
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <div className="rounded-xl bg-[#FAF8F2] px-2.5 py-2">
                            <p className="text-[9px] font-bold uppercase text-[#9a9a9a]">Date</p>
                            <p className="mt-1 text-[11px] font-semibold">{log.date}</p>
                            <p className="text-[10px] text-[#9a9a9a]">{log.time}</p>
                          </div>
                          <div className="rounded-xl bg-[#FAF8F2] px-2.5 py-2 text-center">
                            <p className="text-[9px] font-bold uppercase text-[#9a9a9a]">Change</p>
                            <p className={cn("mt-1 text-[16px] font-black", log.qtyChange < 0 ? "text-red-500" : "text-[#9a7d20]")}>
                              {log.qtyChange > 0 ? "+" : ""}{log.qtyChange}
                            </p>
                          </div>
                          <div className="rounded-xl border border-[#D4AF37]/20 bg-[#FFFBEB] px-2.5 py-2 text-center">
                            <p className="text-[9px] font-bold uppercase text-[#9a7d20]">After</p>
                            <p className="mt-1 text-[16px] font-black text-[#111118]">{log.stockAfter}</p>
                          </div>
                        </div>
                        {(log.ref || log.note) && (
                          <p className="rounded-lg bg-gray-50 px-3 py-2 text-[11px] text-[#6b6b6b]">
                            {log.ref || ""}{log.note ? (log.ref ? " · " : "") + log.note : ""}
                          </p>
                        )}
                      </article>
                    ))}
                  </div>
                  <div className="hidden overflow-x-auto table-scroll lg:block">
                    <table className="w-full text-[12px]">
                      <thead className="bg-[#fafaf8] border-b border-gray-100">
                        <tr>
                          <th className="text-left px-4 py-2.5 font-semibold text-gray-500">Date & Time</th>
                          <th className="text-left px-4 py-2.5 font-semibold text-gray-500">Product</th>
                          <th className="text-left px-4 py-2.5 font-semibold text-gray-500">SKU</th>
                          <th className="text-left px-4 py-2.5 font-semibold text-gray-500">Type</th>
                          <th className="text-center px-4 py-2.5 font-semibold text-gray-500">Change</th>
                          <th className="text-center px-4 py-2.5 font-semibold text-gray-500">Stock After</th>
                          <th className="text-left px-4 py-2.5 font-semibold text-gray-500">Ref / Note</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedLog.map((log, i) => (
                          <tr key={log.id} className={`${TABLE_ROW} ${i % 2 === 0 ? "bg-white" : "bg-[#FAF8F2]/50"}`}>
                            <td className="px-4 py-3 text-gray-500 tabular-nums whitespace-nowrap">{log.date} · {log.time}</td>
                            <td className="px-4 py-3 font-semibold text-[#1a1a1a] max-w-[160px] truncate">{log.productName}</td>
                            <td className="px-4 py-3 font-mono text-gray-400">{log.sku}</td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                log.type === "Service Used" ? "bg-[#FAF8F2] text-[#111118] border-black/[0.08]"
                                : log.type === "Retail Sale" ? "bg-[#FFFBEB] text-[#9a7d20] border-[#D4AF37]/20"
                                : log.type === "Manual Adjustment" ? "bg-[#D4AF37]/10 text-[#9a7d20] border-[#D4AF37]/25"
                                : "bg-[#f4f2ed] text-[#6b6b6b] border-black/[0.08]"
                              }`}>
                                {log.type === "Service Used" && <Scissors className="h-2.5 w-2.5" />}
                                {log.type === "Retail Sale" && <ShoppingCart className="h-2.5 w-2.5" />}
                                {log.type === "Manual Adjustment" && <SlidersHorizontal className="h-2.5 w-2.5" />}
                                {log.type === "Restock" && <RefreshCw className="h-2.5 w-2.5" />}
                                {log.type}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center tabular-nums">
                              <span className={`font-bold flex items-center justify-center gap-0.5 ${log.qtyChange < 0 ? "text-red-500" : "text-[#9a7d20]"}`}>
                                {log.qtyChange < 0 ? <ArrowDownCircle className="h-3 w-3" /> : <ArrowUpCircle className="h-3 w-3" />}
                                {log.qtyChange > 0 ? "+" : ""}{log.qtyChange}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center font-bold text-[#1a1a1a] tabular-nums">{log.stockAfter}</td>
                            <td className="px-4 py-3 text-gray-400 text-[11px] max-w-[180px] truncate">{log.ref || ""}{log.note ? (log.ref ? " · " : "") + log.note : ""}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  </>
                )}
                </div>
                {filteredLog.length > 0 && (
                  <div className="shrink-0 border-t border-black/[0.06] bg-white">
                  <Pagination
                    page={logPagination.page}
                    pageSize={logPagination.pageSize}
                    totalRecords={filteredLog.length}
                    onPageChange={logPagination.setPage}
                    onPageSizeChange={logPagination.setPageSize}
                  />
                  </div>
                )}
              </CardContent>
            </Card>
    </>
  );
}
