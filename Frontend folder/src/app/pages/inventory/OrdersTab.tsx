import type { Dispatch, SetStateAction } from "react";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { cn } from "../../components/ui/utils";
import { Pagination } from "../../components/shared/Pagination";
import type { Product } from "../../context/ProductsContext";
import type { VendorRecord } from "../../../api/vendors";
import type { PurchaseOrderRow } from "../../../lib/inventoryMappers";
import { toast } from "../../components/ui/hot-toast";
import { istDateKey } from "../../../lib/istDate";
import { ShoppingCart, Plus, Receipt } from "lucide-react";
import { CARD_TABLE, TABLE_ROW, orderStatusConfig } from "./inventoryUi";

export type OrdersTabPagination = {
  page: number;
  pageSize: number;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
};

type OrdersTabProps = {
  canManageInventory: boolean;
  products: Product[];
  vendors: VendorRecord[];
  purchaseOrders: PurchaseOrderRow[];
  paginatedOrders: PurchaseOrderRow[];
  ordersLoading: boolean;
  ordersPagination: OrdersTabPagination;
  openVendorBill: () => void;
  setPoForm: Dispatch<SetStateAction<{
    vendorId: string; productId: string; quantity: string; unitCost: string; date: string; notes: string;
  }>>;
  setFormErrors: Dispatch<SetStateAction<Record<string, string>>>;
  setIsCreatePOOpen: (open: boolean) => void;
  openViewPOModal: (po: PurchaseOrderRow) => void;
  handlePOAction: (poId: string, action: string) => void;
};

export function OrdersTab({
  canManageInventory, products, vendors, purchaseOrders, paginatedOrders,
  ordersLoading, ordersPagination, openVendorBill, setPoForm, setFormErrors,
  setIsCreatePOOpen, openViewPOModal, handlePOAction,
}: OrdersTabProps) {
  return (
    <>
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
                        setPoForm({ vendorId: "", productId: "", quantity: "", unitCost: "", date: istDateKey(), notes: "" });
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
    </>
  );
}
