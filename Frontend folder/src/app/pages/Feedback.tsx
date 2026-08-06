import { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "../components/ui/utils";
import {
  MessageSquare, Star, Search,
  ThumbsUp, ThumbsDown, Minus, Reply, Eye,
  Send, CheckCircle2, TrendingUp,
  Smile, AlertCircle, Clock, Scissors,
} from "lucide-react";
import { Dialog, DialogContent } from "../components/ui/dialog";
import { PageStatCard } from "../components/shared/PageStatCard";
import { Pagination } from "../components/shared/Pagination";
import { useTablePagination } from "../hooks/useTablePagination";
import {
  fetchFeedback,
  fetchFeedbackStats,
  updateFeedback,
  type FeedbackItem,
  type FeedbackStats,
  type FeedbackStatus,
} from "../../api/feedback";
import { sendFeedbackRequestWhatsApp } from "../../api/messaging";
import { getApiErrorMessage } from "../../lib/api";
import { toast } from "../components/ui/hot-toast";

const SOURCE_META: Record<string, { label: string }> = {
  google: { label: "Google" },
  app:    { label: "App"    },
  sms:    { label: "SMS"    },
};

function StarRow({ rating, size = "sm" }: { rating: number; size?: "sm" | "lg" }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} className={cn(
          size === "lg" ? "h-5 w-5" : "h-3.5 w-3.5",
          i <= rating ? "fill-[#D4AF37] text-[#D4AF37]" : "fill-none text-gray-200"
        )} />
      ))}
    </div>
  );
}

function Avatar({ name, size = "md" }: { name: string; size?: "sm" | "md" | "lg" }) {
  const initials = name.split(" ").map(n => n[0]).join("").slice(0, 2);
  const s = { sm: "h-8 w-8 text-[11px]", md: "h-11 w-11 text-sm", lg: "h-14 w-14 text-base" }[size];
  return (
    <div className={`${s} rounded-xl bg-[#111118] text-[#D4AF37] font-black flex items-center justify-center shrink-0`}>
      {initials}
    </div>
  );
}

