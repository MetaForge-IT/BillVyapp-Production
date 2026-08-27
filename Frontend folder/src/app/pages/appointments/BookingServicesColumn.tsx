import { motion } from "framer-motion";
import {
  Search, Plus, Check, Scissors, Clock, Sparkles, Package, AlertTriangle,
  ChevronDown, ChevronLeft, ChevronRight,
} from "lucide-react";
import { Input } from "../../components/ui/input";
import { cn } from "../../components/ui/utils";
import { ColHeader } from "../walkInBilling/ColHeader";
import type {
  AppointmentPackage,
  AppointmentProduct,
  AppointmentService,
} from "./appointmentData";
import {
  SERVICES_PAGE_SIZE,
  type ProductOverride,
  type SelectedPackage,
  type SelectedProduct,
  type SelectedService,
  type ServiceTab,
} from "./newAppointmentDraft";

type GroupSection = {
  categoryName: string;
  groupName: string;
  services: AppointmentService[];
};

export type BookingServicesColumnProps = {
  customerValid: boolean;
  visibleServiceTabs: ServiceTab[];
  serviceTab: ServiceTab;
  setServiceTab: (tab: ServiceTab) => void;
  serviceSearchInput: string;
  setServiceSearchInput: (v: string) => void;
  setServiceSearch: (v: string) => void;
  setServiceListPage: React.Dispatch<React.SetStateAction<number>>;
  filteredServices: AppointmentService[];
  useGroupedServiceList: boolean;
  paginatedGroupSections: GroupSection[];
  paginatedServices: AppointmentService[];
  expandedGroups: Record<string, boolean>;
  setExpandedGroups: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  selectedServices: SelectedService[];
  setSelectedServices: React.Dispatch<React.SetStateAction<SelectedService[]>>;
  selectedPackages: SelectedPackage[];
  setSelectedPackages: React.Dispatch<React.SetStateAction<SelectedPackage[]>>;
  selectedProducts: SelectedProduct[];
  setSelectedProducts: React.Dispatch<React.SetStateAction<SelectedProduct[]>>;
  filteredPackages: AppointmentPackage[];
  paginatedPackages: AppointmentPackage[];
  filteredProducts: AppointmentProduct[];
  paginatedProducts: AppointmentProduct[];
  catalogListTotal: number;
  catalogPageStart: number;
  catalogPageEnd: number;
  catalogPrevDisabled: boolean;
  catalogNextDisabled: boolean;
  productOverrides: Record<string, ProductOverride[]>;
  setProductOverrides: React.Dispatch<React.SetStateAction<Record<string, ProductOverride[]>>>;
  expandedServiceId: string | null;
  setExpandedServiceId: React.Dispatch<React.SetStateAction<string | null>>;
  initOverridesForService: (service: AppointmentService) => void;
  updateOverrideQty: (serviceId: string, sku: string, qty: number) => void;
  stockOf: (sku: string) => number;
  stockStatus: (sku: string) => string;
  totalSelectedCount: number;
  estimatedDuration: number;
};

