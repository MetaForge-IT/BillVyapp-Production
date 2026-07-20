import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "../components/ui/select";
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "../components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "../components/ui/dialog";
import {
  Receipt, Search, Download, Mail, Eye, IndianRupee, FileCheck, Clock, AlertCircle,
  Printer, FileText, Calendar, FileSpreadsheet, X, Send, Check,
} from "lucide-react";
import { Pagination } from "../components/shared/Pagination";
import { useTablePagination } from "../hooks/useTablePagination";
import { fetchInvoices, type InvoiceResponse } from "../../api/billing";

interface Invoice {
  id: string;
  invoiceNo: string;
  date: string;
  dueDate: string;
  customer: string;
  phone: string;
  services: string[];
  subtotal: number;
  discount: number;
  gst: number;
  total: number;
  status: "paid" | "pending" | "overdue";
  paymentMethod?: string;
}


function mapApiInvoice(inv: InvoiceResponse): Invoice {
  const statusRaw = (inv.paymentStatus || inv.status || "").toLowerCase();
  let status: Invoice["status"] = "pending";
  if (statusRaw === "paid" || inv.paymentStatus === "PAID") status = "paid";
  else if (statusRaw === "overdue") status = "overdue";
  return {
    id: inv.id,
    invoiceNo: inv.receiptNumber || inv.receiptNo || inv.id,
    date: inv.date || new Date().toISOString().slice(0, 10),
    dueDate: inv.dueDate || inv.date || "",
    customer: inv.customer || "Walk-in",
    phone: inv.phone || "",
    services: inv.services || [],
    subtotal: inv.subtotal ?? inv.totalAmount ?? 0,
    discount: inv.discount ?? 0,
    gst: inv.gst ?? 0,
    total: inv.total ?? inv.totalAmount ?? 0,
    status,
    paymentMethod: inv.paymentMethod,
  };
}

function statusBadge(status: Invoice["status"]) {
  if (status === "paid")
    return <Badge className="bg-green-100 text-green-700 border-green-200 flex items-center gap-1"><FileCheck className="h-3 w-3" /> Paid</Badge>;
  if (status === "pending")
    return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200 flex items-center gap-1"><Clock className="h-3 w-3" /> Pending</Badge>;
  return <Badge className="bg-red-100 text-red-700 border-red-200 flex items-center gap-1"><AlertCircle className="h-3 w-3" /> Overdue</Badge>;
}

