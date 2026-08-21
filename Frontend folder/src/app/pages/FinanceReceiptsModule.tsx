import { useState, useMemo, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router";
import { Receipts } from "./Receipts";
import { usePendingPayments } from "../context/PendingPaymentsContext";
import { useAdvances } from "../context/AdvancesContext";
import { useRole } from "../context/RoleContext";
import { SegmentedPillNav } from "../components/layout/SegmentedPillNav";
import { TABS, type ReceiptTab } from "./finance/receipts/tabs";
import type { RefundRecord } from "./finance/receipts/types";
import { RefundsTab } from "./finance/receipts/RefundsTab";
import { PendingTab } from "./finance/receipts/PendingTab";
import { AdvanceTab } from "./finance/receipts/AdvanceTab";
import { MembershipTab } from "./finance/receipts/MembershipTab";

export function FinanceReceiptsModule() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { role } = useRole();
  const isManager = role === "manager";
  const visibleTabs = useMemo(
    () =>
      isManager
        ? TABS.filter((t) => t.id === "sales" || t.id === "pending")
        : [...TABS],
    [isManager],
  );
  const dateParam = searchParams.get("date");
  const sectionParam = searchParams.get("section");

  const defaultSection: ReceiptTab = isManager ? "pending" : "sales";
  const sectionFromUrl = (
    visibleTabs.find((t) => t.id === sectionParam)?.id ?? defaultSection
  ) as ReceiptTab;
  const [active, setActive] = useState<ReceiptTab>(sectionFromUrl);
  const { pendingPayments, refresh: refreshPending } = usePendingPayments();
  const { advances } = useAdvances();
  const [membershipStats, setMembershipStats] = useState({ active: 0, exhausted: 0, expired: 0 });
  const [pendingRefundCount, setPendingRefundCount] = useState(0);

  // Keep sub-tab in sync with ?section= (dashboard KPI drill-downs, deep links)
  useEffect(() => {
    if (dateParam && visibleTabs.some((t) => t.id === "sales")) {
      setActive("sales");
      return;
    }
    if (sectionParam && visibleTabs.some((t) => t.id === sectionParam)) {
      setActive(sectionParam as ReceiptTab);
      return;
    }
    setActive(defaultSection);
  }, [dateParam, sectionParam, visibleTabs, defaultSection]);

  // Managers default to Pending when no section is set
  useEffect(() => {
    if (!isManager) return;
    if (sectionParam && visibleTabs.some((t) => t.id === sectionParam)) return;
    if (dateParam) return;
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("tab", "receipts");
      next.set("section", "pending");
      return next;
    }, { replace: true });
  }, [isManager, sectionParam, dateParam, visibleTabs, setSearchParams]);

  useEffect(() => {
    if (active === "pending") void refreshPending();
  }, [active, refreshPending]);

  const handleTabChange = (id: ReceiptTab) => {
    setActive(id);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("tab", "receipts");
      next.set("section", id);
      if (id !== "sales") next.delete("date");
      return next;
    }, { replace: true });
  };

  const handleRefundsLoaded = useCallback((refunds: RefundRecord[]) => {
    setPendingRefundCount(refunds.filter((r) => r.status === "pending").length);
  }, []);

  const badges: Partial<Record<ReceiptTab, number>> = {
    refunds:    pendingRefundCount,
    pending:    pendingPayments.length,
    advance:    advances.length,
    membership: membershipStats.active,
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
      <div className="shrink-0">
        <SegmentedPillNav
          items={visibleTabs.map(({ id, label, shortLabel, icon }) => ({
            id,
            label,
            shortLabel,
            icon,
            badge: badges[id],
          }))}
          value={active}
          onChange={handleTabChange}
        />
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {active === "sales" ? (
          <Receipts />
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            {active === "refunds"    && <RefundsTab onLoaded={handleRefundsLoaded} />}
            {active === "pending"    && <PendingTab />}
            {active === "advance"    && <AdvanceTab />}
            {active === "membership" && <MembershipTab onStatsChange={setMembershipStats} />}
          </div>
        )}
      </div>
    </div>
  );
}
