import { useEffect, useMemo } from "react";
import { useSearchParams } from "react-router";
import { motion } from "framer-motion";
import { FinanceReceiptsModule } from "./FinanceReceiptsModule";

// Accounting (Overview / Expenses / Cash Flow / Closing / Reports / Planning)
// is intentionally not shown on Billing — receipts only.
type PrimaryTab = "receipts";

const TAB_META: Record<PrimaryTab, { subtitle: string }> = {
  receipts: {
    subtitle: "Receipts, refunds, pending payments, advances, and memberships",
  },
};

export function Finance() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  const tab: PrimaryTab = "receipts";

  useEffect(() => {
    if (tabParam !== "receipts") {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set("tab", "receipts");
          return next;
        },
        { replace: true },
      );
    }
  }, [tabParam, setSearchParams]);

  const meta = useMemo(() => TAB_META[tab], [tab]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="space-y-5"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#D4AF37]">
            Finance
          </p>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-[#1a1a1a] to-[#d4af37] bg-clip-text text-transparent">
            Receipts
          </h1>
          <p className="mt-1 text-[13px] text-[#9a9a9a]">{meta.subtitle}</p>
        </div>
      </div>

      <FinanceReceiptsModule />
    </motion.div>
  );
}

export default Finance;