export function Invoices() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const [viewInvoice, setViewInvoice] = useState<Invoice | null>(null);
  const [emailInvoice, setEmailInvoice] = useState<Invoice | null>(null);
  const [downloadInvoice, setDownloadInvoice] = useState<Invoice | null>(null);
  const [exportModal, setExportModal] = useState<boolean>(false);

  const [emailTo, setEmailTo] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailMessage, setEmailMessage] = useState("");
  const [emailSent, setEmailSent] = useState(false);

  const [downloadFormat, setDownloadFormat] = useState<"PDF" | "CSV" | "Excel">("PDF");

  const [exportFormat, setExportFormat] = useState<"PDF" | "CSV" | "Excel">("PDF");
  const [exportStatus, setExportStatus] = useState<string>("all");
  const [exportFrom, setExportFrom] = useState("");
  const [exportTo, setExportTo] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetchInvoices()
      .then((data) => {
        if (!cancelled) setInvoices(data.map(mapApiInvoice));
      })
      .catch(() => {
        if (!cancelled) setInvoices([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    return invoices.filter((inv) => {
      const matchesSearch =
        inv.invoiceNo.toLowerCase().includes(search.toLowerCase()) ||
        inv.customer.toLowerCase().includes(search.toLowerCase()) ||
        inv.phone.includes(search);
      const matchesStatus = statusFilter === "all" || inv.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [search, statusFilter]);

  const { page, setPage, pageSize, setPageSize, paginate } = useTablePagination(
    filtered.length,
    [search, statusFilter],
  );
  const paginatedInvoices = useMemo(() => paginate(filtered), [filtered, paginate]);

  const totalInvoices = invoices.length;
  const totalPaid = invoices.filter((i) => i.status === "paid").length;
  const totalPending = invoices.filter((i) => i.status === "pending").length;
  const totalOverdue = invoices.filter((i) => i.status === "overdue").length;
  const totalAmount = invoices.reduce((sum, i) => sum + i.total, 0);
  const pendingAmount = invoices.filter((i) => i.status === "pending" || i.status === "overdue").reduce((sum, i) => sum + i.total, 0);

  const openView = (inv: Invoice) => {
    setViewInvoice(inv);
  };

  const openEmail = (inv: Invoice) => {
    setEmailInvoice(inv);
    setEmailTo("");
    setEmailSubject(`Invoice ${inv.invoiceNo} from BillVyapp`);
    setEmailMessage(`Dear ${inv.customer},\n\nPlease find attached your invoice ${inv.invoiceNo} for services rendered.\n\nThank you for choosing BillVyapp!\n\nBest regards,\nBillVyapp Team`);
    setEmailSent(false);
  };

  const openDownload = (inv: Invoice) => {
    setDownloadInvoice(inv);
    setDownloadFormat("PDF");
  };

  const handleSendEmail = () => {
    setEmailSent(true);
  };

  const handleDownload = () => {
    if (!downloadInvoice) return;
    alert(`Simulated download: ${downloadInvoice.invoiceNo}.${downloadFormat.toLowerCase()}`);
  };

  const handleExport = () => {
    alert(`Simulated export: ${exportFormat} | Status: ${exportStatus} | From: ${exportFrom || "Any"} To: ${exportTo || "Any"}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#FAF8F2] border border-[#D4AF37]/20">
          <Receipt className="h-6 w-6 text-[#121212]" />
        </div>
        <div>
          <h1 className="text-2xl text-manrope-semibold text-[#121212]">Invoices</h1>
          <p className="text-sm text-inter-regular text-[#6B6B6B]">Manage invoices, track payments, and send reminders</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-2 border-[#d4af37]/30 bg-gradient-to-br from-amber-50 to-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Invoices</p>
                <p className="text-3xl font-bold text-[#1a1a1a]">{totalInvoices}</p>
              </div>
              <Receipt className="h-10 w-10 text-[#1a1a1a]/30" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-2 border-green-200 bg-gradient-to-br from-green-50 to-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Paid</p>
                <p className="text-3xl font-bold text-green-600">{totalPaid}</p>
              </div>
              <FileCheck className="h-10 w-10 text-green-600/30" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-2 border-yellow-200 bg-gradient-to-br from-yellow-50 to-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-3xl font-bold text-[#d4af37]">{totalPending}</p>
              </div>
              <Clock className="h-10 w-10 text-[#d4af37]/30" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-2 border-red-200 bg-gradient-to-br from-red-50 to-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Overdue</p>
                <p className="text-3xl font-bold text-red-600">{totalOverdue}</p>
              </div>
              <AlertCircle className="h-10 w-10 text-red-600/30" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Summary Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-gradient-to-r from-[#1a1a1a] to-[#2d2d2d] rounded-xl p-4 text-white">
        <div className="flex items-center gap-4">
          <div>
            <p className="text-xs text-[#d4af37]">Total Invoice Value</p>
            <p className="text-xl font-bold">₹{totalAmount.toLocaleString()}</p>
          </div>
          <div className="h-8 w-px bg-white/20" />
          <div>
            <p className="text-xs text-yellow-300">Pending / Overdue</p>
            <p className="text-xl font-bold">₹{pendingAmount.toLocaleString()}</p>
          </div>
        </div>
        <div className="flex gap-2">
        </div>
      </div>

      {/* Filters */}
      <Card className="shadow-md">
        <CardContent className="pt-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by invoice #, customer, phone..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Invoices Table */}
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Invoice List</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Services</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedInvoices.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell>
                      <span className="font-mono font-semibold text-sm">{inv.invoiceNo}</span>
                    </TableCell>
                    <TableCell className="text-sm">{inv.date}</TableCell>
                    <TableCell className="text-sm">{inv.dueDate}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">{inv.customer}</p>
                        <p className="text-xs text-muted-foreground">{inv.phone}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {inv.services.map((s, i) => (
                          <Badge key={i} variant="outline" className="text-xs">{s}</Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      <div className="flex items-center justify-end gap-1">
                        <IndianRupee className="h-3.5 w-3.5" />
                        {inv.total.toLocaleString()}
                      </div>
                    </TableCell>
                    <TableCell>{statusBadge(inv.status)}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1.5">
                        <Button size="sm" variant="outline" className="h-8" onClick={() => openView(inv)}>
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" variant="outline" className="h-8" onClick={() => openEmail(inv)}>
                          <Mail className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" variant="outline" className="h-8" onClick={() => openDownload(inv)}>
                          <Download className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                      No invoices found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <Pagination
            page={page}
            pageSize={pageSize}
            totalRecords={filtered.length}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </CardContent>
      </Card>

      {/* View Invoice Modal */}
      <Dialog open={!!viewInvoice} onOpenChange={(open) => !open && setViewInvoice(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-[#D4AF37]" />
              View Invoice
            </DialogTitle>
            <DialogDescription>
              Invoice details for {viewInvoice?.customer}
            </DialogDescription>
          </DialogHeader>
          {viewInvoice && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Invoice No</p>
                  <p className="font-semibold">{viewInvoice.invoiceNo}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <div className="mt-0.5">{statusBadge(viewInvoice.status)}</div>
                </div>
                <div>
                  <p className="text-muted-foreground">Date</p>
                  <p className="font-semibold">{viewInvoice.date}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Due Date</p>
                  <p className="font-semibold">{viewInvoice.dueDate}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Customer</p>
                  <p className="font-semibold">{viewInvoice.customer}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Phone</p>
                  <p className="font-semibold">{viewInvoice.phone}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-muted-foreground">Payment Method</p>
                  <p className="font-semibold">{viewInvoice.paymentMethod || "N/A"}</p>
                </div>
              </div>

              <div className="border rounded-lg p-3 space-y-2">
                <p className="text-sm font-semibold">Services</p>
                {viewInvoice.services.map((s, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span>{s}</span>
                  </div>
                ))}
                <div className="border-t pt-2 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-semibold">₹{viewInvoice.subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Discount</span>
                    <span className="font-semibold text-green-600">-₹{viewInvoice.discount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">GST</span>
                    <span className="font-semibold">₹{viewInvoice.gst.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-base font-bold">
                    <span>Total</span>
                    <span>₹{viewInvoice.total.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewInvoice(null)}>
              <X className="h-4 w-4 mr-2" />
              Close
            </Button>
            <Button variant="outline" onClick={() => alert("Print invoice: " + viewInvoice?.invoiceNo)}>
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
            <Button className="bg-[#D4AF37] text-white hover:bg-[#b8962e]" onClick={() => alert("Download invoice: " + viewInvoice?.invoiceNo)}>
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send Invoice Modal */}
      <Dialog open={!!emailInvoice} onOpenChange={(open) => !open && setEmailInvoice(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-[#D4AF37]" />
              Send Invoice
            </DialogTitle>
            <DialogDescription>
              Email {emailInvoice?.invoiceNo} to {emailInvoice?.customer}
            </DialogDescription>
          </DialogHeader>
          {emailSent ? (
            <div className="flex flex-col items-center justify-center py-8 space-y-3">
              <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                <Check className="h-6 w-6 text-green-600" />
              </div>
              <p className="text-lg font-semibold text-green-700">Email Sent Successfully!</p>
              <p className="text-sm text-muted-foreground">Invoice {emailInvoice?.invoiceNo} has been sent to {emailTo || "the recipient"}.</p>
              <Button className="mt-2" onClick={() => setEmailInvoice(null)}>
                Close
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">To Email</label>
                <Input
                  placeholder="customer@example.com"
                  value={emailTo}
                  onChange={(e) => setEmailTo(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Subject</label>
                <Input
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Message</label>
                <textarea
                  className="w-full min-h-[120px] rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={emailMessage}
                  onChange={(e) => setEmailMessage(e.target.value)}
                />
              </div>
            </div>
          )}
          {!emailSent && (
            <DialogFooter>
              <Button variant="outline" onClick={() => setEmailInvoice(null)}>
                Cancel
              </Button>
              <Button className="bg-[#D4AF37] text-white hover:bg-[#b8962e]" onClick={handleSendEmail}>
                <Send className="h-4 w-4 mr-2" />
                Send
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {/* Download Invoice Modal */}
      <Dialog open={!!downloadInvoice} onOpenChange={(open) => !open && setDownloadInvoice(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Download className="h-5 w-5 text-[#D4AF37]" />
              Download Invoice
            </DialogTitle>
            <DialogDescription>
              Choose format for {downloadInvoice?.invoiceNo}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2">
              <Button
                variant={downloadFormat === "PDF" ? "default" : "outline"}
                className={downloadFormat === "PDF" ? "bg-[#D4AF37] text-white hover:bg-[#b8962e]" : ""}
                onClick={() => setDownloadFormat("PDF")}
              >
                <FileText className="h-4 w-4 mr-2" />
                PDF
              </Button>
              <Button
                variant={downloadFormat === "CSV" ? "default" : "outline"}
                className={downloadFormat === "CSV" ? "bg-[#D4AF37] text-white hover:bg-[#b8962e]" : ""}
                onClick={() => setDownloadFormat("CSV")}
              >
                <FileText className="h-4 w-4 mr-2" />
                CSV
              </Button>
              <Button
                variant={downloadFormat === "Excel" ? "default" : "outline"}
                className={downloadFormat === "Excel" ? "bg-[#D4AF37] text-white hover:bg-[#b8962e]" : ""}
                onClick={() => setDownloadFormat("Excel")}
              >
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Excel
              </Button>
            </div>
            <div className="text-sm text-muted-foreground">
              Downloading <span className="font-semibold text-foreground">{downloadInvoice?.invoiceNo}</span> as <span className="font-semibold text-foreground">{downloadFormat}</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDownloadInvoice(null)}>
              Cancel
            </Button>
            <Button className="bg-[#D4AF37] text-white hover:bg-[#b8962e]" onClick={handleDownload}>
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Export Invoices Modal */}
      <Dialog open={exportModal} onOpenChange={(open) => !open && setExportModal(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Download className="h-5 w-5 text-[#D4AF37]" />
              Export Invoices
            </DialogTitle>
            <DialogDescription>
              Filter and export your invoice list
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Format</label>
              <div className="grid grid-cols-3 gap-2 mt-1.5">
                <Button
                  variant={exportFormat === "PDF" ? "default" : "outline"}
                  className={exportFormat === "PDF" ? "bg-[#D4AF37] text-white hover:bg-[#b8962e]" : ""}
                  onClick={() => setExportFormat("PDF")}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  PDF
                </Button>
                <Button
                  variant={exportFormat === "CSV" ? "default" : "outline"}
                  className={exportFormat === "CSV" ? "bg-[#D4AF37] text-white hover:bg-[#b8962e]" : ""}
                  onClick={() => setExportFormat("CSV")}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  CSV
                </Button>
                <Button
                  variant={exportFormat === "Excel" ? "default" : "outline"}
                  className={exportFormat === "Excel" ? "bg-[#D4AF37] text-white hover:bg-[#b8962e]" : ""}
                  onClick={() => setExportFormat("Excel")}
                >
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Excel
                </Button>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Status</label>
              <Select value={exportStatus} onValueChange={setExportStatus}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">From Date</label>
                <div className="relative mt-1.5">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input type="date" className="pl-9" value={exportFrom} onChange={(e) => setExportFrom(e.target.value)} />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">To Date</label>
                <div className="relative mt-1.5">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input type="date" className="pl-9" value={exportTo} onChange={(e) => setExportTo(e.target.value)} />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExportModal(false)}>
              Cancel
            </Button>
            <Button className="bg-[#D4AF37] text-white hover:bg-[#b8962e]" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default Invoices;
