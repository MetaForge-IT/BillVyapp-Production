import { useState, useMemo, useEffect, useCallback } from "react";
import { useNavigate } from "react-router";
import { motion } from "framer-motion";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { cn } from "../components/ui/utils";
import {
  Plus, Search, Star, Clock, Percent, Users,
  CheckCircle2, Edit2, Eye, X, Sparkles, Layers, Crown, Package,
} from "lucide-react";
import { Pagination } from "../components/shared/Pagination";
import { useTablePagination } from "../hooks/useTablePagination";
import { fetchServiceCatalog, type CatalogService } from "../../api/services";
import { fetchProducts } from "../../api/products";
import {
  createSalonPlan,
  fetchPlanEnrollments,
  fetchSalonPlans,
  updateSalonPlan,
  type SalonPlan,
} from "../../api/plans";
import { getApiErrorMessage } from "../../lib/api";
import { toast } from "../components/ui/hot-toast";

interface Package {
  id: string;
  name: string;
  description: string;
  services: string[];
  originalPrice: number;
  discountedPrice: number;
  discountPct: number;
  duration: number;
  validityDays: number;
  category: "hair" | "spa" | "combo" | "bridal" | "seasonal";
  isPopular: boolean;
  isSeasonal: boolean;
  bookings: number;
  revenue: number;
  active: boolean;
}

function inferCategory(plan: SalonPlan): Package["category"] {
  const text = `${plan.name} ${plan.description ?? ""}`.toLowerCase();
  if (text.includes("bridal")) return "bridal";
  if (text.includes("spa")) return "spa";
  if (text.includes("hair")) return "hair";
  if (text.includes("season") || text.includes("monsoon")) return "seasonal";
  return "combo";
}

function mapSalonPlanToPackage(plan: SalonPlan, catalog: CatalogService[]): Package {
  const services = plan.includedServices.map((s) => s.serviceName);
  const originalPrice = plan.includedServices.reduce((sum, item) => {
    const svc = catalog.find((c) => c.id === item.serviceId);
    return sum + (svc?.price ?? 0) * item.quantity;
  }, 0);
  const discountedPrice = plan.price;
  const discountPct =
    originalPrice > 0
      ? Math.round(((originalPrice - discountedPrice) / originalPrice) * 100)
      : plan.discountPercent ?? 0;
  const duration = plan.includedServices.reduce((sum, item) => {
    const svc = catalog.find((c) => c.id === item.serviceId);
    return sum + (svc?.duration ?? 60) * item.quantity;
  }, 0);

  return {
    id: plan.id,
    name: plan.name,
    description: plan.description ?? "Bundled service package",
    services,
    originalPrice: originalPrice || discountedPrice,
    discountedPrice,
    discountPct: Math.max(0, discountPct),
    duration: duration || 60,
    validityDays: plan.validityDays,
    category: inferCategory(plan),
    isPopular: plan.isActive && plan.price >= 3000,
    isSeasonal: inferCategory(plan) === "seasonal",
    bookings: 0,
    revenue: 0,
    active: plan.isActive,
  };
}

const CATEGORY_STYLES: Record<string, { label: string; color: string }> = {
  hair: { label: "Hair", color: "bg-[#faf9f7] text-[#111118] border-black/[0.08]" },
  spa: { label: "Spa", color: "bg-[#f4f2ed] text-[#3f3f46] border-black/[0.08]" },
  combo: { label: "Combo", color: "bg-[#D4AF37]/10 text-[#9a7d20] border-[#D4AF37]/25" },
  bridal: { label: "Bridal", color: "bg-[#111118]/5 text-[#111118] border-[#D4AF37]/20" },
  seasonal: { label: "Seasonal", color: "bg-[#D4AF37]/8 text-[#B8962E] border-[#D4AF37]/30" },
};

