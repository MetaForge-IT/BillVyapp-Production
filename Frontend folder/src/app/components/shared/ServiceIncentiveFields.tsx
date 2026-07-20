import { Award, IndianRupee, Percent } from "lucide-react";
import { Switch } from "../ui/switch";
import { cn } from "../ui/utils";
import {
  computeIncentiveAmount,
  type ServiceIncentiveSettings,
} from "../../types/serviceIncentive";

interface ServiceIncentiveFieldsProps {
  settings: ServiceIncentiveSettings;
  onChange: (settings: ServiceIncentiveSettings) => void;
  servicePrice?: number;
  className?: string;
}

export function ServiceIncentiveFields({
  settings,
  onChange,
  servicePrice,
  className,
}: ServiceIncentiveFieldsProps) {
  const previewAmount =
    settings.enabled && servicePrice && servicePrice > 0
      ? computeIncentiveAmount(settings, servicePrice, 1)
      : 0;

  return (
    <div className={cn("rounded-xl border border-[#d4af37]/20 bg-[#faf8f2]/80 p-4 space-y-4", className)}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#d4af37]/12 border border-[#d4af37]/20">
            <Award className="h-4 w-4 text-[#d4af37]" />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-[#b8962e]">Incentive Settings</p>
            <p className="text-[11px] text-gray-500">Reward staff when this service is billed</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[11px] font-semibold text-gray-500">{settings.enabled ? "On" : "Off"}</span>
          <Switch
            checked={settings.enabled}
            onCheckedChange={enabled => onChange({ ...settings, enabled })}
          />
        </div>
      </div>

      {settings.enabled && (
        <>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onChange({ ...settings, type: "fixed" })}
              className={cn(
                "flex-1 h-9 rounded-xl border text-[12px] font-semibold transition-all inline-flex items-center justify-center gap-1.5",
                settings.type === "fixed"
                  ? "border-[#d4af37] bg-[#d4af37]/12 text-[#9a7d20]"
                  : "border-gray-200 bg-white text-gray-600 hover:border-[#d4af37]/40",
              )}
            >
              <IndianRupee className="h-3.5 w-3.5" />
              Fixed Amount
            </button>
            <button
              type="button"
              onClick={() => onChange({ ...settings, type: "percentage" })}
              className={cn(
                "flex-1 h-9 rounded-xl border text-[12px] font-semibold transition-all inline-flex items-center justify-center gap-1.5",
                settings.type === "percentage"
                  ? "border-[#d4af37] bg-[#d4af37]/12 text-[#9a7d20]"
                  : "border-gray-200 bg-white text-gray-600 hover:border-[#d4af37]/40",
              )}
            >
              <Percent className="h-3.5 w-3.5" />
              Percentage
            </button>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
              {settings.type === "fixed" ? "Incentive Amount (₹)" : "Incentive Percentage (%)"}
            </label>
            <div className="flex h-10 rounded-xl border border-gray-200 bg-white overflow-hidden focus-within:border-[#d4af37] focus-within:ring-2 focus-within:ring-[#d4af37]/12">
              <span className="flex items-center px-3 text-xs font-bold text-[#d4af37] bg-[#111118] border-r border-gray-200 shrink-0">
                {settings.type === "fixed" ? "₹" : "%"}
              </span>
              <input
                type="number"
                min={0}
                step={settings.type === "fixed" ? 1 : 0.5}
                value={settings.value || ""}
                onChange={e => onChange({ ...settings, value: Math.max(0, Number(e.target.value) || 0) })}
                className="flex-1 px-3 text-sm bg-transparent outline-none text-gray-800"
                placeholder={settings.type === "fixed" ? "50" : "10"}
              />
            </div>
          </div>

          {previewAmount > 0 && (
            <p className="text-[12px] text-[#9a7d20] font-semibold px-1">
              Employee earns ₹{previewAmount.toLocaleString("en-IN")}
              {settings.type === "percentage" ? ` (${settings.value}% of ₹${servicePrice?.toLocaleString("en-IN")})` : " per service"}
            </p>
          )}
        </>
      )}
    </div>
  );
}
