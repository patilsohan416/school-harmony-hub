import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { 
  Pencil, Plus, Printer, Save, Search, Trash2, X, 
  Download, Package, TrendingUp, DollarSign, Box, 
  Calendar, Building2, Hash, Tag, User, FileText, 
  RefreshCw, ArrowDownToLine 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api/client";
import * as XLSX from 'xlsx';

// ✅ Stock In Record Interface
interface StockInRecord {
  id: string;
  category: string;
  material: string;
  brandName?: string;
  receiptNumber?: string;
  quantity: number;
  requiredQuantity: number;
  pricePerUnit: number;
  totalAmount: number;
  supplier?: string;
  createdAt: string;
  updatedAt: string;
}

// ✅ Form State Interface
interface FormState {
  category: string;
  material: string;
  brandName: string;
  receiptNumber: string;
  quantity: string;
  requiredQuantity: string;
  pricePerUnit: string;
  totalAmount: string;
  supplier: string;
  date: string;
  endDate: string;
  remarks: string;
}

const EMPTY_FORM: FormState = {
  category: "",
  material: "",
  brandName: "",
  receiptNumber: "",
  quantity: "",
  requiredQuantity: "",
  pricePerUnit: "",
  totalAmount: "",
  supplier: "",
  date: "",
  endDate: "",
  remarks: "",
};

// ✅ Category Options
const CATEGORY_OPTIONS = [
  "Stationery",
  "Books",
  "Furniture",
  "Electronics",
  "Computer Equipment",
  "Cleaning Supplies",
  "Sports Equipment",
  "Laboratory Equipment",
  "Office Supplies",
  "Uniform",
  "Other",
];

// ✅ Helper: Format currency
const formatCurrency = (amount: number): string => {
  if (amount === 0) return "₹0";
  return `₹${amount.toLocaleString('en-IN')}`;
};

export function StockInPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // ✅ Fetch data from database using React Query
  const { data: stockIn, isLoading, refetch } = useQuery({
    queryKey: ["stock-in-list"],
    queryFn: async () => {
      const response = await apiFetch<{ data: StockInRecord[] }>(
        "/stock-in?limit=100&sortBy=createdAt&sortOrder=desc"
      );
      return response.data || [];
    },
  });

  // ✅ Filter Stock In Entries
  const filteredStockIn = useMemo(() => {
    const list = stockIn || [];
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter((item) =>
      (item.material ?? "").toLowerCase().includes(q) ||
      (item.category ?? "").toLowerCase().includes(q) ||
      (item.supplier ?? "").toLowerCase().includes(q) ||
      (item.receiptNumber ?? "").toLowerCase().includes(q) ||
      (item.brandName ?? "").toLowerCase().includes(q)
    );
  }, [stockIn, search]);

  // ✅ Auto-calculate Total Amount
  const calculateTotal = () => {
    const qty = parseFloat(form.quantity) || 0;
    const price = parseFloat(form.pricePerUnit) || 0;
    const total = qty * price;
    setForm((f) => ({ ...f, totalAmount: total > 0 ? String(total) : "" }));
  };

  const handleQuantityChange = (value: string) => {
    setForm((f) => ({ ...f, quantity: value }));
    setTimeout(calculateTotal, 10);
  };

  const handlePriceChange = (value: string) => {
    setForm((f) => ({ ...f, pricePerUnit: value }));
    setTimeout(calculateTotal, 10);
  };

  // ✅ Reset Form
  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
  };

  // ✅ Start Edit
  const startEdit = (record: StockInRecord) => {
    setEditingId(record.id);
    setForm({
      category: record.category || "",
      material: record.material || "",
      brandName: record.brandName || "",
      receiptNumber: record.receiptNumber || "",
      quantity: record.quantity != null ? String(record.quantity) : "",
      requiredQuantity: record.requiredQuantity != null ? String(record.requiredQuantity) : "",
      pricePerUnit: record.pricePerUnit != null ? String(record.pricePerUnit) : "",
      totalAmount: record.totalAmount != null ? String(record.totalAmount) : "",
      supplier: record.supplier || "",
      date: record.createdAt ? record.createdAt.slice(0, 10) : "",
      endDate: "",
      remarks: "",
    });
  };

  // ✅ Save Stock In Entry to Database
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!form.category) {
      toast.error("Please select a category");
      return;
    }
    if (!form.material.trim()) {
      toast.error("Please enter material name");
      return;
    }
    if (!form.quantity || parseFloat(form.quantity) <= 0) {
      toast.error("Please enter a valid quantity");
      return;
    }
    if (!form.pricePerUnit || parseFloat(form.pricePerUnit) <= 0) {
      toast.error("Please enter a valid price per unit");
      return;
    }

    const qty = parseFloat(form.quantity) || 0;
    const price = parseFloat(form.pricePerUnit) || 0;
    const total = qty * price;

    const payload = {
      category: form.category,
      material: form.material.trim(),
      brandName: form.brandName.trim() || undefined,
      receiptNumber: form.receiptNumber.trim() || undefined,
      quantity: qty,
      requiredQuantity: form.requiredQuantity ? parseFloat(form.requiredQuantity) : 0,
      pricePerUnit: price,
      totalAmount: total,
      supplier: form.supplier.trim() || undefined,
      date: form.date || undefined,
      endDate: form.endDate || undefined,
      remarks: form.remarks.trim() || undefined,
    };

    console.log("📤 Sending payload:", payload);

    setSaving(true);
    try {
      if (editingId) {
        await apiFetch(`/stock-in/${editingId}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        toast.success("Stock In entry updated successfully");
      } else {
        await apiFetch("/stock-in", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        toast.success("Stock In entry added successfully");
      }

      // ✅ Refetch data from database
      await refetch();
      resetForm();
    } catch (error: any) {
      console.error("❌ Error:", error);
      toast.error(error?.message || "Failed to save entry");
    } finally {
      setSaving(false);
    }
  };

  // ✅ Delete Stock In Entry from Database
  const handleDelete = async (record: StockInRecord) => {
    if (!window.confirm(`Delete this entry for "${record.material}"?`)) return;
    
    try {
      await apiFetch(`/stock-in/${record.id}`, {
        method: "DELETE",
      });
      
      toast.success("Entry deleted successfully");
      await refetch();
      if (editingId === record.id) resetForm();
    } catch (error: any) {
      toast.error(error?.message || "Failed to delete entry");
    }
  };

  // ✅ Refresh Data
  const handleRefresh = () => {
    refetch();
    toast.success("Data refreshed");
  };

  // ✅ Print
  const handlePrint = () => {
    window.print();
  };

  // ✅ Export to Excel
  const handleExportExcel = () => {
    const data = filteredStockIn;
    if (data.length === 0) {
      toast.error("No data to export");
      return;
    }

    try {
      const excelData = data.map((item) => ({
        'Date': item.createdAt ? new Date(item.createdAt).toLocaleDateString() : '-',
        'Category': item.category || '-',
        'Material': item.material || '-',
        'Brand Name': item.brandName || '-',
        'Receipt No.': item.receiptNumber || '-',
        'Quantity': item.quantity ?? '-',
        'Required Qty': item.requiredQuantity ?? '-',
        'Price/Unit (₹)': item.pricePerUnit ?? '-',
        'Total Amount (₹)': item.totalAmount ?? '-',
        'Supplier': item.supplier || '-',
      }));

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(excelData);

      ws['!cols'] = [
        { wch: 15 }, { wch: 18 }, { wch: 20 }, { wch: 18 },
        { wch: 18 }, { wch: 12 }, { wch: 18 }, { wch: 16 },
        { wch: 18 }, { wch: 20 },
      ];

      XLSX.utils.book_append_sheet(wb, ws, 'Stock In');
      const date = new Date().toISOString().split('T')[0];
      XLSX.writeFile(wb, `stock-in-${date}.xlsx`);
      
      toast.success(`Exported ${data.length} entries to Excel`);
    } catch (error) {
      toast.error("Failed to export Excel file");
      console.error(error);
    }
  };

  // ✅ Summary Statistics with proper formatting
  const totalEntries = stockIn?.length || 0;
  const totalQuantity = stockIn?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0;
  const totalValue = stockIn?.reduce((sum, item) => sum + (Number(item.totalAmount) || 0), 0) || 0;

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-7xl mx-auto">
      {/* ✅ Page Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <ArrowDownToLine className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Stock In</h1>
            <p className="text-sm text-muted-foreground">
              Record goods received into inventory against a supplier voucher.
            </p>
          </div>
        </div>
      </div>

      {/* ✅ Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border bg-card p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Entries</p>
              <p className="text-2xl font-bold">{totalEntries}</p>
            </div>
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Package className="h-5 w-5 text-blue-500" />
            </div>
          </div>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Quantity</p>
              <p className="text-2xl font-bold">{totalQuantity}</p>
            </div>
            <div className="p-2 rounded-lg bg-green-500/10">
              <TrendingUp className="h-5 w-5 text-green-500" />
            </div>
          </div>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Value</p>
              {/* ✅ Fixed: Proper currency formatting */}
              <p className="text-2xl font-bold">{formatCurrency(totalValue)}</p>
            </div>
            <div className="p-2 rounded-lg bg-purple-500/10">
              <DollarSign className="h-5 w-5 text-purple-500" />
            </div>
          </div>
        </div>
      </div>

      {/* ✅ Add/Edit Form */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="p-6 border-b bg-muted/20">
          <div className="flex items-center gap-2">
            {editingId ? (
              <Pencil className="h-5 w-5 text-blue-500" />
            ) : (
              <Plus className="h-5 w-5 text-green-500" />
            )}
            <h2 className="font-semibold">{editingId ? "Edit Stock In Entry" : "New Stock In Entry"}</h2>
          </div>
        </div>
        <form onSubmit={handleSave}>
          <div className="p-6 space-y-4">
            {/* Row 1: Category, Material, Brand Name, Receipt Number */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <Label className="text-sm font-medium flex items-center gap-1">
                  <Tag className="h-4 w-4 text-muted-foreground" />
                  Category <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={form.category}
                  onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}
                >
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORY_OPTIONS.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm font-medium flex items-center gap-1">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  Material <span className="text-red-500">*</span>
                </Label>
                <Input
                  value={form.material}
                  onChange={(e) => setForm((f) => ({ ...f, material: e.target.value }))}
                  placeholder="Enter Material"
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label className="text-sm font-medium flex items-center gap-1">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  Brand Name
                </Label>
                <Input
                  value={form.brandName}
                  onChange={(e) => setForm((f) => ({ ...f, brandName: e.target.value }))}
                  placeholder="Brand name"
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label className="text-sm font-medium flex items-center gap-1">
                  <Hash className="h-4 w-4 text-muted-foreground" />
                  Receipt Number
                </Label>
                <Input
                  value={form.receiptNumber}
                  onChange={(e) => setForm((f) => ({ ...f, receiptNumber: e.target.value }))}
                  placeholder="Enter receipt/invoice number"
                  className="mt-1.5"
                />
              </div>
            </div>

            {/* Row 2: Quantity, Required Quantity, Price per Unit, Total Amount */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <Label className="text-sm font-medium flex items-center gap-1">
                  <Box className="h-4 w-4 text-muted-foreground" />
                  Quantity <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="number"
                  min="0"
                  value={form.quantity}
                  onChange={(e) => handleQuantityChange(e.target.value)}
                  placeholder="0"
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label className="text-sm font-medium flex items-center gap-1">
                  <Box className="h-4 w-4 text-muted-foreground" />
                  Required Quantity
                </Label>
                <Input
                  type="number"
                  min="0"
                  value={form.requiredQuantity}
                  onChange={(e) => setForm((f) => ({ ...f, requiredQuantity: e.target.value }))}
                  placeholder="0"
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label className="text-sm font-medium flex items-center gap-1">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  Price per Unit (₹) <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.pricePerUnit}
                  onChange={(e) => handlePriceChange(e.target.value)}
                  placeholder="0.00"
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label className="text-sm font-medium flex items-center gap-1">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  Total Amount (₹)
                </Label>
                <Input
                  type="text"
                  value={form.totalAmount ? formatCurrency(parseFloat(form.totalAmount)) : "₹0"}
                  className="mt-1.5 bg-muted/20 font-semibold text-primary"
                  readOnly
                />
                <p className="text-xs text-muted-foreground mt-1">Auto-calculated</p>
              </div>
            </div>

            {/* Row 3: Supplier, Date, End Date, Remarks */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <Label className="text-sm font-medium flex items-center gap-1">
                  <User className="h-4 w-4 text-muted-foreground" />
                  Supplier
                </Label>
                <Input
                  value={form.supplier}
                  onChange={(e) => setForm((f) => ({ ...f, supplier: e.target.value }))}
                  placeholder="Supplier name"
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label className="text-sm font-medium flex items-center gap-1">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  Date
                </Label>
                <Input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label className="text-sm font-medium flex items-center gap-1">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  End Date
                </Label>
                <Input
                  type="date"
                  value={form.endDate}
                  onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label className="text-sm font-medium flex items-center gap-1">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  Remarks
                </Label>
                <Input
                  value={form.remarks}
                  onChange={(e) => setForm((f) => ({ ...f, remarks: e.target.value }))}
                  placeholder="Optional remarks"
                  className="mt-1.5"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap justify-between items-center gap-3 pt-4 border-t">
              <div className="flex gap-2">
                <Button type="submit" disabled={saving} className="gap-2">
                  <Save className="h-4 w-4" />
                  {saving ? "Saving…" : editingId ? "Update" : "Save"}
                </Button>
                {editingId && (
                  <Button type="button" variant="outline" onClick={resetForm} className="gap-2">
                    <X className="h-4 w-4" /> Cancel
                  </Button>
                )}
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={handleRefresh} className="gap-2">
                  <RefreshCw className="h-4 w-4" /> Refresh
                </Button>
                <Button type="button" variant="outline" onClick={handlePrint} className="gap-2 border-amber-500 text-amber-600 hover:bg-amber-50">
                  <Printer className="h-4 w-4" /> Print
                </Button>
                <Button type="button" variant="outline" onClick={handleExportExcel} className="gap-2 border-green-500 text-green-600 hover:bg-green-50">
                  <Download className="h-4 w-4" /> Export Excel
                </Button>
              </div>
            </div>
          </div>
        </form>
      </div>

      {/* ✅ Search and List */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h2 className="font-semibold flex items-center gap-2">
            <Box className="h-5 w-5 text-primary" />
            Stock In Entries
            {!isLoading && filteredStockIn.length > 0 && (
              <span className="ml-2 inline-flex items-center justify-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                {filteredStockIn.length}
              </span>
            )}
          </h2>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by material, category, supplier..."
              className="pl-9 w-full"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
          </div>
        ) : filteredStockIn.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center rounded-lg border">
            <ArrowDownToLine className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-sm text-muted-foreground">No Stock In entries found</p>
            <p className="text-xs text-muted-foreground mt-1">Add your first entry using the form above.</p>
          </div>
        ) : (
          <div className="rounded-lg border overflow-hidden overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/30">
                <tr>
                  <th className="text-left font-medium px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground">Date</th>
                  <th className="text-left font-medium px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground">Category</th>
                  <th className="text-left font-medium px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground">Material</th>
                  <th className="text-left font-medium px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground">Brand Name</th>
                  <th className="text-left font-medium px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground">Receipt No.</th>
                  <th className="text-left font-medium px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground">Qty</th>
                  <th className="text-left font-medium px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground">Req. Qty</th>
                  <th className="text-left font-medium px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground">Price/Unit</th>
                  <th className="text-left font-medium px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground">Total Amount</th>
                  <th className="text-left font-medium px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground">Supplier</th>
                  <th className="text-right font-medium px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredStockIn.map((item) => (
                  <tr key={item.id} className="border-t hover:bg-muted/5 transition-colors">
                    <td className="px-4 py-3">{item.createdAt ? new Date(item.createdAt).toLocaleDateString() : "-"}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex px-2 py-0.5 rounded-full bg-primary/10 text-xs">
                        {item.category || "-"}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium">{item.material}</td>
                    <td className="px-4 py-3">{item.brandName || "-"}</td>
                    <td className="px-4 py-3 font-mono text-xs">{item.receiptNumber || "-"}</td>
                    <td className="px-4 py-3 text-center">{item.quantity ?? "-"}</td>
                    <td className="px-4 py-3 text-center">{item.requiredQuantity ?? "-"}</td>
                    <td className="px-4 py-3 text-center">₹{item.pricePerUnit ?? "-"}</td>
                    <td className="px-4 py-3 font-semibold text-primary text-center">
                      {item.totalAmount != null ? formatCurrency(Number(item.totalAmount)) : "-"}
                    </td>
                    <td className="px-4 py-3">{item.supplier || "-"}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => startEdit(item)} className="h-8 w-8 p-0 hover:bg-blue-50">
                          <Pencil className="h-4 w-4 text-blue-500" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(item)} className="h-8 w-8 p-0 hover:bg-red-50">
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}