export function Packages() {
  const navigate = useNavigate();
  const [serviceCatalog, setServiceCatalog] = useState<CatalogService[]>([]);
  const [availableServices, setAvailableServices] = useState<string[]>([]);
  const [availableProducts, setAvailableProducts] = useState<string[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [search, setSearch] = useState("");

  const loadPackages = useCallback(async (catalog: CatalogService[]) => {
    setLoading(true);
    try {
      const [plans, enrollments] = await Promise.all([
        fetchSalonPlans(),
        fetchPlanEnrollments().catch(() => []),
      ]);
      const packagePlans = plans
        .filter((p) => p.planType === "package")
        .slice()
        .sort((a, b) => {
          const aTime = a.createdAt ? Date.parse(a.createdAt) : 0;
          const bTime = b.createdAt ? Date.parse(b.createdAt) : 0;
          return aTime - bTime;
        });

      const stats = new Map<string, { bookings: number; revenue: number }>();
      for (const enrollment of enrollments) {
        if (enrollment.planType !== "package") continue;
        const current = stats.get(enrollment.planId) ?? { bookings: 0, revenue: 0 };
        current.bookings += 1;
        current.revenue += enrollment.amountPaid ?? 0;
        stats.set(enrollment.planId, current);
      }

      setPackages(
        packagePlans.map((plan) => {
          const mapped = mapSalonPlanToPackage(plan, catalog);
          const planStats = stats.get(plan.id);
          return {
            ...mapped,
            bookings: planStats?.bookings ?? 0,
            revenue: planStats?.revenue ?? 0,
          };
        }),
      );
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to load packages"));
      setPackages([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        const services = await fetchServiceCatalog();
        setServiceCatalog(services);
        setAvailableServices(services.map((service) => service.name));
        await loadPackages(services);
      } catch {
        setServiceCatalog([]);
        setAvailableServices([]);
        setPackages([]);
        setLoading(false);
      }
      fetchProducts({ status: "active" })
        .then((products) => setAvailableProducts(products.map((product) => product.name)))
        .catch(() => setAvailableProducts([]));
    })();
  }, [loadPackages]);
  const [categoryFilter, setCategoryFilter] = useState<"all" | string>("all");
  const [showInactive, setShowInactive] = useState(false);
  const [preview, setPreview] = useState<Package | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [serviceSearch, setServiceSearch] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [newPkg, setNewPkg] = useState({
    name: "",
    category: "combo" as Package["category"],
    description: "",
    originalPrice: "",
    discountedPrice: "",
    validityDays: "",
    duration: "",
  });
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [editPkg, setEditPkg] = useState<Package | null>(null);

  function toggleService(s: string) {
    setSelectedServices((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  }
  function toggleProduct(p: string) {
    setSelectedProducts((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));
  }
  function resetCreateForm() {
    setNewPkg({ name: "", category: "combo", description: "", originalPrice: "", discountedPrice: "", validityDays: "", duration: "" });
    setSelectedServices([]);
    setSelectedProducts([]);
    setShowCreate(false);
  }
  async function handleCreatePackage() {
    if (!newPkg.name.trim() || selectedServices.length === 0 || creating) return;
    const original = Number(newPkg.originalPrice) || 0;
    const discounted = Number(newPkg.discountedPrice) || original;
    const includedServices = selectedServices
      .map((name) => {
        const svc = serviceCatalog.find((s) => s.name === name);
        return svc ? { serviceId: svc.id, quantity: 1 } : null;
      })
      .filter((item): item is { serviceId: string; quantity: number } => item !== null);

    if (includedServices.length === 0) {
      toast.error("Selected services could not be matched to the catalog");
      return;
    }

    setCreating(true);
    try {
      const created = await createSalonPlan({
        namePreset: "custom",
        customName: newPkg.name.trim(),
        planType: "package",
        price: discounted,
        validityDays: Number(newPkg.validityDays) || 30,
        serviceLimit: includedServices.length,
        discountPercent:
          original > 0 ? Math.round(((original - discounted) / original) * 100) : null,
        description: newPkg.description.trim() || "Custom bundled package",
        isActive: true,
        includedServices,
      });
      const mapped = mapSalonPlanToPackage(created, serviceCatalog);
      setPackages((prev) => [...prev, mapped]);
      resetCreateForm();
      toast.success("Package created");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to create package"));
    } finally {
      setCreating(false);
    }
  }

  const filtered = packages.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.services.some(s => s.toLowerCase().includes(search.toLowerCase()));
    const matchCat = categoryFilter === "all" || p.category === categoryFilter;
    const matchActive = showInactive ? true : p.active;
    return matchSearch && matchCat && matchActive;
  });

  const packagesPagination = useTablePagination(filtered.length, [search, categoryFilter, showInactive]);
  const paginatedPackages = useMemo(
    () => packagesPagination.paginate(filtered),
    [filtered, packagesPagination],
  );

  const toggleActive = (id: string) => {
    const pkg = packages.find((p) => p.id === id);
    if (!pkg) return;
    const nextActive = !pkg.active;
    setPackages((prev) => prev.map((p) => (p.id === id ? { ...p, active: nextActive } : p)));
    void updateSalonPlan(id, { isActive: nextActive })
      .catch((error) => {
        setPackages((prev) => prev.map((p) => (p.id === id ? { ...p, active: pkg.active } : p)));
        toast.error(getApiErrorMessage(error, "Failed to update package status"));
      });
  };

  async function saveEdit() {
    if (!editPkg || savingEdit) return;
    const original = Number(editPkg.originalPrice);
    const discounted = Number(editPkg.discountedPrice);
    if (Number.isNaN(discounted) || discounted < 0) {
      toast.error("Enter a valid package price");
      return;
    }
    if (!editPkg.name.trim()) {
      toast.error("Package name is required");
      return;
    }

    const includedServices = editPkg.services
      .map((name) => {
        const svc = serviceCatalog.find((s) => s.name === name);
        return svc ? { serviceId: svc.id, quantity: 1 } : null;
      })
      .filter((item): item is { serviceId: string; quantity: number } => item !== null);

    if (editPkg.services.length > 0 && includedServices.length !== editPkg.services.length) {
      toast.error("Some service names do not match the catalog. Use exact service names.");
      return;
    }

    const pct =
      original > 0 && !Number.isNaN(original)
        ? Math.round(((original - discounted) / original) * 100)
        : 0;

    setSavingEdit(true);
    try {
      const updated = await updateSalonPlan(editPkg.id, {
        namePreset: "custom",
        customName: editPkg.name.trim(),
        price: discounted,
        validityDays: Number(editPkg.validityDays) || 30,
        discountPercent: Math.max(0, pct),
        description: editPkg.description.trim() || null,
        serviceLimit: includedServices.length > 0 ? includedServices.length : null,
        includedServices,
      });
      const mapped = mapSalonPlanToPackage(updated, serviceCatalog);
      setPackages((prev) =>
        prev.map((p) =>
          p.id === editPkg.id
            ? {
                ...mapped,
                bookings: p.bookings,
                revenue: p.revenue,
                isPopular: editPkg.isPopular,
              }
            : p,
        ),
      );
      setEditPkg(null);
      toast.success("Package updated");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to update package"));
    } finally {
      setSavingEdit(false);
    }
  }

  const totalRevenue = packages.reduce((a, b) => a + b.revenue, 0);
  const activeCount = packages.filter(p => p.active).length;
  const totalBookings = packages.reduce((a, b) => a + b.bookings, 0);
  const mostPopular = useMemo(
    () => packages.length > 0
      ? packages.reduce((best, p) => (p.bookings > best.bookings ? p : best), packages[0])
      : null,
    [packages],
  );

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#D4AF37]">Bundles & Combos</p>
          <p className="text-[13px] text-[#52525b]">Create and manage bundled service offerings</p>
        </div>
        <Button
          className="h-9 rounded-xl bg-[#111118] text-[#D4AF37] hover:bg-[#1a1a1a] shadow-sm"
          onClick={() => setShowCreate(true)}
        >
          <Plus className="h-4 w-4 mr-2" /> Create Package
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: "Total Packages", value: String(packages.length), sub: `${activeCount} active`, Icon: Package },
          { label: "Total Bookings", value: String(totalBookings), sub: "all time", Icon: Users },
          { label: "Package Revenue", value: `₹${(totalRevenue / 100000).toFixed(1)}L`, sub: "from packages", Icon: Percent },
          { label: "Most Popular", value: mostPopular?.name ?? "—", sub: `${mostPopular?.bookings ?? 0} bookings`, Icon: Crown },
        ].map((kpi, i) => (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            whileHover={{ y: -3, transition: { duration: 0.2 } }}
            className="group relative overflow-hidden rounded-xl border border-black/[0.07] bg-white shadow-sm transition-all duration-300 hover:shadow-[0_12px_32px_rgba(17,17,24,0.08)]"
          >
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#D4AF37]/60 to-transparent" />
            <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,rgba(212,175,55,0.06),transparent)] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
            <div className="relative flex items-start justify-between p-3.5">
              <div className="min-w-0 flex-1 pr-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#3f3f46]">{kpi.label}</p>
                <p className="mt-1 truncate text-xl font-bold leading-tight text-[#111118] tabular-nums">{kpi.value}</p>
                <p className="mt-1 text-[11px] text-[#52525b]">{kpi.sub}</p>
              </div>
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#D4AF37]/20 bg-[#D4AF37]/10">
                <kpi.Icon className="h-4 w-4 text-[#D4AF37]" />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2.5 rounded-2xl border border-black/[0.07] bg-white p-3 shadow-sm">
        <div className="relative min-w-[180px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#D4AF37]" />
          <input
            placeholder="Search packages by name or service…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="h-9 w-full rounded-xl border border-black/[0.08] bg-[#fafaf8] pl-9 pr-3 text-[13px] text-[#111118] outline-none transition-all placeholder:text-[#52525b] focus:border-[#D4AF37]/50 focus:ring-2 focus:ring-[#D4AF37]/10"
          />
        </div>
        <div className="flex gap-1 rounded-xl border border-black/[0.08] bg-[#f4f2ed] p-1">
          {(["all", "hair", "spa", "combo", "bridal", "seasonal"] as const).map(cat => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategoryFilter(cat)}
              className={cn(
                "rounded-lg px-2.5 py-1 text-[10px] font-bold capitalize transition-all",
                categoryFilter === cat ? "bg-[#111118] text-[#D4AF37] shadow-sm" : "text-[#52525b] hover:text-[#111118]",
              )}
            >
              {cat === "all" ? "All" : CATEGORY_STYLES[cat].label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setShowInactive(!showInactive)}
          className={cn(
            "flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-[11px] font-semibold transition-all",
            showInactive
              ? "border-[#111118] bg-[#111118] text-[#D4AF37]"
              : "border-black/[0.08] bg-[#faf9f7] text-[#52525b] hover:border-[#D4AF37]/30 hover:text-[#111118]",
          )}
        >
          {showInactive ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          Show Inactive
        </button>
        <span className="ml-auto text-[11px] font-medium text-[#52525b]">
          {filtered.length} package{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Create Package Form */}
      {showCreate && (
        <div className="overflow-hidden rounded-xl border border-black/[0.07] bg-white shadow-sm">
          {/* Header */}
          <div className="bg-[#111118] px-6 py-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-[#d4af37]/15 border border-[#d4af37]/20 flex items-center justify-center shrink-0">
                <Layers className="h-4 w-4 text-[#D4AF37]" />
              </div>
              <div>
                <h3 className="text-[15px] font-bold text-white leading-tight">Create New Package</h3>
                <p className="text-[11px] text-white/40 mt-0.5">Fields marked <span className="text-red-400">*</span> are required</p>
              </div>
            </div>
            <button onClick={resetCreateForm} className="h-7 w-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
              <X className="h-3.5 w-3.5 text-white/70" />
            </button>
          </div>

          {/* Body */}
          <div className="space-y-5 bg-[#faf9f7] p-6">

            {/* Name + Category */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-widest text-[#b8962e]">Package Name <span className="text-red-400">*</span></label>
                <Input
                  placeholder="e.g. Premium Glow Package"
                  className="h-10 px-3.5 rounded-xl border border-gray-200 bg-white focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/12"
                  value={newPkg.name}
                  onChange={e => setNewPkg(p => ({ ...p, name: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-widest text-[#b8962e]">Category <span className="text-red-400">*</span></label>
                <select
                  className="w-full h-10 rounded-xl border border-gray-200 bg-white px-3.5 text-sm text-[#121212] focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/12"
                  value={newPkg.category}
                  onChange={e => setNewPkg(p => ({ ...p, category: e.target.value as Package["category"] }))}
                >
                  <option value="hair">Hair</option>
                  <option value="spa">Spa</option>
                  <option value="combo">Combo</option>
                  <option value="bridal">Bridal</option>
                  <option value="seasonal">Seasonal</option>
                </select>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-widest text-[#b8962e]">Description</label>
              <Input
                placeholder="Short description of this package..."
                className="h-10 px-3.5 rounded-xl border border-gray-200 bg-white focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/12"
                value={newPkg.description}
                onChange={e => setNewPkg(p => ({ ...p, description: e.target.value }))}
              />
            </div>

            {/* Services */}
            {/* Services */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold uppercase tracking-widest text-[#b8962e]">Select Services <span className="text-red-400">*</span></label>
                {selectedServices.length > 0 && (
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#111118] text-[#D4AF37]">
                    {selectedServices.length} selected
                  </span>
                )}
              </div>
              <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                <div className="relative border-b border-gray-100">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
                  <input
                    placeholder="Search services…"
                    value={serviceSearch}
                    onChange={e => setServiceSearch(e.target.value)}
                    className="w-full h-9 pl-8 pr-3 text-xs bg-gray-50 outline-none placeholder:text-gray-400 text-gray-700"
                  />
                </div>
                <div className="p-3 max-h-40 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {serviceCatalog
                    .filter((svc) => {
                      const q = serviceSearch.toLowerCase().trim();
                      if (!q) return true;
                      return (
                        svc.name.toLowerCase().includes(q) ||
                        (svc.displayName ?? "").toLowerCase().includes(q) ||
                        (svc.serviceGroup ?? "").toLowerCase().includes(q) ||
                        (svc.category ?? "").toLowerCase().includes(q)
                      );
                    })
                    .map((svc) => {
                      const selected = selectedServices.includes(svc.name);
                      const label = svc.displayName || svc.name;
                      return (
                    <button
                      key={svc.id}
                      type="button"
                      onClick={() => toggleService(svc.name)}
                      className={cn(
                        "text-left text-xs px-3 py-2 rounded-lg border transition-all truncate font-medium",
                        selected
                          ? "bg-[#111118] text-[#D4AF37] border-[#111118] shadow-sm"
                          : "bg-gray-50 text-gray-600 border-gray-200 hover:border-[#D4AF37]/40 hover:bg-[#faf8f2]"
                      )}
                      title={svc.name}
                    >
                      {selected && <CheckCircle2 className="h-3 w-3 inline mr-1 shrink-0" />}
                      {label}
                    </button>
                      );
                    })}
                </div>
              </div>
            </div>

            {/* Products */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold uppercase tracking-widest text-[#b8962e]">Select Products <span className="text-gray-400 font-normal normal-case tracking-normal text-[10px]">(optional)</span></label>
                {selectedProducts.length > 0 && (
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#D4AF37]/15 text-[#b8962e] border border-[#D4AF37]/20">
                    {selectedProducts.length} selected
                  </span>
                )}
              </div>
              <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                <div className="relative border-b border-gray-100">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
                  <input
                    placeholder="Search products…"
                    value={productSearch}
                    onChange={e => setProductSearch(e.target.value)}
                    className="w-full h-9 pl-8 pr-3 text-xs bg-gray-50 outline-none placeholder:text-gray-400 text-gray-700"
                  />
                </div>
                <div className="p-3 max-h-40 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {availableProducts.filter(p => p.toLowerCase().includes(productSearch.toLowerCase())).map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => toggleProduct(p)}
                      className={cn(
                        "text-left text-xs px-3 py-2 rounded-lg border transition-all truncate font-medium",
                        selectedProducts.includes(p)
                          ? "bg-gradient-to-r from-[#d4af37] to-[#b8962e] text-black border-[#D4AF37] shadow-sm"
                          : "bg-gray-50 text-gray-600 border-gray-200 hover:border-[#D4AF37]/40 hover:bg-[#faf8f2]"
                      )}
                      title={p}
                    >
                      {selectedProducts.includes(p) && <CheckCircle2 className="h-3 w-3 inline mr-1 shrink-0" />}
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Pricing + Validity + Duration */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-widest text-[#b8962e]">Original Price</label>
                <div className="flex h-10 rounded-xl border border-gray-200 bg-white overflow-hidden focus-within:border-[#D4AF37] focus-within:ring-2 focus-within:ring-[#D4AF37]/12">
                  <span className="flex items-center px-3 text-xs font-bold text-[#D4AF37] bg-[#111118] border-r border-gray-200 shrink-0">₹</span>
                  <input type="number" placeholder="5000" value={newPkg.originalPrice}
                    onChange={e => setNewPkg(p => ({ ...p, originalPrice: e.target.value }))}
                    className="flex-1 px-3 text-sm bg-transparent outline-none placeholder:text-gray-400" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-widest text-[#b8962e]">Package Price</label>
                <div className="flex h-10 rounded-xl border border-gray-200 bg-white overflow-hidden focus-within:border-[#D4AF37] focus-within:ring-2 focus-within:ring-[#D4AF37]/12">
                  <span className="flex items-center px-3 text-xs font-bold text-[#D4AF37] bg-[#111118] border-r border-gray-200 shrink-0">₹</span>
                  <input type="number" placeholder="3999" value={newPkg.discountedPrice}
                    onChange={e => setNewPkg(p => ({ ...p, discountedPrice: e.target.value }))}
                    className="flex-1 px-3 text-sm bg-transparent outline-none placeholder:text-gray-400" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-widest text-[#b8962e]">Validity (days)</label>
                <div className="flex h-10 rounded-xl border border-gray-200 bg-white overflow-hidden focus-within:border-[#D4AF37] focus-within:ring-2 focus-within:ring-[#D4AF37]/12">
                  <span className="flex items-center px-3 text-xs font-bold text-white/80 bg-[#111118] border-r border-gray-200 shrink-0">Days</span>
                  <input type="number" placeholder="30" value={newPkg.validityDays}
                    onChange={e => setNewPkg(p => ({ ...p, validityDays: e.target.value }))}
                    className="flex-1 px-3 text-sm bg-transparent outline-none placeholder:text-gray-400" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-widest text-[#b8962e]">Duration (minutes)</label>
                <div className="flex h-10 rounded-xl border border-gray-200 bg-white overflow-hidden focus-within:border-[#D4AF37] focus-within:ring-2 focus-within:ring-[#D4AF37]/12">
                  <span className="flex items-center px-3 text-xs font-bold text-white/80 bg-[#111118] border-r border-gray-200 shrink-0">Min</span>
                  <input type="number" placeholder="120" value={newPkg.duration}
                    onChange={e => setNewPkg(p => ({ ...p, duration: e.target.value }))}
                    className="flex-1 px-3 text-sm bg-transparent outline-none placeholder:text-gray-400" />
                </div>
              </div>
            </div>

            {/* Savings pill */}
            {newPkg.originalPrice && newPkg.discountedPrice && Number(newPkg.originalPrice) > Number(newPkg.discountedPrice) && (
              <div className="flex items-center gap-2 rounded-xl border border-[#D4AF37]/20 bg-[#D4AF37]/8 px-4 py-2.5">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-[#9a7d20]" />
                <p className="text-xs font-semibold text-[#9a7d20]">
                  {Math.round(((Number(newPkg.originalPrice) - Number(newPkg.discountedPrice)) / Number(newPkg.originalPrice)) * 100)}% off — clients save ₹{(Number(newPkg.originalPrice) - Number(newPkg.discountedPrice)).toLocaleString()}
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-white">
            <Button variant="outline" className="rounded-xl h-9 text-sm border-gray-200" onClick={resetCreateForm}>Cancel</Button>
            <Button
              className="h-9 rounded-xl bg-[#111118] px-5 text-sm font-bold text-[#D4AF37] hover:bg-[#1a1a1a] disabled:opacity-40"
              onClick={() => void handleCreatePackage()}
              disabled={!newPkg.name.trim() || selectedServices.length === 0}
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" /> Create Package
            </Button>
          </div>
        </div>
      )}

      {/* Package Cards Grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {paginatedPackages.map((pkg, i) => (
          <motion.div
            key={pkg.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04, duration: 0.35 }}
            className={cn(
              "group relative flex flex-col overflow-hidden rounded-xl border bg-white transition-all duration-300",
              pkg.active
                ? "border-black/[0.07] shadow-sm hover:shadow-[0_12px_32px_rgba(17,17,24,0.08)] hover:-translate-y-0.5"
                : "border-black/[0.06] opacity-60",
            )}
          >
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#D4AF37]/50 to-transparent" />
            <div className="flex flex-1 flex-col p-4">
              {/* Package Header */}
              <div className="mb-3">
                <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
                  <Badge className={cn("border text-[10px] font-semibold", CATEGORY_STYLES[pkg.category].color)}>
                    {CATEGORY_STYLES[pkg.category].label}
                  </Badge>
                  {pkg.isPopular && (
                    <Badge className="border border-[#D4AF37]/25 bg-[#D4AF37]/10 text-[10px] font-semibold text-[#9a7d20]">
                      <Star className="mr-0.5 h-2.5 w-2.5 fill-[#D4AF37] text-[#D4AF37]" /> Popular
                    </Badge>
                  )}
                  {pkg.isSeasonal && (
                    <Badge className="border border-[#D4AF37]/20 bg-[#faf9f7] text-[10px] font-semibold text-[#B8962E]">
                      <Sparkles className="mr-0.5 h-2.5 w-2.5" /> Seasonal
                    </Badge>
                  )}
                  {!pkg.active && (
                    <Badge className="border border-red-200 bg-red-50 text-[10px] font-semibold text-red-500">Inactive</Badge>
                  )}
                </div>
                <h3 className="text-[13px] font-bold leading-tight text-[#111118]">{pkg.name}</h3>
                <p className="mt-0.5 line-clamp-2 text-[11px] text-[#52525b]">{pkg.description}</p>
              </div>

              {/* Services Included */}
              <div className="mb-3">
                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#52525b]">Includes</p>
                <div className="flex flex-wrap gap-1">
                  {pkg.services.slice(0, 3).map(s => (
                    <span key={s} className="rounded-md border border-black/[0.06] bg-[#faf9f7] px-2 py-0.5 text-[10px] text-[#111118]">
                      {s}
                    </span>
                  ))}
                  {pkg.services.length > 3 && (
                    <span className="px-1.5 py-0.5 text-[10px] font-medium text-[#52525b]">+{pkg.services.length - 3} more</span>
                  )}
                </div>
              </div>

              {/* Price & Details */}
              <div className="mb-3 border-t border-black/[0.06] pt-3">
                <div className="flex items-end justify-between">
                  <div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-lg font-bold text-[#111118]">₹{pkg.discountedPrice.toLocaleString()}</span>
                      <span className="text-[11px] text-[#52525b] line-through">₹{pkg.originalPrice.toLocaleString()}</span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <span className="rounded-md bg-[#D4AF37]/10 px-1.5 py-0.5 text-[10px] font-bold text-[#9a7d20]">{pkg.discountPct}% off</span>
                      <span className="text-[10px] text-[#52525b]">
                        <Clock className="mr-0.5 inline h-3 w-3" />{pkg.duration} min
                      </span>
                      <span className="text-[10px] text-[#52525b]">{pkg.validityDays}d validity</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-[#52525b]">Bookings</p>
                    <p className="text-sm font-bold text-[#111118]">{pkg.bookings}</p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="mt-auto flex gap-2">
                <Button
                  size="sm"
                  className="h-8 flex-1 rounded-lg bg-[#111118] text-[11px] text-[#D4AF37] hover:bg-[#1a1a1a]"
                  onClick={() => setPreview(pkg)}
                >
                  <Eye className="mr-1 h-3.5 w-3.5" /> View
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 rounded-lg border-black/[0.08] text-[11px] hover:border-[#D4AF37]/40 hover:bg-[#faf9f7]"
                  onClick={() => setEditPkg({ ...pkg })}
                >
                  <Edit2 className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className={cn(
                    "h-8 rounded-lg text-[11px]",
                    pkg.active
                      ? "border-black/[0.08] hover:border-red-200 hover:bg-red-50"
                      : "border-[#D4AF37]/30 text-[#9a7d20] hover:bg-[#D4AF37]/5",
                  )}
                  onClick={() => toggleActive(pkg.id)}
                >
                  {pkg.active ? <X className="h-3.5 w-3.5 text-red-500" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                </Button>
              </div>
            </div>
          </motion.div>
        ))}

        {/* Add Package Card */}
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="flex min-h-[180px] flex-col items-center justify-center gap-2.5 rounded-xl border-2 border-dashed border-[#D4AF37]/25 bg-[#faf9f7]/50 p-4 text-center transition-all hover:border-[#D4AF37]/50 hover:bg-[#D4AF37]/5"
        >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#D4AF37]/20 bg-white">
              <Plus className="h-5 w-5 text-[#D4AF37]" />
            </div>
            <div>
              <p className="text-[13px] font-semibold text-[#111118]">Create New Package</p>
              <p className="mt-0.5 text-[11px] text-[#52525b]">Bundle services for better value</p>
            </div>
          </button>
      </div>

      {filtered.length > 0 && (
        <Pagination
          page={packagesPagination.page}
          pageSize={packagesPagination.pageSize}
          totalRecords={filtered.length}
          onPageChange={packagesPagination.setPage}
          onPageSizeChange={packagesPagination.setPageSize}
        />
      )}

      {/* Preview Modal */}
      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" onClick={() => setPreview(null)}>
          <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between bg-[#111118] px-5 py-4">
              <div className="min-w-0 flex-1 pr-4">
                <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
                  <Badge className={cn("border text-[10px]", CATEGORY_STYLES[preview.category].color)}>
                    {CATEGORY_STYLES[preview.category].label}
                  </Badge>
                  {preview.isPopular && (
                    <Badge className="border border-[#D4AF37]/25 bg-[#D4AF37]/15 text-[10px] text-[#D4AF37]">Popular</Badge>
                  )}
                </div>
                <h2 className="text-[15px] font-bold text-white">{preview.name}</h2>
                <p className="mt-0.5 text-[12px] text-white/50">{preview.description}</p>
              </div>
              <button
                type="button"
                onClick={() => setPreview(null)}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10 transition-colors hover:bg-white/20"
              >
                <X className="h-4 w-4 text-white/70" />
              </button>
            </div>

            <div className="p-5">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[#52525b]">
                Services Included ({preview.services.length})
              </p>
              <div className="mb-4 max-h-40 space-y-1.5 overflow-y-auto">
                {preview.services.map(s => (
                  <div key={s} className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-[#D4AF37]" />
                    <span className="text-[13px] text-[#111118]">{s}</span>
                  </div>
                ))}
              </div>

              <div className="mb-4 rounded-xl border border-[#D4AF37]/15 bg-[#faf9f7] p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold text-[#111118]">₹{preview.discountedPrice.toLocaleString()}</p>
                    <p className="text-[13px] text-[#52525b] line-through">₹{preview.originalPrice.toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-[#9a7d20]">{preview.discountPct}% OFF</p>
                    <p className="text-[11px] text-[#52525b]">
                      Save ₹{(preview.originalPrice - preview.discountedPrice).toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-4 border-t border-black/[0.06] pt-3">
                  <span className="text-[11px] text-[#52525b]"><Clock className="mr-1 inline h-3 w-3" />{preview.duration} minutes</span>
                  <span className="text-[11px] text-[#52525b]">Valid {preview.validityDays} days</span>
                  <span className="text-[11px] text-[#52525b]">{preview.bookings} bookings</span>
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" className="h-9 flex-1 rounded-xl border-black/[0.08]" onClick={() => setPreview(null)}>Close</Button>
                <Button
                  className="h-9 flex-1 rounded-xl bg-[#111118] text-[#D4AF37] hover:bg-[#1a1a1a]"
                  onClick={() => { setPreview(null); navigate("/appointments"); }}
                >
                  Book This Package
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Package Dialog ── */}
      {editPkg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white rounded-2xl overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="bg-[#111118] px-6 py-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-[#d4af37]/15 border border-[#d4af37]/20 flex items-center justify-center">
                  <Edit2 className="h-4 w-4 text-[#d4af37]" />
                </div>
                <div>
                  <p className="text-white font-bold text-[14px]">Edit Package</p>
                  <p className="text-gray-500 text-[11px] mt-0.5 truncate max-w-[200px]">{editPkg.name}</p>
                </div>
              </div>
              <button onClick={() => setEditPkg(null)} className="h-8 w-8 rounded-lg bg-white/06 hover:bg-white/12 flex items-center justify-center text-gray-400 hover:text-white transition-all text-lg">×</button>
            </div>

            <div className="px-6 py-5 space-y-4 max-h-[65vh] overflow-y-auto">
              {/* Name */}
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Package Name <span className="text-[#d4af37]">*</span></p>
                <input value={editPkg.name} onChange={e => setEditPkg(p => p && ({ ...p, name: e.target.value }))}
                  className="w-full h-10 px-3.5 rounded-xl border border-gray-200 bg-gray-50 text-[13px] text-[#111118] focus:outline-none focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/12 focus:bg-white transition-all" />
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Description</p>
                <textarea rows={2} value={editPkg.description} onChange={e => setEditPkg(p => p && ({ ...p, description: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-[13px] text-[#111118] resize-none focus:outline-none focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/12 focus:bg-white transition-all" />
              </div>

              {/* Prices */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Original Price (₹)</p>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[13px] text-gray-400">₹</span>
                    <input type="number" value={editPkg.originalPrice} onChange={e => setEditPkg(p => p && ({ ...p, originalPrice: Number(e.target.value) }))}
                      className="w-full h-10 pl-8 pr-3.5 rounded-xl border border-gray-200 bg-gray-50 text-[13px] text-[#111118] focus:outline-none focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/12 focus:bg-white transition-all" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Offer Price (₹)</p>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[13px] text-gray-400">₹</span>
                    <input type="number" value={editPkg.discountedPrice} onChange={e => setEditPkg(p => p && ({ ...p, discountedPrice: Number(e.target.value) }))}
                      className="w-full h-10 pl-8 pr-3.5 rounded-xl border border-gray-200 bg-gray-50 text-[13px] text-[#111118] focus:outline-none focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/12 focus:bg-white transition-all" />
                  </div>
                </div>
              </div>

              {/* Duration + Validity */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Duration (mins)</p>
                  <input type="number" value={editPkg.duration} onChange={e => setEditPkg(p => p && ({ ...p, duration: Number(e.target.value) }))}
                    className="w-full h-10 px-3.5 rounded-xl border border-gray-200 bg-gray-50 text-[13px] text-[#111118] focus:outline-none focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/12 focus:bg-white transition-all" />
                </div>
                <div className="space-y-1.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Validity (days)</p>
                  <input type="number" value={editPkg.validityDays} onChange={e => setEditPkg(p => p && ({ ...p, validityDays: Number(e.target.value) }))}
                    className="w-full h-10 px-3.5 rounded-xl border border-gray-200 bg-gray-50 text-[13px] text-[#111118] focus:outline-none focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/12 focus:bg-white transition-all" />
                </div>
              </div>

              {/* Services list (editable as comma-separated) */}
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Services <span className="normal-case font-normal text-gray-400">(comma separated)</span></p>
                <textarea rows={2} value={editPkg.services.join(", ")}
                  onChange={e => setEditPkg(p => p && ({ ...p, services: e.target.value.split(",").map(s => s.trim()).filter(Boolean) }))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-[13px] text-[#111118] resize-none focus:outline-none focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/12 focus:bg-white transition-all" />
              </div>

              {/* Popular toggle */}
              <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-gray-50 border border-gray-100">
                <p className="text-[13px] font-semibold text-[#111118]">Mark as Popular</p>
                <button onClick={() => setEditPkg(p => p && ({ ...p, isPopular: !p.isPopular }))}
                  className={`h-6 w-11 rounded-full transition-all relative ${editPkg.isPopular ? "bg-[#d4af37]" : "bg-gray-200"}`}>
                  <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${editPkg.isPopular ? "left-[22px]" : "left-0.5"}`} />
                </button>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-black/[0.06] bg-white flex items-center justify-end gap-2">
              <button onClick={() => setEditPkg(null)}
                className="h-10 px-5 rounded-xl border border-black/[0.08] bg-white text-[13px] font-semibold text-[#3f3f46] hover:bg-[#faf9f7] transition-all">
                Cancel
              </button>
              <button onClick={() => void saveEdit()}
                disabled={!editPkg.name.trim() || savingEdit}
                className="h-10 px-6 rounded-xl bg-[#111118] text-[13px] font-bold text-[#D4AF37] disabled:opacity-40 transition-all flex items-center gap-2">
                <Edit2 className="h-4 w-4" /> {savingEdit ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
