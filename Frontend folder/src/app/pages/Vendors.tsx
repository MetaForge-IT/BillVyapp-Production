import { useState, useMemo, useEffect, useCallback } from "react";
import { toast } from "../components/ui/hot-toast";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { Dialog, DialogContent, DialogTitle } from "../components/ui/dialog";
import {
  Truck, Plus, Search, Eye, Mail, Phone, MapPin, Package, CheckCircle2, AlertTriangle, Loader2,
  Power, PowerOff,
} from "lucide-react";
import { Pagination } from "../components/shared/Pagination";
import { useTablePagination } from "../hooks/useTablePagination";
import {
  createVendor,
  fetchVendors,
  updateVendor,
  type VendorRecord,
} from "../../api/vendors";
import { getApiErrorMessage } from "../../lib/api";
import { useRole } from "../context/RoleContext";

type VendorRow = {
  id: string;
  name: string;
  contact: string;
  email: string;
  phone: string;
  address: string;
  category: string;
  products: number;
  status: "active" | "inactive";
};

function mapVendor(vendor: VendorRecord): VendorRow {
  return {
    id: vendor.id,
    name: vendor.name,
    contact: vendor.contactPerson,
    email: vendor.email,
    phone: vendor.phone,
    address: vendor.address,
    category: vendor.paymentTerms || "General",
    products: vendor.productCount,
    status: vendor.status,
  };
}

