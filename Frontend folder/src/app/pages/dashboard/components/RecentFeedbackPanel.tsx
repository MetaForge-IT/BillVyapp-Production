import { motion } from "framer-motion";
import { useNavigate } from "react-router";
import { MessageSquare, Star } from "lucide-react";
import { DashboardCard, DashboardCardHeader, SectionLabel } from "./DashboardCard";
import { useDashboard } from "../useDashboard";
import { cn } from "../../../components/ui/utils";
import { DASHBOARD_VIEWPORT, dashboardFadeUp } from "../motion";

function StarRow({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={cn(
            "h-3 w-3",
            n <= rating ? "fill-[#D4AF37] text-[#D4AF37]" : "fill-none text-gray-200",
          )}
        />
      ))}
    </div>
  );
}

/** Latest customer ratings — ties into post-checkout feedback. */
export function RecentFeedbackPanel() {
  const navigate = useNavigate();
  const { data } = useDashboard();
  const reviews = data?.feedbackAnalytics?.recentReviews?.slice(0, 5) ?? [];
  const avg = data?.feedbackAnalytics?.averageRating ?? 0;
  const total = data?.feedbackAnalytics?.totalReviews ?? 0;

  return (
    <section aria-label="Recent feedback" className="flex h-full flex-col">
      <SectionLabel>Customer Feedback</SectionLabel>
      <motion.div variants={dashboardFadeUp} initial="hidden" whileInView="show" viewport={DASHBOARD_VIEWPORT} className="min-h-0 flex-1">
        <DashboardCard className="h-full">
          <DashboardCardHeader
            icon={MessageSquare}
            title="Recent ratings"
            badge={avg > 0 ? `${avg.toFixed(1)} avg` : undefined}
            action="All"
            onAction={() => navigate("/feedback")}
          />
          <div className="divide-y divide-black/[0.04]">
            {reviews.length === 0 ? (
              <p className="px-4 py-10 text-center text-[12px] text-[#52525b]">
                No feedback yet — ratings appear after checkout
              </p>
            ) : (
              reviews.map((review) => (
                <button
                  key={review.id}
                  type="button"
                  onClick={() => navigate("/feedback")}
                  className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-[#f4f2ed]/70"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#D4AF37]/10 text-[11px] font-bold text-[#111118]">
                    {(review.customer || "?").slice(0, 1).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-[13px] font-semibold text-[#111118]">{review.customer}</p>
                      <StarRow rating={review.rating} />
                    </div>
                    <p className="mt-0.5 truncate text-[11px] text-[#52525b]">
                      {review.service || "Visit"}
                      {review.comment ? ` · ${review.comment}` : ""}
                    </p>
                    <p className="mt-0.5 text-[10px] text-[#b0b0b0]">{review.date}</p>
                  </div>
                </button>
              ))
            )}
          </div>
          {total > 0 && (
            <div className="border-t border-black/[0.05] px-4 py-2.5">
              <p className="text-[11px] text-[#52525b]">
                {total} total review{total === 1 ? "" : "s"} · {data?.feedbackAnalytics?.satisfactionPercent ?? 0}% positive
              </p>
            </div>
          )}
        </DashboardCard>
      </motion.div>
    </section>
  );
}
