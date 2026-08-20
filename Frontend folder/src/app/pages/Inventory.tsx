import { useState, useMemo, useEffect, useCallback } from "react";
import { useProducts } from "../context/ProductsContext";
import { useRole, canManageInventoryOps } from "../context/RoleContext";
import { toast } from "../components/ui/hot-toast";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { cn } from "../components/ui/utils";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "../components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Vendors } from "./Vendors";
import {
  Package, Plus, AlertTriangle, TrendingUp, ShoppingCart, Search,
  RefreshCw, Eye, CheckCircle2, X, Upload, SlidersHorizontal,
  History, ArrowDownCircle, ArrowUpCircle, Minus as MinusIcon, Scissors,
  Truck, Pencil, Trash2, Tag, Loader2, Receipt,
} from "lucide-react";
import { BulkUploadProducts, type ParsedRow, type ExistingProduct } from "../components/shared/BulkUploadProducts";
import { VendorDirectBillDialog } from "../components/shared/VendorDirectBillDialog";
import { Pagination } from "../components/shared/Pagination";
import { PageStatCard } from "../components/shared/PageStatCard";
import { useTablePagination } from "../hooks/useTablePagination";
import { SEGMENTED_PILL_LIST, SEGMENTED_PILL_TRIGGER } from "../components/layout/segmented-nav";
import {
  financeGoldBtn,
  financePanel,
  financePanelHeader,
  financeIconWrap,
  financeBadgeGold,
} from "./finance/finance-ui";
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
  formatInr,
  type PurchaseOrderRow,
} from "../../lib/inventoryMappers";
import type { Product } from "../context/ProductsContext";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "../components/ui/table";

const CARD_TABLE = `${financePanel} overflow-hidden`;
const TABLE_ROW = "border-b border-black/[0.05] hover:bg-[#FAF8F2]/80 transition-colors";

const statusConfig = {
  ok: { label: "In Stock", className: "bg-[#D4AF37]/10 text-[#9a7d20] border-[#D4AF37]/25 hover:bg-[#D4AF37]/10" },
  low: { label: "Low Stock", className: "bg-[#FFFBEB] text-[#9a7d20] border-[#D4AF37]/20 hover:bg-[#FFFBEB]" },
  critical: { label: "Critical", className: "bg-red-50 text-red-700 border-red-200 hover:bg-red-50" },
  out: { label: "Out of Stock", className: "bg-[#f4f2ed] text-[#6b6b6b] border-black/[0.08] hover:bg-[#f4f2ed]" },
};

