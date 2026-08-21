import { financePanel } from "../finance/finance-ui";

export const CARD_TABLE = `${financePanel} overflow-hidden`;
export const TABLE_ROW = "border-b border-black/[0.05] hover:bg-[#FAF8F2]/80 transition-colors";

export const statusConfig = {
  ok: { label: "In Stock", className: "bg-[#D4AF37]/10 text-[#9a7d20] border-[#D4AF37]/25 hover:bg-[#D4AF37]/10" },
  low: { label: "Low Stock", className: "bg-[#FFFBEB] text-[#9a7d20] border-[#D4AF37]/20 hover:bg-[#FFFBEB]" },
  critical: { label: "Critical", className: "bg-red-50 text-red-700 border-red-200 hover:bg-red-50" },
  out: { label: "Out of Stock", className: "bg-[#f4f2ed] text-[#6b6b6b] border-black/[0.08] hover:bg-[#f4f2ed]" },
};

export const orderStatusConfig = {
  pending: { label: "Pending", className: "bg-[#FFFBEB] text-[#9a7d20] border-[#D4AF37]/20 hover:bg-[#FFFBEB]" },
  shipped: { label: "Shipped", className: "bg-[#FAF8F2] text-[#111118] border-black/[0.08] hover:bg-[#FAF8F2]" },
  delivered: { label: "Delivered", className: "bg-[#D4AF37]/10 text-[#9a7d20] border-[#D4AF37]/25 hover:bg-[#D4AF37]/10" },
};
