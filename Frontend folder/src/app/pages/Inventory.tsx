import { useState, useMemo, useEffect, useCallback } from "react";
import { useProducts } from "../context/ProductsContext";
import { useRole, canManageInventoryOps } from "../context/RoleContext";
import { toast } from "../components/ui/hot-toast";
import { cn } from "../components/ui/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Vendors } from "./Vendors";
import {
  Package, Plus, AlertTriangle, TrendingUp, ShoppingCart,
  RefreshCw, Upload, History, Truck, Tag, Receipt,
} from "lucide-react";
import { BulkUploadProducts, type ParsedRow, type ExistingProduct } from "../components/shared/BulkUploadProducts";
import { VendorDirectBillDialog } from "../components/shared/VendorDirectBillDialog";
import { PageStatCard } from "../components/shared/PageStatCard";
import { useTablePagination } from "../hooks/useTablePagination";
import { SEGMENTED_PILL_LIST, SEGMENTED_PILL_TRIGGER } from "../components/layout/segmented-nav";
import {
  financeGoldBtn,
  financeIconWrap,
} from "./finance/finance-ui";
import { istDateKey } from "../../lib/istDate";
import {
  createProduct,
  deleteProduct,
  fetchProduct,
  updateProduct,
} from "../../api/products";
import {
  createProductCategory,
  deleteProductCategory,
  fetchProductCategories,
  updateProductCategory,
  type ProductCategory,
} from "../../api/product-categories";
import { fetchVendors, type VendorRecord } from "../../api/vendors";
import { createStockPurchase, fetchStockPurchases } from "../../api/stock-purchases";
import { createStockAdjustment } from "../../api/stock-adjustments";
import { getApiErrorMessage } from "../../lib/api";
import {
  mapProductRecord,
  mapStockAdjustmentToLog,
  mapStockPurchaseToRow,
  parsePriceInput,
  type PurchaseOrderRow,
} from "../../lib/inventoryMappers";
import type { Product } from "../context/ProductsContext";
import { StockTab } from "./inventory/StockTab";
import { OrdersTab } from "./inventory/OrdersTab";
import { UsageLogTab } from "./inventory/UsageLogTab";
import { AdjustStockModal } from "./inventory/AdjustStockModal";
import { AddProductModal } from "./inventory/AddProductModal";
import { OrderProductModal, StockAlertOrderModal } from "./inventory/OrderProductModal";
import { ViewProductModal } from "./inventory/ViewProductModal";
import { CreatePurchaseOrderModal } from "./inventory/CreatePurchaseOrderModal";
import { ViewPurchaseOrderModal } from "./inventory/ViewPurchaseOrderModal";
import { CategoryManagerDialog } from "./inventory/CategoryManagerDialog";

