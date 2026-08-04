import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { PAGE_SIZE_OPTIONS } from "../../hooks/useTablePagination";
import { cn } from "../ui/utils";

export interface TablePaginationProps {
  page: number;
  pageSize: number;
  totalRecords: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

type PageItem = number | "ellipsis";

/** Build a compact numbered page list with ellipsis, e.g. 1 … 4 5 6 … 12 */
export function buildPageItems(current: number, totalPages: number, siblingCount = 1): PageItem[] {
  if (totalPages <= 1) return totalPages === 1 ? [1] : [];

  const totalNumbers = siblingCount * 2 + 5; // first, last, current, 2 siblings, 2 ellipsis slots
  if (totalPages <= totalNumbers) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const leftSibling = Math.max(current - siblingCount, 1);
  const rightSibling = Math.min(current + siblingCount, totalPages);
  const showLeftEllipsis = leftSibling > 2;
  const showRightEllipsis = rightSibling < totalPages - 1;

  if (!showLeftEllipsis && showRightEllipsis) {
    const leftCount = 3 + siblingCount * 2;
    const left = Array.from({ length: leftCount }, (_, i) => i + 1);
    return [...left, "ellipsis", totalPages];
  }

  if (showLeftEllipsis && !showRightEllipsis) {
    const rightCount = 3 + siblingCount * 2;
    const right = Array.from({ length: rightCount }, (_, i) => totalPages - rightCount + 1 + i);
    return [1, "ellipsis", ...right];
  }

  const middle = Array.from({ length: rightSibling - leftSibling + 1 }, (_, i) => leftSibling + i);
  return [1, "ellipsis", ...middle, "ellipsis", totalPages];
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
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize) || 1);
  const isPrevDisabled = page <= 1 || totalRecords === 0;
  const isNextDisabled = page >= totalPages || totalRecords === 0;
  const pageItems = buildPageItems(page, totalPages);

  const navBtnClass = (disabled: boolean) =>
    cn(
      "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border text-[12px] font-semibold transition-all",
      disabled
        ? "cursor-not-allowed border-[rgba(18,18,18,0.08)] bg-gray-100 text-gray-300"
        : "cursor-pointer border-[rgba(18,18,18,0.12)] bg-white text-[#121212] hover:border-[#D4AF37]/40 hover:bg-[#D4AF37]/5",
    );

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[rgba(18,18,18,0.08)] bg-[#FAF8F2]/40 px-3 py-3 sm:gap-4 sm:px-4">
      <p className="text-[12px] font-medium text-[#6B6B6B]">
        {totalRecords === 0
          ? "Showing 0-0 of 0 records"
          : `Showing ${start}-${end} of ${totalRecords} records`}
      </p>

      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
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

        <nav className="flex items-center gap-1" aria-label="Pagination">
          <button
            type="button"
            onClick={() => onPageChange(page - 1)}
            disabled={isPrevDisabled}
            aria-label="Previous page"
            className={navBtnClass(isPrevDisabled)}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <div className="flex items-center gap-1">
            {pageItems.map((item, idx) =>
              item === "ellipsis" ? (
                <span
                  key={`ellipsis-${idx}`}
                  className="flex h-8 min-w-8 items-center justify-center px-1 text-[12px] font-semibold text-[#9a9a9a]"
                  aria-hidden
                >
                  …
                </span>
              ) : (
                <button
                  key={item}
                  type="button"
                  onClick={() => onPageChange(item)}
                  aria-label={`Page ${item}`}
                  aria-current={item === page ? "page" : undefined}
                  className={cn(
                    "flex h-8 min-w-8 items-center justify-center rounded-xl border px-2 text-[12px] font-semibold transition-all",
                    item === page
                      ? "border-[#D4AF37]/50 bg-gradient-to-r from-[#D4AF37]/20 to-[#D4AF37]/10 text-[#121212] shadow-sm"
                      : "border-[rgba(18,18,18,0.12)] bg-white text-[#121212] hover:border-[#D4AF37]/40 hover:bg-[#D4AF37]/5",
                  )}
                >
                  {item}
                </button>
              ),
            )}
          </div>

          <button
            type="button"
            onClick={() => onPageChange(page + 1)}
            disabled={isNextDisabled}
            aria-label="Next page"
            className={navBtnClass(isNextDisabled)}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </nav>
      </div>
    </div>
  );
}