export function Feedback() {
  const [search, setSearch]                   = useState("");
  const [sentimentFilter, setSentimentFilter] = useState<"all" | FeedbackItem["sentiment"]>("all");
  const [statusFilter, setStatusFilter]       = useState<"all" | FeedbackStatus>("all");
  const [replyFilter, setReplyFilter] = useState<"all" | "unreplied">("all");
  const [ratingFilter, setRatingFilter]       = useState<"all" | "5" | "4" | "3" | "1-2">("all");
  const [replyOpen, setReplyOpen]             = useState<string | null>(null);
  const [replyText, setReplyText]             = useState("");
  const [feedbacks, setFeedbacks]             = useState<FeedbackItem[]>([]);
  const [stats, setStats]                     = useState<FeedbackStats | null>(null);
  const [loading, setLoading]                 = useState(true);
  const [viewFeedback, setViewFeedback]       = useState<FeedbackItem | null>(null);
  const [requestOpen, setRequestOpen]         = useState(false);
  const [requestPhone, setRequestPhone]       = useState("");
  const [requestName, setRequestName]         = useState("");
  const [requestChannel, setRequestChannel]   = useState<"whatsapp" | "sms" | "email">("whatsapp");
  const [requestSent, setRequestSent]         = useState(false);

  const loadFeedback = useCallback(async () => {
    try {
      const apiFilters: {
        search?: string;
        rating?: number;
        ratingRange?: "1-2";
        status?: FeedbackStatus;
      } = {};

      if (search.trim()) apiFilters.search = search.trim();
      if (ratingFilter === "1-2") apiFilters.ratingRange = "1-2";
      else if (ratingFilter !== "all") apiFilters.rating = Number(ratingFilter);
      if (statusFilter !== "all") apiFilters.status = statusFilter;
      else if (replyFilter === "unreplied") apiFilters.status = "new";

      const [items, feedbackStats] = await Promise.all([
        fetchFeedback(apiFilters),
        fetchFeedbackStats(),
      ]);
      setFeedbacks(items);
      setStats(feedbackStats);
    } catch {
      toast.error("Failed to load feedback");
    } finally {
      setLoading(false);
    }
  }, [search, ratingFilter, statusFilter, replyFilter]);

  useEffect(() => {
    void loadFeedback();
  }, [loadFeedback]);

  useEffect(() => {
    try {
      const params   = new URLSearchParams(window.location.search);
      const customer = params.get("customer");
      if (customer) setSearch(customer);
    } catch {}
  }, []);

  const filtered = useMemo(() => {
    return feedbacks.filter((f) => {
      if (sentimentFilter !== "all" && f.sentiment !== sentimentFilter) return false;
      if (replyFilter === "unreplied" && f.replied) return false;
      return true;
    });
  }, [feedbacks, sentimentFilter, replyFilter]);

  const avgRating = stats ? stats.averageRating.toFixed(1) : "0.0";
  const positiveCount = stats?.positiveCount ?? 0;
  const negativeCount = stats?.negativeCount ?? 0;
  const unreplied = stats?.unrepliedCount ?? 0;
  const satisfactionPct = stats?.satisfactionPercent ?? 0;
  const totalReviews = stats?.totalReviews ?? 0;

  const { page, setPage, pageSize, setPageSize, paginate } = useTablePagination(
    filtered.length,
    [search, sentimentFilter, ratingFilter, replyFilter, statusFilter],
  );
  const paginatedFeedback = useMemo(() => paginate(filtered), [filtered, paginate]);

  const handleReply = async (id: string) => {
    if (!replyText.trim()) return;
    try {
      const updated = await updateFeedback(id, { replyText: replyText.trim() });
      setFeedbacks((prev) => prev.map((f) => (f.id === id ? updated : f)));
      setReplyOpen(null);
      setReplyText("");
      void loadFeedback();
    } catch {
      toast.error("Failed to send reply");
    }
  };

  const handleStatusUpdate = async (id: string, status: FeedbackStatus) => {
    try {
      const updated = await updateFeedback(id, { status });
      setFeedbacks((prev) => prev.map((f) => (f.id === id ? updated : f)));
      setViewFeedback((prev) => (prev?.id === id ? updated : prev));
      void loadFeedback();
    } catch {
      toast.error("Failed to update status");
    }
  };

  const handleSendRequest = async () => {
    if (!requestName.trim() || !requestPhone.trim()) return;

    if (requestChannel !== "whatsapp") {
      toast.error("Only WhatsApp feedback requests are enabled right now");
      return;
    }

    try {
      await sendFeedbackRequestWhatsApp({
        phone: requestPhone.trim(),
        customerName: requestName.trim(),
      });
      setRequestSent(true);
      toast.success("Feedback request sent on WhatsApp");
      window.setTimeout(() => {
        setRequestOpen(false);
        setRequestSent(false);
      }, 2000);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to send feedback request on WhatsApp"));
    }
  };

  return (
    <div className="space-y-6">

      {/* ── Page header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#D4AF37]">Customer Voice</p>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-[#1a1a1a] to-[#d4af37] bg-clip-text text-transparent">
            All Customer Feedbacks
          </h1>
          <p className="mt-1 text-sm text-[#9a9a9a]">Monitor reviews and respond to your customers</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => { setRequestSent(false); setRequestPhone(""); setRequestName(""); setRequestChannel("whatsapp"); setRequestOpen(true); }}
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#111118] px-5 text-[13px] font-bold text-[#D4AF37] shadow-sm transition-colors hover:bg-[#1e1e1e]"
        >
          <MessageSquare className="h-4 w-4" />
          Request Feedback
        </motion.button>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <PageStatCard label="Avg Rating" value={avgRating} sub={`${totalReviews} reviews`} icon={Star} index={0} href="/feedback" />
        <PageStatCard
          label="Satisfaction"
          value={`${satisfactionPct}%`}
          sub={`${positiveCount} positive`}
          icon={Smile}
          index={1}
          onClick={() => { setSentimentFilter("positive"); setReplyFilter("all"); }}
        />
        <PageStatCard
          label="Need Attention"
          value={negativeCount}
          sub="negative"
          icon={AlertCircle}
          index={2}
          onClick={() => { setSentimentFilter("negative"); setReplyFilter("all"); }}
        />
        <PageStatCard
          label="Awaiting Reply"
          value={unreplied}
          sub="pending"
          icon={Clock}
          index={3}
          onClick={() => { setReplyFilter("unreplied"); setStatusFilter("new"); setSentimentFilter("all"); }}
        />
      </div>

      <div className="space-y-4">

        {/* ── Rating Distribution ── */}
        <div className="overflow-hidden rounded-xl border border-black/[0.06] bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-black/[0.06] px-4 py-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#D4AF37]/20 bg-[#D4AF37]/10">
                <TrendingUp className="h-3.5 w-3.5 text-[#D4AF37]" />
              </div>
              <p className="text-[12px] font-bold text-[#111118]">Rating Distribution</p>
            </div>
            <div className="flex items-center gap-1.5">
              <StarRow rating={Math.round(Number(avgRating))} />
              <span className="ml-1 text-[14px] font-bold text-[#111118]">{avgRating}</span>
              <span className="text-[10px] text-[#9a9a9a]">/ 5</span>
            </div>
          </div>
          <div className="space-y-2 px-4 py-3">
            {[5, 4, 3, 2, 1].map(rating => {
              const count = stats?.ratingDistribution[rating as 1 | 2 | 3 | 4 | 5] ?? feedbacks.filter(f => f.rating === rating).length;
              const pct   = totalReviews > 0 ? Math.round((count / totalReviews) * 100) : 0;
              return (
                <div key={rating} className="flex items-center gap-3">
                  <div className="flex items-center gap-1 w-12 shrink-0">
                    <span className="text-[12px] font-bold text-gray-600">{rating}</span>
                    <Star className="h-3 w-3 fill-[#D4AF37] text-[#D4AF37]" />
                  </div>
                  <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.6, delay: (5 - rating) * 0.06 }}
                      className={cn("h-full rounded-full", rating >= 4 ? "bg-gradient-to-r from-[#D4AF37] to-[#b8962e]" : rating === 3 ? "bg-amber-300" : "bg-red-400")}
                    />
                  </div>
                  <div className="flex items-center gap-1.5 w-16 shrink-0 justify-end">
                    <span className="text-[11px] font-bold text-gray-700">{count}</span>
                    <span className="text-[10px] text-gray-400">({pct}%)</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Filters ── */}
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[#D4AF37]/15 bg-white px-4 py-3 shadow-[0_2px_12px_rgba(212,175,55,0.06)]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#9a9a9a]" />
            <input
              placeholder="Search feedbacks..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="h-9 w-52 rounded-xl border border-black/[0.08] bg-[#faf9f7] pl-9 pr-3 text-[12px] transition-all placeholder:text-[#9a9a9a] focus:border-[#D4AF37]/50 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/10"
            />
          </div>
          <div className="flex gap-1 rounded-xl border border-black/[0.08] bg-[#f4f2ed] p-1">
            {(["all", "new", "reviewed", "resolved"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => {
                  setStatusFilter(s);
                  setReplyFilter(s === "new" ? "unreplied" : "all");
                }}
                className={cn(
                  "rounded-lg px-2.5 py-1 text-[10px] font-bold capitalize transition-all",
                  statusFilter === s ? "bg-[#111118] text-[#D4AF37] shadow-sm" : "text-[#9a9a9a] hover:text-[#111118]",
                )}
              >
                {s === "all" ? "All status" : s}
              </button>
            ))}
          </div>
          <div className="flex gap-1 rounded-xl border border-black/[0.08] bg-[#f4f2ed] p-1">
            {(["all", "5", "4", "3", "1-2"] as const).map(r => (
              <button
                key={r}
                type="button"
                onClick={() => setRatingFilter(r)}
                className={cn(
                  "rounded-lg px-2.5 py-1 text-[10px] font-bold transition-all",
                  ratingFilter === r ? "bg-[#111118] text-[#D4AF37] shadow-sm" : "text-[#9a9a9a] hover:text-[#111118]",
                )}
              >
                {r === "all" ? "All" : r === "1-2" ? "1–2 ★" : `${r} ★`}
              </button>
            ))}
          </div>
          <span className="ml-auto text-[11px] font-medium text-[#9a9a9a]">
            {filtered.length} result{filtered.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* ── Feedback cards ── */}
        <div className="space-y-2.5">
          {filtered.length === 0 && !loading && (
            <div className="rounded-xl border border-black/[0.06] bg-white p-12 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl border border-dashed border-black/[0.1] bg-[#faf9f7]">
                <MessageSquare className="h-5 w-5 text-[#D4AF37]/35" />
              </div>
              <p className="text-[13px] font-semibold text-[#111118]">No feedback found</p>
              <p className="mt-1 text-[11px] text-[#9a9a9a]">Try adjusting your filters.</p>
            </div>
          )}

          {paginatedFeedback.map((fb, i) => (
              <motion.div
                key={fb.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="group overflow-hidden rounded-xl border border-black/[0.06] bg-white transition-all hover:border-[#D4AF37]/25 hover:shadow-[0_4px_16px_rgba(212,175,55,0.08)]"
              >

                <div className="p-3.5">
                  <div className="flex items-start gap-3">
                    <Avatar name={fb.customer} size="sm" />

                    <div className="min-w-0 flex-1">
                      <div className="mb-1.5 flex items-start justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <p className="text-[13px] font-bold text-[#111118]">{fb.customer}</p>
                          <StarRow rating={fb.rating} />
                          <span className={cn(
                            "inline-flex items-center gap-0.5 rounded-full border px-1.5 py-0.5 text-[9px] font-bold capitalize",
                            fb.sentiment === "positive"
                              ? "border-[#D4AF37]/25 bg-[#D4AF37]/10 text-[#B8962E]"
                              : fb.sentiment === "negative"
                              ? "border-black/[0.08] bg-black/[0.04] text-[#6b6b6b]"
                              : "border-black/[0.08] bg-black/[0.04] text-[#9a9a9a]",
                          )}>
                            {fb.sentiment === "positive" ? <ThumbsUp className="h-2 w-2" /> :
                             fb.sentiment === "negative" ? <ThumbsDown className="h-2 w-2" /> :
                             <Minus className="h-2 w-2" />}
                            {fb.sentiment}
                          </span>
                          {fb.replied
                            ? <span className="rounded-full border border-[#D4AF37]/25 bg-[#D4AF37]/10 px-1.5 py-0.5 text-[9px] font-bold text-[#B8962E]">Replied</span>
                            : <span className="rounded-full border border-black/[0.08] bg-[#faf9f7] px-1.5 py-0.5 text-[9px] font-bold text-[#9a9a9a]">Pending</span>
                          }
                          <span className="rounded-full border border-black/[0.06] bg-[#faf9f7] px-1.5 py-0.5 text-[9px] font-bold text-[#9a9a9a]">
                            {SOURCE_META[fb.source].label}
                          </span>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <span className="whitespace-nowrap text-[9px] text-[#9a9a9a]">{fb.date}</span>
                          <button
                            type="button"
                            onClick={() => setViewFeedback(fb)}
                            className="flex h-6 w-6 items-center justify-center rounded-md text-[#c0c0c0] opacity-0 transition-all hover:bg-[#D4AF37]/10 hover:text-[#D4AF37] group-hover:opacity-100"
                          >
                            <Eye className="h-3 w-3" />
                          </button>
                        </div>
                      </div>

                      <div className="mb-2 flex items-center gap-1.5">
                        <Scissors className="h-2.5 w-2.5 shrink-0 text-[#D4AF37]/50" />
                        <span className="text-[10px] font-semibold text-[#6b6b6b]">{fb.service}</span>
                        <span className="text-[#D4AF37]/30">·</span>
                        <span className="text-[10px] text-[#9a9a9a]">{fb.staff}</span>
                      </div>

                      <p className="line-clamp-2 text-[12px] leading-relaxed text-[#6b6b6b]">{fb.comment}</p>
                    </div>
                  </div>

                  {fb.replied && fb.replyText && (
                    <div className="mt-3 flex items-start gap-2 pl-11">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-[#D4AF37]/20 bg-[#D4AF37]/10">
                        <Reply className="h-3 w-3 text-[#D4AF37]" />
                      </div>
                      <div className="flex-1 rounded-lg border border-[#D4AF37]/15 bg-[#FFFBEB] px-3 py-2">
                        <p className="mb-1 text-[9px] font-bold uppercase tracking-wider text-[#B8962E]">Salon response</p>
                        <p className="text-[11px] leading-relaxed text-[#6b6b6b]">{fb.replyText}</p>
                      </div>
                    </div>
                  )}

                  <AnimatePresence>
                    {replyOpen === fb.id && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                        <div className="mt-3 pl-11">
                          <textarea
                            value={replyText}
                            onChange={e => setReplyText(e.target.value)}
                            placeholder="Write a professional, friendly response..."
                            rows={2}
                            autoFocus
                            className="w-full resize-none rounded-lg border border-black/[0.08] bg-white px-3 py-2 text-[12px] text-[#111118] placeholder:text-[#c0c0c0] focus:border-[#D4AF37]/40 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/10"
                          />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="flex items-center justify-between border-t border-black/[0.05] bg-[#faf9f7] px-3.5 py-2">
                  <div className="flex items-center gap-1.5">
                    <div className={cn(
                      "h-1.5 w-1.5 shrink-0 rounded-full",
                      fb.sentiment === "positive" ? "bg-[#D4AF37]" : fb.sentiment === "negative" ? "bg-[#111118]" : "bg-[#c0c0c0]",
                    )} />
                    <span className="text-[9px] font-medium capitalize text-[#9a9a9a]">{fb.sentiment}</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {replyOpen === fb.id ? (
                      <>
                        <button
                          type="button"
                          onClick={() => { setReplyOpen(null); setReplyText(""); }}
                          className="h-7 rounded-lg border border-black/[0.08] bg-white px-2.5 text-[10px] font-semibold text-[#9a9a9a] hover:border-black/[0.12]"
                        >
                          Cancel
                        </button>
                        <motion.button
                          whileTap={{ scale: 0.97 }}
                          type="button"
                          onClick={() => void handleReply(fb.id)}
                          disabled={!replyText.trim()}
                          className="flex h-7 items-center gap-1 rounded-lg bg-[#111118] px-3 text-[10px] font-bold text-[#D4AF37] disabled:opacity-40"
                        >
                          <Reply className="h-3 w-3" /> Send
                        </motion.button>
                      </>
                    ) : (
                      <>
                        {!fb.replied ? (
                          <motion.button
                            whileTap={{ scale: 0.97 }}
                            type="button"
                            onClick={() => { setReplyOpen(fb.id); setReplyText(""); }}
                            className="flex h-7 items-center gap-1 rounded-lg bg-[#111118] px-3 text-[10px] font-bold text-[#D4AF37]"
                          >
                            <Reply className="h-3 w-3" /> Reply
                          </motion.button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => { setReplyOpen(fb.id); setReplyText(fb.replyText || ""); }}
                            className="flex h-7 items-center gap-1 rounded-lg border border-black/[0.08] bg-white px-2.5 text-[10px] font-semibold text-[#6b6b6b] hover:border-[#D4AF37]/30"
                          >
                            <Reply className="h-3 w-3" /> Edit
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </motion.div>
          ))}
        </div>

        {filtered.length > 0 && (
          <Pagination
            page={page}
            pageSize={pageSize}
            totalRecords={filtered.length}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        )}
      </div>

      {/* ── View Detail Modal ── */}
      <Dialog open={!!viewFeedback} onOpenChange={() => setViewFeedback(null)}>
        <DialogContent className="w-[min(95vw,38rem)] max-w-none p-0 gap-0 overflow-hidden rounded-2xl [&>button:last-of-type]:hidden">
          {viewFeedback && (
              <>
                <div className="bg-[#111118] px-6 py-5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-[#d4af37]/15 flex items-center justify-center">
                      <MessageSquare className="h-5 w-5 text-[#d4af37]" />
                    </div>
                    <div>
                      <p className="text-white font-bold text-[13px] leading-tight">Feedback Detail</p>
                      <p className="text-gray-500 text-[11px]">{viewFeedback.date}</p>
                    </div>
                  </div>
                  <button onClick={() => setViewFeedback(null)} className="h-8 w-8 rounded-lg bg-white/06 hover:bg-white/12 flex items-center justify-center text-gray-400 hover:text-white transition-all">
                    ×
                  </button>
                </div>
                <div className="p-6 space-y-4">
                  <div className="flex items-center gap-4">
                    <Avatar name={viewFeedback.customer} size="lg" />
                    <div>
                      <p className="text-[16px] font-black text-[#111118]">{viewFeedback.customer}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <StarRow rating={viewFeedback.rating} size="lg" />
                        <span className="rounded-full border border-black/[0.08] bg-[#faf9f7] px-2 py-0.5 text-[10px] font-bold text-[#9a9a9a]">
                          {SOURCE_META[viewFeedback.source].label}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-[12px] text-gray-500">
                    <Scissors className="h-3.5 w-3.5 text-gray-300" />
                    <span className="font-semibold text-gray-700">{viewFeedback.service}</span>
                    <span className="text-gray-300">·</span>
                    <span>{viewFeedback.staff}</span>
                  </div>
                  <div className="rounded-xl bg-gray-50 border border-gray-100 px-4 py-4">
                    <p className="text-[13px] text-gray-700 leading-relaxed">"{viewFeedback.comment}"</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(["new", "reviewed", "resolved"] as const).map((status) => (
                      <button
                        key={status}
                        type="button"
                        onClick={() => void handleStatusUpdate(viewFeedback.id, status)}
                        className={cn(
                          "rounded-lg px-3 py-1.5 text-[10px] font-bold capitalize border transition-all",
                          viewFeedback.status === status
                            ? "bg-[#111118] border-[#111118] text-[#D4AF37]"
                            : "bg-white border-black/[0.08] text-[#6b6b6b] hover:border-[#D4AF37]/30",
                        )}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                  {viewFeedback.replied && viewFeedback.replyText && (
                    <div className="rounded-xl bg-gradient-to-br from-[#faf8f2] to-[#fdf9ee] border border-[#D4AF37]/15 px-4 py-4">
                      <p className="text-[10px] font-bold text-[#b8962e] uppercase tracking-wider mb-2">✦ Salon Response</p>
                      <p className="text-[13px] text-gray-600 leading-relaxed">{viewFeedback.replyText}</p>
                    </div>
                  )}
                </div>
              </>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Request Feedback Modal ── */}
      <Dialog open={requestOpen} onOpenChange={v => { setRequestOpen(v); if (!v) setRequestSent(false); }}>
        <DialogContent className="w-[min(95vw,32rem)] max-w-none p-0 gap-0 overflow-hidden rounded-2xl [&>button:last-of-type]:hidden">
          <div className="bg-[#111118] px-6 py-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-[#d4af37]/15 flex items-center justify-center">
                <MessageSquare className="h-5 w-5 text-[#d4af37]" />
              </div>
              <div>
                <p className="text-white font-bold text-[13px]">Request Feedback</p>
                <p className="text-gray-500 text-[10px]">Send a review link to your customer</p>
              </div>
            </div>
            <button onClick={() => setRequestOpen(false)} className="h-8 w-8 rounded-lg bg-white/06 hover:bg-white/12 flex items-center justify-center text-gray-400 hover:text-white transition-all">×</button>
          </div>
          <div className="p-6">
            <AnimatePresence mode="wait">
              {requestSent ? (
                <motion.div key="sent" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-8">
                  <div className="h-16 w-16 rounded-2xl bg-green-50 border border-green-100 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="h-8 w-8 text-green-500" />
                  </div>
                  <p className="font-bold text-[#111118] text-[15px]">Request Sent!</p>
                  <p className="text-[12px] text-gray-400 mt-1">Feedback request sent to {requestName}</p>
                </motion.div>
              ) : (
                <motion.div key="form" className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Customer Name</label>
                    <input value={requestName} onChange={e => setRequestName(e.target.value)} placeholder="e.g. Sarah Johnson"
                      className="w-full h-10 px-3.5 rounded-xl border border-gray-200 text-[13px] bg-gray-50/60 focus:bg-white focus:outline-none focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/12 transition-all placeholder:text-gray-300" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Phone / Email</label>
                    <input value={requestPhone} onChange={e => setRequestPhone(e.target.value)} placeholder="+91 98765 43210"
                      className="w-full h-10 px-3.5 rounded-xl border border-gray-200 text-[13px] bg-gray-50/60 focus:bg-white focus:outline-none focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/12 transition-all placeholder:text-gray-300" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Send Via</label>
                    <div className="grid grid-cols-3 gap-2">
                      {(["whatsapp","sms","email"] as const).map(ch => (
                        <button key={ch} onClick={() => setRequestChannel(ch)}
                          className={cn("h-10 rounded-xl text-[12px] font-bold border capitalize transition-all",
                            requestChannel === ch ? "bg-[#111118] border-[#111118] text-[#d4af37]" : "bg-white border-gray-200 text-gray-500 hover:border-gray-300")}>
                          {ch}
                        </button>
                      ))}
                    </div>
                  </div>
                  <motion.button whileTap={{ scale: 0.97 }}
                    onClick={handleSendRequest}
                    disabled={!requestName.trim() || !requestPhone.trim()}
                    className="w-full h-11 rounded-xl bg-gradient-to-r from-[#d4af37] to-[#b8962e] text-[13px] font-bold text-black disabled:opacity-40 transition-all flex items-center justify-center gap-2 mt-2">
                    <Send className="h-4 w-4" /> Send Request
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
