import { Loader2 } from "lucide-react";
import { useDashboard } from "../useDashboard";

export function DashboardState({ children }: { children: React.ReactNode }) {
  const { loading, error, refresh } = useDashboard();

  if (loading && !error) {
    return (
      <div className="flex min-h-[320px] items-center justify-center rounded-2xl border border-black/[0.06] bg-white">
        <div className="flex items-center gap-3 text-[#3f3f46]">
          <Loader2 className="h-5 w-5 animate-spin text-[#D4AF37]" />
          <span className="text-[13px] font-medium">Loading dashboard data…</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 rounded-2xl border border-red-200 bg-red-50/40 px-6 text-center">
        <p className="text-[14px] font-semibold text-[#111118]">Unable to load dashboard</p>
        <p className="text-[12px] text-[#3f3f46] max-w-md">{error}</p>
        <button
          type="button"
          onClick={() => void refresh()}
          className="mt-1 rounded-xl bg-[#111118] px-4 py-2 text-[12px] font-semibold text-[#D4AF37]"
        >
          Try again
        </button>
      </div>
    );
  }

  return <>{children}</>;
}
