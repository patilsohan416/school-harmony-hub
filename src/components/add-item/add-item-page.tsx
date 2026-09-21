import { useMemo, useState, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Pencil, Plus, Save, Search, Trash2, X,
  Package, Box, AlertTriangle, DollarSign,
  Printer, Download, TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { createCrudService, type Record_ } from "@/lib/services/crud.service";
import * as XLSX from 'xlsx';

interface ItemRecord extends Record_ {
  itemCode: string;
  name: string;
  category?: string;
  unit?: string;
  requiredQuantity?: number;
  reorderLevel?: number;
  purchasePrice?: number;
  sellingPrice?: number;
  supplier?: string;
  location?: string;
  description?: string;
  status?: "active" | "inactive" | "discontinued";
}

const itemService = createCrudService<ItemRecord>("add-item");

const UNIT_OPTIONS = ["pcs", "kg", "g", "L", "ml", "box", "pack", "dozen", "unit"];

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
  "Grocery",
  "Other",
];

const SUPPLIER_OPTIONS = [
  "ABC Stationery",
  "XYZ Electronics",
  "Furniture World",
  "Sports Zone",
  "Lab Supplies Inc.",
  "Book Distributors",
  "Uniform Manufacturers",
  "Office Mart",
  "Other",
];

const LOCATION_OPTIONS = [
  "Store Room - Shelf A",
  "Store Room - Shelf B",
  "Store Room - Shelf C",
  "Lab - Cabinet 1",
  "Lab - Cabinet 2",
  "Library - Shelf 1",
  "Library - Shelf 2",
  "Sports Room",
  "Main Office",
  "Other",
];

interface FormState {
  itemCode: string;
  name: string;
  category: string;
  unit: string;
  requiredQuantity: string;
  reorderLevel: string;
  purchasePrice: string;
  sellingPrice: string;
  supplier: string;
  location: string;
  description: string;
  status: "active" | "inactive" | "discontinued";
}

const EMPTY_FORM: FormState = {
  itemCode: "",
  name: "",
  category: "",
  unit: "",
  requiredQuantity: "",
  reorderLevel: "",
  purchasePrice: "",
  sellingPrice: "",
  supplier: "",
  location: "",
  description: "",
  status: "active",
};