export function BookingServicesColumn({
  customerValid,
  visibleServiceTabs,
  serviceTab,
  setServiceTab,
  serviceSearchInput,
  setServiceSearchInput,
  setServiceSearch,
  setServiceListPage,
  filteredServices,
  useGroupedServiceList,
  paginatedGroupSections,
  paginatedServices,
  expandedGroups,
  setExpandedGroups,
  selectedServices,
  setSelectedServices,
  selectedPackages,
  setSelectedPackages,
  selectedProducts,
  setSelectedProducts,
  filteredPackages,
  paginatedPackages,
  filteredProducts,
  paginatedProducts,
  catalogListTotal,
  catalogPageStart,
  catalogPageEnd,
  catalogPrevDisabled,
  catalogNextDisabled,
  productOverrides,
  setProductOverrides,
  expandedServiceId,
  setExpandedServiceId,
  initOverridesForService,
  updateOverrideQty,
  stockOf,
  stockStatus,
  totalSelectedCount,
  estimatedDuration,
}: BookingServicesColumnProps) {
  function renderProductOverrides(serviceId: string) {
    const overrides = productOverrides[serviceId];
    if (!overrides?.length) return null;
    return (
      <div className="mt-1 overflow-hidden rounded-xl border border-[#D4AF37]/25 bg-[#D4AF37]/04">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setExpandedServiceId(expandedServiceId === serviceId ? null : serviceId);
          }}
          className="flex w-full items-center gap-2 px-3 py-2 text-left"
        >
          <Package className="h-3 w-3 shrink-0 text-[#d4af37]" />
          <span className="flex-1 text-[10.5px] font-semibold text-[#b8962e]">
            {overrides.length} product{overrides.length > 1 ? "s" : ""} linked
            {overrides.some((o) => stockOf(o.sku) < o.qty) && (
              <span className="ml-1.5 text-orange-500">· ⚠ low stock</span>
            )}
          </span>
          <ChevronDown
            className={`h-3 w-3 text-[#d4af37] transition-transform ${
              expandedServiceId === serviceId ? "rotate-180" : ""
            }`}
          />
        </button>
        {expandedServiceId === serviceId && (
          <div className="space-y-2 border-t border-[#D4AF37]/15 px-3 py-2">
            {overrides.map((override) => {
              const stock = stockOf(override.sku);
              const status = stockStatus(override.sku);
              const isLow = status === "low" || status === "critical" || status === "out";
              const insufficient = stock < override.qty;
              return (
                <div key={override.sku} className="flex items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[11px] font-semibold text-[#1a1a1a]">{override.name}</p>
                    <p
                      className={`text-[10px] ${
                        insufficient ? "font-bold text-orange-500" : "text-gray-400"
                      }`}
                    >
                      {stock} in stock {isLow ? "⚠" : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        updateOverrideQty(serviceId, override.sku, Math.max(0, override.qty - 1));
                      }}
                      className="flex h-6 w-6 items-center justify-center rounded-lg border border-gray-200 bg-white text-[11px] font-bold text-gray-500 hover:bg-gray-50"
                    >
                      −
                    </button>
                    <span
                      className={`w-8 text-center text-[12px] font-bold ${
                        override.qty !== override.defaultQty ? "text-[#d4af37]" : "text-[#1a1a1a]"
                      }`}
                    >
                      {override.qty}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        updateOverrideQty(serviceId, override.sku, override.qty + 1);
                      }}
                      className="flex h-6 w-6 items-center justify-center rounded-lg border border-gray-200 bg-white text-[11px] font-bold text-gray-500 hover:bg-gray-50"
                    >
                      +
                    </button>
                    <span className="w-16 text-[10px] text-gray-400">{override.unit}</span>
                    {override.qty !== override.defaultQty && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          updateOverrideQty(serviceId, override.sku, override.defaultQty);
                        }}
                        className="text-[9px] text-gray-400 underline hover:text-[#d4af37]"
                      >
                        reset
                      </button>
                    )}
                  </div>
                  {insufficient && <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-orange-500" />}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  function toggleService(service: AppointmentService) {
    setSelectedServices((prev) => {
      const exists = prev.find((s) => s.id === service.id);
      if (exists) {
        setProductOverrides((po) => {
          const n = { ...po };
          delete n[service.id];
          return n;
        });
        return prev.filter((s) => s.id !== service.id);
      }
      initOverridesForService(service);
      return [...prev, { ...service, qty: 1 }];
    });
  }

  return (
    <div
      className={cn(
        "responsive-panel relative flex flex-col overflow-hidden border-b border-black/[0.08] bg-[#f4f2ed] transition-all duration-300 lg:border-b-0 lg:border-r",
        !customerValid && "pointer-events-none select-none",
      )}
    >
      {!customerValid && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-[#f4f2ed]/70 backdrop-blur-[1px]">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#111118]/10 bg-[#111118]/08">
            <Scissors className="h-5 w-5 text-[#111118]/20" />
          </div>
          <p className="text-[12px] font-bold text-[#111118]/30">Fill in customer first</p>
        </div>
      )}
      <ColHeader num="02" icon={Scissors} title="Services" desc="What do they need?" />

      <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
        <div className="tabs-scroll-x rounded-xl border border-black/[0.07] bg-white p-1">
          {visibleServiceTabs.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => {
                setServiceTab(tab);
                setServiceSearch("");
                setServiceSearchInput("");
                setServiceListPage(1);
              }}
              className={cn(
                "whitespace-nowrap rounded-lg px-3 py-2 text-[10.5px] font-bold transition-all",
                serviceTab === tab
                  ? tab === "Packages"
                    ? "bg-[#d4af37] text-[#111118] shadow-sm"
                    : tab === "Products"
                      ? "bg-[#111118] text-[#D4AF37] shadow-sm"
                      : "bg-[#111118] text-[#D4AF37] shadow-sm"
                  : "text-[#52525b] hover:text-[#111118]",
              )}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#52525b]" />
          <Input
            placeholder={
              serviceTab === "Packages"
                ? "Search packages…"
                : serviceTab === "Products"
                  ? "Search products…"
                  : `Search ${serviceTab.toLowerCase()} services…`
            }
            value={serviceSearchInput}
            onChange={(e) => setServiceSearchInput(e.target.value)}
            className="h-10 rounded-xl border-black/[0.08] bg-white pl-9 text-[12.5px] focus:border-[#D4AF37]/40"
          />
        </div>

        {(serviceTab === "Male" || serviceTab === "Female" || serviceTab === "Others") && (
          <div className="space-y-2">
            {filteredServices.length === 0 && (
              <p className="py-6 text-center text-[12px] italic text-[#c0c0c0]">No services found</p>
            )}

            {useGroupedServiceList
              ? paginatedGroupSections.map(({ categoryName, groupName, services }, index) => {
                  const groupKey = `${categoryName}::${groupName}`;
                  const open = expandedGroups[groupKey] ?? false;
                  const showCategoryLabel =
                    index === 0 || paginatedGroupSections[index - 1]?.categoryName !== categoryName;
                  const accordionTitle = groupName;
                  return (
                    <div key={groupKey} className="space-y-2">
                      {showCategoryLabel && (
                        <p className="px-1 pt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[#52525b]">
                          {categoryName}
                        </p>
                      )}
                      <div className="overflow-hidden rounded-xl border border-black/[0.07] bg-white">
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedGroups((prev) => ({ ...prev, [groupKey]: !open }))
                          }
                          className="flex w-full items-center gap-2 px-3 py-2.5 text-left hover:bg-[#faf9f7]"
                        >
                          <ChevronDown
                            className={cn(
                              "h-3.5 w-3.5 text-[#D4AF37] transition-transform",
                              open ? "rotate-0" : "-rotate-90",
                            )}
                          />
                          <span className="text-[12px] font-bold text-[#111118]">{accordionTitle}</span>
                          <span className="ml-auto text-[10px] text-[#52525b]">{services.length}</span>
                        </button>
                        {open && (
                          <div className="space-y-1.5 border-t border-black/[0.05] px-2 py-2">
                            {services.map((service) => {
                              const sel = selectedServices.some((s) => s.id === service.id);
                              return (
                                <div key={service.id} className="space-y-1">
                                  <button
                                    type="button"
                                    onClick={() => toggleService(service)}
                                    className={cn(
                                      "flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-all duration-200",
                                      sel
                                        ? "border-[#D4AF37]/40 bg-white shadow-[0_0_0_1.5px_rgba(212,175,55,0.15)]"
                                        : "border-black/[0.07] bg-[#faf9f7] hover:border-[#D4AF37]/20",
                                    )}
                                  >
                                    <div
                                      className={cn(
                                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br",
                                        service.tone ?? "from-[#52525b] to-[#3f3f46]",
                                      )}
                                    >
                                      <Scissors className="h-4 w-4 text-white/90" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <p className="text-[10px] font-semibold uppercase tracking-wide text-[#52525b]">
                                        {service.categoryLabel || categoryName}
                                        {service.serviceGroup ? ` · ${service.serviceGroup}` : ""}
                                      </p>
                                      <p className="text-[12.5px] font-semibold leading-tight text-[#111118]">
                                        {service.displayName || service.name}
                                      </p>
                                      <p className="mt-0.5 flex items-center gap-1 text-[10.5px] text-[#52525b]">
                                        <Clock className="h-3 w-3" /> {service.duration} min
                                      </p>
                                    </div>
                                    <div className="flex shrink-0 items-center gap-2">
                                      <span className="text-[12.5px] font-bold text-[#111118]">
                                        ₹{service.price.toLocaleString("en-IN")}
                                      </span>
                                      <div
                                        className={cn(
                                          "flex h-6 w-6 items-center justify-center rounded-full transition-all",
                                          sel
                                            ? "bg-[#D4AF37] text-[#111118]"
                                            : "bg-[#f4f2ed] text-[#c0c0c0]",
                                        )}
                                      >
                                        {sel ? (
                                          <Check className="h-3.5 w-3.5" strokeWidth={3} />
                                        ) : (
                                          <Plus className="h-3.5 w-3.5" />
                                        )}
                                      </div>
                                    </div>
                                  </button>
                                  {sel && renderProductOverrides(service.id)}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              : paginatedServices.map((service) => {
                  const sel = selectedServices.some((s) => s.id === service.id);
                  return (
                    <div key={service.id} className="space-y-1">
                      <button
                        type="button"
                        onClick={() => toggleService(service)}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-all duration-200",
                          sel
                            ? "border-[#D4AF37]/40 bg-white shadow-[0_0_0_1.5px_rgba(212,175,55,0.15)]"
                            : "border-black/[0.07] bg-white hover:border-[#D4AF37]/20 hover:shadow-sm",
                        )}
                      >
                        <div
                          className={cn(
                            "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br",
                            service.tone ?? "from-[#52525b] to-[#3f3f46]",
                          )}
                        >
                          <Scissors className="h-4 w-4 text-white/90" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-[#52525b]">
                            {service.categoryLabel}
                            {service.serviceGroup ? ` · ${service.serviceGroup}` : ""}
                          </p>
                          <p className="text-[12.5px] font-semibold leading-tight text-[#111118]">
                            {service.displayName || service.name}
                          </p>
                          <p className="mt-0.5 flex items-center gap-1 text-[10.5px] text-[#52525b]">
                            <Clock className="h-3 w-3" /> {service.duration} min
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <span className="text-[12.5px] font-bold text-[#111118]">
                            ₹{service.price.toLocaleString("en-IN")}
                          </span>
                          <div
                            className={cn(
                              "flex h-6 w-6 items-center justify-center rounded-full transition-all",
                              sel ? "bg-[#D4AF37] text-[#111118]" : "bg-[#f4f2ed] text-[#c0c0c0]",
                            )}
                          >
                            {sel ? (
                              <Check className="h-3.5 w-3.5" strokeWidth={3} />
                            ) : (
                              <Plus className="h-3.5 w-3.5" />
                            )}
                          </div>
                        </div>
                      </button>
                      {sel && renderProductOverrides(service.id)}
                    </div>
                  );
                })}

            {catalogListTotal > SERVICES_PAGE_SIZE &&
              (serviceTab === "Male" || serviceTab === "Female" || serviceTab === "Others") && (
                <div className="flex items-center justify-between gap-2 pt-1">
                  <p className="text-[11px] font-medium text-[#52525b]">
                    {catalogPageStart}–{catalogPageEnd} of {catalogListTotal}
                    {useGroupedServiceList ? " groups" : " services"}
                  </p>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setServiceListPage((p) => Math.max(1, p - 1))}
                      disabled={catalogPrevDisabled}
                      aria-label="Previous services page"
                      className={cn(
                        "flex h-7 w-7 items-center justify-center rounded-lg border text-[11px] transition-all",
                        catalogPrevDisabled
                          ? "cursor-not-allowed border-black/[0.06] bg-[#f4f2ed] text-[#c0c0c0]"
                          : "border-black/[0.1] bg-white text-[#111118] hover:border-[#D4AF37]/40",
                      )}
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setServiceListPage((p) => p + 1)}
                      disabled={catalogNextDisabled}
                      aria-label="Next services page"
                      className={cn(
                        "flex h-7 w-7 items-center justify-center rounded-lg border text-[11px] transition-all",
                        catalogNextDisabled
                          ? "cursor-not-allowed border-black/[0.06] bg-[#f4f2ed] text-[#c0c0c0]"
                          : "border-[#D4AF37]/30 bg-[#D4AF37]/10 text-[#111118] hover:border-[#D4AF37]/50",
                      )}
                    >
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )}
          </div>
        )}

        {serviceTab === "Packages" && (
          <div className="space-y-2">
            {filteredPackages.length === 0 && (
              <p className="py-6 text-center text-[12px] italic text-[#c0c0c0]">No packages found</p>
            )}
            {paginatedPackages.map((pkg) => {
              const sel = selectedPackages.some((p) => p.id === pkg.id);
              return (
                <button
                  key={pkg.id}
                  type="button"
                  onClick={() =>
                    setSelectedPackages((prev) => {
                      const exists = prev.find((p) => p.id === pkg.id);
                      return exists
                        ? prev.filter((p) => p.id !== pkg.id)
                        : [...prev, { ...pkg, qty: 1 }];
                    })
                  }
                  className={cn(
                    "flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-all duration-200",
                    sel
                      ? "border-[#D4AF37]/40 bg-white shadow-[0_0_0_1.5px_rgba(212,175,55,0.15)]"
                      : "border-black/[0.07] bg-white hover:border-[#D4AF37]/20 hover:shadow-sm",
                  )}
                >
                  <div
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br",
                      pkg.tone,
                    )}
                  >
                    <Sparkles className="h-4 w-4 text-white/90" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-[12.5px] font-semibold leading-tight text-[#111118]">
                        {pkg.name}
                      </p>
                      <span
                        className={cn(
                          "rounded-full px-1.5 py-0.5 text-[9px] font-bold",
                          pkg.gender === "Male"
                            ? "bg-blue-50 text-blue-600"
                            : pkg.gender === "Female"
                              ? "bg-pink-50 text-pink-600"
                              : "bg-gray-100 text-gray-500",
                        )}
                      >
                        {pkg.gender}
                      </span>
                    </div>
                    <p className="mt-0.5 flex items-center gap-1 text-[10.5px] text-[#52525b]">
                      <Clock className="h-3 w-3" /> {pkg.duration} min
                    </p>
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {pkg.includes.map((i) => (
                        <span
                          key={i}
                          className="rounded-full border border-black/[0.06] bg-[#f4f2ed] px-1.5 py-0.5 text-[9px] text-[#3f3f46]"
                        >
                          {i}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <span className="text-[12.5px] font-bold text-[#111118]">
                      ₹{pkg.price.toLocaleString("en-IN")}
                    </span>
                    <div
                      className={cn(
                        "flex h-6 w-6 items-center justify-center rounded-full transition-all",
                        sel ? "bg-[#D4AF37] text-[#111118]" : "bg-[#f4f2ed] text-[#c0c0c0]",
                      )}
                    >
                      {sel ? (
                        <Check className="h-3.5 w-3.5" strokeWidth={3} />
                      ) : (
                        <Plus className="h-3.5 w-3.5" />
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
            {filteredPackages.length > SERVICES_PAGE_SIZE && (
              <div className="flex items-center justify-between gap-2 pt-1">
                <p className="text-[11px] font-medium text-[#52525b]">
                  {catalogPageStart}–{catalogPageEnd} of {filteredPackages.length}
                </p>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setServiceListPage((p) => Math.max(1, p - 1))}
                    disabled={catalogPrevDisabled}
                    aria-label="Previous packages page"
                    className={cn(
                      "flex h-7 w-7 items-center justify-center rounded-lg border text-[11px] transition-all",
                      catalogPrevDisabled
                        ? "cursor-not-allowed border-black/[0.06] bg-[#f4f2ed] text-[#c0c0c0]"
                        : "border-black/[0.1] bg-white text-[#111118] hover:border-[#D4AF37]/40",
                    )}
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setServiceListPage((p) => p + 1)}
                    disabled={catalogNextDisabled}
                    aria-label="Next packages page"
                    className={cn(
                      "flex h-7 w-7 items-center justify-center rounded-lg border text-[11px] transition-all",
                      catalogNextDisabled
                        ? "cursor-not-allowed border-black/[0.06] bg-[#f4f2ed] text-[#c0c0c0]"
                        : "border-[#D4AF37]/30 bg-[#D4AF37]/10 text-[#111118] hover:border-[#D4AF37]/50",
                    )}
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {serviceTab === "Products" && (
          <div className="space-y-2">
            {filteredProducts.length === 0 && (
              <p className="py-6 text-center text-[12px] italic text-[#c0c0c0]">No products found</p>
            )}
            {paginatedProducts.map((prod) => {
              const sel = selectedProducts.some((p) => p.id === prod.id);
              return (
                <button
                  key={prod.id}
                  type="button"
                  onClick={() =>
                    setSelectedProducts((prev) => {
                      const exists = prev.find((p) => p.id === prod.id);
                      return exists
                        ? prev.filter((p) => p.id !== prod.id)
                        : [...prev, { ...prod, qty: 1 }];
                    })
                  }
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-all duration-200",
                    sel
                      ? "border-[#D4AF37]/40 bg-white shadow-[0_0_0_1.5px_rgba(212,175,55,0.15)]"
                      : "border-black/[0.07] bg-white hover:border-[#D4AF37]/20 hover:shadow-sm",
                  )}
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#d4af37]/30 bg-gradient-to-br from-[#d4af37]/20 to-[#d4af37]/40">
                    <Sparkles className="h-4 w-4 text-[#b8962e]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12.5px] font-semibold leading-tight text-[#111118]">
                      {prod.name}
                    </p>
                    <div className="mt-0.5 flex items-center gap-2">
                      <span className="text-[10px] font-semibold text-[#d4af37]">{prod.category}</span>
                      <span
                        className={cn(
                          "rounded-full px-1.5 py-0.5 text-[9px] font-bold",
                          prod.stock < 15 ? "bg-red-50 text-red-500" : "bg-green-50 text-green-600",
                        )}
                      >
                        Stock: {prod.stock}
                      </span>
                      <span
                        className={cn(
                          "rounded-full px-1.5 py-0.5 text-[9px] font-bold",
                          prod.gender === "Male"
                            ? "bg-blue-50 text-blue-600"
                            : prod.gender === "Female"
                              ? "bg-pink-50 text-pink-600"
                              : "bg-gray-100 text-gray-500",
                        )}
                      >
                        {prod.gender}
                      </span>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="text-[12.5px] font-bold text-[#111118]">
                      ₹{prod.price.toLocaleString("en-IN")}
                    </span>
                    <div
                      className={cn(
                        "flex h-6 w-6 items-center justify-center rounded-full transition-all",
                        sel ? "bg-[#D4AF37] text-[#111118]" : "bg-[#f4f2ed] text-[#c0c0c0]",
                      )}
                    >
                      {sel ? (
                        <Check className="h-3.5 w-3.5" strokeWidth={3} />
                      ) : (
                        <Plus className="h-3.5 w-3.5" />
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
            {filteredProducts.length > SERVICES_PAGE_SIZE && (
              <div className="flex items-center justify-between gap-2 pt-1">
                <p className="text-[11px] font-medium text-[#52525b]">
                  {catalogPageStart}–{catalogPageEnd} of {filteredProducts.length}
                </p>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setServiceListPage((p) => Math.max(1, p - 1))}
                    disabled={catalogPrevDisabled}
                    aria-label="Previous products page"
                    className={cn(
                      "flex h-7 w-7 items-center justify-center rounded-lg border text-[11px] transition-all",
                      catalogPrevDisabled
                        ? "cursor-not-allowed border-black/[0.06] bg-[#f4f2ed] text-[#c0c0c0]"
                        : "border-black/[0.1] bg-white text-[#111118] hover:border-[#D4AF37]/40",
                    )}
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setServiceListPage((p) => p + 1)}
                    disabled={catalogNextDisabled}
                    aria-label="Next products page"
                    className={cn(
                      "flex h-7 w-7 items-center justify-center rounded-lg border text-[11px] transition-all",
                      catalogNextDisabled
                        ? "cursor-not-allowed border-black/[0.06] bg-[#f4f2ed] text-[#c0c0c0]"
                        : "border-[#D4AF37]/30 bg-[#D4AF37]/10 text-[#111118] hover:border-[#D4AF37]/50",
                    )}
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {totalSelectedCount > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="sticky bottom-0 rounded-xl border border-black/[0.07] bg-white px-3 py-2.5 shadow-lg"
          >
            <div className="mb-2 flex items-center gap-2">
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#D4AF37] text-[9px] font-bold text-[#111118]">
                {totalSelectedCount}
              </div>
              <span className="text-[11.5px] font-semibold text-[#111118]">selected</span>
              {estimatedDuration > 0 && (
                <span className="ml-auto flex items-center gap-1 text-[10.5px] text-[#52525b]">
                  <Clock className="h-3 w-3 text-[#D4AF37]" /> ~{estimatedDuration} min
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {selectedServices.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSelectedServices((prev) => prev.filter((x) => x.id !== s.id))}
                  className="flex items-center gap-1 rounded-full border border-black/[0.06] bg-[#f4f2ed] px-2 py-0.5 text-[10px] font-medium text-[#111118] hover:border-[#D4AF37]/30"
                >
                  {s.name} <span className="ml-0.5 text-[#52525b]">✕</span>
                </button>
              ))}
              {selectedPackages.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelectedPackages((prev) => prev.filter((x) => x.id !== p.id))}
                  className="flex items-center gap-1 rounded-full border border-[#D4AF37]/30 bg-[#D4AF37]/10 px-2 py-0.5 text-[10px] font-medium text-[#b8962e] hover:border-[#D4AF37]/50"
                >
                  <Sparkles className="h-2.5 w-2.5" />
                  {p.name} <span className="ml-0.5">✕</span>
                </button>
              ))}
              {selectedProducts.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelectedProducts((prev) => prev.filter((x) => x.id !== p.id))}
                  className="flex items-center gap-1 rounded-full border border-black/[0.1] bg-[#111118]/[0.06] px-2 py-0.5 text-[10px] font-medium text-[#3f3f46] hover:border-black/20"
                >
                  {p.name} <span className="ml-0.5">✕</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
