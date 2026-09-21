import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Pencil, Plus, Save, Search, Trash2, X, Truck, Download, Phone, Mail, MapPin, Building2, User, FileText, Hash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api/client";
import * as XLSX from 'xlsx';

interface SupplierRecord {
  id: string;
  supplierName: string;
  contactPerson?: string;
  phone: string;
  email?: string;
  gstNumber?: string;
  city?: string;
  address?: string;
  status?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

interface FormState {
  supplierName: string;
  contactPerson: string;
  phone: string;
  email: string;
  gstNumber: string;
  city: string;
  address: string;
  status: "active" | "inactive";
  notes: string;
}

const EMPTY_FORM: FormState = {
  supplierName: "",
  contactPerson: "",
  phone: "",
  email: "",
  gstNumber: "",
  city: "",
  address: "",
  status: "active",
  notes: "",
};

export function SupplierManagementPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // ✅ Fetch suppliers from DATABASE
  const { data: suppliers, isLoading, refetch } = useQuery({
    queryKey: ["supplier-management-list"],
    queryFn: async () => {
      console.log("🔄 Fetching suppliers from DATABASE...");
      const response = await apiFetch<{ data: SupplierRecord[] }>(
        "/suppliers?limit=500&sortBy=createdAt&sortOrder=desc"
      );
      console.log("✅ Suppliers fetched from DATABASE:", response.data?.length || 0, "records");
      return response.data || [];
    },
  });

  // ✅ Filter suppliers based on search
  const filteredSuppliers = useMemo(() => {
    const list = suppliers || [];
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter((s) =>
      (s.supplierName ?? "").toLowerCase().includes(q) ||
      (s.contactPerson ?? "").toLowerCase().includes(q) ||
      (s.phone ?? "").toLowerCase().includes(q) ||
      (s.email ?? "").toLowerCase().includes(q) ||
      (s.city ?? "").toLowerCase().includes(q) ||
      (s.gstNumber ?? "").toLowerCase().includes(q)
    );
  }, [suppliers, search]);

