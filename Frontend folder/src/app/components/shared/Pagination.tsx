import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { PAGE_SIZE_OPTIONS } from "../../hooks/useTablePagination";

export interface TablePaginationProps {
  page: number;
  pageSize: number;
  totalRecords: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

export function Pagination({
  page,
  pageSize,
  totalRecords,
  onPageChange,
  onPageSizeChange,
}: TablePaginationProps) {
  const start = totalRecords === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalRecords);
  const isPrevDisabled = page === 1;
  const isNextDisabled = page * pageSize >= totalRecords;

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[rgba(18,18,18,0.08)] bg-[#FAF8F2]/40 px-4 py-3">
      <p className="text-[12px] font-medium text-[#6B6B6B]">
        {totalRecords === 0
          ? "Showing 0-0 of 0 records"
          : `Showing ${start}-${end} of ${totalRecords} records`}
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-medium text-[#6B6B6B]">Rows</span>
          <div className="relative">
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="h-8 min-w-[3.25rem] appearance-none rounded-xl border border-[rgba(18,18,18,0.12)] bg-white pl-3 pr-8 text-[12px] font-semibold text-[#121212] transition-all hover:border-[#D4AF37]/40 focus:border-[#D4AF37]/60 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/15"
              aria-label="Records per page"
            >
              {PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#6B6B6B]" />
          </div>
          <span className="text-[11px] font-medium text-[#6B6B6B]">/ page</span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onPageChange(page - 1)}
            disabled={isPrevDisabled}
            aria-label="Previous page"
            className={[
              "flex h-8 w-8 items-center justify-center rounded-xl border text-[12px] font-semibold transition-all",
              isPrevDisabled
                ? "cursor-not-allowed border-[rgba(18,18,18,0.08)] bg-gray-100 text-gray-300"
                : "cursor-pointer border-[rgba(18,18,18,0.12)] bg-white text-[#121212] hover:border-[#D4AF37]/40 hover:bg-[#D4AF37]/5",
            ].join(" ")}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onPageChange(page + 1)}
            disabled={isNextDisabled}
            aria-label="Next page"
            className={[
              "flex h-8 w-8 items-center justify-center rounded-xl border text-[12px] font-semibold transition-all",
              isNextDisabled
                ? "cursor-not-allowed border-[rgba(18,18,18,0.08)] bg-gray-100 text-gray-300"
                : "cursor-pointer border-[#D4AF37]/30 bg-gradient-to-r from-[#D4AF37]/10 to-[#D4AF37]/5 text-[#121212] hover:border-[#D4AF37]/50 hover:from-[#D4AF37]/15 hover:to-[#D4AF37]/10",
            ].join(" ")}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
