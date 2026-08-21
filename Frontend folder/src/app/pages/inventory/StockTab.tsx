import type { Dispatch, SetStateAction } from "react";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { cn } from "../../components/ui/utils";
import { Pagination } from "../../components/shared/Pagination";
import { FilterSelect } from "../../components/shared/FilterSelect";
import type { Product } from "../../context/ProductsContext";
import type { ProductCategory } from "../../../api/product-categories";
import {
  Package, Plus, AlertTriangle, Search, Eye, ShoppingCart,
  Pencil, SlidersHorizontal, Loader2,
} from "lucide-react";
import { CARD_TABLE, TABLE_ROW, statusConfig } from "./inventoryUi";

export type StockTabPagination = {
  page: number;
  pageSize: number;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
};

type StockTabProps = {
  search: string;
  setSearch: (v: string) => void;
  category: string;
  setCategory: (v: string) => void;
  stockAlertFilter: string;
  setStockAlertFilter: (v: string) => void;
  categoryFilterOptions: string[];
  products: Product[];
  productCategories: ProductCategory[];
  filtered: Product[];
  paginatedProducts: Product[];
  productsLoading: boolean;
  canManageInventory: boolean;
  stockPagination: StockTabPagination;
  openEditProduct: (product: Product) => void;
  openViewModal: (product: Product) => void;
  openAdjust: (product: Product) => void;
  openOrderModal: (product: Product) => void;
  resetProductForm: () => void;
  setNewProduct: Dispatch<SetStateAction<{
    name: string; sku: string; categoryId: string; brand: string; stock: string; minStock: string;
    price: string; costPrice: string; vendorId: string; barcode: string; unit: string; gstRate: string;
  }>>;
  setIsAddProductOpen: (open: boolean) => void;
};

export function StockTab({
  search, setSearch, category, setCategory, stockAlertFilter, setStockAlertFilter,
  categoryFilterOptions, products, productCategories, filtered, paginatedProducts,
  productsLoading, canManageInventory, stockPagination,
  openEditProduct, openViewModal, openAdjust, openOrderModal,
  resetProductForm, setNewProduct, setIsAddProductOpen,
}: StockTabProps) {
  return (
    <>
            {/* Filter Bar */}
            <div className="inventory-filter-bar shrink-0 rounded-2xl border border-black/[0.07] bg-white p-3 shadow-sm">
              {/* Search */}
              <div className="inventory-filter-search">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#d4af37]" />
                <input
                  placeholder="Search product, SKU, brand…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full h-10 pl-9 pr-3 rounded-xl border border-black/[0.08] bg-white text-[13px] text-[#111] placeholder:text-[#9a9a9a] outline-none focus:border-[#D4AF37]/50 focus:ring-2 focus:ring-[#D4AF37]/12 transition-all"
                />
              </div>

              <div className="hidden h-6 w-px shrink-0 bg-black/[0.06] sm:block" />

              <div className="grid w-full grid-cols-1 gap-2.5 min-[420px]:grid-cols-2 sm:flex sm:w-auto sm:flex-wrap sm:gap-3">
                <FilterSelect
                  value={category}
                  onValueChange={setCategory}
                  icon={Package}
                  active={category !== "All"}
                  triggerClassName="h-10 sm:min-w-[11rem]"
                  options={categoryFilterOptions.map((c) => {
                    const count = c === "All" ? products.length : products.filter((p) => p.category === c).length;
                    return { value: c, label: `${c} (${count})` };
                  })}
                />
                <FilterSelect
                  value={stockAlertFilter}
                  onValueChange={setStockAlertFilter}
                  icon={AlertTriangle}
                  active={stockAlertFilter !== "all"}
                  triggerClassName="h-10 sm:min-w-[12rem]"
                  options={[
                    { value: "all", label: `All Stock (${products.length})` },
                    {
                      value: "out",
                      label: `Out of Stock (${products.filter((p) => p.stock === 0).length})`,
                    },
                    {
                      value: "critical",
                      label: `Critical (${products.filter((p) => p.stock > 0 && p.stock <= p.minStock / 2).length})`,
                    },
                    {
                      value: "low",
                      label: `Low Stock (${products.filter((p) => p.stock > p.minStock / 2 && p.stock <= p.minStock).length})`,
                    },
                  ]}
                />
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
    </>
  );
}
