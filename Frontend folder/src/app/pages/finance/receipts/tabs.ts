import { IndianRupee, RotateCcw, Clock, Wallet, Package } from "lucide-react";

export const TABS = [
  { id: "sales" as const, label: "Sales", shortLabel: "Sales", icon: IndianRupee },
  { id: "refunds" as const, label: "Refunds", shortLabel: "Refunds", icon: RotateCcw },
  { id: "pending" as const, label: "Pending Payments", shortLabel: "Pending", icon: Clock },
  { id: "advance" as const, label: "Advance Payments", shortLabel: "Advance", icon: Wallet },
  { id: "membership" as const, label: "Membership / Packages", shortLabel: "Membership", icon: Package },
] as const;

export type ReceiptTab = typeof TABS[number]["id"];