export function Vendors({ onVendorsChanged }: { onVendorsChanged?: () => void } = {}) {
  const { role } = useRole();
  const [vendors, setVendors] = useState<VendorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [isAddVendorOpen, setIsAddVendorOpen] = useState(false);
  const [isViewVendorOpen, setIsViewVendorOpen] = useState(false);
  const [isDeactivateOpen, setIsDeactivateOpen] = useState(false);
  const [deactivateTarget, setDeactivateTarget] = useState<any>(null);
  const [deactivateReason, setDeactivateReason] = useState("");
  const [deactivateCustom, setDeactivateCustom] = useState("");
  const [selectedVendor, setSelectedVendor] = useState<VendorRow | null>(null);

  const [newVendor, setNewVendor] = useState({
    name: "", contact: "", email: "", phone: "", address: "", category: "", status: "active"
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const loadVendors = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await fetchVendors();
      setVendors(rows.map(mapVendor));
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to load vendors"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadVendors();
  }, [loadVendors]);

  const filtered = vendors.filter(v =>
    v.name.toLowerCase().includes(search.toLowerCase()) ||
    v.contact.toLowerCase().includes(search.toLowerCase()) ||
    v.category.toLowerCase().includes(search.toLowerCase())
  );

  const { page, setPage, pageSize, setPageSize, paginate } = useTablePagination(filtered.length, [search]);
  const paginatedVendors = useMemo(() => paginate(filtered), [filtered, paginate]);

  const validateVendor = () => {
    const errors: Record<string, string> = {};
    if (!newVendor.name.trim()) errors.name = "Vendor name is required";
    if (!newVendor.contact.trim()) errors.contact = "Contact person is required";
    if (!newVendor.email.trim()) errors.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newVendor.email)) errors.email = "Valid email is required";
    if (!newVendor.phone.trim()) errors.phone = "Phone is required";
    if (!newVendor.address.trim()) errors.address = "Address is required";
    if (!newVendor.category.trim()) errors.category = "Category is required";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAddVendor = async () => {
    if (!validateVendor()) return;
    setSaving(true);
    try {
      const created = await createVendor({
        name: newVendor.name,
        contactPerson: newVendor.contact,
        email: newVendor.email,
        phone: newVendor.phone,
        address: newVendor.address,
        paymentTerms: newVendor.category,
        status: newVendor.status as "active" | "inactive",
      });
      setVendors((prev) => [...prev, mapVendor(created)]);
      onVendorsChanged?.();
      setNewVendor({ name: "", contact: "", email: "", phone: "", address: "", category: "", status: "active" });
      setFormErrors({});
      setIsAddVendorOpen(false);
      toast.success("Vendor added successfully");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to add vendor"));
    } finally {
      setSaving(false);
    }
  };

  const openViewVendor = (vendor: VendorRow) => {
    setSelectedVendor(vendor);
    setIsViewVendorOpen(true);
  };

  const confirmDeactivate = async () => {
    if (!deactivateTarget) return;
    setSaving(true);
    try {
      const nextStatus = deactivateTarget.status === "active" ? "inactive" : "active";
      const updated = await updateVendor(deactivateTarget.id, { status: nextStatus });
      setVendors((prev) => prev.map((v) => (v.id === updated.id ? mapVendor(updated) : v)));
      onVendorsChanged?.();
      toast.success(`${deactivateTarget.name} ${nextStatus === "active" ? "reactivated" : "deactivated"}.`);
      setIsDeactivateOpen(false);
      setDeactivateTarget(null);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to update vendor status"));
    } finally {
      setSaving(false);
    }
  };

  const openDeactivate = (vendor: VendorRow) => {
    setDeactivateTarget(vendor);
    setDeactivateReason("");
    setDeactivateCustom("");
    setIsDeactivateOpen(true);
  };

  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#FAF8F2] border border-[#D4AF37]/20">
            <Truck className="h-6 w-6 text-[#121212]" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-[#121212]">Vendors</h1>
            <p className="text-sm text-[#6B6B6B]">Manage vendor relationships</p>
          </div>
        </div>
        {role !== "admin" && (
          <Button className="bg-gradient-to-r from-[#1a1a1a] to-[#2d2d2d] shadow-lg shadow-[#d4af37]/30" onClick={() => { setNewVendor({ name: "", contact: "", email: "", phone: "", address: "", category: "", status: "active" }); setFormErrors({}); setIsAddVendorOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Add Vendor
          </Button>
        )}
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative min-w-0 flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search vendors by name, contact, category..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Truck className="h-5 w-5 text-[#1a1a1a]" />
            All Vendors ({vendors.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading vendors…
            </div>
          ) : (
          <>
          <div className="divide-y divide-black/[0.06] lg:hidden">
            {paginatedVendors.map((vendor) => (
              <article key={vendor.id} className="space-y-3 p-4 sm:p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#111118] text-[13px] font-black text-[#D4AF37]">
                      {vendor.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-[15px] font-bold text-[#111118]">{vendor.name}</p>
                      <p className="truncate text-[12px] text-[#6b6b6b]">{vendor.contact}</p>
                    </div>
                  </div>
                  <Badge className={vendor.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}>
                    {vendor.status === "active" ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <div className="space-y-2 rounded-xl border border-black/[0.06] bg-[#FAF8F2] p-3">
                  <p className="flex items-center gap-2 text-[12px] text-[#3d3d3d]"><Phone className="h-3.5 w-3.5 text-[#D4AF37]" />{vendor.phone}</p>
                  <p className="flex items-center gap-2 text-[12px] text-[#3d3d3d]"><Mail className="h-3.5 w-3.5 text-[#D4AF37]" />{vendor.email}</p>
                  <p className="flex items-start gap-2 text-[12px] text-[#6b6b6b]"><MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#D4AF37]" />{vendor.address}</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-xl bg-[#FAF8F2] px-3 py-2.5">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-[#9a9a9a]">Category</p>
                    <p className="mt-1 truncate text-[13px] font-bold">{vendor.category}</p>
                  </div>
                  <div className="rounded-xl border border-[#D4AF37]/20 bg-[#FFFBEB] px-3 py-2.5">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-[#9a7d20]">Products</p>
                    <p className="mt-1 text-[15px] font-black text-[#9a7d20]">{vendor.products}</p>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" className="h-10 rounded-xl" onClick={() => openViewVendor(vendor)}>
                    <Eye className="mr-1.5 h-3.5 w-3.5" /> View
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className={`h-10 rounded-xl ${vendor.status === "active" ? "border-red-200 text-red-500" : "border-emerald-200 text-emerald-600"}`}
                    onClick={() => openDeactivate(vendor)}
                  >
                    {vendor.status === "active" ? "Deactivate" : "Activate"}
                  </Button>
                </div>
              </article>
            ))}
            {filtered.length === 0 && (
              <div className="py-10 text-center text-sm text-muted-foreground">No vendors found matching your search.</div>
            )}
          </div>

          <div className="hidden overflow-x-auto lg:block">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Vendor</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Contact</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Category</th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-muted-foreground">Products</th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-muted-foreground">Status</th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedVendors.map(v => (
                  <tr key={v.id} className="border-b border-border hover:bg-muted/20 transition-colors">
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-medium text-sm">{v.name}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" />{v.address}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div>
                        <p className="text-sm">{v.contact}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="h-3 w-3" />{v.phone}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm">{v.category}</td>
                    <td className="py-3 px-4 text-center text-sm font-medium">{v.products}</td>
                    <td className="py-3 px-4 text-center">
                      <Badge className={v.status === "active" ? "bg-green-100 text-green-700 hover:bg-green-100" : "bg-gray-100 text-gray-700 hover:bg-gray-100"}>
                        {v.status === "active" ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openViewVendor(v)}>
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" variant="outline"
                          className={`text-xs h-7 ${v.status === "active" ? "border-red-200 text-red-500 hover:bg-red-50" : "border-emerald-200 text-emerald-600 hover:bg-emerald-50"}`}
                          onClick={() => openDeactivate(v)}>
                          {v.status === "active" ? "Deactivate" : "Activate"}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-muted-foreground text-sm">
                      No vendors found matching your search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          </>
          )}
          <Pagination
            page={page}
            pageSize={pageSize}
            totalRecords={filtered.length}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </CardContent>
      </Card>

      {/* Add Vendor Modal */}
      <Dialog open={isAddVendorOpen} onOpenChange={setIsAddVendorOpen}>
        <DialogContent className="w-[min(95vw,36rem)] max-w-none p-0 gap-0 overflow-hidden rounded-2xl [&>button:last-of-type]:hidden">
          {/* Header */}
          <div className="bg-[#111118] px-6 py-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-[#d4af37]/15 border border-[#d4af37]/20 flex items-center justify-center">
                <Truck className="h-5 w-5 text-[#d4af37]" />
              </div>
              <div>
                <DialogTitle className="text-white font-bold text-[14px] leading-tight">Add New Vendor</DialogTitle>
                <p className="text-gray-500 text-[11px] mt-0.5">Fill in all required fields to add a vendor</p>
              </div>
            </div>
            <button onClick={() => setIsAddVendorOpen(false)} className="h-8 w-8 rounded-lg bg-white/06 hover:bg-white/12 flex items-center justify-center text-gray-400 hover:text-white transition-all text-lg leading-none">×</button>
          </div>

          <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
            {/* Vendor Name */}
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Vendor Name <span className="text-[#d4af37]">*</span></p>
              <input value={newVendor.name} onChange={e => setNewVendor({ ...newVendor, name: e.target.value })}
                placeholder="e.g. Beauty World"
                className="w-full h-10 px-3.5 rounded-xl border border-gray-200 bg-gray-50 text-[13px] text-[#111118] focus:outline-none focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/12 focus:bg-white transition-all placeholder:text-gray-300" />
              {formErrors.name && <p className="text-[11px] text-red-500 mt-1">{formErrors.name}</p>}
            </div>

            {/* Contact Person + Email */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Contact Person <span className="text-[#d4af37]">*</span></p>
                <div className="relative">
                  <CheckCircle2 className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-300 pointer-events-none" />
                  <input value={newVendor.contact} onChange={e => setNewVendor({ ...newVendor, contact: e.target.value })}
                    placeholder="e.g. Rajesh Kumar"
                    className="w-full h-10 pl-9 pr-3.5 rounded-xl border border-gray-200 bg-gray-50 text-[13px] text-[#111118] focus:outline-none focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/12 focus:bg-white transition-all placeholder:text-gray-300" />
                </div>
                {formErrors.contact && <p className="text-[11px] text-red-500">{formErrors.contact}</p>}
              </div>
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Email <span className="text-[#d4af37]">*</span></p>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-300 pointer-events-none" />
                  <input type="email" value={newVendor.email} onChange={e => setNewVendor({ ...newVendor, email: e.target.value })}
                    placeholder="e.g. rajesh@beautyworld.in"
                    className="w-full h-10 pl-9 pr-3.5 rounded-xl border border-gray-200 bg-gray-50 text-[13px] text-[#111118] focus:outline-none focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/12 focus:bg-white transition-all placeholder:text-gray-300" />
                </div>
                {formErrors.email && <p className="text-[11px] text-red-500">{formErrors.email}</p>}
              </div>
            </div>

            {/* Phone */}
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Phone <span className="text-[#d4af37]">*</span></p>
              <div className="flex gap-2">
                <div className="h-10 px-3.5 rounded-xl border border-gray-200 bg-[#111118] flex items-center shrink-0">
                  <Phone className="h-3.5 w-3.5 text-[#d4af37] mr-1.5" />
                  <span className="text-[13px] font-bold text-white">+91</span>
                </div>
                <input value={newVendor.phone.replace(/^\+91\s?/, "")} onChange={e => setNewVendor({ ...newVendor, phone: "+91 " + e.target.value })}
                  placeholder="98765 11111"
                  className="flex-1 h-10 px-3.5 rounded-xl border border-gray-200 bg-gray-50 text-[13px] text-[#111118] focus:outline-none focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/12 focus:bg-white transition-all placeholder:text-gray-300" />
              </div>
              {formErrors.phone && <p className="text-[11px] text-red-500">{formErrors.phone}</p>}
            </div>

            {/* Address + Category */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Address <span className="text-[#d4af37]">*</span></p>
                <div className="relative">
                  <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-300 pointer-events-none" />
                  <input value={newVendor.address} onChange={e => setNewVendor({ ...newVendor, address: e.target.value })}
                    placeholder="e.g. Mumbai, Maharashtra"
                    className="w-full h-10 pl-9 pr-3.5 rounded-xl border border-gray-200 bg-gray-50 text-[13px] text-[#111118] focus:outline-none focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/12 focus:bg-white transition-all placeholder:text-gray-300" />
                </div>
                {formErrors.address && <p className="text-[11px] text-red-500">{formErrors.address}</p>}
              </div>
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Category <span className="text-[#d4af37]">*</span></p>
                <div className="relative">
                  <Package className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-300 pointer-events-none" />
                  <input value={newVendor.category} onChange={e => setNewVendor({ ...newVendor, category: e.target.value })}
                    placeholder="e.g. Hair Care, Color..."
                    className="w-full h-10 pl-9 pr-3.5 rounded-xl border border-gray-200 bg-gray-50 text-[13px] text-[#111118] focus:outline-none focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/12 focus:bg-white transition-all placeholder:text-gray-300" />
                </div>
                {formErrors.category && <p className="text-[11px] text-red-500">{formErrors.category}</p>}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/60 flex items-center justify-end gap-2">
            <button onClick={() => setIsAddVendorOpen(false)}
              className="h-10 px-5 rounded-xl border border-gray-200 bg-white text-[13px] font-semibold text-gray-600 hover:bg-gray-50 transition-all">
              Cancel
            </button>
            <button onClick={() => void handleAddVendor()} disabled={saving}
              className="h-10 px-6 rounded-xl bg-gradient-to-r from-[#d4af37] to-[#b8962e] text-[13px] font-bold text-black transition-all flex items-center gap-2 shadow-md shadow-[#d4af37]/20">
              <Plus className="h-4 w-4" /> {saving ? "Saving…" : "Add Vendor"}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Vendor Modal */}
      <Dialog open={isViewVendorOpen} onOpenChange={setIsViewVendorOpen}>
        <DialogContent className="w-[min(95vw,34rem)] max-w-none p-0 gap-0 overflow-hidden rounded-2xl [&>button:last-of-type]:hidden">
          {/* Header */}
          <div className="bg-[#111118] px-6 py-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-[#d4af37]/15 border border-[#d4af37]/20 flex items-center justify-center">
                <Truck className="h-5 w-5 text-[#d4af37]" />
              </div>
              <div>
                <p className="text-white font-bold text-[14px] leading-tight">Vendor Details</p>
                <p className="text-gray-500 text-[11px] mt-0.5">{selectedVendor?.category}</p>
              </div>
            </div>
            <button onClick={() => setIsViewVendorOpen(false)} className="h-8 w-8 rounded-lg bg-white/06 hover:bg-white/12 flex items-center justify-center text-gray-400 hover:text-white transition-all text-lg leading-none">×</button>
          </div>

          {selectedVendor && (
            <div className="px-6 py-5 space-y-4 bg-[#faf8f2]">
              {/* Hero card */}
              <div className="flex items-center gap-4 p-4 rounded-xl bg-white border border-gray-200">
                <div className="h-12 w-12 rounded-xl bg-[#111118] flex items-center justify-center shrink-0 text-[#d4af37] font-black text-[16px]">
                  {selectedVendor.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-bold text-[#111118]">{selectedVendor.name}</p>
                  <p className="text-[12px] text-gray-500 mt-0.5">{selectedVendor.contact}</p>
                </div>
                <Badge className={selectedVendor.status === "active" ? "bg-emerald-100 text-emerald-700 border-emerald-200" : "bg-gray-100 text-gray-500 border-gray-200"}>
                  {selectedVendor.status === "active" ? "Active" : "Inactive"}
                </Badge>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-white border border-gray-200 text-center">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Products Supplied</p>
                  <p className="text-[22px] font-black text-[#111118]">{selectedVendor.products}</p>
                </div>
                <div className="p-3 rounded-xl bg-white border border-gray-200 text-center">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Category</p>
                  <p className="text-[13px] font-bold text-[#111118] mt-1">{selectedVendor.category}</p>
                </div>
              </div>

              {/* Contact info */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#b8962e] mb-3">Contact Info</p>
                <div className="space-y-2">
                  {[
                    { icon: Mail, label: selectedVendor.email },
                    { icon: Phone, label: selectedVendor.phone },
                    { icon: MapPin, label: selectedVendor.address },
                  ].map(({ icon: Icon, label }) => (
                    <div key={label} className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-white border border-gray-200">
                      <div className="h-7 w-7 rounded-lg bg-[#111118] flex items-center justify-center shrink-0">
                        <Icon className="h-3.5 w-3.5 text-[#d4af37]" />
                      </div>
                      <span className="text-[13px] text-[#111118]">{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-100 bg-white flex items-center justify-between">
            <button
              onClick={() => { setIsViewVendorOpen(false); setTimeout(() => openDeactivate(selectedVendor), 150); }}
              className={`h-10 px-4 rounded-xl text-[13px] font-semibold flex items-center gap-2 transition-all border ${selectedVendor?.status === "active" ? "border-red-200 text-red-500 hover:bg-red-50" : "border-emerald-200 text-emerald-600 hover:bg-emerald-50"}`}>
              {selectedVendor?.status === "active" ? <PowerOff className="h-3.5 w-3.5" /> : <Power className="h-3.5 w-3.5" />}
              {selectedVendor?.status === "active" ? "Deactivate" : "Activate"}
            </button>
            <button onClick={() => setIsViewVendorOpen(false)}
              className="h-10 px-5 rounded-xl border border-gray-200 bg-white text-[13px] font-semibold text-gray-600 hover:bg-gray-50 transition-all">
              Close
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Deactivate / Activate Vendor Dialog */}
      <Dialog open={isDeactivateOpen} onOpenChange={setIsDeactivateOpen}>
        <DialogContent className="w-[min(95vw,32rem)] max-w-none p-0 gap-0 overflow-hidden rounded-2xl [&>button:last-of-type]:hidden">
          {/* Header */}
          <div className={`px-6 py-5 flex items-center justify-between ${deactivateTarget?.status === "active" ? "bg-red-600" : "bg-emerald-600"}`}>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center">
                {deactivateTarget?.status === "active"
                  ? <PowerOff className="h-5 w-5 text-white" />
                  : <Power className="h-5 w-5 text-white" />}
              </div>
              <div>
                <DialogTitle className="text-white font-bold text-[14px] leading-tight">
                  {deactivateTarget?.status === "active" ? "Deactivate Vendor" : "Reactivate Vendor"}
                </DialogTitle>
                <p className="text-white/60 text-[11px] mt-0.5">{deactivateTarget?.name}</p>
              </div>
            </div>
            <button onClick={() => setIsDeactivateOpen(false)} className="h-8 w-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/60 hover:text-white transition-all text-lg leading-none">×</button>
          </div>

          <div className="px-6 py-5 space-y-4 bg-[#faf8f2]">
            {/* Vendor card */}
            {deactivateTarget && (
              <div className="flex items-center gap-3 p-3.5 rounded-xl bg-white border border-gray-200">
                <div className="h-10 w-10 rounded-xl bg-[#111118] flex items-center justify-center shrink-0 text-[#d4af37] font-black text-[13px]">
                  {deactivateTarget.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-bold text-[#111118]">{deactivateTarget.name}</p>
                  <p className="text-[11px] text-gray-500">{deactivateTarget.contact} · {deactivateTarget.category}</p>
                </div>
                <Badge className={deactivateTarget.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"}>
                  {deactivateTarget.status === "active" ? "Active" : "Inactive"}
                </Badge>
              </div>
            )}

            {deactivateTarget?.status === "active" ? (
              <>
                {/* Reason pills */}
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#b8962e] mb-3">Reason for Deactivation <span className="text-[#d4af37]">*</span></p>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      "Poor product quality",
                      "Delayed deliveries",
                      "Price not competitive",
                      "Contract ended",
                      "Switching supplier",
                      "Other",
                    ].map((r) => (
                      <button key={r} type="button"
                        onClick={() => setDeactivateReason(r)}
                        className={`h-9 px-3 rounded-xl text-[12px] font-semibold border transition-all text-left ${deactivateReason === r ? "bg-red-600 text-white border-red-600" : "bg-white text-gray-600 border-gray-200 hover:border-red-300 hover:text-red-600"}`}>
                        {r}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom note */}
                <div className="space-y-1.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Additional Notes <span className="text-gray-400 normal-case font-normal">optional</span></p>
                  <textarea
                    rows={2}
                    value={deactivateCustom}
                    onChange={e => setDeactivateCustom(e.target.value)}
                    placeholder="Add any additional context..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white text-[13px] text-[#111118] resize-none focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-400/12 transition-all placeholder:text-gray-300"
                  />
                </div>

                {/* Warning */}
                <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-red-50 border border-red-100">
                  <AlertTriangle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                  <p className="text-[12px] text-red-600">Deactivating this vendor will hide them from active supplier lists. You can reactivate anytime.</p>
                </div>
              </>
            ) : (
              <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-100">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                <p className="text-[12px] text-emerald-700">Reactivating this vendor will restore them to your active supplier list and allow new orders.</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-100 bg-white flex items-center justify-end gap-2">
            <button onClick={() => setIsDeactivateOpen(false)}
              className="h-10 px-5 rounded-xl border border-gray-200 bg-white text-[13px] font-semibold text-gray-600 hover:bg-gray-50 transition-all">
              Cancel
            </button>
            <button
              disabled={deactivateTarget?.status === "active" && !deactivateReason}
              onClick={confirmDeactivate}
              className={`h-10 px-6 rounded-xl text-[13px] font-bold text-white transition-all flex items-center gap-2 shadow-md disabled:opacity-40 ${deactivateTarget?.status === "active" ? "bg-red-600 hover:bg-red-700 shadow-red-500/20" : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20"}`}>
              {deactivateTarget?.status === "active"
                ? <><PowerOff className="h-4 w-4" /> Deactivate</>
                : <><Power className="h-4 w-4" /> Reactivate</>}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
