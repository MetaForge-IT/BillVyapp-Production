import { useState, useMemo, useEffect, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "../components/ui/dialog";
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "../components/ui/table";
import { Input } from "../components/ui/input";
import {
  Receipt, Search, Mail, Eye, IndianRupee, FileCheck,
  Printer, Download, Send, Check, X, Paperclip, User,
  Banknote, CreditCard, Smartphone, Wallet, TrendingUp, CalendarDays, Filter,
  RotateCcw, RefreshCw, Loader2, Store,
} from "lucide-react";
import { useReceipts, type ReceiptRecord } from "../context/ReceiptsContext";
import { useRole, isAdmin } from "../context/RoleContext";
import { fetchInvoicesSummary, requestRefund } from "../../api/billing";
import { fetchMyFranchise } from "../../api/franchises";
import { getApiErrorMessage } from "../../lib/api";
import { toast } from "../components/ui/hot-toast";
import { Pagination } from "../components/shared/Pagination";
import { FilterSelect } from "../components/shared/FilterSelect";
import { DEFAULT_PAGE_SIZE } from "../hooks/useTablePagination";
import { fetchReceiptRecords } from "../lib/billingQueries";
import { queryKeys } from "../lib/queryKeys";
import { istDateKey, addDaysToDateKey } from "../../lib/istDate";
import { BRAND, RECEIPT_FOOTER } from "../config/brand";
import { SalonReceiptBrandHeader, SalonReceiptPaper, useReceiptShopInfo } from "../components/shared/SalonReceiptBrand";
import { downloadReceiptBill } from "../lib/downloadReceipt";
import { receiptLinesForDisplay } from "../lib/receiptLineItems";
import {
  FinanceStatCard,
  FinanceStatGrid,
  financeBadge,
  financeBadgeGold,
  financeFilterBar,
  financeGoldBtn,
  financePanel,
  financePanelHeader,
  financePanelTitle,
} from "./finance/finance-ui";

/* ── helpers ─────────────────────────────────────────────── */
const methodIcon = (m: ReceiptRecord["paymentMethod"]) => {
  if (m === "cash")   return <Banknote   className="h-3.5 w-3.5" />;
  if (m === "card")   return <CreditCard className="h-3.5 w-3.5" />;
  if (m === "upi")    return <Smartphone className="h-3.5 w-3.5" />;
  if (m === "none")   return <IndianRupee className="h-3.5 w-3.5" />;
  return                     <Wallet     className="h-3.5 w-3.5" />;
};
const methodLabel: Record<ReceiptRecord["paymentMethod"], string> = {
  cash: "Cash", card: "Card", upi: "UPI", wallet: "Wallet", none: "Unpaid",
};
const methodColors: Record<ReceiptRecord["paymentMethod"], string> = {
  cash:   `${financeBadge} flex items-center gap-1 w-fit border`,
  card:   `${financeBadge} flex items-center gap-1 w-fit border`,
  upi:    `${financeBadge} flex items-center gap-1 w-fit border`,
  wallet: `${financeBadge} flex items-center gap-1 w-fit border`,
  none:   `${financeBadge} flex items-center gap-1 w-fit border`,
};

function paymentMethodLabel(method: ReceiptRecord["paymentMethod"] | undefined): string {
  if (!method) return "Unknown";
  return methodLabel[method] ?? "Unknown";
}

const DATE_OPTIONS = [
  { value: "all",   label: "All Time" },
  { value: "today", label: "Today" },
  { value: "week",  label: "This Week" },
  { value: "month", label: "This Month" },
];
const METHOD_OPTIONS = [
  { value: "all",    label: "All Methods" },
  { value: "cash",   label: "Cash" },
  { value: "card",   label: "Card" },
  { value: "upi",    label: "UPI" },
  { value: "wallet", label: "Wallet" },
];

/* ── component ───────────────────────────────────────────── */
export function Receipts() {
  const queryClient = useQueryClient();
  const { refresh } = useReceipts();
  const { role } = useRole();
  const isManager = role === "manager";
  const isFranchiseAdmin = isAdmin(role);
  const shopInfo = useReceiptShopInfo();
  const [shopFilter, setShopFilter] = useState("all");
  const [searchParams, setSearchParams] = useSearchParams();
  const dateParam = searchParams.get("date");
  const [search,       setSearch]       = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [methodFilter, setMethodFilter] = useState("all");
  const [dateFilter,   setDateFilter]   = useState("all");
  const [listPage, setListPage] = useState(1);
  const [listPageSize, setListPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [viewReceipt,  setViewReceipt]  = useState<ReceiptRecord | null>(null);
  const [refundReceipt, setRefundReceipt] = useState<ReceiptRecord | null>(null);
  const [refundReason, setRefundReason] = useState("");
  const [refundSubmitting, setRefundSubmitting] = useState(false);
  const [emailReceipt, setEmailReceipt] = useState<ReceiptRecord | null>(null);
  const [emailTo,      setEmailTo]      = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailMessage, setEmailMessage] = useState("");
  const [emailSent,    setEmailSent]    = useState(false);

  const TODAY = istDateKey();

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setListPage(1);
  }, [debouncedSearch, listPageSize, shopFilter, methodFilter, dateFilter, dateParam]);

  const franchiseQuery = useQuery({
    queryKey: ["my-franchise"],
    queryFn: fetchMyFranchise,
    enabled: isFranchiseAdmin,
  });
  const franchiseShops = franchiseQuery.data?.shops ?? [];

  const dateQueryParams = useMemo(() => {
    if (dateParam) return { date: dateParam };
    if (dateFilter === "today") return { date: TODAY };
    if (dateFilter === "week") return { dateFrom: addDaysToDateKey(TODAY, -6), dateTo: TODAY };
    if (dateFilter === "month") return { dateFrom: `${TODAY.slice(0, 7)}-01`, dateTo: TODAY };
    return {};
  }, [dateParam, dateFilter, TODAY]);

  const invoiceParams = {
    page: listPage,
    limit: listPageSize,
    search: debouncedSearch || undefined,
    salonId: isFranchiseAdmin && shopFilter !== "all" ? shopFilter : undefined,
    paymentMethod: methodFilter !== "all" ? methodFilter : undefined,
    ...dateQueryParams,
  };
  const receiptsQuery = useQuery({
    queryKey: queryKeys.billing.invoices(invoiceParams),
    queryFn: () => fetchReceiptRecords(invoiceParams),
  });
  const summaryQuery = useQuery({
    queryKey: queryKeys.billing.invoicesSummary(),
    queryFn: fetchInvoicesSummary,
    enabled: !isManager,
  });
  const receipts = receiptsQuery.data?.items ?? [];
  const receiptsTotal = receiptsQuery.data?.total ?? 0;

  useEffect(() => {
    if (receiptsQuery.error) {
      toast.error(getApiErrorMessage(receiptsQuery.error, "Failed to load revenue report"));
    }
  }, [receiptsQuery.error]);

  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(receiptsTotal / listPageSize) || 1);
    if (listPage > maxPage) setListPage(maxPage);
  }, [receiptsTotal, listPageSize, listPage]);

  const paginatedReceipts = receipts;

  const totalRevenue = summaryQuery.data?.totalRevenue ?? 0;
  const todayRevenue = summaryQuery.data?.todayRevenue ?? 0;
  const avgBill = summaryQuery.data?.avgBill ?? 0;
  const totalReceiptsCount = summaryQuery.data?.totalReceipts ?? receiptsTotal;

  const reportRefreshing =
    receiptsQuery.isFetching || (!isManager && summaryQuery.isFetching);

  const handleRefreshReport = useCallback(async () => {
    try {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["billing"] }),
        refresh(),
      ]);
      toast.success("Revenue report updated");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to refresh revenue report"));
    }
  }, [queryClient, refresh]);

  const hasActiveFilter =
    search ||
    methodFilter !== "all" ||
    dateFilter !== "all" ||
    Boolean(dateParam) ||
    (isFranchiseAdmin && shopFilter !== "all");
  const clearFilters = () => {
    setSearch("");
    setMethodFilter("all");
    setDateFilter("all");
    if (isFranchiseAdmin) setShopFilter("all");
    if (dateParam) {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.delete("date");
        return next;
      }, { replace: true });
    }
  };

  const suggestEmail = (name: string) =>
    name.toLowerCase().replace(/\s+/g, ".") + "@email.com";

  const openEmail = (r: ReceiptRecord) => {
    setEmailReceipt(r);
    setEmailTo(suggestEmail(r.customer));
    setEmailSubject(`Receipt ${r.receiptNo} — ${BRAND.clientName}`);
    setEmailMessage(`Dear ${r.customer},\n\nThank you for visiting ${BRAND.clientName}! Please find your receipt ${r.receiptNo} attached.\n\nTotal Paid: ₹${r.total.toLocaleString()} via ${paymentMethodLabel(r.paymentMethod)}\n\nWe look forward to seeing you again!\n\n${BRAND.clientName} Team`);
    setEmailSent(false);
  };

  const handleDownloadBill = (r: ReceiptRecord) => {
    const ok = downloadReceiptBill(
      {
        receiptNo: r.receiptNo,
        date: r.date,
        time: r.time,
        customer: r.customer,
        phone: r.phone,
        services: r.services,
        lineItems: r.lineItems,
        subtotal: r.subtotal,
        discount: r.discount,
        gst: r.gst,
        total: r.total,
        paymentMethod: r.paymentMethod,
      },
      shopInfo,
    );
    if (!ok) {
      toast.error("Could not download the receipt bill");
      return;
    }
    toast.success(`${r.receiptNo} downloaded — use Save as PDF in the print dialog`);
  };

  const openRefundRequest = (r: ReceiptRecord) => {
    setRefundReceipt(r);
    setRefundReason("");
  };

  const submitRefundRequest = async () => {
    if (!refundReceipt || refundReason.trim().length < 3) {
      toast.error("Please enter a refund reason (at least 3 characters)");
      return;
    }
    setRefundSubmitting(true);
    try {
      await requestRefund(refundReceipt.id, { reason: refundReason.trim() });
      toast.success("Refund request submitted for manager approval");
      setRefundReceipt(null);
      setViewReceipt(null);
      setRefundReason("");
      await refresh();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to submit refund request"));
    } finally {
      setRefundSubmitting(false);
    }
  };

  const canRequestRefund = (r: ReceiptRecord) =>
    r.paymentStatus === "paid" && r.paidAmount > 0 && r.paymentMethod !== "none";

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">

      {/* ── Page header ── */}
      <div className="flex shrink-0 items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/20 shrink-0">
            <Receipt className="h-5 w-5 text-[#D4AF37]" />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-[#111118]">Sales Receipts</h2>
            <p className="text-xs text-[#9a9a9a] mt-0.5">All completed transactions and payment history</p>
          </div>
        </div>
        {!isManager && (
          <button
            type="button"
            onClick={() => void handleRefreshReport()}
            disabled={reportRefreshing}
            className="flex shrink-0 items-center gap-2 rounded-xl border border-black/[0.08] bg-white px-3.5 py-2 text-[12px] font-semibold text-[#111118] transition-all hover:border-[#D4AF37]/35 disabled:opacity-60"
          >
            {reportRefreshing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            Refresh
          </button>
        )}
      </div>

      {/* ── Stat cards (admin Revenue Report only) ── */}
      {!isManager && (
        <div className="shrink-0">
          <FinanceStatGrid>
            <FinanceStatCard
              label="Total Revenue"
              value={`₹${totalRevenue.toLocaleString()}`}
              sub="View all receipts"
              icon={IndianRupee}
              index={0}
              onClick={clearFilters}
            />
            <FinanceStatCard
              label="Today's Revenue"
              value={`₹${todayRevenue.toLocaleString()}`}
              sub="Filter today's bills"
              icon={TrendingUp}
              index={1}
              onClick={() => { setDateFilter("today"); setMethodFilter("all"); setSearch(""); }}
            />
            <FinanceStatCard
              label="Avg. Bill Value"
              value={`₹${avgBill.toLocaleString()}`}
              sub="View this month"
              icon={FileCheck}
              index={2}
              onClick={() => { setDateFilter("month"); setMethodFilter("all"); setSearch(""); }}
            />
            <FinanceStatCard
              label="Total Receipts"
              value={totalReceiptsCount}
              sub={`All paid · ₹${totalRevenue.toLocaleString()}`}
              icon={Receipt}
              index={3}
              onClick={clearFilters}
            />
          </FinanceStatGrid>
        </div>
      )}

      {/* ── Filter bar ── */}
      <div className={`${financeFilterBar} shrink-0`}>
        <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">

          {/* Search */}
          <div className="relative min-w-0 flex-1 sm:min-w-[200px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); }}
              placeholder="Search by receipt #, customer or phone…"
              className="w-full h-10 pl-10 pr-9 rounded-xl border border-gray-200 text-[13px] text-[#111] placeholder:text-gray-400 outline-none focus:border-[#d4af37]/60 focus:ring-2 focus:ring-[#d4af37]/10 bg-white transition-all"
            />
            {search && (
              <button onClick={() => { setSearch(""); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center transition-colors">
                <X className="h-3 w-3 text-gray-500" />
              </button>
            )}
          </div>

          {dateParam && (
            <span className="inline-flex w-fit items-center gap-2 rounded-xl border border-[#d4af37]/40 bg-[#fffbea] px-3 py-1.5 text-[12px] font-semibold text-[#9a7d20] shrink-0">
              <CalendarDays className="h-3.5 w-3.5" />
              {new Date(`${dateParam}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
            </span>
          )}

          <div className="grid grid-cols-1 gap-2.5 min-[420px]:grid-cols-2 sm:flex sm:flex-wrap sm:gap-3">
            {isFranchiseAdmin && franchiseShops.length > 0 && (
              <FilterSelect
                value={shopFilter}
                onValueChange={setShopFilter}
                icon={Store}
                active={shopFilter !== "all"}
                options={[
                  { value: "all", label: `All Shops (${franchiseShops.length})` },
                  ...franchiseShops.map((shop) => ({
                    value: shop.id,
                    label: shop.displayName?.trim() || shop.name,
                  })),
                ]}
              />
            )}
            <FilterSelect
              value={dateFilter}
              onValueChange={setDateFilter}
              icon={CalendarDays}
              active={dateFilter !== "all"}
              options={[
                { value: "all", label: `All Time (${receipts.length})` },
                {
                  value: "today",
                  label: `Today (${receipts.filter((r) => r.date === TODAY).length})`,
                },
                {
                  value: "week",
                  label: `This Week (${receipts.filter((r) => (new Date(TODAY).getTime() - new Date(r.date).getTime()) / 86400000 < 7).length})`,
                },
                {
                  value: "month",
                  label: `This Month (${receipts.filter((r) => r.date.startsWith(TODAY.slice(0, 7))).length})`,
                },
              ]}
            />
            <FilterSelect
              value={methodFilter}
              onValueChange={setMethodFilter}
              icon={Filter}
              active={methodFilter !== "all"}
              options={[
                { value: "all", label: `All Methods (${receipts.length})` },
                { value: "cash", label: `Cash (${receipts.filter((r) => r.paymentMethod === "cash").length})` },
                { value: "upi", label: `UPI (${receipts.filter((r) => r.paymentMethod === "upi").length})` },
                { value: "card", label: `Card (${receipts.filter((r) => r.paymentMethod === "card").length})` },
                { value: "wallet", label: `Wallet (${receipts.filter((r) => r.paymentMethod === "wallet").length})` },
              ]}
            />
          </div>

        </div>
      </div>

      {/* ── Receipt table ── */}
      <div className={`${financePanel} flex min-h-0 flex-1 flex-col`}>
        <div className={`${financePanelHeader} shrink-0 border-b border-black/[0.07]`}>
          <div className="flex items-center gap-2">
            <h2 className={financePanelTitle}>Receipt List</h2>
            <span className="text-[11px] font-semibold text-[#9a9a9a] bg-[#FAF8F2] border border-black/[0.07] px-2 py-0.5 rounded-full">{receiptsTotal}</span>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {/* Phone / tablet: stacked cards — no horizontal scroll */}
        <div className="divide-y divide-black/[0.06] lg:hidden">
          {paginatedReceipts.map((r, index) => (
            <article
              key={r.id}
              className={`space-y-3 p-4 sm:p-5 ${index % 2 === 0 ? "bg-white" : "bg-[#FAFAFA]"}`}
            >
              <div className="flex items-start justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setViewReceipt(r)}
                  className="min-w-0 text-left"
                >
                  <p className="font-mono text-[13px] font-bold text-[#b8962e]">{r.receiptNo}</p>
                  <p className="mt-0.5 text-[12px] font-semibold text-[#111118]">{r.customer}</p>
                  <p className="text-[11px] text-[#9a9a9a]">{r.phone}</p>
                </button>
                <div className="shrink-0 text-right">
                  <p className="text-[15px] font-black tabular-nums text-[#111118]">₹{r.total.toLocaleString()}</p>
                  <p className="mt-0.5 text-[11px] text-[#9a9a9a]">{r.date}</p>
                  <p className="text-[11px] text-[#9a9a9a]">{r.time}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {r.services.map((s, i) => (
                  <span
                    key={i}
                    className="max-w-full truncate text-[10px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 border border-gray-200"
                  >
                    {s}
                  </span>
                ))}
              </div>

              <div className="flex items-center justify-between gap-2">
                <Badge className={`${methodColors[r.paymentMethod]} [&_svg]:text-[#D4AF37]`}>
                  {methodIcon(r.paymentMethod)}
                  {paymentMethodLabel(r.paymentMethod)}
                </Badge>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => setViewReceipt(r)}
                    className="h-8 w-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:text-[#111] hover:border-gray-300 transition-all"
                    aria-label={`View ${r.receiptNo}`}
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDownloadBill(r)}
                    className="h-8 w-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:text-[#D4AF37] hover:border-[#D4AF37]/30 transition-all"
                    aria-label={`Download ${r.receiptNo}`}
                  >
                    <Download className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => openEmail(r)}
                    className="h-8 w-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:text-[#D4AF37] hover:border-[#D4AF37]/30 transition-all"
                    aria-label={`Email ${r.receiptNo}`}
                  >
                    <Mail className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </article>
          ))}
          {paginatedReceipts.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-16">
              <Receipt className="h-8 w-8 text-gray-200" />
              <p className="text-[13px] font-semibold text-gray-400">No receipts found</p>
              {hasActiveFilter && (
                <button type="button" onClick={clearFilters} className="text-[12px] text-[#b8962e] hover:underline">
                  Clear filters
                </button>
              )}
            </div>
          )}
        </div>

        {/* Desktop: full table */}
        <div className="hidden lg:block">
          <Table containerClassName="overflow-x-visible">
            <TableHeader>
              <TableRow className="bg-gray-50/40 hover:bg-gray-50/40">
                <TableHead className="text-[11px] font-bold uppercase tracking-wider text-gray-500 pl-5">Receipt #</TableHead>
                <TableHead className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Date & Time</TableHead>
                <TableHead className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Customer</TableHead>
                <TableHead className="text-[11px] font-bold uppercase tracking-wider text-gray-500 min-w-0 max-w-[220px]">Services</TableHead>
                <TableHead className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Payment</TableHead>
                <TableHead className="text-[11px] font-bold uppercase tracking-wider text-gray-500 text-right">Amount</TableHead>
                <TableHead className="text-[11px] font-bold uppercase tracking-wider text-gray-500 text-right pr-5">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedReceipts.map((r) => (
                <TableRow key={r.id} className="group hover:bg-[#FAF8F2]/60 transition-colors">
                  <TableCell className="pl-5">
                    <button
                      type="button"
                      onClick={() => setViewReceipt(r)}
                      className="font-mono text-[13px] font-bold text-[#b8962e] hover:text-[#d4af37] hover:underline underline-offset-2 transition-colors"
                    >
                      {r.receiptNo}
                    </button>
                  </TableCell>
                  <TableCell>
                    <p className="text-[12px] font-semibold text-[#111]">{r.date}</p>
                    <p className="text-[11px] text-gray-400">{r.time}</p>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-full bg-[#d4af37]/15 border border-[#d4af37]/25 flex items-center justify-center shrink-0">
                        <span className="text-[11px] font-black text-[#b8962e]">{(r.customer || "?")[0]}</span>
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-[12px] font-semibold text-[#111]">{r.customer}</p>
                        <p className="truncate text-[11px] text-gray-400">{r.phone}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[220px] whitespace-normal">
                    <div className="flex flex-wrap gap-1">
                      {r.services.map((s, i) => (
                        <span
                          key={i}
                          className="max-w-full truncate text-[10px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 border border-gray-200"
                          title={s}
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={`${methodColors[r.paymentMethod]} [&_svg]:text-[#D4AF37]`}>
                      {methodIcon(r.paymentMethod)}
                      {paymentMethodLabel(r.paymentMethod)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="text-[14px] font-black tabular-nums text-[#111]">₹{r.total.toLocaleString()}</span>
                  </TableCell>
                  <TableCell className="pr-5">
                    <div className="flex justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => setViewReceipt(r)}
                        className="h-7 w-7 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:text-[#111] hover:border-gray-300 transition-all"
                        aria-label={`View ${r.receiptNo}`}
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDownloadBill(r)}
                        className="h-7 w-7 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:text-[#D4AF37] hover:border-[#D4AF37]/30 transition-all"
                        aria-label={`Download ${r.receiptNo}`}
                      >
                        <Download className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => openEmail(r)}
                        className="h-7 w-7 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:text-[#D4AF37] hover:border-[#D4AF37]/30 transition-all"
                        aria-label={`Email ${r.receiptNo}`}
                      >
                        <Mail className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {paginatedReceipts.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Receipt className="h-8 w-8 text-gray-200" />
                      <p className="text-[13px] font-semibold text-gray-400">No receipts found</p>
                      {hasActiveFilter && (
                        <button type="button" onClick={clearFilters} className="text-[12px] text-[#b8962e] hover:underline">
                          Clear filters
                        </button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        </div>

        <div className="shrink-0 border-t border-black/[0.06]">
          <Pagination
            page={listPage}
            pageSize={listPageSize}
            totalRecords={receiptsTotal}
            onPageChange={setListPage}
            onPageSizeChange={(size) => {
              setListPageSize(size);
              setListPage(1);
            }}
          />
        </div>
      </div>

      {/* ── View Receipt Modal ── */}
      <Dialog open={!!viewReceipt} onOpenChange={open => !open && setViewReceipt(null)}>
        <DialogContent className="sm:max-w-[380px] p-0 gap-0 rounded-2xl shadow-2xl border border-black/[0.07] overflow-hidden bg-white [&>button]:hidden">
          {viewReceipt && (
            <>
              <div className="relative flex items-center justify-between bg-[#111118] px-5 py-4">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_100%_0%,rgba(212,175,55,0.12),transparent)] pointer-events-none" />
                <div className="relative min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#D4AF37]">Receipt Preview</p>
                  <p className="mt-0.5 font-mono text-[14px] font-bold text-white">{viewReceipt.receiptNo}</p>
                  <p className="mt-0.5 text-[11px] text-white/50">{viewReceipt.customer} · {paymentMethodLabel(viewReceipt.paymentMethod)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setViewReceipt(null)}
                  className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10 transition-colors hover:bg-white/20"
                  aria-label="Close"
                >
                  <X className="h-4 w-4 text-white/70" />
                </button>
              </div>

              <div className="max-h-[62vh] overflow-y-auto bg-[#faf9f7] p-4">
                <SalonReceiptPaper>
                  <SalonReceiptBrandHeader />
                  <div className="border-b border-dashed border-[#D4AF37]/25 pb-3 mb-3 space-y-0.5">
                    {([["Receipt No.", viewReceipt.receiptNo], ["Date", `${viewReceipt.date}  ${viewReceipt.time}`], ["Customer", viewReceipt.customer], ["Payment", paymentMethodLabel(viewReceipt.paymentMethod).toUpperCase()]] as [string, string][]).map(([k, v]) => (
                      <div key={k} className="flex justify-between gap-3 text-[11px]">
                        <span className="text-[#9a9a9a]">{k}</span>
                        <span className="font-bold text-right">{v}</span>
                      </div>
                    ))}
                  </div>
                  <div className="border-b border-dashed border-[#D4AF37]/25 pb-3 mb-3">
                    <div className="mb-2 flex border-b border-black/[0.08] pb-1 text-[10px] font-bold uppercase tracking-wider text-[#9a9a9a]">
                      <span className="flex-1">Description</span>
                      <span className="w-16 text-right">Amount</span>
                    </div>
                    {receiptLinesForDisplay(
                      viewReceipt.lineItems,
                      viewReceipt.services,
                      viewReceipt.subtotal,
                    ).map((line, i) => (
                      <div key={i} className="flex py-0.5 text-[11px]">
                        <span className="flex-1 pr-2 font-semibold uppercase">{line.name}</span>
                        <span className="w-16 text-right">&#x20b9;{line.amount.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                  <div className="border-b border-dashed border-[#D4AF37]/25 pb-3 mb-3 space-y-0.5">
                    <div className="flex justify-between text-[11px]"><span className="text-[#9a9a9a]">Subtotal</span><span>&#x20b9;{viewReceipt.subtotal.toLocaleString()}</span></div>
                    {viewReceipt.discount > 0 && (
                      <div className="flex justify-between text-[11px]">
                        <span className="text-[#9a9a9a]">Discount</span>
                        <span className="font-bold text-[#9a7d20]">-&#x20b9;{viewReceipt.discount.toLocaleString()}</span>
                      </div>
                    )}
                    {viewReceipt.gst > 0 && (
                      <div className="flex justify-between text-[11px]">
                        <span className="text-[#9a9a9a]">GST</span>
                        <span>+&#x20b9;{viewReceipt.gst.toLocaleString()}</span>
                      </div>
                    )}
                    <div className="mt-1 flex justify-between border-t border-[#D4AF37]/30 pt-1.5 text-[13px] font-black">
                      <span>GRAND TOTAL</span>
                      <span className="text-[#9a7d20]">&#x20b9;{viewReceipt.total.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-[11px] font-semibold">
                      <span className="text-[#9a9a9a]">Paid ({paymentMethodLabel(viewReceipt.paymentMethod)})</span>
                      <span>&#x20b9;{viewReceipt.total.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span className="text-[#9a9a9a]">Balance Due</span>
                      <span className="font-bold">&#x20b9;0.00</span>
                    </div>
                  </div>
                  <div className="border-b border-dashed border-[#D4AF37]/25 pb-3 mb-3">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-[#9a9a9a]">Loyalty Points Earned</span>
                      <span className="font-bold text-[#9a7d20]">+{Math.floor(viewReceipt.total / 10)} pts</span>
                    </div>
                    <div className="flex justify-between text-[9px] text-[#9a9a9a]">
                      <span>Redeem on next visit</span>
                      <span>1 pt = &#x20b9;0.50</span>
                    </div>
                  </div>
                  <div className="space-y-1 text-center">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#D4AF37]">{RECEIPT_FOOTER.thankYou}</p>
                    <p className="text-[9px] text-[#9a9a9a]">{RECEIPT_FOOTER.revisit}</p>
                    <div className="mx-auto mt-2 h-px w-16 bg-gradient-to-r from-transparent via-[#D4AF37]/40 to-transparent" />
                  </div>
                </SalonReceiptPaper>
              </div>

              <div className="grid grid-cols-3 border-t border-black/[0.06] bg-white">
                {[
                  { Icon: Printer, label: "Print", action: () => handleDownloadBill(viewReceipt) },
                  { Icon: Mail, label: "Email", action: () => openEmail(viewReceipt) },
                  { Icon: Download, label: "Download", action: () => handleDownloadBill(viewReceipt) },
                ].map(({ Icon, label, action }) => (
                  <button
                    key={label}
                    type="button"
                    onClick={action}
                    className="flex flex-col items-center gap-1 border-r border-black/[0.06] py-3 text-[11px] font-semibold text-[#6b6b6b] transition-colors last:border-r-0 hover:bg-[#faf9f7] hover:text-[#9a7d20]"
                  >
                    <Icon className="h-4 w-4 text-[#D4AF37]" />
                    {label}
                  </button>
                ))}
              </div>

              <div className="border-t border-black/[0.06] bg-white px-4 py-3 space-y-2">
                {canRequestRefund(viewReceipt) && (
                  <button
                    type="button"
                    onClick={() => openRefundRequest(viewReceipt)}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 py-2.5 text-[12px] font-bold text-red-700 transition-colors hover:bg-red-100"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Request Refund
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setViewReceipt(null)}
                  className={`${financeGoldBtn} w-full`}
                >
                  Close
                </button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Refund Request Modal ── */}
      <Dialog open={!!refundReceipt} onOpenChange={open => !open && setRefundReceipt(null)}>
        <DialogContent className="sm:max-w-[400px] p-0 gap-0 rounded-2xl shadow-2xl border border-black/[0.07] overflow-hidden bg-white">
          {refundReceipt && (
            <>
              <DialogHeader className="bg-[#111118] px-5 py-4 text-left">
                <DialogTitle className="text-[14px] font-bold text-white">Request Refund</DialogTitle>
                <DialogDescription className="text-[11px] text-white/50 mt-1">
                  {refundReceipt.receiptNo} · {refundReceipt.customer} · ₹{refundReceipt.paidAmount.toLocaleString()}
                </DialogDescription>
              </DialogHeader>
              <div className="bg-[#faf9f7] px-5 py-4 space-y-3">
                <p className="text-[11px] text-[#6b6b6b]">
                  This sends the refund to Finance → Receipts → Refunds for manager approval. The receipt will be removed from sales once submitted.
                </p>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[#b8962e]">Reason for refund</label>
                  <textarea
                    value={refundReason}
                    onChange={e => setRefundReason(e.target.value)}
                    rows={4}
                    placeholder="e.g. Customer dissatisfied with service, duplicate charge..."
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-[13px] focus:border-[#d4af37] focus:outline-none focus:ring-2 focus:ring-[#d4af37]/12 resize-none"
                  />
                </div>
              </div>
              <DialogFooter className="border-t border-black/[0.06] bg-white px-4 py-3 gap-2 sm:justify-end">
                <Button variant="outline" onClick={() => setRefundReceipt(null)} disabled={refundSubmitting}>
                  Cancel
                </Button>
                <Button
                  onClick={() => void submitRefundRequest()}
                  disabled={refundSubmitting || refundReason.trim().length < 3}
                  className="bg-gradient-to-r from-[#d4af37] to-[#b8962e] text-black font-bold hover:opacity-90"
                >
                  {refundSubmitting ? "Submitting..." : "Submit Request"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Email Receipt Modal ── */}
      <Dialog open={!!emailReceipt} onOpenChange={open => !open && setEmailReceipt(null)}>
        <DialogContent className="sm:max-w-lg p-0 gap-0 overflow-hidden rounded-2xl border-0 shadow-2xl [&>button]:hidden">
          {emailSent ? (
            <div className="relative overflow-hidden">
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#D4AF37]/60 to-transparent" />
              <div className="bg-gradient-to-br from-[#FAF8F2] via-white to-[#FAF8F2] px-8 py-14 text-center">
                <div className="relative mx-auto w-fit mb-5">
                  <div className="absolute inset-0 rounded-full bg-[#D4AF37]/25 blur-2xl scale-150" />
                  <div className="relative h-20 w-20 rounded-2xl bg-gradient-to-br from-[#D4AF37] to-[#B8962E] flex items-center justify-center shadow-[0_8px_28px_rgba(212,175,55,0.4)]">
                    <Check className="h-10 w-10 text-[#0d0d14]" strokeWidth={2.5} />
                  </div>
                </div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#D4AF37]">Delivered</p>
                <p className="text-xl font-bold text-[#111118] mt-1">Email Sent Successfully</p>
                <p className="text-sm text-[#6b6b6b] mt-2 max-w-xs mx-auto leading-relaxed">
                  Receipt{" "}
                  <span className="font-mono font-bold text-[#b8962e]">{emailReceipt?.receiptNo}</span>{" "}
                  was sent to{" "}
                  <span className="font-semibold text-[#111118]">{emailTo}</span>
                </p>
                {emailReceipt && (
                  <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-[#D4AF37]/25 bg-[#D4AF37]/10 px-3 py-1.5">
                    <User className="h-3.5 w-3.5 text-[#D4AF37]" />
                    <span className="text-[12px] font-semibold text-[#9a7d20]">{emailReceipt.customer}</span>
                  </div>
                )}
              </div>
              <div className="px-6 py-4 border-t border-black/[0.06] bg-white flex justify-center">
                <button type="button" onClick={() => setEmailReceipt(null)} className={financeGoldBtn + " px-10"}>
                  Done
                </button>
              </div>
            </div>
          ) : emailReceipt && (
            <>
              {/* Dark header */}
              <div className="relative bg-[#111118] px-6 py-5 overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_100%_0%,rgba(212,175,55,0.12),transparent)]" />
                <div className="relative flex items-start gap-4">
                  <div className="h-11 w-11 rounded-xl bg-[#D4AF37]/15 border border-[#D4AF37]/25 flex items-center justify-center shrink-0">
                    <Mail className="h-5 w-5 text-[#D4AF37]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#D4AF37]">Send Receipt</p>
                    <DialogTitle className="text-[16px] font-bold text-white leading-tight mt-0.5">
                      Email {emailReceipt.receiptNo}
                    </DialogTitle>
                    <DialogDescription className="text-[12px] text-white/50 mt-1">
                      to <span className="text-white/90 font-semibold">{emailReceipt.customer}</span>
                    </DialogDescription>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEmailReceipt(null)}
                    className="h-8 w-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors shrink-0"
                    aria-label="Close"
                  >
                    <X className="h-4 w-4 text-white/70" />
                  </button>
                </div>
              </div>

              {/* Cream body */}
              <div className="bg-[#FAF8F2] px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
                {/* Receipt summary */}
                <div className="flex items-center gap-3.5 p-3.5 rounded-xl bg-white border border-black/[0.07] shadow-sm">
                  <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#B8962E] flex items-center justify-center shrink-0 shadow-md shadow-[#D4AF37]/20">
                    <span className="text-[13px] font-black text-[#0d0d14]">{emailReceipt.customer[0]}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-bold text-[#111118] truncate">{emailReceipt.customer}</p>
                    <p className="text-[11px] text-[#9a9a9a] mt-0.5">{emailReceipt.phone}</p>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {emailReceipt.services.map((s, i) => (
                        <span key={i} className={financeBadgeGold + " rounded-full px-2 py-0.5 text-[10px] font-medium"}>
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#9a9a9a]">Total</p>
                    <p className="text-[15px] font-black text-[#111118] tabular-nums">₹{emailReceipt.total.toLocaleString()}</p>
                    <span className={financeBadgeGold + " inline-flex items-center gap-1 rounded-full px-2 py-0.5 mt-1 [&_svg]:text-[#D4AF37]"}>
                      {methodIcon(emailReceipt.paymentMethod)}
                      {paymentMethodLabel(emailReceipt.paymentMethod)}
                    </span>
                  </div>
                </div>

                {/* Attachment */}
                <div className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-white border border-dashed border-[#D4AF37]/35">
                  <div className="h-9 w-9 rounded-lg bg-[#D4AF37]/10 border border-[#D4AF37]/20 flex items-center justify-center shrink-0">
                    <Paperclip className="h-4 w-4 text-[#D4AF37]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-semibold text-[#111118] truncate">{emailReceipt.receiptNo}.pdf</p>
                    <p className="text-[10px] text-[#9a9a9a]">Receipt attachment · will be included</p>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#b8962e] shrink-0">PDF</span>
                </div>

                <div className="border-t border-[#D4AF37]/10" />

                {/* Compose */}
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#b8962e] mb-3">Compose Email</p>
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-[#6b6b6b]">Recipient</label>
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#D4AF37]/60 pointer-events-none" />
                        <input
                          type="email"
                          placeholder="customer@example.com"
                          value={emailTo}
                          onChange={e => setEmailTo(e.target.value)}
                          className="w-full h-10 pl-10 pr-4 rounded-xl border border-black/[0.08] text-[13px] bg-white focus:outline-none focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/12 transition-all"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-[#6b6b6b]">Subject</label>
                      <input
                        type="text"
                        value={emailSubject}
                        onChange={e => setEmailSubject(e.target.value)}
                        className="w-full h-10 px-3.5 rounded-xl border border-black/[0.08] text-[13px] bg-white focus:outline-none focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/12 transition-all"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-[#6b6b6b]">Message</label>
                      <textarea
                        rows={5}
                        value={emailMessage}
                        onChange={e => setEmailMessage(e.target.value)}
                        className="w-full px-3.5 py-3 rounded-xl border border-black/[0.08] text-[13px] bg-white focus:outline-none focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/12 transition-all resize-none leading-relaxed text-[#111118]"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-black/[0.06] bg-white flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setEmailReceipt(null)}
                  className="flex-1 h-10 rounded-xl border border-black/[0.08] bg-white text-[13px] font-semibold text-[#6b6b6b] hover:bg-[#FAF8F2] hover:border-[#D4AF37]/20 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => setEmailSent(true)}
                  disabled={!emailTo.trim()}
                  className={financeGoldBtn + " flex-1 inline-flex items-center justify-center gap-2"}
                >
                  <Send className="h-4 w-4" />
                  Send Email
                </button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}

export default Receipts;