export function Inventory() {
  const { role } = useRole();
  const canManageInventory = canManageInventoryOps(role);
  const { products, setProducts, stockLog, setStockLog, loading: productsLoading, refresh: refreshProducts } = useProducts();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrderRow[]>([]);
  const [productCategories, setProductCategories] = useState<ProductCategory[]>([]);
  const [vendors, setVendors] = useState<VendorRecord[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const validTabs = ["stock", "vendors", "orders", "log"] as const;
  const tabParam = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("tab") : null;
  const initialTab = validTabs.includes(tabParam as typeof validTabs[number]) ? tabParam! : "stock";

  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [directBillOpen, setDirectBillOpen] = useState(false);

  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ProductCategory | null>(null);
  const [categoryForm, setCategoryForm] = useState({ name: "", description: "", status: "active" as "active" | "inactive" });
  const [isOrderProductOpen, setIsOrderProductOpen] = useState(false);
  const [isViewProductOpen, setIsViewProductOpen] = useState(false);
  const [isCreatePOOpen, setIsCreatePOOpen] = useState(false);
  const [isStockAlertOpen, setIsStockAlertOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedPO, setSelectedPO] = useState<PurchaseOrderRow | null>(null);
  const [isViewPOOpen, setIsViewPOOpen] = useState(false);
  const [stockAlertFilter, setStockAlertFilter] = useState("all");
  const [newProduct, setNewProduct] = useState({
    name: "", sku: "", categoryId: "", brand: "", stock: "", minStock: "", price: "", costPrice: "", vendorId: "", barcode: "", unit: "pcs", gstRate: "",
  });
  const [orderForm, setOrderForm] = useState({ quantity: "", notes: "" });
  const [poForm, setPoForm] = useState({
    vendorId: "", productId: "", quantity: "", unitCost: "", date: istDateKey(), notes: "",
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const emptyProductForm = {
    name: "", sku: "", categoryId: "", brand: "", stock: "", minStock: "", price: "", costPrice: "", vendorId: "", barcode: "", unit: "pcs", gstRate: "",
  };
  const emptyCategoryForm = { name: "", description: "", status: "active" as "active" | "inactive" };
  const [logFilter, setLogFilter] = useState<"all" | "Service Used" | "Retail Sale" | "Manual Adjustment" | "Restock">("all");

  // Manual Adjust modal
  const [adjustTarget, setAdjustTarget] = useState<typeof products[0] | null>(null);
  const [adjustMode, setAdjustMode] = useState<"set" | "add" | "subtract">("set");
  const [adjustValue, setAdjustValue] = useState("");
  const [adjustReason, setAdjustReason] = useState("Manual Count");
  const [adjustNote, setAdjustNote] = useState("");

  const adjustReasons = ["Manual Count", "Wastage", "Damage", "Theft", "Expired", "Returned", "Other"];

  const categoryFilterOptions = useMemo(
    () => ["All", ...productCategories.map((c) => c.name)],
    [productCategories],
  );

  const loadMeta = useCallback(async () => {
    setOrdersLoading(true);
    try {
      const [categories, vendorRows, purchases] = await Promise.all([
        fetchProductCategories(),
        fetchVendors(),
        fetchStockPurchases(),
      ]);
      setProductCategories(categories);
      setVendors(vendorRows);
      setPurchaseOrders(purchases.map(mapStockPurchaseToRow));
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to load inventory metadata"));
    } finally {
      setOrdersLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadMeta();
  }, [loadMeta]);

  useEffect(() => {
    if (isCreatePOOpen || directBillOpen) {
      void loadMeta();
    }
  }, [isCreatePOOpen, directBillOpen, loadMeta]);

  const totalValue = useMemo(() => {
    const sum = products.reduce((acc, p) => acc + p.stock * parsePriceInput(p.costPrice), 0);
    return `₹${sum.toLocaleString("en-IN")}`;
  }, [products]);

  function openAdjust(product: Product) {
    setAdjustTarget(product);
    setAdjustMode("set");
    setAdjustValue(String(product.stock));
    setAdjustReason("Manual Count");
    setAdjustNote("");
  }

  async function handleAdjustConfirm() {
    if (!adjustTarget || saving) return;
    const val = parseInt(adjustValue, 10);
    if (Number.isNaN(val) || val < 0) return;
    let newStock: number;
    if (adjustMode === "set") newStock = val;
    else if (adjustMode === "add") newStock = adjustTarget.stock + val;
    else newStock = Math.max(0, adjustTarget.stock - val);

    const qtyChange = newStock - adjustTarget.stock;
    if (qtyChange === 0) {
      setAdjustTarget(null);
      return;
    }

    const noteStr = `${adjustReason}${adjustNote ? ": " + adjustNote : ""}`;
    setSaving(true);
    try {
      const adjustment = await createStockAdjustment({
        productId: adjustTarget.id,
        quantityChange: qtyChange,
        note: noteStr,
      });
      const updated = await fetchProduct(adjustTarget.id);
      setProducts((prev) => prev.map((p) => (p.id === updated.id ? mapProductRecord(updated) : p)));
      setStockLog((prev) => [mapStockAdjustmentToLog(adjustment), ...prev]);
      toast.success("Stock adjusted");
      setAdjustTarget(null);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to adjust stock"));
    } finally {
      setSaving(false);
    }
  }

  const filteredLog = logFilter === "all" ? stockLog : stockLog.filter(l => l.type === logFilter);

  const filtered = products.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase()) ||
      p.brand.toLowerCase().includes(search.toLowerCase());
    const matchCat = category === "All" || p.category === category;
    const matchAlert = stockAlertFilter === "all" || p.status === stockAlertFilter;
    return matchSearch && matchCat && matchAlert;
  });

  const stockPagination = useTablePagination(filtered.length, [search, category, stockAlertFilter]);
  const paginatedProducts = useMemo(
    () => stockPagination.paginate(filtered),
    [filtered, stockPagination],
  );
  const ordersPagination = useTablePagination(purchaseOrders.length);
  const paginatedOrders = useMemo(
    () => ordersPagination.paginate(purchaseOrders),
    [purchaseOrders, ordersPagination],
  );
  const logPagination = useTablePagination(filteredLog.length, [logFilter]);
  const paginatedLog = useMemo(
    () => logPagination.paginate(filteredLog),
    [filteredLog, logPagination],
  );

  const lowStockCount = products.filter(p => p.status === "low" || p.status === "critical" || p.status === "out").length;
  const pendingOrdersCount = purchaseOrders.filter(po => po.status === "pending" || po.status === "shipped").length;

  const openVendorBill = () => {
    if (products.length === 0) {
      toast.error("Add at least one product before creating a vendor bill");
      return;
    }
    if (vendors.length === 0) {
      toast.error("Add a vendor first under the Vendors tab");
      return;
    }
    setDirectBillOpen(true);
  };

  const validateProduct = () => {
    const errors: Record<string, string> = {};
    if (!newProduct.name.trim()) errors.name = "Product name is required";
    if (!newProduct.sku.trim()) errors.sku = "SKU is required";
    if (!newProduct.categoryId) errors.categoryId = "Category is required";
    if (!newProduct.brand.trim()) errors.brand = "Brand is required";
    if (!editingProduct && (!newProduct.stock || Number.isNaN(Number(newProduct.stock)))) errors.stock = "Valid stock quantity is required";
    if (!newProduct.minStock || Number.isNaN(Number(newProduct.minStock))) errors.minStock = "Valid min stock is required";
    if (!newProduct.price.trim()) errors.price = "Price is required";
    if (!newProduct.costPrice.trim()) errors.costPrice = "Cost price is required";
    if (!newProduct.vendorId) errors.vendorId = "Supplier is required";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateOrder = () => {
    const errors: Record<string, string> = {};
    if (!orderForm.quantity || isNaN(Number(orderForm.quantity)) || Number(orderForm.quantity) <= 0) errors.quantity = "Valid quantity is required";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validatePO = () => {
    const errors: Record<string, string> = {};
    if (!poForm.vendorId) errors.vendorId = "Supplier is required";
    if (!poForm.productId) errors.productId = "Product is required";
    if (!poForm.quantity || Number.isNaN(Number(poForm.quantity)) || Number(poForm.quantity) <= 0) errors.quantity = "Valid quantity is required";
    if (!poForm.unitCost || Number.isNaN(Number(poForm.unitCost)) || Number(poForm.unitCost) < 0) errors.unitCost = "Valid unit cost is required";
    if (!poForm.date.trim()) errors.date = "Date is required";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const resetProductForm = () => {
    setNewProduct({ ...emptyProductForm });
    setEditingProduct(null);
    setFormErrors({});
  };

  const openEditProduct = (product: Product) => {
    setEditingProduct(product);
    setNewProduct({
      name: product.name,
      sku: product.sku,
      categoryId: product.categoryId,
      brand: product.brand,
      stock: String(product.stock),
      minStock: String(product.minStock),
      price: String(parsePriceInput(product.price)),
      costPrice: String(parsePriceInput(product.costPrice)),
      vendorId: product.vendorId ?? "",
      barcode: product.barcode ?? "",
      unit: product.unit ?? "pcs",
      gstRate: product.gstRate != null ? String(product.gstRate) : "",
    });
    setFormErrors({});
    setIsAddProductOpen(true);
  };

  const handleSaveProduct = async () => {
    if (!validateProduct() || saving) return;
    setSaving(true);
    try {
      const payload = {
        name: newProduct.name.trim(),
        sku: newProduct.sku.trim(),
        categoryId: newProduct.categoryId,
        brand: newProduct.brand.trim(),
        vendorId: newProduct.vendorId,
        barcode: newProduct.barcode || undefined,
        unit: newProduct.unit || "pcs",
        purchasePrice: parsePriceInput(newProduct.costPrice),
        sellingPrice: parsePriceInput(newProduct.price),
        minimumStock: Number(newProduct.minStock),
        gstRate: newProduct.gstRate ? Number(newProduct.gstRate) : undefined,
        ...(editingProduct
          ? {}
          : { currentStock: Number(newProduct.stock) }),
      };

      if (editingProduct) {
        const updated = await updateProduct(editingProduct.id, payload);
        setProducts((prev) => prev.map((p) => (p.id === updated.id ? mapProductRecord(updated) : p)));
        toast.success("Product updated");
      } else {
        const created = await createProduct(payload);
        setProducts((prev) => [...prev, mapProductRecord(created)]);
        toast.success("Product added");
      }
      resetProductForm();
      setIsAddProductOpen(false);
    } catch (error) {
      toast.error(getApiErrorMessage(error, editingProduct ? "Failed to update product" : "Failed to add product"));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProduct = async (product: Product) => {
    if (saving) return;
    setSaving(true);
    try {
      await deleteProduct(product.id);
      setProducts((prev) => prev.filter((p) => p.id !== product.id));
      setIsViewProductOpen(false);
      toast.success("Product deleted");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to delete product"));
    } finally {
      setSaving(false);
    }
  };

  const recordPurchase = async (
    vendorId: string,
    productId: string,
    quantity: number,
    unitCost: number,
    notes?: string,
    orderDate?: string,
  ) => {
    const purchase = await createStockPurchase({
      vendorId,
      orderDate,
      notes,
      items: [{ productId, quantity, unitCost }],
    });
    const updatedProduct = await fetchProduct(productId);
    setProducts((prev) => prev.map((p) => (p.id === productId ? mapProductRecord(updatedProduct) : p)));
    setPurchaseOrders((prev) => [mapStockPurchaseToRow(purchase), ...prev]);
    return purchase;
  };

  const handleOrderProduct = async () => {
    if (!validateOrder() || !selectedProduct || saving) return;
    const qty = Number(orderForm.quantity);
    const unitCost = parsePriceInput(selectedProduct.costPrice);
    setSaving(true);
    try {
      await recordPurchase(
        selectedProduct.vendorId ?? vendors[0]?.id ?? "",
        selectedProduct.id,
        qty,
        unitCost,
        orderForm.notes || `Reorder: ${selectedProduct.name}`,
      );
      setOrderForm({ quantity: "", notes: "" });
      setFormErrors({});
      setIsOrderProductOpen(false);
      setIsStockAlertOpen(false);
      toast.success("Purchase recorded and stock updated");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to record purchase"));
    } finally {
      setSaving(false);
    }
  };

  const handleCreatePO = async () => {
    if (!validatePO() || saving) return;
    setSaving(true);
    try {
      await recordPurchase(
        poForm.vendorId,
        poForm.productId,
        Number(poForm.quantity),
        Number(poForm.unitCost),
        poForm.notes,
        poForm.date,
      );
      setPoForm({
        vendorId: "", productId: "", quantity: "", unitCost: "",
        date: istDateKey(), notes: "",
      });
      setFormErrors({});
      setIsCreatePOOpen(false);
      toast.success("Purchase order recorded");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to create purchase order"));
    } finally {
      setSaving(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshKey((k) => k + 1);
    await Promise.all([refreshProducts(), loadMeta()]);
    toast.success("Inventory refreshed");
  };

  function resetCategoryForm() {
    setCategoryForm({ ...emptyCategoryForm });
    setEditingCategory(null);
  }

  async function handleSaveCategory() {
    if (!categoryForm.name.trim() || saving) return;
    setSaving(true);
    try {
      if (editingCategory) {
        const updated = await updateProductCategory(editingCategory.id, {
          name: categoryForm.name.trim(),
          description: categoryForm.description || undefined,
          status: categoryForm.status,
        });
        setProductCategories((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
        toast.success("Category updated");
      } else {
        const created = await createProductCategory({
          name: categoryForm.name.trim(),
          description: categoryForm.description || undefined,
          status: categoryForm.status,
        });
        setProductCategories((prev) => [...prev, created]);
        toast.success("Category created");
      }
      resetCategoryForm();
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to save category"));
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteCategory(category: ProductCategory) {
    if (saving) return;
    setSaving(true);
    try {
      await deleteProductCategory(category.id);
      setProductCategories((prev) => prev.filter((c) => c.id !== category.id));
      toast.success("Category deleted");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to delete category"));
    } finally {
      setSaving(false);
    }
  }

  async function handleBulkImport(rows: ParsedRow[]) {
    if (saving) return;
    setSaving(true);
    let imported = 0;
    let failed = 0;
    try {
      for (const row of rows) {
        const category = productCategories.find(
          (c) => c.name.toLowerCase() === (row.data.category ?? "").toLowerCase(),
        );
        const vendor = vendors.find(
          (v) => v.name.toLowerCase() === (row.data.supplier ?? "").toLowerCase(),
        );
        try {
          if (row.mode === "restock" && row.matchedProduct) {
            await recordPurchase(
              vendor?.id ?? row.matchedProduct.vendorId ?? vendors[0]?.id ?? "",
              row.matchedProduct.id,
              row.data.quantity ?? 0,
              row.data.cost_price ?? parsePriceInput(row.matchedProduct.costPrice),
              row.data.restock_note || "Bulk restock",
            );
            imported += 1;
          } else if (row.mode === "new" && row.data.product_name && row.data.sku && category) {
            await createProduct({
              name: row.data.product_name,
              sku: row.data.sku,
              categoryId: category.id,
              brand: row.data.brand,
              vendorId: vendor?.id,
              barcode: row.data.barcode,
              purchasePrice: row.data.cost_price ?? 0,
              sellingPrice: row.data.price ?? 0,
              currentStock: row.data.quantity ?? 0,
              minimumStock: row.data.min_stock ?? 0,
            });
            imported += 1;
          } else {
            failed += 1;
          }
        } catch {
          failed += 1;
        }
      }
      await refreshProducts();
      if (imported > 0) toast.success(`${imported} row${imported === 1 ? "" : "s"} imported`);
      if (failed > 0) toast.error(`${failed} row${failed === 1 ? "" : "s"} could not be imported`);
      setShowBulkUpload(false);
    } finally {
      setSaving(false);
    }
  }

  const openOrderModal = (product: Product) => {
    setSelectedProduct(product);
    setOrderForm({ quantity: "", notes: "" });
    setFormErrors({});
    setIsOrderProductOpen(true);
  };

  const openViewModal = (product: Product) => {
    setSelectedProduct(product);
    setIsViewProductOpen(true);
  };

  const openStockAlertModal = () => {
    const lowProducts = products.filter(p => p.status === "low" || p.status === "critical" || p.status === "out");
    if (lowProducts.length > 0) {
      setSelectedProduct(lowProducts[0]);
      setOrderForm({ quantity: "", notes: "" });
      setFormErrors({});
      setIsStockAlertOpen(true);
    }
  };

  const openViewPOModal = (po: PurchaseOrderRow) => {
    setSelectedPO(po);
    setIsViewPOOpen(true);
  };

  const handlePOAction = (_poId: string, action: string) => {
    if (action === "delete") {
      toast.error("Received purchase entries cannot be deleted once stock is updated");
    } else {
      toast.info("Stock purchases are recorded as received on creation");
    }
  };
  return (
    <div className="inventory-page flex h-[calc(100dvh-8rem)] min-h-0 flex-col gap-3 overflow-hidden sm:gap-4" key={refreshKey}>
      {/* Fixed top: title, actions, KPIs, alert */}
      <div className="inventory-top shrink-0 space-y-3 sm:space-y-4">
      {/* Header — icon-only actions on phones */}
      <div className="flex shrink-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#D4AF37]">Stock Control</p>
          <h1 className="text-xl font-bold bg-gradient-to-r from-[#1a1a1a] to-[#d4af37] bg-clip-text text-transparent sm:text-2xl lg:text-3xl">
            Inventory Management
          </h1>
          <p className="mt-1 hidden text-sm text-muted-foreground sm:block">
            Track products, stock levels, purchase orders & vendors
          </p>
        </div>
        <div className="inventory-actions">
          {canManageInventory && (
            <button
              type="button"
              onClick={openVendorBill}
              title="Vendor Bill"
              aria-label="Vendor Bill"
              className="inventory-action-btn flex h-10 items-center justify-center gap-2 rounded-xl border border-[#d4af37] bg-white px-3 text-[12px] font-semibold text-[#9a7a1e] transition-all hover:bg-[#d4af37]/10 sm:h-9 sm:px-4 sm:text-[13px]"
            >
              <Receipt className="h-4 w-4 shrink-0" />
              <span className="inventory-action-label-short">Bill</span>
              <span className="inventory-action-label-full">Vendor Bill</span>
            </button>
          )}
          {canManageInventory && (
            <button
              type="button"
              onClick={() => { resetCategoryForm(); setShowCategoryManager(true); }}
              title="Categories"
              aria-label="Categories"
              className="inventory-action-btn flex h-10 items-center justify-center gap-2 rounded-xl border border-black/[0.08] bg-[#FAF8F2] px-3 text-[12px] font-semibold text-[#3f3f46] transition-all hover:border-[#D4AF37]/30 hover:text-[#111118] sm:h-9 sm:px-4 sm:text-[13px]"
            >
              <Tag className="h-4 w-4 shrink-0" />
              <span className="inventory-action-label-short">Cats</span>
              <span className="inventory-action-label-full">Categories</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => void handleRefresh()}
            title="Refresh"
            aria-label="Refresh"
            className="inventory-action-btn flex h-10 items-center justify-center gap-2 rounded-xl border border-black/[0.08] bg-[#FAF8F2] px-3 text-[12px] font-semibold text-[#3f3f46] transition-all hover:border-[#D4AF37]/30 hover:text-[#111118] sm:h-9 sm:px-4 sm:text-[13px]"
          >
            <RefreshCw className={`h-4 w-4 shrink-0 ${productsLoading || ordersLoading ? "animate-spin" : ""}`} />
            <span className="inventory-action-label-short">Refresh</span>
            <span className="inventory-action-label-full">Refresh</span>
          </button>
          {canManageInventory && (
            <button
              type="button"
              onClick={() => setShowBulkUpload(true)}
              title="Bulk Upload"
              aria-label="Bulk Upload"
              className="inventory-action-btn flex h-10 items-center justify-center gap-2 rounded-xl border border-black/[0.08] bg-[#FAF8F2] px-3 text-[12px] font-semibold text-[#3f3f46] transition-all hover:border-[#D4AF37]/30 hover:text-[#111118] sm:h-9 sm:px-4 sm:text-[13px]"
            >
              <Upload className="h-4 w-4 shrink-0" />
              <span className="inventory-action-label-short">Upload</span>
              <span className="inventory-action-label-full">Bulk Upload</span>
            </button>
          )}
          {canManageInventory && (
            <button
              type="button"
              title="Add Product"
              aria-label="Add Product"
              className={cn(financeGoldBtn, "inventory-action-btn inline-flex items-center justify-center gap-2")}
              onClick={() => { resetProductForm(); setIsAddProductOpen(true); }}
            >
              <Plus className="h-4 w-4 shrink-0" />
              <span className="inventory-action-label-short">Add</span>
              <span className="inventory-action-label-full">Add Product</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards — tablet/desktop only; phones keep list space */}
      <div className="hidden md:block">
        <div className="stat-grid-4">
        <PageStatCard label="Total Products" value={productsLoading ? "…" : String(products.length)} sub="Live from database" icon={Package} index={0} href="/inventory?tab=stock" compact />
        <PageStatCard label="Low / Out of Stock" value={String(lowStockCount)} sub="Needs immediate reorder" icon={AlertTriangle} index={1} onClick={openStockAlertModal} compact />
        <PageStatCard label="Total Stock Value" value={totalValue} sub="Across all categories" icon={TrendingUp} index={2} href="/inventory?tab=stock" compact />
        <PageStatCard
          label="Pending Orders"
          value={String(pendingOrdersCount)}
          sub="Open purchase entries"
          icon={ShoppingCart}
          index={3}
          href="/inventory?tab=orders"
          compact
        />
        </div>
      </div>

      {/* Alert Banner */}
      {lowStockCount > 0 && (
        <div className="flex flex-col items-stretch gap-3 rounded-xl border border-[#D4AF37]/25 bg-[#FFFBEB] p-3 sm:flex-row sm:items-center sm:p-4">
          <div className={financeIconWrap}>
            <AlertTriangle className="h-4 w-4 text-[#D4AF37]" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-[#111118] text-sm sm:text-base">Stock Alert: {lowStockCount} products need attention</p>
            <p className="hidden text-sm text-[#3f3f46] sm:block">Review low and out-of-stock items and reorder before service is impacted</p>
          </div>
          <button type="button" className={financeGoldBtn + " !h-10 !w-10 !shrink-0 !px-0 sm:!h-8 sm:!w-auto sm:!px-3"} onClick={openStockAlertModal} title="Reorder Now" aria-label="Reorder Now">
            <ShoppingCart className="h-4 w-4 sm:hidden" />
            <span className="hidden sm:inline">Reorder Now</span>
          </button>
        </div>
      )}
      </div>

      <Tabs defaultValue={initialTab} className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
        <TabsList className={cn(SEGMENTED_PILL_LIST, "shrink-0")}>
          <TabsTrigger value="stock" className={SEGMENTED_PILL_TRIGGER}>
            <Package className="h-3.5 w-3.5" />
            Stock
          </TabsTrigger>
          <TabsTrigger value="vendors" className={SEGMENTED_PILL_TRIGGER}>
            <Truck className="h-3.5 w-3.5" />
            Vendors
          </TabsTrigger>
          <TabsTrigger value="orders" className={SEGMENTED_PILL_TRIGGER}>
            <ShoppingCart className="h-3.5 w-3.5" />
            <span className="inventory-tab-label-short">Orders</span>
            <span className="inventory-tab-label-long">Purchase Orders</span>
          </TabsTrigger>
          <TabsTrigger value="log" className={SEGMENTED_PILL_TRIGGER}>
            <History className="h-3.5 w-3.5" />
            <span className="inventory-tab-label-short">Log</span>
            <span className="inventory-tab-label-long">Usage Log</span>
            {stockLog.length > 0 && (
              <span className="ml-0.5 rounded-full bg-[#D4AF37]/20 px-1.5 py-0.5 text-[10px] font-bold text-[#D4AF37]">
                {stockLog.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="stock" className="mt-0 flex min-h-0 flex-1 flex-col gap-3 overflow-hidden data-[state=inactive]:hidden">
          <StockTab
            search={search}
            setSearch={setSearch}
            category={category}
            setCategory={setCategory}
            stockAlertFilter={stockAlertFilter}
            setStockAlertFilter={setStockAlertFilter}
            categoryFilterOptions={categoryFilterOptions}
            products={products}
            productCategories={productCategories}
            filtered={filtered}
            paginatedProducts={paginatedProducts}
            productsLoading={productsLoading}
            canManageInventory={canManageInventory}
            stockPagination={stockPagination}
            openEditProduct={openEditProduct}
            openViewModal={openViewModal}
            openAdjust={openAdjust}
            openOrderModal={openOrderModal}
            resetProductForm={resetProductForm}
            setNewProduct={setNewProduct}
            setIsAddProductOpen={setIsAddProductOpen}
          />
        </TabsContent>

        <TabsContent value="vendors" className="mt-0 min-h-0 flex-1 overflow-y-auto overscroll-contain data-[state=inactive]:hidden">
          <Vendors onVendorsChanged={loadMeta} />
        </TabsContent>

        <TabsContent value="orders" className="mt-0 flex min-h-0 flex-1 flex-col overflow-hidden data-[state=inactive]:hidden">
          <OrdersTab
            canManageInventory={canManageInventory}
            products={products}
            vendors={vendors}
            purchaseOrders={purchaseOrders}
            paginatedOrders={paginatedOrders}
            ordersLoading={ordersLoading}
            ordersPagination={ordersPagination}
            openVendorBill={openVendorBill}
            setPoForm={setPoForm}
            setFormErrors={setFormErrors}
            setIsCreatePOOpen={setIsCreatePOOpen}
            openViewPOModal={openViewPOModal}
            handlePOAction={handlePOAction}
          />
        </TabsContent>

        <TabsContent value="log" className="mt-0 flex min-h-0 flex-1 flex-col overflow-hidden data-[state=inactive]:hidden">
          <UsageLogTab
            logFilter={logFilter}
            setLogFilter={setLogFilter}
            filteredLog={filteredLog}
            paginatedLog={paginatedLog}
            logPagination={logPagination}
          />
        </TabsContent>
      </Tabs>

      <AdjustStockModal
        adjustTarget={adjustTarget}
        setAdjustTarget={setAdjustTarget}
        adjustMode={adjustMode}
        setAdjustMode={setAdjustMode}
        adjustValue={adjustValue}
        setAdjustValue={setAdjustValue}
        adjustReason={adjustReason}
        setAdjustReason={setAdjustReason}
        adjustNote={adjustNote}
        setAdjustNote={setAdjustNote}
        adjustReasons={adjustReasons}
        saving={saving}
        handleAdjustConfirm={handleAdjustConfirm}
      />

      <AddProductModal
        open={isAddProductOpen}
        onOpenChange={setIsAddProductOpen}
        editingProduct={editingProduct}
        newProduct={newProduct}
        setNewProduct={setNewProduct}
        formErrors={formErrors}
        productCategories={productCategories}
        vendors={vendors}
        saving={saving}
        handleSaveProduct={handleSaveProduct}
      />

      <OrderProductModal
        open={isOrderProductOpen}
        onOpenChange={setIsOrderProductOpen}
        selectedProduct={selectedProduct}
        orderForm={orderForm}
        setOrderForm={setOrderForm}
        formErrors={formErrors}
        saving={saving}
        handleOrderProduct={handleOrderProduct}
      />

      <StockAlertOrderModal
        open={isStockAlertOpen}
        onOpenChange={setIsStockAlertOpen}
        selectedProduct={selectedProduct}
        orderForm={orderForm}
        setOrderForm={setOrderForm}
        formErrors={formErrors}
        saving={saving}
        handleOrderProduct={handleOrderProduct}
      />

      <ViewProductModal
        open={isViewProductOpen}
        onOpenChange={setIsViewProductOpen}
        selectedProduct={selectedProduct}
        saving={saving}
        handleDeleteProduct={handleDeleteProduct}
        openEditProduct={openEditProduct}
        openOrderModal={openOrderModal}
      />

      <CreatePurchaseOrderModal
        open={isCreatePOOpen}
        onOpenChange={setIsCreatePOOpen}
        poForm={poForm}
        setPoForm={setPoForm}
        formErrors={formErrors}
        vendors={vendors}
        products={products}
        saving={saving}
        handleCreatePO={handleCreatePO}
      />

      <ViewPurchaseOrderModal
        open={isViewPOOpen}
        onOpenChange={setIsViewPOOpen}
        selectedPO={selectedPO}
      />

      <CategoryManagerDialog
        open={showCategoryManager}
        onOpenChange={setShowCategoryManager}
        categoryForm={categoryForm}
        setCategoryForm={setCategoryForm}
        editingCategory={editingCategory}
        setEditingCategory={setEditingCategory}
        productCategories={productCategories}
        saving={saving}
        resetCategoryForm={resetCategoryForm}
        handleSaveCategory={handleSaveCategory}
        handleDeleteCategory={handleDeleteCategory}
      />

      <BulkUploadProducts
        open={showBulkUpload}
        onClose={() => setShowBulkUpload(false)}
        onImport={handleBulkImport}
        existingProducts={products as ExistingProduct[]}
      />
      <VendorDirectBillDialog
        open={directBillOpen}
        onOpenChange={setDirectBillOpen}
        vendors={vendors}
        products={products}
        onSuccess={(purchase) => {
          setPurchaseOrders((prev) => [mapStockPurchaseToRow(purchase), ...prev]);
          void refreshProducts();
          void loadMeta();
        }}
      />
    </div>
  );
}
