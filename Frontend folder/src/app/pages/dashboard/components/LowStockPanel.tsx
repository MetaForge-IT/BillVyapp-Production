import { motion } from "framer-motion";
import { useNavigate } from "react-router";
import { Package } from "lucide-react";
import { DashboardCard, DashboardCardHeader, SectionLabel } from "./DashboardCard";
import { useDashboard } from "../useDashboard";
import { cn } from "../../../components/ui/utils";
import { DASHBOARD_VIEWPORT, dashboardFadeUp } from "../motion";

/** Low / out-of-stock products managers need to reorder. */
export function LowStockPanel() {
  const navigate = useNavigate();
  const { data } = useDashboard();
  const products = data?.inventoryAnalytics?.lowStockProducts?.slice(0, 5) ?? [];
  const low = data?.inventoryAnalytics?.lowStock ?? 0;
  const out = data?.inventoryAnalytics?.outOfStock ?? 0;
  const alertCount = low + out;

  return (
    <section aria-label="Stock alerts" className="flex h-full flex-col">
      <SectionLabel>Stock Alerts</SectionLabel>
      <motion.div variants={dashboardFadeUp} initial="hidden" whileInView="show" viewport={DASHBOARD_VIEWPORT} className="min-h-0 flex-1">
        <DashboardCard className="h-full">
          <DashboardCardHeader
            icon={Package}
            title="Needs reorder"
            badge={alertCount > 0 ? `${alertCount} items` : "Clear"}
            action="Inventory"
            onAction={() => navigate("/inventory?tab=stock")}
          />
          <div className="divide-y divide-black/[0.04]">
            {products.length === 0 ? (
              <p className="px-4 py-10 text-center text-[12px] text-[#52525b]">All stock levels look healthy</p>
            ) : (
              products.map((product) => {
                const isOut = product.stockStatus === "out_of_stock" || product.stock <= 0;
                return (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => navigate("/inventory?tab=stock")}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[#f4f2ed]/70"
                  >
                    <div
                      className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border text-[10px] font-bold",
                        isOut
                          ? "border-[#111118]/20 bg-[#111118] text-[#D4AF37]"
                          : "border-[#D4AF37]/25 bg-[#D4AF37]/10 text-[#9a7d20]",
                      )}
                    >
                      {isOut ? "OUT" : "LOW"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-semibold text-[#111118]">{product.name}</p>
                      <p className="truncate text-[11px] text-[#52525b]">{product.sku}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-[13px] font-bold tabular-nums text-[#111118]">{product.stock}</p>
                      <p className="text-[10px] text-[#52525b]">min {product.minStock}</p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </DashboardCard>
      </motion.div>
    </section>
  );
}
