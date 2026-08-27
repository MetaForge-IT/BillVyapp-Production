import { ChevronLeft, ChevronRight } from "lucide-react";
import { PAGE_SIZE_OPTIONS } from "../../hooks/useTablePagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
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
      "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border text-[12px] font-semibold transition-all sm:h-8 sm:w-8",
      disabled
        ? "cursor-not-allowed border-[rgba(18,18,18,0.08)] bg-gray-100 text-gray-300"
        : "cursor-pointer border-[rgba(18,18,18,0.12)] bg-white text-[#121212] hover:border-[#D4AF37]/40 hover:bg-[#D4AF37]/5",
    );

  return (
    <div className="flex min-w-0 flex-col gap-2.5 border-t border-[rgba(18,18,18,0.08)] bg-[#FAF8F2]/40 px-2.5 py-2.5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-3 sm:px-4 sm:py-3">
      <p className="min-w-0 truncate text-[11px] font-medium text-[#3f3f46] sm:text-[12px]">
        {totalRecords === 0
          ? "Showing 0-0 of 0"
          : (
            <>
              <span className="sm:hidden">
                {start}-{end} / {totalRecords}
              </span>
              <span className="hidden sm:inline">
                Showing {start}-{end} of {totalRecords} records
              </span>
            </>
          )}
      </p>

      <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 sm:justify-end sm:gap-3">
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <span className="text-[11px] font-medium text-[#3f3f46]">Rows</span>
          <Select
            value={String(pageSize)}
            onValueChange={(value) => onPageSizeChange(Number(value))}
          >
            <SelectTrigger
              size="sm"
              aria-label="Records per page"
              className="h-9 min-w-[4.25rem] border-[rgba(18,18,18,0.12)] px-2 text-[12px] font-semibold shadow-none hover:border-[#D4AF37]/40 sm:h-8 sm:min-w-[4.5rem] sm:px-2.5"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end" className="min-w-[var(--radix-select-trigger-width)] rounded-xl">
              {PAGE_SIZE_OPTIONS.map((size) => (
                <SelectItem key={size} value={String(size)} className="text-[12px]">
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <nav className="flex min-w-0 shrink-0 items-center gap-1" aria-label="Pagination">
          <button
            type="button"
            onClick={() => onPageChange(page - 1)}
            disabled={isPrevDisabled}
            aria-label="Previous page"
            className={navBtnClass(isPrevDisabled)}
          >
            <ChevronLeft className="h-4 w-4 shrink-0" strokeWidth={2.25} />
          </button>

          {/* Phones: compact page indicator — keeps chevrons fully visible */}
          <span className="flex h-9 min-w-[4.5rem] items-center justify-center rounded-xl border border-[rgba(18,18,18,0.12)] bg-white px-2 text-[11px] font-semibold tabular-nums text-[#121212] sm:hidden">
            {page}/{totalPages}
          </span>

          <div className="hidden items-center gap-1 sm:flex">
            {pageItems.map((item, idx) =>
              item === "ellipsis" ? (
                <span
                  key={`ellipsis-${idx}`}
                  className="flex h-8 min-w-8 items-center justify-center px-1 text-[12px] font-semibold text-[#52525b]"
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
            <ChevronRight className="h-4 w-4 shrink-0" strokeWidth={2.25} />
          </button>
        </nav>
      </div>
    </div>
  );
}