const orderStatusConfig = {
  pending: { label: "Pending", className: "bg-[#FFFBEB] text-[#9a7d20] border-[#D4AF37]/20 hover:bg-[#FFFBEB]" },
  shipped: { label: "Shipped", className: "bg-[#FAF8F2] text-[#111118] border-black/[0.08] hover:bg-[#FAF8F2]" },
  delivered: { label: "Delivered", className: "bg-[#D4AF37]/10 text-[#9a7d20] border-[#D4AF37]/25 hover:bg-[#D4AF37]/10" },
};

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
    vendorId: "", productId: "", quantity: "", unitCost: "", date: new Date().toISOString().slice(0, 10), notes: "",
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
        date: new Date().toISOString().slice(0, 10), notes: "",
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

  const openViewPOModal = (po: any) => {
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
      {/* Header */}
      <div className="page-header-row">
        <div className="min-w-0 shrink-0 lg:max-w-[min(100%,28rem)]">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#D4AF37]">Stock Control</p>
          <h1 className="whitespace-nowrap text-xl font-bold bg-gradient-to-r from-[#1a1a1a] to-[#d4af37] bg-clip-text text-transparent sm:text-2xl lg:text-3xl">
            Inventory Management
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">Track products, stock levels, purchase orders & vendors</p>
        </div>
        <div className="inventory-actions">
          {canManageInventory && (
            <button
              type="button"
              onClick={openVendorBill}
              className="inventory-action-btn flex h-10 items-center justify-center gap-2 rounded-xl border border-[#d4af37] bg-white px-3 text-[12px] font-semibold text-[#9a7a1e] transition-all hover:bg-[#d4af37]/10 sm:h-9 sm:px-4 sm:text-[13px]"
            >
              <Receipt className="h-4 w-4 shrink-0" />
              <span className="inventory-action-label-short">Bill</span>
              <span className="inventory-action-label-full">Vendor Bill</span>
            </button>
          )}
          {canManageInventory && (
            <button
              onClick={() => { resetCategoryForm(); setShowCategoryManager(true); }}
              className="inventory-action-btn flex h-10 items-center justify-center gap-2 rounded-xl border border-black/[0.08] bg-[#FAF8F2] px-3 text-[12px] font-semibold text-[#6b6b6b] transition-all hover:border-[#D4AF37]/30 hover:text-[#111118] sm:h-9 sm:px-4 sm:text-[13px]"
            >
              <Tag className="h-4 w-4 shrink-0" />
              <span className="inventory-action-label-short">Cats</span>
              <span className="inventory-action-label-full">Categories</span>
            </button>
          )}
          <button
            onClick={() => void handleRefresh()}
            className="inventory-action-btn flex h-10 items-center justify-center gap-2 rounded-xl border border-black/[0.08] bg-[#FAF8F2] px-3 text-[12px] font-semibold text-[#6b6b6b] transition-all hover:border-[#D4AF37]/30 hover:text-[#111118] sm:h-9 sm:px-4 sm:text-[13px]"
          >
            <RefreshCw className={`h-4 w-4 shrink-0 ${productsLoading || ordersLoading ? "animate-spin" : ""}`} /> Refresh
          </button>
          {canManageInventory && (
            <button
              onClick={() => setShowBulkUpload(true)}
              className="inventory-action-btn flex h-10 items-center justify-center gap-2 rounded-xl border border-black/[0.08] bg-[#FAF8F2] px-3 text-[12px] font-semibold text-[#6b6b6b] transition-all hover:border-[#D4AF37]/30 hover:text-[#111118] sm:h-9 sm:px-4 sm:text-[13px]"
            >
              <Upload className="h-4 w-4 shrink-0" />
              <span className="inventory-action-label-short">Upload</span>
              <span className="inventory-action-label-full">Bulk Upload</span>
            </button>
          )}
          {canManageInventory && (
            <button
              type="button"
              className={cn(financeGoldBtn, "inventory-action-btn inline-flex items-center justify-center gap-2 col-span-2 sm:col-span-1")}
              onClick={() => { resetProductForm(); setIsAddProductOpen(true); }}
            >
              <Plus className="h-4 w-4 shrink-0" />
              Add Product
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards — 2×2 on phones, 4-up from md */}
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

      {/* Alert Banner */}
      {lowStockCount > 0 && (
        <div className="flex flex-col items-stretch gap-3 rounded-xl border border-[#D4AF37]/25 bg-[#FFFBEB] p-3 sm:flex-row sm:items-center sm:p-4">
          <div className={financeIconWrap}>
            <AlertTriangle className="h-4 w-4 text-[#D4AF37]" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-[#111118] text-sm sm:text-base">Stock Alert: {lowStockCount} products need attention</p>
            <p className="hidden text-sm text-[#6b6b6b] sm:block">Review low and out-of-stock items and reorder before service is impacted</p>
          </div>
          <button type="button" className={financeGoldBtn + " !h-10 !w-full !px-3 !text-[11px] sm:!h-8 sm:!w-auto"} onClick={openStockAlertModal}>Reorder Now</button>
        </div>
      )}
      </div>

      <Tabs defaultValue={initialTab} className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
        <TabsList className={cn(SEGMENTED_PILL_LIST, "tabs-scroll-x shrink-0")}>
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
          {/* Filter Bar */}
          <div className="inventory-filter-bar shrink-0 rounded-2xl border border-black/[0.07] bg-white p-3 shadow-sm">
            {/* Search */}
            <div className="inventory-filter-search">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#d4af37]" />
              <input
                placeholder="Search product, SKU, brand…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full h-9 pl-9 pr-3 rounded-xl border border-black/[0.08] bg-[#FAF8F2]/60 text-[13px] text-[#111] placeholder:text-[#9a9a9a] outline-none focus:border-[#D4AF37]/50 focus:ring-2 focus:ring-[#D4AF37]/12 transition-all"
              />
            </div>

            <div className="hidden h-6 w-px shrink-0 bg-black/[0.06] sm:block" />

            {/* Category Dropdown */}
            <div className="inventory-filter-select">
              <div className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
                <Package className="h-3.5 w-3.5 text-[#d4af37]" />
              </div>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className={`h-9 w-full pl-8 pr-7 rounded-xl border text-[12px] font-medium outline-none appearance-none cursor-pointer transition-all sm:min-w-[9.5rem] ${
                  category !== "All"
                    ? "border-[#D4AF37]/45 bg-[#FFFBEB] text-[#9a7d20] font-semibold"
                    : "border-black/[0.08] bg-[#FAF8F2]/60 text-[#6b6b6b] hover:border-black/[0.12]"
                }`}
              >
                {categoryFilterOptions.map(c => {
                  const count = c === "All" ? products.length : products.filter(p => p.category === c).length;
                  return <option key={c} value={c}>{c} ({count})</option>;
                })}
              </select>
              <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                <svg width="10" height="6" viewBox="0 0 10 6" fill="none"><path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>
              {category !== "All" && <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-[#d4af37]" />}
            </div>

            {/* Stock Alert Dropdown */}
            <div className="inventory-filter-select">
              <div className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
                <AlertTriangle className="h-3.5 w-3.5 text-[#d4af37]" />
              </div>
              <select
                value={stockAlertFilter}
                onChange={e => setStockAlertFilter(e.target.value)}
                className={`h-9 w-full pl-8 pr-7 rounded-xl border text-[12px] font-medium outline-none appearance-none cursor-pointer transition-all sm:min-w-[10.5rem] ${
                  stockAlertFilter !== "all"
                    ? "border-[#D4AF37]/45 bg-[#FFFBEB] text-[#9a7d20] font-semibold"
                    : "border-black/[0.08] bg-[#FAF8F2]/60 text-[#6b6b6b] hover:border-black/[0.12]"
                }`}
              >
                <option value="all">All Stock ({products.length})</option>
                <option value="out">Out of Stock ({products.filter(p => p.stock === 0).length})</option>
                <option value="critical">Critical ({products.filter(p => p.stock > 0 && p.stock <= p.minStock / 2).length})</option>
                <option value="low">Low Stock ({products.filter(p => p.stock > p.minStock / 2 && p.stock <= p.minStock).length})</option>
              </select>
              <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                <svg width="10" height="6" viewBox="0 0 10 6" fill="none"><path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>
              {stockAlertFilter !== "all" && <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-[#d4af37]" />}
            </div>

          </div>

          <Card className={cn(CARD_TABLE, "flex min-h-0 flex-1 flex-col")}>
            <CardContent className="flex min-h-0 flex-1 flex-col overflow-hidden p-0">
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              {/* Phone/tablet cards avoid a seven-column horizontal table. */}
              <div className="divide-y divide-black/[0.06] lg:hidden">
                {productsLoading ? (
                  <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin" /> Loading products…
                  </div>
                ) : paginatedProducts.map((product) => {
                  const status = statusConfig[product.status as keyof typeof statusConfig];
                  return (
                    <article key={product.id} className="space-y-3 p-4 sm:p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-[15px] font-bold text-[#111118]">{product.name}</p>
                          <p className="mt-0.5 truncate text-[11px] text-[#6b6b6b]">{product.brand} · {product.category}</p>
                          <p className="mt-1 font-mono text-[11px] text-[#9a9a9a]">SKU {product.sku}</p>
                        </div>
                        <Badge className={status.className}>{status.label}</Badge>
                      </div>

                      <div className="inventory-metric-grid">
                        <div className="rounded-xl border border-black/[0.06] bg-[#FAF8F2] p-2.5">
                          <p className="text-[9px] font-bold uppercase tracking-wider text-[#9a9a9a]">Stock</p>
                          <p className={cn(
                            "mt-1 text-[17px] font-black",
                            product.stock === 0 ? "text-red-600" : product.stock < product.minStock ? "text-[#9a7d20]" : "text-[#111118]",
                          )}>
                            {product.stock}
                          </p>
                        </div>
                        <div className="rounded-xl border border-black/[0.06] bg-white p-2.5">
                          <p className="text-[9px] font-bold uppercase tracking-wider text-[#9a9a9a]">Minimum</p>
                          <p className="mt-1 text-[17px] font-black text-[#111118]">{product.minStock}</p>
                        </div>
                        <div className="rounded-xl border border-[#D4AF37]/20 bg-[#FFFBEB] p-2.5 col-span-2 min-[400px]:col-span-1">
                          <p className="text-[9px] font-bold uppercase tracking-wider text-[#9a7d20]">Price</p>
                          <p className="mt-1 truncate text-[14px] font-black text-[#9a7d20]">{product.price}</p>
                        </div>
                      </div>

                      <div className="inventory-card-actions">
                        <Button variant="outline" size="sm" className="h-10 rounded-xl" onClick={() => openEditProduct(product)}>
                          <Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit
                        </Button>
                        <Button variant="outline" size="sm" className="h-10 rounded-xl" onClick={() => openViewModal(product)}>
                          <Eye className="mr-1.5 h-3.5 w-3.5" /> View
                        </Button>
                        <Button variant="outline" size="sm" className="h-10 rounded-xl border-[#D4AF37]/30 text-[#9a7d20]" onClick={() => openAdjust(product)}>
                          <SlidersHorizontal className="mr-1.5 h-3.5 w-3.5" /> Adjust
                        </Button>
                        {(product.status === "low" || product.status === "critical" || product.status === "out") && (
                          <Button size="sm" className="h-10 rounded-xl bg-[#111118] text-[#D4AF37]" onClick={() => openOrderModal(product)}>
                            <ShoppingCart className="mr-1.5 h-3.5 w-3.5" /> Reorder
                          </Button>
                        )}
                      </div>
                    </article>
                  );
                })}
                {!productsLoading && filtered.length === 0 && (
                  <div className="flex flex-col items-center gap-3 px-4 py-12 text-center">
                    <Package className="h-10 w-10 text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground">No products match the current filters.</p>
                  </div>
                )}
              </div>

              <div className="hidden overflow-x-auto table-scroll lg:block">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-black/[0.06] bg-[#FAF8F2]">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Product</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">SKU</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Category</th>
                      <th className="text-center py-3 px-4 text-sm font-semibold text-muted-foreground">Stock</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-muted-foreground">Price</th>
                      <th className="text-center py-3 px-4 text-sm font-semibold text-muted-foreground">Status</th>
                      <th className="text-center py-3 px-4 text-sm font-semibold text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {productsLoading ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-muted-foreground">
                          <Loader2 className="h-6 w-6 animate-spin inline-block mr-2" />
                          Loading products…
                        </td>
                      </tr>
                    ) : paginatedProducts.map(p => (
                      <tr key={p.id} className={TABLE_ROW}>
                        <td className="py-3 px-4">
                          <div>
                            <p className="font-medium text-sm">{p.name}</p>
                            <p className="text-xs text-muted-foreground">{p.brand} • Supplier: {p.supplier}</p>
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono text-xs text-muted-foreground">{p.sku}</td>
                        <td className="py-3 px-4 text-sm">{p.category}</td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex flex-col items-center gap-1">
                            <span className={`font-bold text-sm ${p.stock === 0 ? "text-red-600" : p.stock < p.minStock ? "text-[#9a7d20]" : "text-[#111118]"}`}>
                              {p.stock}
                            </span>
                            <div className="w-16 bg-[#f4f2ed] rounded-full h-1.5">
                              <div
                                className={`h-1.5 rounded-full ${p.stock === 0 ? "bg-red-500" : p.stock < p.minStock ? "bg-[#D4AF37]" : "bg-[#B8962E]"}`}
                                style={{ width: `${Math.min((p.stock / (p.minStock * 2)) * 100, 100)}%` }}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground">min: {p.minStock}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right font-semibold text-sm">{p.price}</td>
                        <td className="py-3 px-4 text-center">
                          <Badge className={statusConfig[p.status as keyof typeof statusConfig].className}>
                            {statusConfig[p.status as keyof typeof statusConfig].label}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEditProduct(p)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openViewModal(p)}>
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-[#d4af37] hover:text-[#b8962e] hover:bg-[#d4af37]/10" title="Adjust Stock" onClick={() => openAdjust(p)}>
                              <SlidersHorizontal className="h-3.5 w-3.5" />
                            </Button>
                            {(p.status === "low" || p.status === "critical" || p.status === "out") && (
                              <Button size="sm" variant="outline" className="text-xs h-7 border-[#D4AF37]/35 text-[#9a7d20] hover:bg-[#FFFBEB]" onClick={() => openOrderModal(p)}>
                                Reorder
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {!productsLoading && filtered.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-12 px-4">
                          <div className="flex flex-col items-center justify-center text-center gap-3">
                            <Package className="h-10 w-10 text-muted-foreground/40" />
                            <p className="text-sm text-muted-foreground">No products found in <strong>{category}</strong>.</p>
                            {canManageInventory && (
                              <Button size="sm" className="bg-gradient-to-r from-[#1a1a1a] to-[#2d2d2d]" onClick={() => { resetProductForm(); if (category !== "All") { const cat = productCategories.find((c) => c.name === category); if (cat) setNewProduct((f) => ({ ...f, categoryId: cat.id })); } setIsAddProductOpen(true); }}>
                                <Plus className="h-4 w-4 mr-2" />
                                Add Product for {category}
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              </div>
              <div className="shrink-0 border-t border-black/[0.06] bg-white">
              <Pagination
                page={stockPagination.page}
                pageSize={stockPagination.pageSize}
                totalRecords={filtered.length}
                onPageChange={stockPagination.setPage}
                onPageSizeChange={stockPagination.setPageSize}
              />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="vendors" className="mt-0 min-h-0 flex-1 overflow-y-auto overscroll-contain data-[state=inactive]:hidden">
          <Vendors onVendorsChanged={loadMeta} />
        </TabsContent>

        <TabsContent value="orders" className="mt-0 flex min-h-0 flex-1 flex-col overflow-hidden data-[state=inactive]:hidden">
          <Card className={cn(CARD_TABLE, "flex min-h-0 flex-1 flex-col")}>
            <CardHeader className="shrink-0">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5 text-[#1a1a1a]" />
                  Purchase Orders
                </CardTitle>
                {canManageInventory && (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-xl border-[#d4af37]/35 text-[#9a7a1e] hover:bg-[#d4af37]/10"
                      onClick={openVendorBill}
                    >
                      <Receipt className="h-4 w-4 mr-1" /> Vendor Bill
                    </Button>
                    <Button size="sm" className="bg-gradient-to-r from-[#1a1a1a] to-[#2d2d2d]" onClick={() => {
                      if (products.length === 0) {
                        toast.error("Add at least one product before creating a purchase order");
                        return;
                      }
                      if (vendors.length === 0) {
                        toast.error("Add a vendor first under the Vendors tab");
                        return;
                      }
                      setPoForm({ vendorId: "", productId: "", quantity: "", unitCost: "", date: new Date().toISOString().slice(0, 10), notes: "" });
                      setFormErrors({});
                      setIsCreatePOOpen(true);
                    }}>
                      <Plus className="h-4 w-4 mr-1" /> Create PO
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="flex min-h-0 flex-1 flex-col overflow-hidden px-0 sm:px-6">
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              <div className="divide-y divide-black/[0.06] lg:hidden">
                {paginatedOrders.map((order) => {
                  const status = orderStatusConfig[order.status as keyof typeof orderStatusConfig];
                  return (
                    <article key={order.id} className="space-y-3 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-mono text-[13px] font-bold text-[#111118]">{order.id}</p>
                          <p className="mt-1 truncate text-[14px] font-semibold">{order.supplier}</p>
                          <p className="mt-0.5 text-[11px] text-[#9a9a9a]">{order.date}</p>
                          {order.isVendorBill && (
                            <Badge className="mt-1 bg-[#d4af37]/10 text-[#9a7a1e] border-[#d4af37]/25 hover:bg-[#d4af37]/10">Vendor Bill</Badge>
                          )}
                        </div>
                        <Badge className={status.className}>{status.label}</Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="rounded-xl bg-[#FAF8F2] px-3 py-2.5">
                          <p className="text-[9px] font-bold uppercase tracking-wider text-[#9a9a9a]">Qty</p>
                          <p className="mt-1 text-[15px] font-black">{order.totalQuantity}</p>
                          {order.lineCount > 1 && (
                            <p className="mt-0.5 text-[10px] text-[#9a9a9a]">{order.lineCount} products</p>
                          )}
                        </div>
                        <div className="rounded-xl border border-[#D4AF37]/20 bg-[#FFFBEB] px-3 py-2.5">
                          <p className="text-[9px] font-bold uppercase tracking-wider text-[#9a7d20]">Total</p>
                          <p className="mt-1 text-[15px] font-black text-[#9a7d20]">{order.total}</p>
                        </div>
                      </div>
                      <div className="inventory-card-actions">
                        <Button variant="outline" size="sm" className="h-10 rounded-xl" onClick={() => openViewPOModal(order)}>View</Button>
                        {order.status === "pending" && (
                          <Button variant="outline" size="sm" className="h-10 rounded-xl" onClick={() => handlePOAction(order.id, "mark-shipped")}>Ship</Button>
                        )}
                        {order.status === "shipped" && (
                          <Button variant="outline" size="sm" className="h-10 rounded-xl border-[#D4AF37]/35 text-[#9a7d20]" onClick={() => handlePOAction(order.id, "mark-delivered")}>Deliver</Button>
                        )}
                      </div>
                    </article>
                  );
                })}
                {!ordersLoading && purchaseOrders.length === 0 && (
                  <div className="py-12 text-center text-sm text-muted-foreground">No purchase orders yet.</div>
                )}
              </div>

              <div className="hidden overflow-x-auto table-scroll lg:block">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-black/[0.06] bg-[#FAF8F2]">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Order ID</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Supplier</th>
                      <th className="text-center py-3 px-4 text-sm font-semibold text-muted-foreground">Qty</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-muted-foreground">Total</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Date</th>
                      <th className="text-center py-3 px-4 text-sm font-semibold text-muted-foreground">Status</th>
                      <th className="text-center py-3 px-4 text-sm font-semibold text-muted-foreground">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedOrders.map(po => (
                      <tr key={po.id} className={TABLE_ROW}>
                        <td className="py-3 px-4 font-mono font-semibold text-[#1a1a1a] text-sm">{po.id}</td>
                        <td className="py-3 px-4 text-sm font-medium">{po.supplier}</td>
                        <td className="py-3 px-4 text-center text-sm">
                          <span className="font-semibold">{po.totalQuantity}</span>
                          {po.lineCount > 1 && (
                            <span className="block text-[10px] text-muted-foreground">{po.lineCount} lines</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-semibold text-sm">{po.total}</td>
                        <td className="py-3 px-4 text-sm text-muted-foreground">{po.date}</td>
                        <td className="py-3 px-4 text-center">
                          <Badge className={orderStatusConfig[po.status as keyof typeof orderStatusConfig].className}>
                            {orderStatusConfig[po.status as keyof typeof orderStatusConfig].label}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => openViewPOModal(po)}>View</Button>
                            {po.status === "pending" && (
                              <Button size="sm" variant="outline" className="text-xs h-7 border-black/[0.08] text-[#111118] hover:bg-[#FAF8F2]" onClick={() => handlePOAction(po.id, "mark-shipped")}>Ship</Button>
                            )}
                            {po.status === "shipped" && (
                              <Button size="sm" variant="outline" className="text-xs h-7 border-[#D4AF37]/35 text-[#9a7d20] hover:bg-[#FFFBEB]" onClick={() => handlePOAction(po.id, "mark-delivered")}>Deliver</Button>
                            )}
                            <Button variant="ghost" size="sm" className="text-xs h-7 text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => handlePOAction(po.id, "delete")}>Delete</Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              </div>
              <div className="shrink-0 border-t border-black/[0.06] bg-white">
              <Pagination
                page={ordersPagination.page}
                pageSize={ordersPagination.pageSize}
                totalRecords={purchaseOrders.length}
                onPageChange={ordersPagination.setPage}
                onPageSizeChange={ordersPagination.setPageSize}
              />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Usage Log Tab ── */}
        <TabsContent value="log" className="mt-0 flex min-h-0 flex-1 flex-col overflow-hidden data-[state=inactive]:hidden">
          <Card className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-black/[0.07] shadow-sm">
            <CardHeader className="shrink-0 pb-3">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <CardTitle className="text-[15px] font-bold text-[#1a1a1a] flex items-center gap-2">
                  <History className="h-4 w-4 text-[#d4af37]" /> Stock Usage Log
                </CardTitle>
                <div className="flex max-w-full items-center gap-2 overflow-x-auto pb-1">
                  {(["all", "Service Used", "Retail Sale", "Manual Adjustment"] as const).map(f => (
                    <button key={f} onClick={() => setLogFilter(f)}
                      className={`h-7 shrink-0 whitespace-nowrap px-3 rounded-full text-[11px] font-semibold transition-all ${logFilter === f ? "bg-[#121212] text-[#D4AF37]" : "bg-[#FAF8F2] text-[#6b6b6b] hover:bg-[#f4f2ed] border border-black/[0.06]"}`}>
                      {f === "all" ? "All" : f}
                    </button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex min-h-0 flex-1 flex-col overflow-hidden p-0">
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              {filteredLog.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-16 text-center">
                  <History className="h-10 w-10 text-gray-200" />
                  <p className="text-[13px] font-semibold text-gray-400">No stock movements yet</p>
                  <p className="text-[11px] text-gray-400">Movements appear here when appointments are completed, products are sold, or stock is adjusted manually.</p>
                </div>
              ) : (
                <>
                <div className="divide-y divide-black/[0.06] lg:hidden">
                  {paginatedLog.map((log) => (
                    <article key={log.id} className="space-y-3 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-[14px] font-bold text-[#111118]">{log.productName}</p>
                          <p className="mt-0.5 font-mono text-[10px] text-[#9a9a9a]">{log.sku}</p>
                        </div>
                        <span className={cn(
                          "inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-bold",
                          log.type === "Service Used" ? "border-black/[0.08] bg-[#FAF8F2] text-[#111118]"
                            : log.type === "Retail Sale" ? "border-[#D4AF37]/20 bg-[#FFFBEB] text-[#9a7d20]"
                              : log.type === "Manual Adjustment" ? "border-[#D4AF37]/25 bg-[#D4AF37]/10 text-[#9a7d20]"
                                : "border-black/[0.08] bg-[#f4f2ed] text-[#6b6b6b]",
                        )}>
                          {log.type}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="rounded-xl bg-[#FAF8F2] px-2.5 py-2">
                          <p className="text-[9px] font-bold uppercase text-[#9a9a9a]">Date</p>
                          <p className="mt-1 text-[11px] font-semibold">{log.date}</p>
                          <p className="text-[10px] text-[#9a9a9a]">{log.time}</p>
                        </div>
                        <div className="rounded-xl bg-[#FAF8F2] px-2.5 py-2 text-center">
                          <p className="text-[9px] font-bold uppercase text-[#9a9a9a]">Change</p>
                          <p className={cn("mt-1 text-[16px] font-black", log.qtyChange < 0 ? "text-red-500" : "text-[#9a7d20]")}>
                            {log.qtyChange > 0 ? "+" : ""}{log.qtyChange}
                          </p>
                        </div>
                        <div className="rounded-xl border border-[#D4AF37]/20 bg-[#FFFBEB] px-2.5 py-2 text-center">
                          <p className="text-[9px] font-bold uppercase text-[#9a7d20]">After</p>
                          <p className="mt-1 text-[16px] font-black text-[#111118]">{log.stockAfter}</p>
                        </div>
                      </div>
                      {(log.ref || log.note) && (
                        <p className="rounded-lg bg-gray-50 px-3 py-2 text-[11px] text-[#6b6b6b]">
                          {log.ref || ""}{log.note ? (log.ref ? " · " : "") + log.note : ""}
                        </p>
                      )}
                    </article>
                  ))}
                </div>
                <div className="hidden overflow-x-auto table-scroll lg:block">
                  <table className="w-full text-[12px]">
                    <thead className="bg-[#fafaf8] border-b border-gray-100">
                      <tr>
                        <th className="text-left px-4 py-2.5 font-semibold text-gray-500">Date & Time</th>
                        <th className="text-left px-4 py-2.5 font-semibold text-gray-500">Product</th>
                        <th className="text-left px-4 py-2.5 font-semibold text-gray-500">SKU</th>
                        <th className="text-left px-4 py-2.5 font-semibold text-gray-500">Type</th>
                        <th className="text-center px-4 py-2.5 font-semibold text-gray-500">Change</th>
                        <th className="text-center px-4 py-2.5 font-semibold text-gray-500">Stock After</th>
                        <th className="text-left px-4 py-2.5 font-semibold text-gray-500">Ref / Note</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedLog.map((log, i) => (
                        <tr key={log.id} className={`${TABLE_ROW} ${i % 2 === 0 ? "bg-white" : "bg-[#FAF8F2]/50"}`}>
                          <td className="px-4 py-3 text-gray-500 tabular-nums whitespace-nowrap">{log.date} · {log.time}</td>
                          <td className="px-4 py-3 font-semibold text-[#1a1a1a] max-w-[160px] truncate">{log.productName}</td>
                          <td className="px-4 py-3 font-mono text-gray-400">{log.sku}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              log.type === "Service Used" ? "bg-[#FAF8F2] text-[#111118] border-black/[0.08]"
                              : log.type === "Retail Sale" ? "bg-[#FFFBEB] text-[#9a7d20] border-[#D4AF37]/20"
                              : log.type === "Manual Adjustment" ? "bg-[#D4AF37]/10 text-[#9a7d20] border-[#D4AF37]/25"
                              : "bg-[#f4f2ed] text-[#6b6b6b] border-black/[0.08]"
                            }`}>
                              {log.type === "Service Used" && <Scissors className="h-2.5 w-2.5" />}
                              {log.type === "Retail Sale" && <ShoppingCart className="h-2.5 w-2.5" />}
                              {log.type === "Manual Adjustment" && <SlidersHorizontal className="h-2.5 w-2.5" />}
                              {log.type === "Restock" && <RefreshCw className="h-2.5 w-2.5" />}
                              {log.type}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center tabular-nums">
                            <span className={`font-bold flex items-center justify-center gap-0.5 ${log.qtyChange < 0 ? "text-red-500" : "text-[#9a7d20]"}`}>
                              {log.qtyChange < 0 ? <ArrowDownCircle className="h-3 w-3" /> : <ArrowUpCircle className="h-3 w-3" />}
                              {log.qtyChange > 0 ? "+" : ""}{log.qtyChange}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center font-bold text-[#1a1a1a] tabular-nums">{log.stockAfter}</td>
                          <td className="px-4 py-3 text-gray-400 text-[11px] max-w-[180px] truncate">{log.ref || ""}{log.note ? (log.ref ? " · " : "") + log.note : ""}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                </>
              )}
              </div>
              {filteredLog.length > 0 && (
                <div className="shrink-0 border-t border-black/[0.06] bg-white">
                <Pagination
                  page={logPagination.page}
                  pageSize={logPagination.pageSize}
                  totalRecords={filteredLog.length}
                  onPageChange={logPagination.setPage}
                  onPageSizeChange={logPagination.setPageSize}
                />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>

      {/* ── Manual Adjust Modal ── */}
      <Dialog open={!!adjustTarget} onOpenChange={open => { if (!open) setAdjustTarget(null); }}>
        <DialogContent className="w-[min(100%,28rem)] max-w-[calc(100%-1rem)] rounded-2xl p-0 overflow-hidden border-0 shadow-2xl max-sm:dialog-mobile-sheet">
          <div className="bg-gradient-to-br from-[#111118] to-[#2a2a2a] px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-[#d4af37]/15 border border-[#d4af37]/30 flex items-center justify-center shrink-0">
                <SlidersHorizontal className="h-4.5 w-4.5 text-[#d4af37]" />
              </div>
              <div>
                <DialogTitle className="text-[15px] font-bold text-white">Adjust Stock</DialogTitle>
                <p className="text-[11px] text-white/45 mt-0.5 truncate max-w-[260px]">{adjustTarget?.name}</p>
              </div>
            </div>
          </div>
          <div className="p-6 space-y-4">
            {/* Current stock display */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-[#fafaf8] border border-gray-100">
              <span className="text-[12px] text-gray-500 font-medium">Current Stock</span>
              <span className="text-[18px] font-bold text-[#1a1a1a]">{adjustTarget?.stock ?? 0}</span>
            </div>

            {/* Mode selector */}
            <div className="grid grid-cols-3 gap-2">
              {([
                { mode: "set" as const, label: "Set to", icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
                { mode: "add" as const, label: "Add", icon: <ArrowUpCircle className="h-3.5 w-3.5" /> },
                { mode: "subtract" as const, label: "Remove", icon: <MinusIcon className="h-3.5 w-3.5" /> },
              ]).map(({ mode, label, icon }) => (
                <button key={mode} onClick={() => { setAdjustMode(mode); setAdjustValue(""); }}
                  className={`flex flex-col items-center gap-1.5 p-2.5 rounded-xl border text-[11px] font-bold transition-all ${adjustMode === mode ? "bg-[#1a1a1a] border-[#1a1a1a] text-[#d4af37]" : "border-gray-200 text-gray-500 hover:border-gray-300"}`}>
                  {icon} {label}
                </button>
              ))}
            </div>

            {/* Value input */}
            <div className="space-y-1.5">
              <Label className="text-[12px] font-semibold text-[#1a1a1a]">
                {adjustMode === "set" ? "New Stock Quantity" : adjustMode === "add" ? "Quantity to Add" : "Quantity to Remove"}
              </Label>
              <Input
                type="number"
                min="0"
                value={adjustValue}
                onChange={e => setAdjustValue(e.target.value)}
                placeholder="Enter quantity"
                className="h-10 rounded-xl border-gray-200 focus:border-[#d4af37] focus:ring-[#d4af37]"
              />
              {adjustValue && !isNaN(parseInt(adjustValue)) && adjustTarget && (
                <p className="text-[11px] text-gray-400">
                  Stock will change: <span className="font-bold text-[#1a1a1a]">{adjustTarget.stock}</span> →{" "}
                  <span className="font-bold text-[#d4af37]">
                    {adjustMode === "set" ? parseInt(adjustValue)
                      : adjustMode === "add" ? adjustTarget.stock + parseInt(adjustValue)
                      : Math.max(0, adjustTarget.stock - parseInt(adjustValue))}
                  </span>
                </p>
              )}
            </div>

            {/* Reason */}
            <div className="space-y-1.5">
              <Label className="text-[12px] font-semibold text-[#1a1a1a]">Reason</Label>
              <Select value={adjustReason} onValueChange={setAdjustReason}>
                <SelectTrigger className="h-10 rounded-xl border-gray-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {adjustReasons.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Note */}
            <div className="space-y-1.5">
              <Label className="text-[12px] font-semibold text-[#1a1a1a]">Note <span className="text-gray-400 font-normal">(optional)</span></Label>
              <Input
                value={adjustNote}
                onChange={e => setAdjustNote(e.target.value)}
                placeholder="e.g. Physical count mismatch, supplier return..."
                className="h-10 rounded-xl border-gray-200 focus:border-[#d4af37] focus:ring-[#d4af37]"
              />
            </div>
          </div>
          <div className="flex items-center justify-end gap-2.5 px-6 py-4 border-t border-gray-100">
            <Button variant="outline" className="h-9 px-4 rounded-xl text-[13px]" onClick={() => setAdjustTarget(null)}>Cancel</Button>
            <button
              onClick={() => void handleAdjustConfirm()}
              disabled={saving || !adjustValue || Number.isNaN(parseInt(adjustValue, 10)) || parseInt(adjustValue, 10) < 0}
              className="h-9 px-5 rounded-xl bg-gradient-to-r from-[#d4af37] to-[#b8962e] text-[13px] font-bold text-black disabled:opacity-40 hover:shadow-lg transition-all"
            >
              Confirm Adjustment
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Product Modal */}
      <Dialog open={isAddProductOpen} onOpenChange={setIsAddProductOpen}>
        <DialogContent className="w-[min(100%,42rem)] max-w-[calc(100%-1rem)] p-0 overflow-hidden rounded-2xl border-0 shadow-2xl max-h-[95dvh] max-sm:dialog-mobile-sheet [&>button:last-of-type]:hidden">

          {/* Header */}
          <div className="relative bg-gradient-to-br from-[#1a1a1a] via-[#222] to-[#2d2d2d] px-4 pt-6 pb-5 sm:px-7 sm:pt-7 sm:pb-6">
            <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: "radial-gradient(circle at 70% 30%, #d4af37 0%, transparent 60%)" }} />
            <div className="relative flex items-start gap-3 sm:gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#d4af37]/15 border border-[#d4af37]/30 sm:h-12 sm:w-12">
                <Package className="h-5 w-5 text-[#d4af37] sm:h-6 sm:w-6" />
              </div>
              <div className="flex-1 min-w-0">
                <DialogTitle className="text-lg font-bold text-white tracking-tight sm:text-xl">{editingProduct ? "Edit Product" : "Add New Product"}</DialogTitle>
                <p className="text-xs text-white/50 mt-0.5 sm:text-sm">{editingProduct ? "Update product details in inventory" : "Fill in all required fields to add a product to inventory"}</p>
              </div>
              <button onClick={() => setIsAddProductOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-white/50 hover:text-white transition-all">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="overflow-y-auto max-h-[calc(95dvh-200px)] px-4 py-5 sm:px-7 sm:py-6 bg-[#fafaf8] space-y-5">

            {/* Section: Identity */}
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-[#d4af37] mb-3">Product Identity</p>
              <div className="form-grid-2 gap-4">
                <div className="sm:col-span-2 space-y-1.5">
                  <label className="text-[12px] font-semibold text-[#333]">Product Name <span className="text-red-500">*</span></label>
                  <input value={newProduct.name} onChange={e => setNewProduct({ ...newProduct, name: e.target.value })}
                    placeholder="e.g. L'Oreal Professional Shampoo"
                    className={`w-full h-10 px-3.5 rounded-xl border text-[13px] text-[#111] bg-white outline-none transition-all focus:ring-2 focus:ring-[#d4af37]/20 focus:border-[#d4af37]/60 placeholder:text-gray-400 ${formErrors.name ? "border-red-400 bg-red-50" : "border-gray-200 hover:border-gray-300"}`} />
                  {formErrors.name && <p className="text-[11px] text-red-500 flex items-center gap-1"><span>⚠</span>{formErrors.name}</p>}
                </div>
                <div className="space-y-1.5">
                  <label className="text-[12px] font-semibold text-[#333]">SKU <span className="text-red-500">*</span></label>
                  <input value={newProduct.sku} onChange={e => setNewProduct({ ...newProduct, sku: e.target.value })}
                    placeholder="e.g. LPS-001"
                    className={`w-full h-10 px-3.5 rounded-xl border text-[13px] text-[#111] bg-white outline-none transition-all focus:ring-2 focus:ring-[#d4af37]/20 focus:border-[#d4af37]/60 placeholder:text-gray-400 font-mono ${formErrors.sku ? "border-red-400 bg-red-50" : "border-gray-200 hover:border-gray-300"}`} />
                  {formErrors.sku && <p className="text-[11px] text-red-500 flex items-center gap-1"><span>⚠</span>{formErrors.sku}</p>}
                </div>
                <div className="space-y-1.5">
                  <label className="text-[12px] font-semibold text-[#333]">Brand <span className="text-red-500">*</span></label>
                  <input value={newProduct.brand} onChange={e => setNewProduct({ ...newProduct, brand: e.target.value })}
                    placeholder="e.g. L'Oreal"
                    className={`w-full h-10 px-3.5 rounded-xl border text-[13px] text-[#111] bg-white outline-none transition-all focus:ring-2 focus:ring-[#d4af37]/20 focus:border-[#d4af37]/60 placeholder:text-gray-400 ${formErrors.brand ? "border-red-400 bg-red-50" : "border-gray-200 hover:border-gray-300"}`} />
                  {formErrors.brand && <p className="text-[11px] text-red-500 flex items-center gap-1"><span>⚠</span>{formErrors.brand}</p>}
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200" />

            {/* Section: Classification */}
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-[#d4af37] mb-3">Classification</p>
              <div className="form-grid-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[12px] font-semibold text-[#333]">Category <span className="text-red-500">*</span></label>
                  <Select value={newProduct.categoryId} onValueChange={v => setNewProduct({ ...newProduct, categoryId: v })}>
                    <SelectTrigger className={`h-10 rounded-xl text-[13px] border focus:ring-2 focus:ring-[#d4af37]/20 focus:border-[#d4af37]/60 ${formErrors.categoryId ? "border-red-400 bg-red-50" : "border-gray-200 bg-white hover:border-gray-300"}`}>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {productCategories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {formErrors.categoryId && <p className="text-[11px] text-red-500 flex items-center gap-1"><span>⚠</span>{formErrors.categoryId}</p>}
                </div>
                <div className="space-y-1.5">
                  <label className="text-[12px] font-semibold text-[#333]">Supplier <span className="text-red-500">*</span></label>
                  <Select value={newProduct.vendorId} onValueChange={v => setNewProduct({ ...newProduct, vendorId: v })}>
                    <SelectTrigger className={`h-10 rounded-xl text-[13px] border focus:ring-2 focus:ring-[#d4af37]/20 focus:border-[#d4af37]/60 ${formErrors.vendorId ? "border-red-400 bg-red-50" : "border-gray-200 bg-white hover:border-gray-300"}`}>
                      <SelectValue placeholder="Select supplier" />
                    </SelectTrigger>
                    <SelectContent>
                      {vendors.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {formErrors.vendorId && <p className="text-[11px] text-red-500 flex items-center gap-1"><span>⚠</span>{formErrors.vendorId}</p>}
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200" />

            {/* Section: Stock */}
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-[#d4af37] mb-3">Stock Levels</p>
              <div className="form-grid-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[12px] font-semibold text-[#333]">Current Stock {!editingProduct && <span className="text-red-500">*</span>}</label>
                  <div className="relative">
                    <input type="number" value={newProduct.stock} onChange={e => setNewProduct({ ...newProduct, stock: e.target.value })}
                      placeholder="e.g. 45"
                      disabled={!!editingProduct}
                      className={`w-full h-10 px-3.5 pr-12 rounded-xl border text-[13px] text-[#111] bg-white outline-none transition-all focus:ring-2 focus:ring-[#d4af37]/20 focus:border-[#d4af37]/60 placeholder:text-gray-400 ${formErrors.stock ? "border-red-400 bg-red-50" : "border-gray-200 hover:border-gray-300"} ${editingProduct ? "opacity-60" : ""}`} />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-gray-400">units</span>
                  </div>
                  {formErrors.stock && <p className="text-[11px] text-red-500 flex items-center gap-1"><span>⚠</span>{formErrors.stock}</p>}
                </div>
                <div className="space-y-1.5">
                  <label className="text-[12px] font-semibold text-[#333]">Minimum Stock <span className="text-red-500">*</span>
                    <span className="ml-1 text-[10px] font-normal text-gray-400">(reorder alert)</span>
                  </label>
                  <div className="relative">
                    <input type="number" value={newProduct.minStock} onChange={e => setNewProduct({ ...newProduct, minStock: e.target.value })}
                      placeholder="e.g. 20"
                      className={`w-full h-10 px-3.5 pr-12 rounded-xl border text-[13px] text-[#111] bg-white outline-none transition-all focus:ring-2 focus:ring-[#d4af37]/20 focus:border-[#d4af37]/60 placeholder:text-gray-400 ${formErrors.minStock ? "border-red-400 bg-red-50" : "border-gray-200 hover:border-gray-300"}`} />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-gray-400">units</span>
                  </div>
                  {formErrors.minStock && <p className="text-[11px] text-red-500 flex items-center gap-1"><span>⚠</span>{formErrors.minStock}</p>}
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200" />

            {/* Section: Pricing */}
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-[#d4af37] mb-3">Pricing</p>
              <div className="form-grid-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[12px] font-semibold text-[#333]">Selling Price <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[13px] font-bold text-[#d4af37]">₹</span>
                    <input value={newProduct.price} onChange={e => setNewProduct({ ...newProduct, price: e.target.value })}
                      placeholder="850"
                      className={`w-full h-10 pl-8 pr-3.5 rounded-xl border text-[13px] text-[#111] bg-white outline-none transition-all focus:ring-2 focus:ring-[#d4af37]/20 focus:border-[#d4af37]/60 placeholder:text-gray-400 ${formErrors.price ? "border-red-400 bg-red-50" : "border-gray-200 hover:border-gray-300"}`} />
                  </div>
                  {formErrors.price && <p className="text-[11px] text-red-500 flex items-center gap-1"><span>⚠</span>{formErrors.price}</p>}
                </div>
                <div className="space-y-1.5">
                  <label className="text-[12px] font-semibold text-[#333]">Cost Price <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[13px] font-bold text-gray-400">₹</span>
                    <input value={newProduct.costPrice} onChange={e => setNewProduct({ ...newProduct, costPrice: e.target.value })}
                      placeholder="620"
                      className={`w-full h-10 pl-8 pr-3.5 rounded-xl border text-[13px] text-[#111] bg-white outline-none transition-all focus:ring-2 focus:ring-[#d4af37]/20 focus:border-[#d4af37]/60 placeholder:text-gray-400 ${formErrors.costPrice ? "border-red-400 bg-red-50" : "border-gray-200 hover:border-gray-300"}`} />
                  </div>
                  {formErrors.costPrice && <p className="text-[11px] text-red-500 flex items-center gap-1"><span>⚠</span>{formErrors.costPrice}</p>}
                  {newProduct.price && newProduct.costPrice && !isNaN(Number(newProduct.price)) && !isNaN(Number(newProduct.costPrice)) && Number(newProduct.costPrice) > 0 && (
                    <p className="text-[11px] text-emerald-600 font-semibold">
                      Margin: {Math.round(((Number(newProduct.price) - Number(newProduct.costPrice)) / Number(newProduct.price)) * 100)}%
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="inventory-dialog-footer px-4 py-4 sm:px-7 bg-white border-t border-gray-100">
            <p className="text-[11px] text-gray-400 text-center sm:text-left"><span className="text-red-400">*</span> Required fields</p>
            <div className="inventory-dialog-footer-actions">
              <button onClick={() => setIsAddProductOpen(false)}
                className="h-10 px-5 rounded-xl border border-gray-200 text-[13px] font-semibold text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-all">
                Cancel
              </button>
              <button onClick={() => void handleSaveProduct()} disabled={saving}
                className="h-10 px-6 rounded-xl bg-gradient-to-r from-[#d4af37] to-[#b8962e] text-[13px] font-bold text-black hover:from-[#c9a42e] hover:to-[#a8862a] shadow-[0_2px_12px_rgba(212,175,55,0.35)] hover:shadow-[0_4px_16px_rgba(212,175,55,0.45)] transition-all flex items-center justify-center gap-2">
                <Plus className="h-4 w-4" /> {saving ? "Saving…" : editingProduct ? "Save Changes" : "Add Product"}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Order Product Modal (from actions) */}
      <Dialog open={isOrderProductOpen} onOpenChange={setIsOrderProductOpen}>
        <DialogContent className="w-[min(95vw,34rem)] max-w-none p-0 gap-0 overflow-hidden rounded-2xl [&>button:last-of-type]:hidden">
          {/* Header */}
          <div className="bg-[#111118] px-6 py-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-[#d4af37]/15 border border-[#d4af37]/20 flex items-center justify-center">
                <ShoppingCart className="h-5 w-5 text-[#d4af37]" />
              </div>
              <div>
                <p className="text-white font-bold text-[14px] leading-tight">Reorder Product</p>
                <p className="text-gray-500 text-[11px] mt-0.5">{selectedProduct?.supplier}</p>
              </div>
            </div>
            <button onClick={() => setIsOrderProductOpen(false)} className="h-8 w-8 rounded-lg bg-white/06 hover:bg-white/12 flex items-center justify-center text-gray-400 hover:text-white transition-all text-lg leading-none">×</button>
          </div>

          <div className="px-6 py-5 space-y-4 bg-[#faf8f2]">
            {/* Product info card */}
            {selectedProduct && (
              <div className="flex items-center gap-4 p-4 rounded-xl bg-white border border-gray-200">
                <div className="h-11 w-11 rounded-xl bg-[#111118] flex items-center justify-center shrink-0">
                  <Package className="h-5 w-5 text-[#d4af37]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-bold text-[#111118] truncate">{selectedProduct.name}</p>
                  <p className="text-[11px] text-gray-500 mt-0.5">{selectedProduct.category} · SKU: {selectedProduct.sku}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-0.5">In Stock</p>
                  <p className={`text-[22px] font-black leading-none ${selectedProduct.stock === 0 ? "text-red-600" : selectedProduct.stock < selectedProduct.minStock ? "text-orange-500" : "text-emerald-600"}`}>{selectedProduct.stock}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">Min: {selectedProduct.minStock}</p>
                </div>
              </div>
            )}

            {/* Suggested qty hint */}
            {selectedProduct && selectedProduct.stock < selectedProduct.minStock && (
              <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-amber-50 border border-amber-200">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                <p className="text-[11px] text-amber-700 font-medium">Suggested reorder: <span className="font-bold">{Math.max(selectedProduct.minStock * 2 - selectedProduct.stock, 10)} units</span> to restore safe stock levels</p>
              </div>
            )}

            {/* Quantity */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#b8962e] mb-3">Order Details</p>
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Quantity <span className="text-[#d4af37]">*</span></p>
                <div className="relative">
                  <ShoppingCart className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-300 pointer-events-none" />
                  <input
                    type="number"
                    value={orderForm.quantity}
                    onChange={e => setOrderForm({ ...orderForm, quantity: e.target.value })}
                    placeholder="Enter quantity to order"
                    className="w-full h-10 pl-9 pr-3.5 rounded-xl border border-gray-200 bg-white text-[13px] font-semibold text-[#111118] focus:outline-none focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/12 transition-all placeholder:font-normal placeholder:text-gray-300"
                  />
                </div>
                {formErrors.quantity && <p className="text-[11px] text-red-500">{formErrors.quantity}</p>}
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Notes <span className="text-gray-400 normal-case font-normal">optional</span></p>
              <textarea
                value={orderForm.notes}
                onChange={e => setOrderForm({ ...orderForm, notes: e.target.value })}
                placeholder="Add any special instructions for this order..."
                rows={2}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white text-[13px] text-[#111118] resize-none focus:outline-none focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/12 transition-all placeholder:text-gray-300"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-100 bg-white flex items-center justify-end gap-2">
            <button onClick={() => setIsOrderProductOpen(false)}
              className="h-10 px-5 rounded-xl border border-gray-200 bg-white text-[13px] font-semibold text-gray-600 hover:bg-gray-50 transition-all">
              Cancel
            </button>
            <button onClick={() => void handleOrderProduct()} disabled={saving}
              className="h-10 px-6 rounded-xl bg-gradient-to-r from-[#d4af37] to-[#b8962e] text-[13px] font-bold text-black transition-all flex items-center gap-2 shadow-md shadow-[#d4af37]/20">
              <ShoppingCart className="h-4 w-4" /> Place Order
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Stock Alert Order Modal */}
      <Dialog open={isStockAlertOpen} onOpenChange={setIsStockAlertOpen}>
        <DialogContent className="w-[min(95vw,34rem)] max-w-none p-0 gap-0 overflow-hidden rounded-2xl [&>button:last-of-type]:hidden">
          {/* Header */}
          <div className="bg-[#111118] px-6 py-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-red-500/15 border border-red-500/20 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-red-400" />
              </div>
              <div>
                <p className="text-white font-bold text-[14px] leading-tight">Stock Alert — Reorder</p>
                <p className="text-gray-500 text-[11px] mt-0.5">Place an urgent restock order</p>
              </div>
            </div>
            <button onClick={() => setIsStockAlertOpen(false)} className="h-8 w-8 rounded-lg bg-white/06 hover:bg-white/12 flex items-center justify-center text-gray-400 hover:text-white transition-all text-lg leading-none">×</button>
          </div>

          <div className="px-6 py-5 space-y-4">
            {/* Product info card */}
            {selectedProduct && (
              <div className="flex items-center gap-4 p-4 rounded-xl bg-red-50 border border-red-100">
                <div className="h-11 w-11 rounded-xl bg-[#111118] flex items-center justify-center shrink-0">
                  <Package className="h-5 w-5 text-[#d4af37]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-bold text-[#111118] truncate">{selectedProduct.name}</p>
                  <p className="text-[11px] text-gray-500 mt-0.5">{selectedProduct.supplier} · {selectedProduct.category}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-red-500 mb-0.5">Current Stock</p>
                  <p className="text-[22px] font-black text-red-600 leading-none">{selectedProduct.stock}</p>
                  <p className="text-[10px] text-red-400 mt-0.5">Min: {selectedProduct.minStock}</p>
                </div>
              </div>
            )}

            {/* Quantity */}
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Order Quantity <span className="text-[#d4af37]">*</span></p>
              <div className="relative">
                <ShoppingCart className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-300 pointer-events-none" />
                <input type="number" value={orderForm.quantity}
                  onChange={e => setOrderForm({ ...orderForm, quantity: e.target.value })}
                  placeholder="Enter quantity to order"
                  className="w-full h-10 pl-9 pr-3.5 rounded-xl border border-gray-200 bg-gray-50 text-[13px] font-semibold text-[#111118] focus:outline-none focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/12 focus:bg-white transition-all placeholder:font-normal placeholder:text-gray-300" />
              </div>
              {formErrors.quantity && <p className="text-[11px] text-red-500">{formErrors.quantity}</p>}
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Notes <span className="text-gray-400 normal-case font-normal">optional</span></p>
              <textarea value={orderForm.notes}
                onChange={e => setOrderForm({ ...orderForm, notes: e.target.value })}
                placeholder="Urgent reorder — add any special instructions..."
                rows={2}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-[13px] text-[#111118] resize-none focus:outline-none focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/12 focus:bg-white transition-all placeholder:text-gray-300" />
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/60 flex items-center justify-end gap-2">
            <button onClick={() => setIsStockAlertOpen(false)}
              className="h-10 px-5 rounded-xl border border-gray-200 bg-white text-[13px] font-semibold text-gray-600 hover:bg-gray-50 transition-all">
              Cancel
            </button>
            <button onClick={() => void handleOrderProduct()} disabled={saving}
              className="h-10 px-6 rounded-xl bg-gradient-to-r from-red-600 to-red-500 text-[13px] font-bold text-white transition-all flex items-center gap-2 shadow-md shadow-red-500/20 hover:from-red-700 hover:to-red-600">
              <AlertTriangle className="h-4 w-4" /> Place Urgent Order
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Product Modal */}
      <Dialog open={isViewProductOpen} onOpenChange={setIsViewProductOpen}>
        <DialogContent className="w-[min(95vw,34rem)] max-w-none p-0 gap-0 overflow-hidden rounded-2xl [&>button:last-of-type]:hidden">
          {/* Header */}
          <div className="bg-[#111118] px-6 py-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-[#d4af37]/15 border border-[#d4af37]/20 flex items-center justify-center">
                <Package className="h-5 w-5 text-[#d4af37]" />
              </div>
              <div>
                <p className="text-white font-bold text-[14px] leading-tight">Product Details</p>
                <p className="text-gray-500 text-[11px] mt-0.5">{selectedProduct?.category} · SKU {selectedProduct?.sku}</p>
              </div>
            </div>
            <button onClick={() => setIsViewProductOpen(false)} className="h-8 w-8 rounded-lg bg-white/06 hover:bg-white/12 flex items-center justify-center text-gray-400 hover:text-white transition-all text-lg leading-none">×</button>
          </div>

          {selectedProduct && (
            <div className="max-h-[calc(100dvh-11rem)] space-y-4 overflow-y-auto bg-[#faf8f2] px-4 py-5 sm:px-6">
              {/* Hero card */}
              <div className="flex items-center gap-4 p-4 rounded-xl bg-white border border-gray-200">
                <div className="h-12 w-12 rounded-xl bg-[#111118] flex items-center justify-center shrink-0">
                  <Package className="h-6 w-6 text-[#d4af37]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-bold text-[#111118] truncate">{selectedProduct.name}</p>
                  <p className="text-[12px] text-gray-500 mt-0.5">{selectedProduct.brand} · {selectedProduct.supplier}</p>
                </div>
                <Badge className={statusConfig[selectedProduct.status as keyof typeof statusConfig].className}>
                  {statusConfig[selectedProduct.status as keyof typeof statusConfig].label}
                </Badge>
              </div>

              {/* Stock bar */}
              <div className="p-4 rounded-xl bg-white border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#b8962e]">Stock Level</p>
                  <p className={`text-[13px] font-black ${selectedProduct.stock === 0 ? "text-red-600" : selectedProduct.stock < selectedProduct.minStock ? "text-orange-500" : "text-emerald-600"}`}>
                    {selectedProduct.stock} <span className="text-[11px] font-normal text-gray-400">/ min {selectedProduct.minStock}</span>
                  </p>
                </div>
                <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${selectedProduct.stock === 0 ? "bg-red-500" : selectedProduct.stock < selectedProduct.minStock ? "bg-orange-400" : "bg-emerald-500"}`}
                    style={{ width: `${Math.min(100, (selectedProduct.stock / (selectedProduct.minStock * 2)) * 100)}%` }}
                  />
                </div>
                <p className="text-[10px] text-gray-400 mt-1.5">Last ordered: {selectedProduct.lastOrder}</p>
              </div>

              {/* Pricing */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#b8962e] mb-3">Pricing</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-white border border-gray-200 text-center">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Selling Price</p>
                    <p className="text-[18px] font-black text-[#111118]">{selectedProduct.price}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-white border border-gray-200 text-center">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Cost Price</p>
                    <p className="text-[18px] font-black text-[#111118]">{selectedProduct.costPrice}</p>
                  </div>
                </div>
              </div>

              {/* Details */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#b8962e] mb-3">Details</p>
                <div className="rounded-xl bg-white border border-gray-200 divide-y divide-gray-100">
                  {[
                    { label: "Category", value: selectedProduct.category },
                    { label: "Brand", value: selectedProduct.brand },
                    { label: "Supplier", value: selectedProduct.supplier },
                    { label: "SKU", value: selectedProduct.sku, mono: true },
                  ].map(({ label, value, mono }) => (
                    <div key={label} className="flex items-center justify-between px-4 py-2.5">
                      <span className="text-[12px] text-gray-500">{label}</span>
                      <span className={`text-[12px] font-semibold text-[#111118] ${mono ? "font-mono" : ""}`}>{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="flex flex-col items-stretch gap-2 border-t border-gray-100 bg-white px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <button onClick={() => selectedProduct && void handleDeleteProduct(selectedProduct)} disabled={saving}
              className="h-10 px-4 rounded-xl border border-red-200 text-red-600 text-[13px] font-semibold hover:bg-red-50 transition-all flex items-center gap-2">
              <Trash2 className="h-4 w-4" /> Delete
            </button>
            <div className="flex flex-wrap items-center justify-end gap-2">
            <button onClick={() => setIsViewProductOpen(false)}
              className="h-10 px-5 rounded-xl border border-gray-200 bg-white text-[13px] font-semibold text-gray-600 hover:bg-gray-50 transition-all">
              Close
            </button>
            <button onClick={() => { if (selectedProduct) { setIsViewProductOpen(false); openEditProduct(selectedProduct); } }}
              className="h-10 px-5 rounded-xl border border-gray-200 bg-white text-[13px] font-semibold text-gray-600 hover:bg-gray-50 transition-all flex items-center gap-2">
              <Pencil className="h-4 w-4" /> Edit
            </button>
            {(selectedProduct?.status === "low" || selectedProduct?.status === "critical" || selectedProduct?.status === "out") && (
              <button onClick={() => { setIsViewProductOpen(false); setTimeout(() => openOrderModal(selectedProduct), 200); }}
                className="h-10 px-6 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 text-[13px] font-bold text-white transition-all flex items-center gap-2 shadow-md shadow-orange-500/20">
                <ShoppingCart className="h-4 w-4" /> Reorder
              </button>
            )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create PO Modal */}
      <Dialog open={isCreatePOOpen} onOpenChange={setIsCreatePOOpen}>
        <DialogContent className="w-[min(95vw,36rem)] max-w-none p-0 gap-0 overflow-hidden rounded-2xl [&>button:last-of-type]:hidden">
          {/* Header */}
          <div className="bg-[#111118] px-6 py-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-[#d4af37]/15 border border-[#d4af37]/20 flex items-center justify-center">
                <ShoppingCart className="h-5 w-5 text-[#d4af37]" />
              </div>
              <div>
                <DialogTitle className="text-white font-bold text-[14px] leading-tight">Create Purchase Order</DialogTitle>
                <p className="text-gray-500 text-[11px] mt-0.5">Fill in the required fields to create a new PO</p>
              </div>
            </div>
            <button onClick={() => setIsCreatePOOpen(false)} className="h-8 w-8 rounded-lg bg-white/06 hover:bg-white/12 flex items-center justify-center text-gray-400 hover:text-white transition-all text-lg leading-none">×</button>
          </div>

          <div className="px-6 py-5 space-y-4">
            {/* Supplier */}
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Supplier <span className="text-[#d4af37]">*</span></p>
              <Select value={poForm.vendorId} onValueChange={v => setPoForm({ ...poForm, vendorId: v, productId: "" })}>
                <SelectTrigger className="h-10 rounded-xl border-gray-200 bg-gray-50 text-[13px] focus:border-[#d4af37] focus:ring-[#d4af37]/12">
                  <SelectValue placeholder="Select supplier" />
                </SelectTrigger>
                <SelectContent>
                  {vendors.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
              {vendors.length === 0 && (
                <p className="text-[11px] text-amber-700">No vendors loaded — add one under the Vendors tab or click Refresh.</p>
              )}
              {formErrors.vendorId && <p className="text-[11px] text-red-500 mt-1">{formErrors.vendorId}</p>}
            </div>

            <div className="space-y-1.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Product <span className="text-[#d4af37]">*</span></p>
              <Select value={poForm.productId} onValueChange={v => setPoForm({ ...poForm, productId: v })}>
                <SelectTrigger className="h-10 rounded-xl border-gray-200 bg-gray-50 text-[13px] focus:border-[#d4af37] focus:ring-[#d4af37]/12">
                  <SelectValue placeholder="Select product" />
                </SelectTrigger>
                <SelectContent>
                  {products.length === 0 ? (
                    <SelectItem value="__none__" disabled>No products — add a product first</SelectItem>
                  ) : (
                    products.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}{p.supplier ? ` · ${p.supplier}` : ""}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {formErrors.productId && <p className="text-[11px] text-red-500 mt-1">{formErrors.productId}</p>}
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Quantity <span className="text-[#d4af37]">*</span></p>
                <div className="relative">
                  <Package className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-300 pointer-events-none" />
                  <input type="number" value={poForm.quantity}
                    onChange={e => setPoForm({ ...poForm, quantity: e.target.value })}
                    placeholder="e.g. 5"
                    className="w-full h-10 pl-9 pr-3.5 rounded-xl border border-gray-200 bg-gray-50 text-[13px] text-[#111118] focus:outline-none focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/12 focus:bg-white transition-all placeholder:text-gray-300" />
                </div>
                {formErrors.quantity && <p className="text-[11px] text-red-500">{formErrors.quantity}</p>}
              </div>
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Unit Cost (₹) <span className="text-[#d4af37]">*</span></p>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[13px] text-gray-400 pointer-events-none">₹</span>
                  <input value={poForm.unitCost}
                    onChange={e => setPoForm({ ...poForm, unitCost: e.target.value })}
                    placeholder="e.g. 620"
                    className="w-full h-10 pl-8 pr-3.5 rounded-xl border border-gray-200 bg-gray-50 text-[13px] font-semibold text-[#111118] focus:outline-none focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/12 focus:bg-white transition-all placeholder:font-normal placeholder:text-gray-300" />
                </div>
                {formErrors.unitCost && <p className="text-[11px] text-red-500">{formErrors.unitCost}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Order Date <span className="text-[#d4af37]">*</span></p>
                <input type="date" value={poForm.date}
                  onChange={e => setPoForm({ ...poForm, date: e.target.value })}
                  className="w-full h-10 px-3.5 rounded-xl border border-gray-200 bg-gray-50 text-[13px] text-[#111118] focus:outline-none focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/12 focus:bg-white transition-all" />
                {formErrors.date && <p className="text-[11px] text-red-500">{formErrors.date}</p>}
              </div>
            </div>
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Notes</p>
              <Textarea value={poForm.notes} onChange={(e) => setPoForm({ ...poForm, notes: e.target.value })} placeholder="Optional purchase notes" className="min-h-[72px] rounded-xl" />
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/60 flex items-center justify-end gap-2">
            <button onClick={() => setIsCreatePOOpen(false)}
              className="h-10 px-5 rounded-xl border border-gray-200 bg-white text-[13px] font-semibold text-gray-600 hover:bg-gray-50 transition-all">
              Cancel
            </button>
            <button onClick={() => void handleCreatePO()} disabled={saving}
              className="h-10 px-6 rounded-xl bg-gradient-to-r from-[#d4af37] to-[#b8962e] text-[13px] font-bold text-black transition-all flex items-center gap-2 shadow-md shadow-[#d4af37]/20">
              <Plus className="h-4 w-4" /> {saving ? "Saving…" : "Create PO"}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* View PO Modal */}
      <Dialog open={isViewPOOpen} onOpenChange={setIsViewPOOpen}>
        <DialogContent className="w-[min(95vw,34rem)] max-w-none p-0 gap-0 overflow-hidden rounded-2xl [&>button:last-of-type]:hidden">
          {/* Header */}
          <div className="bg-[#111118] px-6 py-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-[#d4af37]/15 border border-[#d4af37]/20 flex items-center justify-center">
                <ShoppingCart className="h-5 w-5 text-[#d4af37]" />
              </div>
              <div>
                <p className="text-white font-bold text-[14px] leading-tight">Purchase Order Details</p>
                <p className="text-gray-500 text-[11px] mt-0.5 font-mono">{selectedPO?.id}</p>
              </div>
            </div>
            <button onClick={() => setIsViewPOOpen(false)} className="h-8 w-8 rounded-lg bg-white/06 hover:bg-white/12 flex items-center justify-center text-gray-400 hover:text-white transition-all text-lg leading-none">×</button>
          </div>

          {selectedPO && (
            <div className="px-6 py-5 space-y-4 bg-[#faf8f2]">
              {/* Status + supplier hero */}
              <div className="flex items-center gap-4 p-4 rounded-xl bg-white border border-gray-200">
                <div className="h-12 w-12 rounded-xl bg-[#111118] flex items-center justify-center shrink-0">
                  <ShoppingCart className="h-6 w-6 text-[#d4af37]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-bold text-[#111118] truncate">{selectedPO.supplier}</p>
                  <p className="text-[12px] text-gray-500 mt-0.5">Ordered on {selectedPO.date}</p>
                </div>
                <Badge className={orderStatusConfig[selectedPO.status as keyof typeof orderStatusConfig].className}>
                  {orderStatusConfig[selectedPO.status as keyof typeof orderStatusConfig].label}
                </Badge>
              </div>

              {/* Key stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 rounded-xl bg-white border border-gray-200 text-center">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Total Value</p>
                  <p className="text-[20px] font-black text-[#111118]">{selectedPO.total}</p>
                </div>
                <div className="p-4 rounded-xl bg-white border border-gray-200 text-center">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Qty Ordered</p>
                  <p className="text-[20px] font-black text-[#111118]">{selectedPO.totalQuantity}</p>
                  {selectedPO.lineCount > 1 && (
                    <p className="text-[10px] text-gray-500 mt-0.5">{selectedPO.lineCount} product lines</p>
                  )}
                </div>
              </div>

              {/* Details */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#b8962e] mb-3">Order Info</p>
                <div className="rounded-xl bg-white border border-gray-200 divide-y divide-gray-100">
                  {[
                    { label: "Order ID", value: selectedPO.id, mono: true },
                    { label: "Supplier", value: selectedPO.supplier },
                    { label: "Date", value: selectedPO.date },
                    {
                      label: "Qty Ordered",
                      value: `${selectedPO.totalQuantity} unit${selectedPO.totalQuantity !== 1 ? "s" : ""}${selectedPO.lineCount > 1 ? ` (${selectedPO.lineCount} products)` : ""}`,
                    },
                    ...(selectedPO.isVendorBill ? [{ label: "Type", value: "Vendor Bill" }] : []),
                  ].map(({ label, value, mono }) => (
                    <div key={label} className="flex items-center justify-between px-4 py-2.5">
                      <span className="text-[12px] text-gray-500">{label}</span>
                      <span className={`text-[12px] font-semibold text-[#111118] ${mono ? "font-mono" : ""}`}>{value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Line items */}
              {selectedPO.raw.items.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#b8962e] mb-3">Products</p>
                  <div className="rounded-xl bg-white border border-gray-200 divide-y divide-gray-100 overflow-hidden">
                    {selectedPO.raw.items.map((item) => (
                      <div key={item.id} className="flex items-center justify-between gap-3 px-4 py-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-[12px] font-semibold text-[#111118] truncate">{item.productName}</p>
                          <p className="text-[10px] text-gray-500 font-mono mt-0.5">{item.sku}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-[12px] font-bold text-[#111118]">× {item.quantity}</p>
                          <p className="text-[10px] text-gray-500 mt-0.5">{formatInr(item.unitCost)} each</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Status timeline */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#b8962e] mb-3">Status Timeline</p>
                <div className="flex items-center gap-0">
                  {(["pending", "shipped", "delivered"] as const).map((step, i) => {
                    const cfg = orderStatusConfig[step];
                    const steps = ["pending", "shipped", "delivered"];
                    const currentIdx = steps.indexOf(selectedPO.status);
                    const stepIdx = steps.indexOf(step);
                    const done = stepIdx <= currentIdx;
                    return (
                      <div key={step} className="flex items-center flex-1 last:flex-none">
                        <div className="flex flex-col items-center gap-1">
                          <div className={`h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-bold border-2 transition-all ${done ? "bg-[#111118] border-[#111118] text-[#d4af37]" : "bg-white border-gray-200 text-gray-400"}`}>
                            {done ? "✓" : i + 1}
                          </div>
                          <p className={`text-[10px] font-semibold whitespace-nowrap ${done ? "text-[#111118]" : "text-gray-400"}`}>{cfg.label}</p>
                        </div>
                        {i < 2 && <div className={`flex-1 h-0.5 mb-4 mx-1 ${stepIdx < currentIdx ? "bg-[#111118]" : "bg-gray-200"}`} />}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-100 bg-white flex items-center justify-end">
            <button onClick={() => setIsViewPOOpen(false)}
              className="h-10 px-5 rounded-xl border border-gray-200 bg-white text-[13px] font-semibold text-gray-600 hover:bg-gray-50 transition-all">
              Close
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showCategoryManager} onOpenChange={(open) => { setShowCategoryManager(open); if (!open) resetCategoryForm(); }}>
        <DialogContent className="w-[min(100%,42rem)] max-w-[calc(100%-1rem)] p-0 gap-0 overflow-hidden rounded-2xl max-sm:dialog-mobile-sheet [&>button]:hidden">
          <div className="bg-[#111118] px-6 py-5 flex items-center justify-between">
            <div>
              <DialogTitle className="text-white text-[15px] font-bold">Manage Categories</DialogTitle>
              <p className="text-[11px] text-white/40 mt-0.5">Create, edit, and delete product categories</p>
            </div>
            <button onClick={() => { setShowCategoryManager(false); resetCategoryForm(); }} className="h-8 w-8 rounded-lg bg-white/06 hover:bg-white/12 flex items-center justify-center text-gray-400 hover:text-white">×</button>
          </div>
          <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input value={categoryForm.name} onChange={(e) => setCategoryForm((f) => ({ ...f, name: e.target.value }))} placeholder="Category name" className="h-10 rounded-xl" />
              <Select value={categoryForm.status} onValueChange={(v) => setCategoryForm((f) => ({ ...f, status: v as "active" | "inactive" }))}>
                <SelectTrigger className="h-10 rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Input value={categoryForm.description} onChange={(e) => setCategoryForm((f) => ({ ...f, description: e.target.value }))} placeholder="Description (optional)" className="h-10 rounded-xl" />
            <div className="flex justify-end gap-2">
              {editingCategory && <Button variant="outline" onClick={resetCategoryForm} disabled={saving}>Cancel Edit</Button>}
              <Button onClick={() => void handleSaveCategory()} disabled={saving || !categoryForm.name.trim()} className="bg-gradient-to-r from-[#d4af37] to-[#b8962e] text-black font-bold">
                {saving ? "Saving…" : editingCategory ? "Update Category" : "Add Category"}
              </Button>
            </div>
            <div className="rounded-xl border border-black/[0.07] overflow-x-auto table-scroll">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead>Name</TableHead>
                    <TableHead>Products</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {productCategories.map((cat) => (
                    <TableRow key={cat.id}>
                      <TableCell className="font-medium">{cat.name}</TableCell>
                      <TableCell>{cat.productCount}</TableCell>
                      <TableCell><Badge variant="outline" className="text-xs capitalize">{cat.status}</Badge></TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="outline" onClick={() => { setEditingCategory(cat); setCategoryForm({ name: cat.name, description: cat.description, status: cat.status }); }} disabled={saving}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="sm" variant="outline" className="border-red-200 text-red-500 hover:bg-red-50" onClick={() => void handleDeleteCategory(cat)} disabled={saving}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