  function startEdit(supplier: SupplierRecord) {
    setEditingId(supplier.id);
    setForm({
      supplierName: supplier.supplierName || "",
      contactPerson: supplier.contactPerson || "",
      phone: supplier.phone || "",
      email: supplier.email || "",
      gstNumber: supplier.gstNumber || "",
      city: supplier.city || "",
      address: supplier.address || "",
      status: (supplier.status as "active" | "inactive") || "active",
      notes: supplier.notes || "",
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  // ✅ Save Supplier to DATABASE
  async function handleSave() {
    // ✅ Validation
    if (!form.supplierName.trim()) {
      toast.error("Supplier Name is required");
      return;
    }
    if (!form.phone.trim() || form.phone.length < 10) {
      toast.error("Valid 10-digit Phone number is required");
      return;
    }

    const payload = {
      supplierName: form.supplierName.trim(),
      contactPerson: form.contactPerson.trim() || undefined,
      phone: form.phone.trim(),
      email: form.email.trim() || undefined,
      gstNumber: form.gstNumber.trim() || undefined,
      city: form.city.trim() || undefined,
      address: form.address.trim() || undefined,
      status: form.status,
      notes: form.notes.trim() || undefined,
    };

    console.log("📤 Sending payload:", payload);

    setSaving(true);
    try {
      if (editingId) {
        await apiFetch(`/suppliers/${editingId}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        toast.success(`"${form.supplierName}" updated successfully`);
      } else {
        await apiFetch("/suppliers", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        toast.success(`"${form.supplierName}" added successfully`);
      }

      await refetch();
      setForm(EMPTY_FORM);
      setEditingId(null);
    } catch (err: any) {
      console.error("❌ Database error:", err);
      toast.error(err?.message || "Failed to save supplier");
    } finally {
      setSaving(false);
    }
  }

  // ✅ Delete Supplier from DATABASE
  async function handleDelete(supplier: SupplierRecord) {
    if (!window.confirm(`Delete "${supplier.supplierName}"? This cannot be undone.`)) return;
    
    try {
      await apiFetch(`/suppliers/${supplier.id}`, {
        method: "DELETE",
      });
      
      toast.success(`"${supplier.supplierName}" deleted successfully`);
      await refetch();
      if (editingId === supplier.id) cancelEdit();
    } catch (err: any) {
      console.error("❌ Database delete error:", err);
      toast.error(err?.message || "Failed to delete supplier");
    }
  }

  // ✅ Export to Excel
  function handleExportExcel() {
    const data = filteredSuppliers;
    if (data.length === 0) {
      toast.error("No data to export");
      return;
    }

    try {
      const excelData = data.map((item) => ({
        'Supplier Name': item.supplierName,
        'Contact Person': item.contactPerson || '-',
        'Phone': item.phone,
        'Email': item.email || '-',
        'GST Number': item.gstNumber || '-',
        'City': item.city || '-',
        'Address': item.address || '-',
        'Status': item.status || 'active',
        'Notes': item.notes || '-',
      }));

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(excelData);

      ws['!cols'] = [
        { wch: 25 }, { wch: 20 }, { wch: 15 },
        { wch: 25 }, { wch: 18 }, { wch: 18 },
        { wch: 30 }, { wch: 12 }, { wch: 30 },
      ];

      XLSX.utils.book_append_sheet(wb, ws, 'Suppliers');
      const date = new Date().toISOString().split('T')[0];
      XLSX.writeFile(wb, `suppliers-${date}.xlsx`);
      
      toast.success(`Exported ${data.length} suppliers to Excel`);
    } catch (error) {
      toast.error("Failed to export Excel file");
      console.error(error);
    }
  }

  const getStatusColor = (status?: string) =>
    status === "inactive"
      ? "text-yellow-600 bg-yellow-50 border-yellow-200"
      : "text-green-600 bg-green-50 border-green-200";

  // ✅ Summary statistics
  const totalSuppliers = suppliers?.length || 0;
  const activeSuppliers = suppliers?.filter(s => s.status === "active").length || 0;
  const inactiveSuppliers = suppliers?.filter(s => s.status === "inactive").length || 0;

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Truck className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Supplier Management</h1>
            <p className="text-sm text-muted-foreground">
              Add and manage suppliers for your school.
            </p>
          </div>
        </div>
      </div>

      {/* ✅ Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border bg-card p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Suppliers</p>
              <p className="text-2xl font-bold">{totalSuppliers}</p>
            </div>
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Truck className="h-5 w-5 text-blue-500" />
            </div>
          </div>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Active</p>
              <p className="text-2xl font-bold text-green-500">{activeSuppliers}</p>
            </div>
            <div className="p-2 rounded-lg bg-green-500/10">
              <div className="h-5 w-5 rounded-full bg-green-500/20 flex items-center justify-center text-green-500">✓</div>
            </div>
          </div>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Inactive</p>
              <p className="text-2xl font-bold text-yellow-500">{inactiveSuppliers}</p>
            </div>
            <div className="p-2 rounded-lg bg-yellow-500/10">
              <div className="h-5 w-5 rounded-full bg-yellow-500/20 flex items-center justify-center text-yellow-500">⏸</div>
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
            <h2 className="font-semibold">{editingId ? "Edit Supplier" : "Add New Supplier"}</h2>
          </div>
        </div>
        <div className="p-6 space-y-4">
          {/* Row 1: Name, Contact, Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div>
              <Label className="text-sm font-medium flex items-center gap-1">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                Supplier Name <span className="text-red-500">*</span>
              </Label>
              <Input
                value={form.supplierName}
                onChange={(e) => setForm((f) => ({ ...f, supplierName: e.target.value }))}
                placeholder="e.g. ABC Stationery"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label className="text-sm font-medium flex items-center gap-1">
                <User className="h-4 w-4 text-muted-foreground" />
                Contact Person
              </Label>
              <Input
                value={form.contactPerson}
                onChange={(e) => setForm((f) => ({ ...f, contactPerson: e.target.value }))}
                placeholder="Contact person name"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label className="text-sm font-medium flex items-center gap-1">
                <Phone className="h-4 w-4 text-muted-foreground" />
                Phone <span className="text-red-500">*</span>
              </Label>
              <Input
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="10-digit mobile number"
                className="mt-1.5"
                maxLength={10}
              />
            </div>
          </div>

          {/* Row 2: Email, GST Number, City */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div>
              <Label className="text-sm font-medium flex items-center gap-1">
                <Mail className="h-4 w-4 text-muted-foreground" />
                Email
              </Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="Email address"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label className="text-sm font-medium flex items-center gap-1">
                <Hash className="h-4 w-4 text-muted-foreground" />
                GST Number
              </Label>
              <Input
                value={form.gstNumber}
                onChange={(e) => setForm((f) => ({ ...f, gstNumber: e.target.value }))}
                placeholder="GSTIN number"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label className="text-sm font-medium flex items-center gap-1">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                City
              </Label>
              <Input
                value={form.city}
                onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                placeholder="City name"
                className="mt-1.5"
              />
            </div>
          </div>

          {/* Row 3: Address, Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-sm font-medium flex items-center gap-1">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                Address
              </Label>
              <Textarea
                value={form.address}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                placeholder="Full address"
                className="mt-1.5"
                rows={2}
              />
            </div>
            <div>
              <Label className="text-sm font-medium flex items-center gap-1">
                <div className="h-4 w-4 rounded-full bg-green-500/20 flex items-center justify-center text-xs">●</div>
                Status
              </Label>
              <Select
                value={form.status}
                onValueChange={(v) => setForm((f) => ({ ...f, status: v as "active" | "inactive" }))}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Row 4: Notes */}
          <div>
            <Label className="text-sm font-medium flex items-center gap-1">
              <FileText className="h-4 w-4 text-muted-foreground" />
              Notes
            </Label>
            <Textarea
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="Any additional notes"
              className="mt-1.5"
              rows={2}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4 border-t">
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              <Save className="h-4 w-4" />
              {saving ? "Saving…" : editingId ? "Update Supplier" : "Save Supplier"}
            </Button>
            {editingId && (
              <Button variant="outline" onClick={cancelEdit} className="gap-2">
                <X className="h-4 w-4" /> Cancel
              </Button>
            )}
            <Button onClick={handleExportExcel} variant="outline" className="gap-2 border-green-500 text-green-600 hover:bg-green-50 ml-auto">
              <Download className="h-4 w-4" /> Export Excel
            </Button>
          </div>
        </div>
      </div>

      {/* ✅ Search and List */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h2 className="font-semibold flex items-center gap-2">
            <Truck className="h-5 w-5 text-primary" />
            Suppliers
            {!isLoading && filteredSuppliers.length > 0 && (
              <span className="ml-2 inline-flex items-center justify-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                {filteredSuppliers.length}
              </span>
            )}
          </h2>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, contact, phone, email..."
              className="pl-9 w-full"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
          </div>
        ) : filteredSuppliers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center rounded-lg border">
            <Truck className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-sm text-muted-foreground">No suppliers found</p>
            <p className="text-xs text-muted-foreground mt-1">Add your first supplier using the form above.</p>
          </div>
        ) : (
          <div className="rounded-lg border overflow-hidden overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/30">
                <tr>
                  <th className="text-left font-medium px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground">Supplier</th>
                  <th className="text-left font-medium px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground">Contact</th>
                  <th className="text-left font-medium px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground">Phone</th>
                  <th className="text-left font-medium px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground">City</th>
                  <th className="text-left font-medium px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground">Status</th>
                  <th className="text-right font-medium px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSuppliers.map((supplier) => (
                  <tr key={supplier.id} className="border-t hover:bg-muted/5 transition-colors">
                    <td className="px-4 py-3 font-medium">{supplier.supplierName}</td>
                    <td className="px-4 py-3">{supplier.contactPerson || "-"}</td>
                    <td className="px-4 py-3">{supplier.phone}</td>
                    <td className="px-4 py-3">{supplier.city || "-"}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${getStatusColor(supplier.status)}`}>
                        {supplier.status || "active"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => startEdit(supplier)} className="h-8 w-8 p-0 hover:bg-blue-50">
                          <Pencil className="h-4 w-4 text-blue-500" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(supplier)} className="h-8 w-8 p-0 hover:bg-red-50">
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