import type { Dispatch, SetStateAction } from "react";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "../../components/ui/table";
import type { ProductCategory } from "../../../api/product-categories";
import { Pencil, Trash2 } from "lucide-react";

export type CategoryFormState = {
  name: string;
  description: string;
  status: "active" | "inactive";
};

type CategoryManagerDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryForm: CategoryFormState;
  setCategoryForm: Dispatch<SetStateAction<CategoryFormState>>;
  editingCategory: ProductCategory | null;
  setEditingCategory: (c: ProductCategory | null) => void;
  productCategories: ProductCategory[];
  saving: boolean;
  resetCategoryForm: () => void;
  handleSaveCategory: () => void | Promise<void>;
  handleDeleteCategory: (category: ProductCategory) => void | Promise<void>;
};

export function CategoryManagerDialog({
  open, onOpenChange, categoryForm, setCategoryForm,
  editingCategory, setEditingCategory, productCategories, saving,
  resetCategoryForm, handleSaveCategory, handleDeleteCategory,
}: CategoryManagerDialogProps) {
  const showCategoryManager = open;
  const setShowCategoryManager = onOpenChange;
  return (
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
  );
}
