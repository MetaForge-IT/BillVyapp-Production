import { useEffect, useMemo, useState } from "react";

export const DEFAULT_PAGE_SIZE = 10;
export const PAGE_SIZE_OPTIONS = [5, 10, 15, 20] as const;

export function useTablePagination(
  totalRecords: number,
  resetDeps: unknown[] = [],
  initialPageSize: number = DEFAULT_PAGE_SIZE,
) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);

  useEffect(() => {
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalRecords, ...resetDeps]);

  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(totalRecords / pageSize) || 1);
    if (page > maxPage) setPage(maxPage);
  }, [totalRecords, pageSize, page]);

  const start = totalRecords === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalRecords);
  const isPrevDisabled = page === 1;
  const isNextDisabled = page * pageSize >= totalRecords;

  const paginate = useMemo(
    () =>
      <T,>(items: T[]): T[] => {
        const offset = (page - 1) * pageSize;
        return items.slice(offset, offset + pageSize);
      },
    [page, pageSize],
  );

  function handlePageSizeChange(size: number) {
    setPageSize(size);
    setPage(1);
  }

  return {
    page,
    setPage,
    pageSize,
    setPageSize: handlePageSizeChange,
    start,
    end,
    isPrevDisabled,
    isNextDisabled,
    paginate,
  };
}
