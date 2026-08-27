import { UserCheck, Calendar, Receipt, Crown, CreditCard } from "lucide-react";
import { cn } from "../ui/utils";

const dotColors: Record<string, string> = {
  customer: "bg-[#D4AF37]",
  appointment: "bg-[#121212]",
  billing: "bg-[#D4AF37]",
  loyalty: "bg-[#D4AF37]",
  payment: "bg-[#111118]",
  inventory: "bg-[#3f3f46]",
};

export function ActivityFeed({ compact = false }: { compact?: boolean }) {
  const items: Array<{
    id: number;
    text: string;
    time: string;
    icon: typeof UserCheck;
    type: string;
  }> = [];

  return (
    <div className="space-y-1">
      {items.length === 0 && (
        <p className="text-center text-sm text-[#3f3f46] py-6">No recent activity yet.</p>
      )}
      {items.map((item, i) => (
        <div
          key={item.id}
          className={cn(
            "flex items-start gap-3 p-3 rounded-xl transition-colors hover:bg-[#FAF8F2]",
            i === 0 && "bg-[#FAF8F2]/80"
          )}
        >
          <div className="relative mt-0.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white border border-[#D4AF37]/15">
              <item.icon className="h-4 w-4 text-[#121212]" />
            </div>
            {i === 0 && (
              <span className={cn("absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-white", dotColors[item.type])} />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-[#121212] leading-snug">{item.text}</p>
            <p className="text-xs text-[#3f3f46] mt-0.5">{item.time}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