function downloadCsv(filename: string, rows: Record<string, unknown>[]) {
  if (rows.length === 0) {
    toast.error("Nothing to export");
    return;
  }
  const headers = Object.keys(rows[0]);
  const escape = (val: unknown) => {
    const s = val == null ? "" : String(val);
    return `"${s.replace(/"/g, '""')}"`;
  };
  const csv = [
    headers.join(","),
    ...rows.map((row) => headers.map((h) => escape(row[h])).join(",")),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function AddItemPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const itemsQuery = useQuery({
    queryKey: ["add-item-list"],
    queryFn: async () => {
      const result = await itemService.list({ pageSize: 500, sortBy: "createdAt", sortDir: "desc" });
      return result.rows;
    },
  });

  const filteredItems = useMemo(() => {
    const list = itemsQuery.data ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter((i) =>
      (i.itemCode ?? "").toLowerCase().includes(q) ||
      (i.name ?? "").toLowerCase().includes(q) ||
      (i.category ?? "").toLowerCase().includes(q) ||
      (i.supplier ?? "").toLowerCase().includes(q) ||
      (i.location ?? "").toLowerCase().includes(q)
    );
  }, [itemsQuery.data, search]);

  // Summary calculations
  const totalItems = itemsQuery.data?.length || 0;
  const totalQuantity = itemsQuery.data?.reduce((sum, i) => sum + (i.requiredQuantity || 0), 0) || 0;
  
  // Total Value = sum of (quantity × price per unit)
  const totalValue = itemsQuery.data?.reduce((sum, i) => sum + ((i.requiredQuantity || 0) * (i.purchasePrice || 0)), 0) || 0;
  
  const lowStockItems = itemsQuery.data?.filter(i =>
    (i.requiredQuantity || 0) <= (i.reorderLevel || 0)
  ).length || 0;

  function startEdit(item: ItemRecord) {
    setEditingId(item.id);
    setForm({
      itemCode: item.itemCode || "",
      name: item.name || "",
      category: item.category || "",
      unit: item.unit || "",
      requiredQuantity: item.requiredQuantity != null ? String(item.requiredQuantity) : "",
      reorderLevel: item.reorderLevel != null ? String(item.reorderLevel) : "",
      purchasePrice: item.purchasePrice != null ? String(item.purchasePrice) : "",
      sellingPrice: item.sellingPrice != null ? String(item.sellingPrice) : "",
      supplier: item.supplier || "",
      location: item.location || "",
      description: item.description || "",
      status: item.status || "active",
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  function generateItemCode() {
    const category = form.category || "ITEM";
    const random = String(Math.floor(Math.random() * 10000)).padStart(4, "0");
    const code = `${category.substring(0, 3).toUpperCase()}-${random}`;
    setForm((f) => ({ ...f, itemCode: code }));
    toast.info(`Item code generated: ${code}`);
  }

  async function handleSave() {
    if (!form.itemCode.trim() || !form.name.trim()) {
      toast.error("Item Code and Item Name are required");
      return;
    }

    const payload: Partial<ItemRecord> = {
      itemCode: form.itemCode.trim(),
      name: form.name.trim(),
      category: form.category.trim() || undefined,
      unit: form.unit || undefined,
      requiredQuantity: form.requiredQuantity ? Number(form.requiredQuantity) : undefined,
      reorderLevel: form.reorderLevel ? Number(form.reorderLevel) : undefined,
      purchasePrice: form.purchasePrice ? Number(form.purchasePrice) : undefined,
      sellingPrice: form.sellingPrice ? Number(form.sellingPrice) : undefined,
      supplier: form.supplier || undefined,
      location: form.location || undefined,
      description: form.description || undefined,
      status: form.status,
    };

    setSaving(true);
    try {
      if (editingId) {
        await itemService.update(editingId, payload);
        toast.success(`"${form.name.trim()}" updated successfully`);
      } else {
        await itemService.create(payload);
        toast.success(`"${form.name.trim()}" added to inventory`);
      }
      setForm(EMPTY_FORM);
      setEditingId(null);
      queryClient.invalidateQueries({ queryKey: ["add-item-list"] });
    } catch (err: any) {
      toast.error(err?.message || "Failed to save item");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(item: ItemRecord) {
    if (!window.confirm(`Delete "${item.name}"? This cannot be undone.`)) return;
    try {
      await itemService.remove(item.id);
      toast.success(`"${item.name}" deleted`);
      if (editingId === item.id) cancelEdit();
      queryClient.invalidateQueries({ queryKey: ["add-item-list"] });
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete item");
    }
  }

  function handlePrintItems() {
    const printContent = printRef.current;
    if (!printContent) {
      toast.error("No content to print");
      return;
    }

    const printWindow = window.open("", "_blank", "width=1200,height=800");
    if (!printWindow) {
      toast.error("Please allow pop-ups to print");
      return;
    }

    const date = new Date().toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Inventory Items Report</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: Arial, sans-serif; padding: 40px; background: white; color: #0f172a; }
            .print-header {
              text-align: center;
              margin-bottom: 30px;
              border-bottom: 3px solid #2563eb;
              padding-bottom: 20px;
            }
            .print-header h1 {
              font-size: 28px;
              color: #0f172a;
              margin-bottom: 5px;
            }
            .print-header .subtitle {
              font-size: 14px;
              color: #64748b;
            }
            .print-header .date {
              font-size: 14px;
              color: #64748b;
              margin-top: 5px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              font-size: 12px;
            }
            th {
              background: #1e293b;
              color: white;
              padding: 10px 8px;
              text-align: left;
              font-weight: 600;
              text-transform: uppercase;
              font-size: 10px;
              letter-spacing: 0.5px;
            }
            td {
              padding: 8px;
              border-bottom: 1px solid #e2e8f0;
            }
            tr:hover td {
              background: #f1f5f9;
            }
            .status-badge {
              display: inline-block;
              padding: 2px 10px;
              border-radius: 20px;
              font-size: 10px;
              font-weight: 600;
              text-transform: capitalize;
            }
            .status-active { background: #dcfce7; color: #166534; }
            .status-inactive { background: #fef9c3; color: #854d0e; }
            .status-discontinued { background: #fee2e2; color: #991b1b; }
            .summary {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 15px;
              margin-bottom: 30px;
            }
            .summary-card {
              background: #f8fafc;
              padding: 15px;
              border-radius: 8px;
              border: 1px solid #e2e8f0;
              text-align: center;
            }
            .summary-card .label {
              font-size: 12px;
              color: #64748b;
            }
            .summary-card .value {
              font-size: 22px;
              font-weight: bold;
              color: #0f172a;
              margin-top: 4px;
            }
            .summary-card .value.green { color: #16a34a; }
            .summary-card .value.blue { color: #2563eb; }
            .summary-card .value.red { color: #dc2626; }
            .print-footer {
              text-align: center;
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #e2e8f0;
              font-size: 12px;
              color: #94a3b8;
            }
            @media print {
              body { padding: 20px; }
            }
          </style>
        </head>
        <body>
          <div class="print-header">
            <h1>📦 Inventory Items Report</h1>
            <div class="subtitle">School Inventory Management System</div>
            <div class="date">Generated on: ${date}</div>
          </div>

          <div class="summary">
            <div class="summary-card">
              <div class="label">Total Items</div>
              <div class="value blue">${totalItems}</div>
            </div>
            <div class="summary-card">
              <div class="label">Total Quantity</div>
              <div class="value green">${totalQuantity}</div>
            </div>
            <div class="summary-card">
              <div class="label">Total Value</div>
              <div class="value blue">₹${totalValue.toLocaleString()}</div>
            </div>
            <div class="summary-card">
              <div class="label">Low Stock Items</div>
              <div class="value red">${lowStockItems}</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Item Code</th>
                <th>Item Name</th>
                <th>Category</th>
                <th>Unit</th>
                <th>Required Qty</th>
                <th>Reorder Level</th>
                <th>Price per Unit</th>
                <th>Selling Price</th>
                <th>Total Value</th>
                <th>Supplier</th>
                <th>Location</th>
                <th>Description</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${filteredItems.map((item) => `
                <tr>
                  <td><strong>${item.itemCode}</strong></td>
                  <td>${item.name}</td>
                  <td>${item.category || "-"}</td>
                  <td>${item.unit || "-"}</td>
                  <td>${item.requiredQuantity ?? "-"}</td>
                  <td>${item.reorderLevel ?? "-"}</td>
                  <td>${item.purchasePrice != null ? `₹${item.purchasePrice}` : "-"}</td>
                  <td>${item.sellingPrice != null ? `₹${item.sellingPrice}` : "-"}</td>
                  <td>${(item.requiredQuantity && item.purchasePrice) ? `₹${(item.requiredQuantity * item.purchasePrice).toLocaleString()}` : "-"}</td>
                  <td>${item.supplier || "-"}</td>
                  <td>${item.location || "-"}</td>
                  <td>${item.description || "-"}</td>
                  <td><span class="status-badge status-${item.status || 'active'}">${item.status || 'active'}</span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="print-footer">
            <p>Generated by School ERP System • Total ${filteredItems.length} items</p>
          </div>

          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 1000);
            };
          <\/script>
        </body>
      </html>
    `);

    printWindow.document.close();
  }

  function handleExportExcel() {
    if (filteredItems.length === 0) {
      toast.error("No items to export");
      return;
    }

    try {
      // Prepare data for Excel
      const excelData = filteredItems.map((item) => ({
        'Item Code': item.itemCode,
        'Item Name': item.name,
        'Category': item.category || '-',
        'Unit': item.unit || '-',
        'Required Quantity': item.requiredQuantity ?? '-',
        'Reorder Level': item.reorderLevel ?? '-',
        'Price per Unit (₹)': item.purchasePrice ?? '-',
        'Selling Price (₹)': item.sellingPrice ?? '-',
        'Total Value (₹)': (item.requiredQuantity && item.purchasePrice) 
          ? (item.requiredQuantity * item.purchasePrice) 
          : '-',
        'Supplier': item.supplier || '-',
        'Location': item.location || '-',
        'Description': item.description || '-',
        'Status': item.status || 'active',
      }));

      // Create workbook
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(excelData);

      // Set column widths
      ws['!cols'] = [
        { wch: 15 }, // Item Code
        { wch: 20 }, // Item Name
        { wch: 18 }, // Category
        { wch: 10 }, // Unit
        { wch: 18 }, // Required Quantity
        { wch: 15 }, // Reorder Level
        { wch: 18 }, // Price per Unit
        { wch: 18 }, // Selling Price
        { wch: 18 }, // Total Value
        { wch: 20 }, // Supplier
        { wch: 20 }, // Location
        { wch: 30 }, // Description
        { wch: 12 }, // Status
      ];

      XLSX.utils.book_append_sheet(wb, ws, 'Inventory');
      
      // Generate Excel file with date
      const date = new Date().toISOString().split('T')[0];
      XLSX.writeFile(wb, `inventory-items-${date}.xlsx`);
      
      toast.success(`Exported ${filteredItems.length} items to Excel`);
    } catch (error) {
      toast.error("Failed to export Excel file");
      console.error(error);
    }
  }

  function handleExportCsv() {
    downloadCsv(
      `inventory-items-${new Date().toISOString().split('T')[0]}.csv`,
      filteredItems.map((i) => ({
        itemCode: i.itemCode,
        name: i.name,
        category: i.category || "",
        unit: i.unit || "",
        requiredQuantity: i.requiredQuantity ?? "",
        reorderLevel: i.reorderLevel ?? "",
        purchasePrice: i.purchasePrice ?? "",
        sellingPrice: i.sellingPrice ?? "",
        totalValue: (i.requiredQuantity && i.purchasePrice) ? (i.requiredQuantity * i.purchasePrice) : "",
        supplier: i.supplier || "",
        location: i.location || "",
        description: i.description || "",
        status: i.status || "active",
      }))
    );
  }

  const getStatusColor = (status?: string) => {
    switch (status) {
      case "active": return "text-green-600 bg-green-50 border-green-200";
      case "inactive": return "text-yellow-600 bg-yellow-50 border-yellow-200";
      case "discontinued": return "text-red-600 bg-red-50 border-red-200";
      default: return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-7xl mx-auto">
      {/* Hidden print content */}
      <div ref={printRef} className="hidden" />

      {/* Page Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Package className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Add Item</h1>
            <p className="text-sm text-muted-foreground">
              Add and manage items in your school's inventory.
            </p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-xl border bg-card p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Items</p>
              <p className="text-2xl font-bold">{totalItems}</p>
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
              <p className="text-2xl font-bold">₹{totalValue.toLocaleString()}</p>
            </div>
            <div className="p-2 rounded-lg bg-purple-500/10">
              <DollarSign className="h-5 w-5 text-purple-500" />
            </div>
          </div>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Low Stock Items</p>
              <p className="text-2xl font-bold text-red-500">{lowStockItems}</p>
            </div>
            <div className="p-2 rounded-lg bg-red-500/10">
              <AlertTriangle className="h-5 w-5 text-red-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Add/Edit Form */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="p-6 border-b bg-muted/20">
          <div className="flex items-center gap-2">
            {editingId ? (
              <Pencil className="h-5 w-5 text-blue-500" />
            ) : (
              <Plus className="h-5 w-5 text-green-500" />
            )}
            <h2 className="font-semibold">{editingId ? "Edit Item" : "Add New Item"}</h2>
          </div>
        </div>
        <div className="p-6 space-y-6">
          {/* Row 1: Item Code, Name, Category */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label className="text-sm font-medium flex items-center gap-1">
                Item Code <span className="text-red-500">*</span>
              </Label>
              <div className="flex gap-2 mt-1.5">
                <Input
                  value={form.itemCode}
                  onChange={(e) => setForm((f) => ({ ...f, itemCode: e.target.value }))}
                  placeholder="Enter or select item code"
                  className="flex-1"
                  list="item-code-options"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={generateItemCode}
                  className="shrink-0"
                >
                  Generate
                </Button>
              </div>
              <datalist id="item-code-options">
                <option value="STY-001">A4 Paper</option>
                <option value="STY-002">Blue Pen</option>
                <option value="FUR-001">Student Chair</option>
                <option value="ELE-001">Projector</option>
                <option value="ELE-002">Computer</option>
                <option value="OFF-001">Office Supplies</option>
                <option value="SPT-001">Cricket Bat</option>
                <option value="LAB-001">Microscope</option>
              </datalist>
            </div>
            <div>
              <Label className="text-sm font-medium flex items-center gap-1">
                Item Name <span className="text-red-500">*</span>
              </Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. A4 Paper"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label className="text-sm font-medium">Category</Label>
              <Select
                value={form.category}
                onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_OPTIONS.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Row 2: Unit, Required Qty, Reorder Level */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label className="text-sm font-medium">Unit</Label>
              <Select
                value={form.unit}
                onValueChange={(v) => setForm((f) => ({ ...f, unit: v }))}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Select unit" />
                </SelectTrigger>
                <SelectContent>
                  {UNIT_OPTIONS.map((u) => (
                    <SelectItem key={u} value={u}>{u}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm font-medium">Required Quantity</Label>
              <Input
                type="number"
                min={0}
                value={form.requiredQuantity}
                onChange={(e) => setForm((f) => ({ ...f, requiredQuantity: e.target.value }))}
                placeholder="e.g. 50"
                className="mt-1.5"
              />
              <p className="text-xs text-muted-foreground mt-1">Number of items needed</p>
            </div>
            <div>
              <Label className="text-sm font-medium flex items-center gap-1">
                Reorder Level <span className="text-red-500">*</span>
              </Label>
              <Input
                type="number"
                min={0}
                value={form.reorderLevel}
                onChange={(e) => setForm((f) => ({ ...f, reorderLevel: e.target.value }))}
                placeholder="e.g. 10"
                className="mt-1.5"
              />
              <p className="text-xs text-muted-foreground mt-1">Minimum stock before reorder</p>
            </div>
          </div>

          {/* Row 3: Purchase Price & Selling Price */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium">Price per Unit (₹)</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={form.purchasePrice}
                onChange={(e) => setForm((f) => ({ ...f, purchasePrice: e.target.value }))}
                placeholder="e.g. 300"
                className="mt-1.5"
              />
              <p className="text-xs text-muted-foreground mt-1">Cost for one unit</p>
            </div>
            <div>
              <Label className="text-sm font-medium">Selling Price per Unit (₹)</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={form.sellingPrice}
                onChange={(e) => setForm((f) => ({ ...f, sellingPrice: e.target.value }))}
                placeholder="e.g. 500"
                className="mt-1.5"
              />
              <p className="text-xs text-muted-foreground mt-1">Selling price for one unit</p>
            </div>
          </div>

          {/* Row 4: Supplier & Location */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium">Supplier</Label>
              <Select
                value={form.supplier}
                onValueChange={(v) => setForm((f) => ({ ...f, supplier: v }))}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Select supplier" />
                </SelectTrigger>
                <SelectContent>
                  {SUPPLIER_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm font-medium">Location / Storage</Label>
              <Select
                value={form.location}
                onValueChange={(v) => setForm((f) => ({ ...f, location: v }))}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  {LOCATION_OPTIONS.map((l) => (
                    <SelectItem key={l} value={l}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Row 5: Description */}
          <div>
            <Label className="text-sm font-medium">Description</Label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Enter item description (optional)"
              className="mt-1.5 min-h-[80px] resize-vertical"
            />
          </div>

          {/* Row 6: Status */}
          <div>
            <Label className="text-sm font-medium">Status</Label>
            <div className="flex flex-wrap gap-4 mt-1.5">
              {["active", "inactive", "discontinued"].map((status) => (
                <label key={status} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="status"
                    value={status}
                    checked={form.status === status}
                    onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as any }))}
                    className="h-4 w-4 accent-primary"
                  />
                  <span className={`text-sm capitalize px-2 py-0.5 rounded-full ${getStatusColor(status)}`}>
                    {status}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2 border-t">
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              <Save className="h-4 w-4" />
              {saving ? "Saving…" : editingId ? "Update Item" : "Add Item"}
            </Button>
            {editingId && (
              <Button variant="outline" onClick={cancelEdit} className="gap-2">
                <X className="h-4 w-4" /> Cancel
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Item List */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h2 className="font-semibold flex items-center gap-2">
            <Box className="h-5 w-5 text-primary" />
            Inventory Items
            {!itemsQuery.isLoading && filteredItems.length > 0 && (
              <span className="ml-2 inline-flex items-center justify-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                {filteredItems.length}
              </span>
            )}
          </h2>
          <div className="flex items-center gap-2">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by code, name, category..."
                className="pl-9 w-full"
              />
            </div>
            <Button variant="outline" size="sm" className="gap-2" onClick={handlePrintItems}>
              <Printer className="h-4 w-4" /> Print
            </Button>
            <Button variant="outline" size="sm" className="gap-2" onClick={handleExportExcel}>
              <Download className="h-4 w-4" /> Export Excel
            </Button>
            <Button variant="outline" size="sm" className="gap-2" onClick={handleExportCsv}>
              <Download className="h-4 w-4" /> Export CSV
            </Button>
          </div>
        </div>

        {itemsQuery.isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : itemsQuery.isError ? (
          <p className="text-sm text-destructive rounded-lg border p-4">Failed to load items. Please try again.</p>
        ) : filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center rounded-lg border">
            <Package className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-sm text-muted-foreground">No items found</p>
            <p className="text-xs text-muted-foreground mt-1">Add your first item using the form above.</p>
          </div>
        ) : (
          <div className="rounded-lg border overflow-hidden overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/30">
                <tr>
                  <th className="text-left font-medium px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground">Item Code</th>
                  <th className="text-left font-medium px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground">Item Name</th>
                  <th className="text-left font-medium px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground">Category</th>
                  <th className="text-left font-medium px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground">Unit</th>
                  <th className="text-left font-medium px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground">Required Qty</th>
                  <th className="text-left font-medium px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground">Reorder Level</th>
                  <th className="text-left font-medium px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground">Price per Unit</th>
                  <th className="text-left font-medium px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground">Selling Price</th>
                  <th className="text-left font-medium px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground">Total Value</th>
                  <th className="text-left font-medium px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground">Supplier</th>
                  <th className="text-left font-medium px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground">Location</th>
                  <th className="text-left font-medium px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground">Status</th>
                  <th className="text-right font-medium px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => {
                  const totalValue = (item.requiredQuantity && item.purchasePrice) 
                    ? (item.requiredQuantity * item.purchasePrice) 
                    : null;
                  return (
                    <tr key={item.id} className="border-t hover:bg-muted/5 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs">{item.itemCode}</td>
                      <td className="px-4 py-3 font-medium">{item.name}</td>
                      <td className="px-4 py-3">{item.category || "-"}</td>
                      <td className="px-4 py-3">{item.unit || "-"}</td>
                      <td className="px-4 py-3">{item.requiredQuantity ?? "-"}</td>
                      <td className="px-4 py-3">{item.reorderLevel ?? "-"}</td>
                      <td className="px-4 py-3">{item.purchasePrice != null ? `₹${item.purchasePrice}` : "-"}</td>
                      <td className="px-4 py-3">{item.sellingPrice != null ? `₹${item.sellingPrice}` : "-"}</td>
                      <td className="px-4 py-3 font-semibold">
                        {totalValue !== null ? `₹${totalValue.toLocaleString()}` : "-"}
                      </td>
                      <td className="px-4 py-3">{item.supplier || "-"}</td>
                      <td className="px-4 py-3">{item.location || "-"}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(item.status)}`}>
                          {item.status || "active"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => startEdit(item)}
                            className="h-8 w-8 p-0"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(item)}
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}