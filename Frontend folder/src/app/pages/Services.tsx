import { useMemo, useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router";
import { toast } from "../components/ui/hot-toast";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "../components/ui/select";
import {
  Dialog, DialogContent, DialogTitle,
} from "../components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/ui/tabs";
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "../components/ui/table";
import {
  Scissors, Crown, Plus, Search, Clock,
  IndianRupee, Star, Pencil, Trash2, Tag, Package, X, CheckCircle, Loader2,
} from "lucide-react";
import {
  createService,
  fetchServices,
  updateService,
  type ServiceGender,
  type ServiceRecord,
} from "../../api/services";
import { fetchSalonPlans } from "../../api/plans";
import { fetchServiceCategories, type ServiceCategory, createServiceCategory, updateServiceCategory, deleteServiceCategory } from "../../api/service-categories";
import { getApiErrorMessage } from "../../lib/api";

import { Packages } from "./Packages";
import { CouponsSection } from "./CouponsSection";
import { BulkUploadServices, type BulkServiceRow } from "../components/shared/BulkUploadServices";
import { ServiceProductLinksModal } from "../components/shared/ServiceProductLinksModal";
import { useServiceProducts } from "../context/ServiceProductsContext";
import { useRole } from "../context/RoleContext";
import { Upload } from "lucide-react";
import { Pagination } from "../components/shared/Pagination";
import { PageStatCard } from "../components/shared/PageStatCard";
import { useTablePagination } from "../hooks/useTablePagination";
import { SEGMENTED_PILL_LIST, SEGMENTED_PILL_TRIGGER } from "../components/layout/segmented-nav";
// Incentive Settings UI removed from this page — IncentivesContext, the
// serviceIncentiveSeed data, and ServiceIncentiveFields.tsx itself are
// untouched and still used by the Appointments billing flow.

type ServiceRow = ServiceRecord & {
  category: string;
  color: string;
  memberPrice: number;
  popularity: number;
};

type EditingState = {
  id: string;
  displayName: string;
  serviceGroup: string;
  categoryId: string;
  duration: number;
  price: number;
  memberPrice: number;
  popularity: number;
  gender: ServiceGender;
  status: "active" | "inactive";
  description: string;
};

const currency = (n: number) =>
  `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

function getCategoryColor(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes("men") || lower.includes("male")) return "from-blue-500 to-blue-700";
  if (lower.includes("women") || lower.includes("female")) return "from-[#d4af37] to-[#1a1a1a]";
  if (lower.includes("spa") || lower.includes("wellness")) return "from-green-500 to-green-700";
  if (lower.includes("kid")) return "from-pink-500 to-pink-700";
  if (lower.includes("bridal")) return "from-yellow-500 to-yellow-700";
  return "from-purple-500 to-purple-700";
}

function resolveCategoryId(categoryLabel: string, categories: ServiceCategory[]): string | null {
  const exact = categories.find((c) => c.name.toLowerCase() === categoryLabel.toLowerCase());
  if (exact) return exact.id;

  const lower = categoryLabel.toLowerCase();
  const heuristics: Record<string, string[]> = {
    male: ["men", "male", "hair"],
    female: ["women", "female", "spa"],
    others: ["kid", "child"],
  };
  const hints = heuristics[lower] ?? [lower];
  for (const hint of hints) {
    const match = categories.find((c) => c.name.toLowerCase().includes(hint));
    if (match) return match.id;
  }
  return categories[0]?.id ?? null;
}

const emptyForm = {
  displayName: "",
  serviceGroup: "",
  categoryId: "",
  duration: "",
  price: "",
  memberPrice: "",
  description: "",
  gender: "UNISEX" as ServiceGender,
  status: "active" as "active" | "inactive",
};

export function Services() {
  const { role } = useRole();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = searchParams.get("tab");
  const [mainTab, setMainTab] = useState(
    tabFromUrl === "packages" || tabFromUrl === "coupons"
      ? tabFromUrl
      : "categories",
  );

  useEffect(() => {
    if (tabFromUrl === "packages" || tabFromUrl === "coupons") {
      setMainTab(tabFromUrl);
    }
  }, [tabFromUrl]);

  const handleMainTabChange = (value: string) => {
    setMainTab(value);
    setSearchParams(value === "categories" ? {} : { tab: value }, { replace: true });
  };

  const { getLinks } = useServiceProducts();
  const [services, setServices] = useState<ServiceRecord[]>([]);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [genderFilter, setGenderFilter] = useState<"all" | "MALE" | "FEMALE" | "UNISEX">("all");
  const [showAdd, setShowAdd] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState<EditingState | null>(null);
  const [productLinks, setProductLinks] = useState<{ serviceId: string; serviceName: string } | null>(null);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ServiceCategory | null>(null);
  const [categoryForm, setCategoryForm] = useState({
    name: "",
    description: "",
    status: "active" as "active" | "inactive",
  });
  const [activePackageCount, setActivePackageCount] = useState(0);

  const emptyCategoryForm = {
    name: "",
    description: "",
    status: "active" as "active" | "inactive",
  };

  const loadServices = useCallback(async () => {
    setLoading(true);
    try {
      const [servicesData, categoriesData, plansData] = await Promise.all([
        fetchServices({ limit: 1000, sort: "createdAt" }),
        fetchServiceCategories(),
        fetchSalonPlans(),
      ]);
      setServices(servicesData.items);
      setCategories(categoriesData);
      setActivePackageCount(
        plansData.filter((plan) => plan.planType === "package" && plan.isActive).length,
      );
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to load services"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadServices();
  }, [loadServices]);

  // 300ms debounce for management search
  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(searchInput), 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    services.forEach((s) => {
      counts[s.categoryId] = (counts[s.categoryId] ?? 0) + 1;
    });
    return counts;
  }, [services]);

  const totalServices = services.length;

  const allServicesFlat = useMemo<ServiceRow[]>(
    () =>
      services.map((s) => ({
        ...s,
        category: s.categoryName,
        color: getCategoryColor(s.categoryName),
        memberPrice: s.memberPrice ?? Math.round(s.price * 0.88),
        popularity: s.popularity ?? 0,
      })),
    [services],
  );

  const mostPopular = useMemo(
    () => allServicesFlat.reduce((best, s) => (s.popularity > (best?.popularity ?? -1) ? s : best), allServicesFlat[0]),
    [allServicesFlat]
  );

  const avgPrice = useMemo(() => {
    if (allServicesFlat.length === 0) return 0;
    return Math.round(allServicesFlat.reduce((a, s) => a + s.price, 0) / allServicesFlat.length);
  }, [allServicesFlat]);

  const filteredServices = useMemo(() => {
    const q = search.toLowerCase().trim();
    const rows = allServicesFlat.filter((s) => {
      const matchesSearch =
        !q ||
        s.name.toLowerCase().includes(q) ||
        s.displayName.toLowerCase().includes(q) ||
        (s.serviceGroup ?? "").toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q) ||
        s.serviceCode.toLowerCase().includes(q);
      const matchesCategory = categoryFilter === "all" || s.category === categoryFilter;
      const matchesStatus = statusFilter === "all" || s.status === statusFilter;
      const matchesGender = genderFilter === "all" || s.gender === genderFilter;
      return matchesSearch && matchesCategory && matchesStatus && matchesGender;
    });
    // Newest created first
    return [...rows].sort((a, b) => {
      const aTime = new Date(a.createdAt).getTime();
      const bTime = new Date(b.createdAt).getTime();
      if (aTime !== bTime) return bTime - aTime;
      return a.displayName.localeCompare(b.displayName);
    });
  }, [allServicesFlat, search, categoryFilter, statusFilter, genderFilter]);

  const { page, setPage, pageSize, setPageSize, paginate } = useTablePagination(
    filteredServices.length,
    [search, categoryFilter, statusFilter, genderFilter],
    5,
  );
  const paginatedServices = useMemo(() => paginate(filteredServices), [filteredServices, paginate]);


  async function handleBulkImport(rows: BulkServiceRow[]) {
    setSaving(true);
    let imported = 0;
    let failed = 0;

    for (const row of rows) {
      const categoryId = resolveCategoryId(row.category, categories);
      if (!categoryId) {
        failed += 1;
        continue;
      }

      try {
        const created = await createService({
          displayName: row.service_name,
          categoryId,
          description: row.description,
          duration: row.duration_minutes,
          price: row.price,
          memberPrice: row.member_price,
          status: "active",
        });
        setServices((prev) => [...prev, created]);
        imported += 1;
      } catch {
        failed += 1;
      }
    }

    setSaving(false);
    if (imported > 0) {
      toast.success(`${imported} service${imported === 1 ? "" : "s"} imported`);
    }
    if (failed > 0) {
      toast.error(`${failed} row${failed === 1 ? "" : "s"} could not be imported`);
    }
  }

  function resetAddForm() {
    setForm({ ...emptyForm });
    setShowAdd(false);
  }

  async function handleAddService() {
    if (!form.displayName.trim() || !form.categoryId || !form.duration || !form.price) return;

    const price = Number(form.price);
    const memberPrice = form.memberPrice ? Number(form.memberPrice) : Math.round(price * 0.88);
    const duration = Number(form.duration);

    setSaving(true);
    try {
      const created = await createService({
        displayName: form.displayName.trim(),
        serviceGroup: form.serviceGroup.trim() || undefined,
        categoryId: form.categoryId,
        description: form.description || undefined,
        duration,
        price,
        memberPrice,
        gender: form.gender,
        status: form.status,
      });
      setServices((prev) => [...prev, created]);
      toast.success("Service created", { description: created.displayName });
      resetAddForm();
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to create service"));
    } finally {
      setSaving(false);
    }
  }

  function startEdit(service: ServiceRow) {
    setEditing({
      id: service.id,
      displayName: service.displayName,
      serviceGroup: service.serviceGroup ?? "",
      categoryId: service.categoryId,
      duration: service.duration,
      price: service.price,
      memberPrice: service.memberPrice,
      popularity: service.popularity,
      gender: service.gender,
      status: service.status,
      description: service.description,
    });
  }

  async function saveEdit() {
    if (!editing) return;

    setSaving(true);
    try {
      const updated = await updateService(editing.id, {
        displayName: editing.displayName.trim(),
        serviceGroup: editing.serviceGroup.trim() || null,
        categoryId: editing.categoryId,
        description: editing.description || undefined,
        duration: editing.duration,
        price: editing.price,
        memberPrice: editing.memberPrice,
        popularity: Math.min(100, Math.max(0, Math.round(Number(editing.popularity) || 0))),
        gender: editing.gender,
        status: editing.status,
      });
      setServices((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      toast.success("Service updated", { description: updated.displayName });
      setEditing(null);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to update service"));
    } finally {
      setSaving(false);
    }
  }

  function resetCategoryForm() {
    setCategoryForm({ ...emptyCategoryForm });
    setEditingCategory(null);
  }

  async function handleSaveCategory() {
    if (!categoryForm.name.trim()) return;
    setSaving(true);
    try {
      if (editingCategory) {
        const updated = await updateServiceCategory(editingCategory.id, {
          name: categoryForm.name.trim(),
          description: categoryForm.description || undefined,
          status: categoryForm.status,
        });
        setCategories((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
        toast.success("Category updated", { description: updated.name });
      } else {
        const created = await createServiceCategory({
          name: categoryForm.name.trim(),
          description: categoryForm.description || undefined,
          status: categoryForm.status,
        });
        setCategories((prev) => [...prev, created]);
        toast.success("Category created", { description: created.name });
      }
      resetCategoryForm();
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to save category"));
    } finally {
      setSaving(false);
    }
  }

  function startEditCategory(category: ServiceCategory) {
    setEditingCategory(category);
    setCategoryForm({
      name: category.name,
      description: category.description,
      status: category.status,
    });
  }

  async function handleDeleteCategory(category: ServiceCategory) {
    try {
      await deleteServiceCategory(category.id);
      setCategories((prev) => prev.filter((c) => c.id !== category.id));
      toast.success("Category deleted", { description: category.name });
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to delete category"));
    }
  }

  return (
    <div className="flex h-[calc(100dvh-8rem)] min-h-0 min-w-0 max-w-full flex-col gap-4 overflow-hidden">
      {/* Header */}
      <div className="flex shrink-0 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-[#1a1a1a] to-[#d4af37] bg-clip-text text-transparent">
            Service Management
          </h1>
          <p className="text-muted-foreground mt-1">Manage services, packages, and coupons</p>
        </div>
        <div className="flex gap-2">
          {role !== "admin" && (
            <>
              <Button
                variant="outline"
                className="border-[#d4af37]/50 text-[#9a7a1e] hover:bg-[#d4af37]/08 hover:border-[#d4af37]"
                onClick={() => { resetCategoryForm(); setShowCategoryManager(true); }}
              >
                <Tag className="h-4 w-4 mr-2" />
                Categories
              </Button>
              <Button
                variant="outline"
                className="border-[#d4af37]/50 text-[#9a7a1e] hover:bg-[#d4af37]/08 hover:border-[#d4af37]"
                onClick={() => setShowBulkUpload(true)}
              >
                <Upload className="h-4 w-4 mr-2" />
                Bulk Upload
              </Button>
              <Button
                className="bg-gradient-to-r from-[#111118] to-[#1a1a1a] hover:from-[#1a1a1a] hover:to-[#D4AF37]/80 shadow-lg shadow-[#D4AF37]/20 text-white"
                onClick={() => setShowAdd(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Service
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Laptop/desktop only — tablets and phones prioritize service space. */}
      <div className="hidden shrink-0 gap-3 lg:grid lg:grid-cols-4">
        <PageStatCard label="Total Services" value={String(totalServices)} sub="Across all categories" icon={Scissors} index={0} onClick={() => handleMainTabChange("categories")} />
        <PageStatCard label="Most Popular" value={mostPopular?.displayName ?? "—"} sub={`${mostPopular?.popularity ?? 0}% booking rate`} icon={Star} index={1} onClick={() => handleMainTabChange("categories")} />
        <PageStatCard label="Avg. Service Price" value={currency(avgPrice)} sub="Across all services" icon={IndianRupee} index={2} href="/reports" />
        <PageStatCard label="Active Packages" value={String(activePackageCount)} sub="Combo & bundle deals" icon={Crown} index={3} onClick={() => handleMainTabChange("packages")} />
      </div>

      {/* Main tabbed area */}
      <Tabs value={mainTab} onValueChange={handleMainTabChange} className="min-h-0 flex-1 gap-4 overflow-hidden">
        <TabsList className={`${SEGMENTED_PILL_LIST} shrink-0`}>
          <TabsTrigger value="categories" className={SEGMENTED_PILL_TRIGGER}>
            <Scissors className="h-3.5 w-3.5" />
            Services
          </TabsTrigger>
          <TabsTrigger value="packages" className={SEGMENTED_PILL_TRIGGER}>
            <Crown className="h-3.5 w-3.5" />
            Packages
          </TabsTrigger>
          <TabsTrigger value="coupons" className={SEGMENTED_PILL_TRIGGER}>
            <Tag className="h-3.5 w-3.5" />
            Coupons
          </TabsTrigger>
        </TabsList>

        <TabsContent value="categories" className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
          {/* Filter Bar — search stays full-width on phone/tablet so it never gets squished */}
          <div className="flex w-full min-w-0 shrink-0 flex-col gap-2.5 rounded-2xl border border-black/[0.07] bg-white p-3 shadow-sm lg:flex-row lg:items-center lg:gap-3">
            {/* Search */}
            <div className="relative w-full min-w-0 shrink-0 lg:max-w-sm lg:flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#d4af37]" />
              <input
                placeholder="Search services…"
                value={searchInput}
                onChange={e => { setSearchInput(e.target.value); }}
                className="h-10 w-full rounded-xl border border-gray-200 bg-[#fafaf8] pl-9 pr-3 text-[13px] text-[#111] outline-none transition-all placeholder:text-gray-400 focus:border-[#d4af37]/60 focus:ring-2 focus:ring-[#d4af37]/10"
              />
            </div>

            {/* Filters */}
            <div className="flex w-full min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center lg:flex-1">
              {/* Gender Pills */}
              <div className="flex max-w-full items-center gap-1.5 overflow-x-auto table-scroll pb-0.5">
                {([
                  { key: "all", label: "All" },
                  { key: "MALE", label: "Male" },
                  { key: "FEMALE", label: "Female" },
                  { key: "UNISEX", label: "Unisex" },
                ] as const).map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => { setGenderFilter(key); }}
                    className={`h-9 shrink-0 rounded-xl px-3 text-[12px] font-semibold transition-all ${
                      genderFilter === key
                        ? "bg-[#1a1a1a] text-[#d4af37] shadow-sm"
                        : "bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700"
                    }`}
                  >
                    {label}
                    <span className={`ml-1.5 text-[10px] font-bold ${genderFilter === key ? "text-[#d4af37]/70" : "text-gray-400"}`}>
                      {key === "all"
                        ? allServicesFlat.length
                        : allServicesFlat.filter(s => s.gender === key).length}
                    </span>
                  </button>
                ))}
              </div>

              <div className="flex min-w-0 flex-wrap items-center gap-2">
                {/* Category Dropdown */}
                <div className="relative min-w-0 flex-1 sm:flex-none">
                  <select
                    value={categoryFilter}
                    onChange={e => { setCategoryFilter(e.target.value); }}
                    className={`h-9 w-full max-w-full cursor-pointer appearance-none rounded-xl border pl-3 pr-7 text-[12px] font-medium outline-none transition-all sm:w-auto ${
                      categoryFilter !== "all"
                        ? "border-[#d4af37]/60 bg-amber-50 font-semibold text-[#b8962e]"
                        : "border-gray-200 bg-[#fafaf8] text-[#555] hover:border-gray-300"
                    }`}
                  >
                    <option value="all">All Categories</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.name}>{c.name} ({categoryCounts[c.id] ?? 0})</option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-gray-400">
                    <svg width="10" height="6" viewBox="0 0 10 6" fill="none"><path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </div>
                  {categoryFilter !== "all" && <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-[#d4af37]" />}
                </div>

                {/* Status Dropdown */}
                <div className="relative min-w-0 flex-1 sm:flex-none">
                  <select
                    value={statusFilter}
                    onChange={e => { setStatusFilter(e.target.value as "all" | "active" | "inactive"); }}
                    className={`h-9 w-full cursor-pointer appearance-none rounded-xl border pl-3 pr-7 text-[12px] font-medium outline-none transition-all sm:w-auto ${
                      statusFilter !== "all"
                        ? "border-[#d4af37]/60 bg-amber-50 font-semibold text-[#b8962e]"
                        : "border-gray-200 bg-[#fafaf8] text-[#555] hover:border-gray-300"
                    }`}
                  >
                    <option value="all">All Status</option>
                    <option value="active">Active ({allServicesFlat.filter(s => s.status === "active").length})</option>
                    <option value="inactive">Inactive ({allServicesFlat.filter(s => s.status === "inactive").length})</option>
                  </select>
                  <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-gray-400">
                    <svg width="10" height="6" viewBox="0 0 10 6" fill="none"><path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </div>
                  {statusFilter !== "all" && <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-[#d4af37]" />}
                </div>
              </div>
            </div>
          </div>

          {/* Services Table */}
          <Card className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden shadow-lg">
            <CardHeader className="shrink-0 bg-gradient-to-r from-[#1a1a1a] to-[#2d2d2d] text-white">
              <CardTitle className="flex items-center gap-3">
                All Services
                <Badge variant="secondary" className="ml-auto bg-white/20 text-white border-white/40">
                  {filteredServices.length} of {totalServices}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain p-0">
              <Table
                className="table-fixed"
                containerClassName="no-table-scroll"
              >
                  <TableHeader className="sticky top-0 z-10 bg-gray-50">
                    <TableRow className="bg-gray-50">
                      <TableHead className="w-[34%] whitespace-normal">Service</TableHead>
                      <TableHead className="w-[26%] whitespace-normal">Category</TableHead>
                      <TableHead className="w-[18%] whitespace-normal">Pricing</TableHead>
                      <TableHead className="w-[22%] text-center whitespace-normal">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-10 text-muted-foreground whitespace-normal">
                          <span className="inline-flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin text-[#d4af37]" />
                            Loading services…
                          </span>
                        </TableCell>
                      </TableRow>
                    ) : paginatedServices.map((s) => (
                      <TableRow key={s.id} className="hover:bg-gray-50">
                        <TableCell className="font-medium text-[#1a1a1a] whitespace-normal align-top">
                          <div className="min-w-0">
                            <p className="truncate text-[13px]">{s.displayName}</p>
                            <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] font-normal text-muted-foreground">
                              <span className="inline-flex items-center gap-1">
                                <Clock className="h-3 w-3 shrink-0" />
                                {s.duration} mins
                              </span>
                              <Badge variant="secondary" className="text-[9px] px-1.5 py-0">{s.gender}</Badge>
                              <span className="inline-flex items-center gap-0.5">
                                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                {s.popularity}%
                              </span>
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="whitespace-normal align-top">
                          <div className="min-w-0 flex flex-col gap-1">
                            <Badge variant="outline" className="text-[10px] w-fit max-w-full truncate">
                              {s.category}
                            </Badge>
                            {s.serviceGroup && (
                              <span className="text-[10px] text-muted-foreground truncate">{s.serviceGroup}</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="whitespace-normal align-top">
                          <div className="min-w-0">
                            <p className="text-[13px] font-semibold text-[#1a1a1a]">{currency(s.price)}</p>
                            <p className="text-[11px] font-semibold text-[#d4af37]">
                              Member {currency(s.memberPrice)}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="text-center whitespace-normal align-middle">
                          <div className="flex items-center justify-center gap-1.5 flex-wrap">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 w-8 p-0 border-[#1a1a1a]/20 hover:border-[#1a1a1a]"
                              onClick={() => startEdit(s)}
                              disabled={saving}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              title="Manage product links"
                              className="h-8 w-8 p-0 border-[#d4af37]/40 text-[#b8962e] hover:bg-[#d4af37]/10 relative"
                              onClick={() => setProductLinks({ serviceId: s.id, serviceName: s.displayName })}
                            >
                              <Package className="h-3.5 w-3.5" />
                              {getLinks(s.id).length > 0 && (
                                <span className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-[#d4af37] text-[8px] font-bold text-black flex items-center justify-center">
                                  {getLinks(s.id).length}
                                </span>
                              )}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {!loading && filteredServices.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-10 text-muted-foreground whitespace-normal">
                          No services found matching your search.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              <Pagination
                page={page}
                pageSize={pageSize}
                totalRecords={filteredServices.length}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="packages" className="min-h-0 overflow-y-auto overscroll-contain pr-1">
          <Packages />
        </TabsContent>

        <TabsContent value="coupons" className="min-h-0 overflow-y-auto overscroll-contain pr-1">
          <CouponsSection />
        </TabsContent>
      </Tabs>

      {/* Add Service Dialog */}
      <Dialog open={showAdd} onOpenChange={(open) => (open ? setShowAdd(true) : resetAddForm())}>
        <DialogContent className="w-[min(95vw,36rem)] max-w-none p-0 gap-0 overflow-hidden rounded-2xl [&>button:last-of-type]:hidden">
          {/* Header */}
          <div className="bg-[#111118] px-6 py-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-[#d4af37]/15 border border-[#d4af37]/20 flex items-center justify-center">
                <Scissors className="h-5 w-5 text-[#d4af37]" />
              </div>
              <div>
                <p className="text-white font-bold text-[14px] leading-tight">Add New Service</p>
                <p className="text-gray-500 text-[11px] mt-0.5">Create a service with pricing and duration</p>
              </div>
            </div>
            <button onClick={resetAddForm} className="h-8 w-8 rounded-lg bg-white/06 hover:bg-white/12 flex items-center justify-center text-gray-400 hover:text-white transition-all text-lg leading-none">×</button>
          </div>

          <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
            {/* Display name */}
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Display Name <span className="text-[#d4af37]">*</span></p>
              <input
                placeholder="e.g. Cheeks"
                value={form.displayName}
                onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
                className="w-full h-10 px-3.5 rounded-xl border border-gray-200 bg-gray-50 text-[13px] text-[#111118] focus:outline-none focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/12 focus:bg-white transition-all placeholder:text-gray-300"
              />
            </div>

            {/* Category + Group */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Category <span className="text-[#d4af37]">*</span></p>
                <Select value={form.categoryId} onValueChange={(v) => setForm((f) => ({ ...f, categoryId: v }))}>
                  <SelectTrigger className="h-10 rounded-xl border-gray-200 bg-gray-50 text-[13px] focus:border-[#d4af37] focus:ring-[#d4af37]/12">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Service Group</p>
                <input
                  placeholder="e.g. Face"
                  value={form.serviceGroup}
                  onChange={(e) => setForm((f) => ({ ...f, serviceGroup: e.target.value }))}
                  className="w-full h-10 px-3.5 rounded-xl border border-gray-200 bg-gray-50 text-[13px] text-[#111118] focus:outline-none focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/12 focus:bg-white transition-all placeholder:text-gray-300"
                />
              </div>
            </div>

            {/* Gender + Duration */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Gender</p>
                <Select value={form.gender} onValueChange={(v) => setForm((f) => ({ ...f, gender: v as ServiceGender }))}>
                  <SelectTrigger className="h-10 rounded-xl border-gray-200 bg-gray-50 text-[13px] focus:border-[#d4af37] focus:ring-[#d4af37]/12">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MALE">Male</SelectItem>
                    <SelectItem value="FEMALE">Female</SelectItem>
                    <SelectItem value="UNISEX">Unisex</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Duration (mins) <span className="text-[#d4af37]">*</span></p>
                <div className="relative">
                  <Clock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
                  <input
                    type="number"
                    placeholder="30"
                    value={form.duration}
                    onChange={(e) => setForm((f) => ({ ...f, duration: e.target.value }))}
                    className="w-full h-10 pl-9 pr-3.5 rounded-xl border border-gray-200 bg-gray-50 text-[13px] text-[#111118] focus:outline-none focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/12 focus:bg-white transition-all placeholder:text-gray-300"
                  />
                </div>
              </div>
            </div>

            {/* Price + Member Price */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Price (₹) <span className="text-[#d4af37]">*</span></p>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[13px] text-gray-400">₹</span>
                  <input
                    type="number"
                    placeholder="499"
                    value={form.price}
                    onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                    className="w-full h-10 pl-8 pr-3.5 rounded-xl border border-gray-200 bg-gray-50 text-[13px] font-semibold text-[#111118] focus:outline-none focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/12 focus:bg-white transition-all placeholder:font-normal placeholder:text-gray-300"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Member Price (₹) <span className="text-gray-400 normal-case font-normal">optional</span></p>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[13px] text-gray-400">₹</span>
                  <input
                    type="number"
                    placeholder={form.price ? `~${Math.round(Number(form.price) * 0.88)}` : "Auto ~12% off"}
                    value={form.memberPrice}
                    onChange={(e) => setForm((f) => ({ ...f, memberPrice: e.target.value }))}
                    className="w-full h-10 pl-8 pr-3.5 rounded-xl border border-gray-200 bg-gray-50 text-[13px] text-[#111118] focus:outline-none focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/12 focus:bg-white transition-all placeholder:text-gray-300"
                  />
                </div>
              </div>
            </div>

            {/* Price preview badge */}
            {form.price && form.memberPrice && (
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#d4af37]/08 border border-[#d4af37]/15">
                <Tag className="h-3.5 w-3.5 text-[#d4af37] shrink-0" />
                <p className="text-[12px] text-[#9a7d20] font-semibold">
                  Members save ₹{(Number(form.price) - Number(form.memberPrice)).toLocaleString()}
                  {" "}({Math.round(((Number(form.price) - Number(form.memberPrice)) / Number(form.price)) * 100)}% off)
                </p>
              </div>
            )}

            {/* Description */}
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Description <span className="text-gray-400 normal-case font-normal">optional</span></p>
              <textarea
                rows={2}
                placeholder="Brief description shown to clients..."
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-[13px] text-[#111118] resize-none focus:outline-none focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/12 focus:bg-white transition-all placeholder:text-gray-300"
              />
            </div>

            {/* Status */}
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Status</p>
              <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v as "active" | "inactive" }))}>
                <SelectTrigger className="h-10 rounded-xl border-gray-200 bg-gray-50 text-[13px] focus:border-[#d4af37] focus:ring-[#d4af37]/12">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>

          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/60 flex items-center justify-end gap-2">
            <button onClick={resetAddForm}
              className="h-10 px-5 rounded-xl border border-gray-200 bg-white text-[13px] font-semibold text-gray-600 hover:bg-gray-50 transition-all">
              Cancel
            </button>
            <button
              onClick={() => void handleAddService()}
              disabled={saving || !form.displayName.trim() || !form.categoryId || !form.duration || !form.price}
              className="h-10 px-6 rounded-xl bg-gradient-to-r from-[#d4af37] to-[#b8962e] text-[13px] font-bold text-black disabled:opacity-40 transition-all flex items-center gap-2 shadow-md shadow-[#d4af37]/20">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {saving ? "Saving…" : "Add Service"}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Service Dialog */}
      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="sm:max-w-lg p-0 gap-0 overflow-hidden rounded-2xl [&>button:last-of-type]:hidden">
          {/* Dark header */}
          <div className="bg-[#111118] px-6 py-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-[#d4af37]/15 border border-[#d4af37]/20 flex items-center justify-center shrink-0">
                <Scissors className="h-4 w-4 text-[#D4AF37]" />
              </div>
              <div>
                <DialogTitle className="text-[15px] font-bold text-white leading-tight">Edit Service</DialogTitle>
                <p className="text-[11px] text-white/40 mt-0.5">{editing?.displayName}</p>
              </div>
            </div>
            <button onClick={() => setEditing(null)} className="h-7 w-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
              <X className="h-3.5 w-3.5 text-white/70" />
            </button>
          </div>

          {editing && (
            <div className="px-6 py-5 bg-[#faf8f2] space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-widest text-[#b8962e]">Display Name</label>
                <Input
                  value={editing.displayName}
                  onChange={(e) => setEditing((cur) => cur && { ...cur, displayName: e.target.value })}
                  className="h-10 px-3.5 rounded-xl border border-gray-200 bg-white focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/12"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-widest text-[#b8962e]">Category</label>
                  <Select
                    value={editing.categoryId}
                    onValueChange={(v) => setEditing((cur) => cur && { ...cur, categoryId: v })}
                  >
                    <SelectTrigger className="h-10 rounded-xl border-gray-200 bg-white text-[13px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-widest text-[#b8962e]">Service Group</label>
                  <Input
                    value={editing.serviceGroup}
                    onChange={(e) => setEditing((cur) => cur && { ...cur, serviceGroup: e.target.value })}
                    placeholder="e.g. Face"
                    className="h-10 px-3.5 rounded-xl border border-gray-200 bg-white focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/12"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-widest text-[#b8962e]">Gender</label>
                  <Select
                    value={editing.gender}
                    onValueChange={(v) => setEditing((cur) => cur && { ...cur, gender: v as ServiceGender })}
                  >
                    <SelectTrigger className="h-10 rounded-xl border-gray-200 bg-white text-[13px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MALE">Male</SelectItem>
                      <SelectItem value="FEMALE">Female</SelectItem>
                      <SelectItem value="UNISEX">Unisex</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-widest text-[#b8962e]">Status</label>
                  <Select
                    value={editing.status}
                    onValueChange={(v) => setEditing((cur) => cur && { ...cur, status: v as "active" | "inactive" })}
                  >
                    <SelectTrigger className="h-10 rounded-xl border-gray-200 bg-white text-[13px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-widest text-[#b8962e]">Duration</label>
                  <div className="flex h-10 rounded-xl border border-gray-200 bg-white overflow-hidden focus-within:border-[#d4af37] focus-within:ring-2 focus-within:ring-[#d4af37]/12">
                    <span className="flex items-center px-3 text-xs font-bold text-[#d4af37] bg-[#111118] border-r border-gray-200 shrink-0">Min</span>
                    <input
                      type="number"
                      value={editing.duration}
                      onChange={(e) => setEditing((cur) => cur && { ...cur, duration: Number(e.target.value) })}
                      className="flex-1 px-3 text-sm bg-transparent outline-none text-gray-800"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-widest text-[#b8962e]">Popularity</label>
                  <div className="flex h-10 rounded-xl border border-gray-200 bg-white overflow-hidden focus-within:border-[#d4af37] focus-within:ring-2 focus-within:ring-[#d4af37]/12">
                    <span className="flex items-center px-3 text-xs font-bold text-[#d4af37] bg-[#111118] border-r border-gray-200 shrink-0">%</span>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={editing.popularity}
                      onChange={(e) =>
                        setEditing((cur) =>
                          cur && {
                            ...cur,
                            popularity: Math.min(100, Math.max(0, Number(e.target.value) || 0)),
                          },
                        )
                      }
                      className="flex-1 px-3 text-sm bg-transparent outline-none text-gray-800"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-widest text-[#b8962e]">Price</label>
                  <div className="flex h-10 rounded-xl border border-gray-200 bg-white overflow-hidden focus-within:border-[#d4af37] focus-within:ring-2 focus-within:ring-[#d4af37]/12">
                    <span className="flex items-center px-3 text-xs font-bold text-[#d4af37] bg-[#111118] border-r border-gray-200 shrink-0">₹</span>
                    <input
                      type="number"
                      value={editing.price}
                      onChange={(e) => setEditing((cur) => cur && { ...cur, price: Number(e.target.value) })}
                      className="flex-1 px-3 text-sm bg-transparent outline-none text-gray-800"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-widest text-[#b8962e]">Member Price</label>
                  <div className="flex h-10 rounded-xl border border-gray-200 bg-white overflow-hidden focus-within:border-[#d4af37] focus-within:ring-2 focus-within:ring-[#d4af37]/12">
                    <span className="flex items-center px-3 text-xs font-bold text-[#d4af37] bg-[#111118] border-r border-gray-200 shrink-0">₹</span>
                    <input
                      type="number"
                      value={editing.memberPrice}
                      onChange={(e) => setEditing((cur) => cur && { ...cur, memberPrice: Number(e.target.value) })}
                      className="flex-1 px-3 text-sm bg-transparent outline-none text-gray-800"
                    />
                  </div>
                </div>
              </div>

              {editing.price > editing.memberPrice && (
                <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-50 border border-emerald-200">
                  <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
                  <p className="text-xs text-emerald-700 font-semibold">
                    Members save ₹{(editing.price - editing.memberPrice).toLocaleString()} ({Math.round(((editing.price - editing.memberPrice) / editing.price) * 100)}% off)
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-100 bg-white">
            <Button variant="outline" onClick={() => setEditing(null)} className="rounded-xl h-9 text-sm" disabled={saving}>Cancel</Button>
            <Button onClick={() => void saveEdit()} disabled={saving} className="rounded-xl h-9 text-sm bg-gradient-to-r from-[#d4af37] to-[#b8962e] text-black font-bold hover:opacity-90 px-5">
              {saving ? "Saving…" : "Save Changes"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk Upload Modal */}
      <BulkUploadServices
        open={showBulkUpload}
        onClose={() => setShowBulkUpload(false)}
        onImport={handleBulkImport}
        existingNames={allServicesFlat.map(s => s.name)}
        categoryNames={categories.map((c) => c.name)}
      />

      {productLinks && (
        <ServiceProductLinksModal
          open={!!productLinks}
          serviceId={productLinks.serviceId}
          serviceName={productLinks.serviceName}
          onClose={() => setProductLinks(null)}
        />
      )}

      <Dialog open={showCategoryManager} onOpenChange={(open) => { setShowCategoryManager(open); if (!open) resetCategoryForm(); }}>
        <DialogContent className="sm:max-w-2xl p-0 gap-0 overflow-hidden rounded-2xl [&>button]:hidden">
          <div className="bg-[#111118] px-6 py-5 flex items-center justify-between">
            <div>
              <DialogTitle className="text-white text-[15px] font-bold">Manage Categories</DialogTitle>
              <p className="text-[11px] text-white/40 mt-0.5">Create, edit, and delete service categories</p>
            </div>
            <button onClick={() => { setShowCategoryManager(false); resetCategoryForm(); }} className="h-8 w-8 rounded-lg bg-white/06 hover:bg-white/12 flex items-center justify-center text-gray-400 hover:text-white">×</button>
          </div>

          <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Category Name</p>
                <Input
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Hair"
                  className="h-10 rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Status</p>
                <Select value={categoryForm.status} onValueChange={(v) => setCategoryForm((f) => ({ ...f, status: v as "active" | "inactive" }))}>
                  <SelectTrigger className="h-10 rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Description</p>
              <Input
                value={categoryForm.description}
                onChange={(e) => setCategoryForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Optional description"
                className="h-10 rounded-xl"
              />
            </div>
            <div className="flex justify-end gap-2">
              {editingCategory && (
                <Button variant="outline" onClick={resetCategoryForm} disabled={saving}>Cancel Edit</Button>
              )}
              <Button
                onClick={() => void handleSaveCategory()}
                disabled={saving || !categoryForm.name.trim()}
                className="bg-gradient-to-r from-[#d4af37] to-[#b8962e] text-black font-bold"
              >
                {saving ? "Saving…" : editingCategory ? "Update Category" : "Add Category"}
              </Button>
            </div>

            <div className="rounded-xl border border-black/[0.07] overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead>Name</TableHead>
                    <TableHead>Services</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categories.map((category) => (
                    <TableRow key={category.id}>
                      <TableCell className="font-medium">{category.name}</TableCell>
                      <TableCell>{category.serviceCount}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs capitalize">{category.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="outline" onClick={() => startEditCategory(category)} disabled={saving}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="sm" variant="outline" className="border-red-200 text-red-500 hover:bg-red-50" onClick={() => void handleDeleteCategory(category)} disabled={saving}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {categories.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No categories yet</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
