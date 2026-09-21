import { useState, useMemo, useEffect } from "react";
import { toast } from "sonner";
import { 
  Loader2, Pencil, Trash2, X, UserPlus, 
  Search, Download, Printer, Calendar, 
  DollarSign, Users, TrendingUp, FileText, Filter, RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api/client";
import * as XLSX from 'xlsx';

// ✅ Staff Member Interface
interface StaffMember {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  designation: string;
  department?: string;
  phone: string;
  email: string;
  isActive: boolean;
}

// ✅ Payroll Record Interface — matches the "staff-payroll" generic module
// fields registered in school-erp-backend/src/shared/modules-registry.ts
// (staffId, empId, name, month, monthLabel, gross, deductions, net, remarks).
interface PayrollRecord {
  id: string;
  staffId: string;
  empId: string;
  name: string;
  month: string;
  monthLabel: string;
  gross: number;
  deductions: number;
  net: number;
  remarks?: string;
  createdAt: string;
  updatedAt: string;
}

// ✅ Form State Interface
interface FormState {
  staffId: string;
  month: string;
  gross: string;
  deductions: string;
  net: string;
  remarks: string;
}

const EMPTY_FORM: FormState = {
  staffId: "",
  month: new Date().toISOString().slice(0, 7),
  gross: "",
  deductions: "",
  net: "",
  remarks: "",
};

// ✅ Month Options
const MONTH_OPTIONS = [
  { value: "2026-01", label: "January 2026" },
  { value: "2026-02", label: "February 2026" },
  { value: "2026-03", label: "March 2026" },
  { value: "2026-04", label: "April 2026" },
  { value: "2026-05", label: "May 2026" },
  { value: "2026-06", label: "June 2026" },
  { value: "2026-07", label: "July 2026" },
  { value: "2026-08", label: "August 2026" },
  { value: "2026-09", label: "September 2026" },
  { value: "2026-10", label: "October 2026" },
  { value: "2026-11", label: "November 2026" },
  { value: "2026-12", label: "December 2026" },
];

// ✅ Month Label Helper
function getMonthLabel(monthValue: string) {
  const [year, month] = monthValue.split("-").map(Number);
  if (!year || !month) return monthValue;
  return new Date(year, month - 1, 1).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
}

export function StaffPayrollPage() {
  const [search, setSearch] = useState("");
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<PayrollRecord | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  const [selectedEmployee, setSelectedEmployee] = useState<string>("all");
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [payroll, setPayroll] = useState<PayrollRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // ✅ Load data on mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // ✅ Load staff list (for the Employee dropdown) from the real backend
      try {
        const response = await apiFetch<{ data: StaffMember[] }>(
          "/teachers?limit=100&sortBy=createdAt&sortOrder=desc"
        );
        setStaff(response.data || []);
      } catch (error) {
        console.error("❌ Failed to load staff:", error);
        toast.error("Failed to load staff list");
        setStaff([]);
      }

      // ✅ Load payroll records from the real backend — the generic CRUD
      // module registered as "staff-payroll" (see modules-registry.ts).
      // This used to read/write localStorage only, which meant records
      // never left the browser and never showed up in the database.
      try {
        const res = await apiFetch<{ data: PayrollRecord[] }>(
          "/generic/staff-payroll?limit=100&sortOrder=desc"
        );
        setPayroll(res.data || []);
      } catch (error) {
        console.error("❌ Failed to load payroll records:", error);
        toast.error("Failed to load payroll records");
        setPayroll([]);
      }
    } finally {
      setLoading(false);
    }
  };

  // ✅ Filter Payroll Records
  const filteredPayroll = useMemo(() => {
    let result = payroll;
    
    const q = search.trim().toLowerCase();
    if (q) {
      result = result.filter((p) =>
        (p.name ?? "").toLowerCase().includes(q) ||
        (p.empId ?? "").toLowerCase().includes(q) ||
        (p.monthLabel ?? "").toLowerCase().includes(q)
      );
    }
    
    if (selectedMonth !== "all") {
      result = result.filter((p) => p.month === selectedMonth);
    }
    
    if (selectedEmployee !== "all") {
      result = result.filter((p) => p.staffId === selectedEmployee);
    }
    
    return result;
  }, [payroll, search, selectedMonth, selectedEmployee]);

  // ✅ Auto-calculate Net Amount
  const calculateNet = () => {
    const gross = parseFloat(form.gross) || 0;
    const deductions = parseFloat(form.deductions) || 0;
    const net = gross - deductions;
    setForm((f) => ({ ...f, net: net > 0 ? net.toFixed(2) : "0" }));
  };

  const handleGrossChange = (value: string) => {
    setForm((f) => ({ ...f, gross: value }));
    setTimeout(calculateNet, 10);
  };

  const handleDeductionsChange = (value: string) => {
    setForm((f) => ({ ...f, deductions: value }));
    setTimeout(calculateNet, 10);
  };

  // ✅ Reset Form
  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
  };

  // ✅ Start Edit
  const startEdit = (record: PayrollRecord) => {
    setEditingId(record.id);
    setForm({
      staffId: record.staffId || "",
      month: record.month || "",
      gross: record.gross?.toString() || "",
      deductions: record.deductions?.toString() || "",
      net: record.net?.toString() || "",
      remarks: record.remarks || "",
    });
  };

  // ✅ Save Payroll Record — POST/PUT to the real backend
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!form.staffId) {
      toast.error("Please select an employee");
      return;
    }
    if (!form.month) {
      toast.error("Please select a month");
      return;
    }
    if (!form.gross || parseFloat(form.gross) <= 0) {
      toast.error("Gross amount must be greater than 0");
      return;
    }

    const selectedStaff = staff.find(s => s.id === form.staffId);
    const grossAmount = parseFloat(form.gross) || 0;
    const deductionsAmount = parseFloat(form.deductions) || 0;
    const netAmount = grossAmount - deductionsAmount;

    const payload = {
      staffId: form.staffId,
      empId: selectedStaff?.employeeId || "",
      name: selectedStaff ? `${selectedStaff.firstName} ${selectedStaff.lastName}` : "",
      month: form.month,
      monthLabel: getMonthLabel(form.month),
      gross: grossAmount,
      deductions: deductionsAmount,
      net: netAmount,
      remarks: form.remarks || "",
    };

    setSaving(true);
    try {
      if (editingId) {
        await apiFetch(`/generic/staff-payroll/${editingId}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        toast.success("Payroll record updated successfully");
      } else {
        await apiFetch("/generic/staff-payroll", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        toast.success("Payroll record added successfully");
      }

      resetForm();
      await loadData();
    } catch (err: any) {
      console.error("❌ Error:", err);
      toast.error(err?.message || "Failed to save payroll record");
    } finally {
      setSaving(false);
    }
  };

  // ✅ Delete Payroll Record — DELETE on the real backend
  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await apiFetch(`/generic/staff-payroll/${deleting.id}`, { method: "DELETE" });
      toast.success("Payroll record deleted successfully");
      setDeleting(null);
      if (editingId === deleting.id) resetForm();
      await loadData();
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete payroll record");
    }
  };

  // ✅ Export to Excel
  const handleExportExcel = () => {
    if (filteredPayroll.length === 0) {
      toast.error("No data to export");
      return;
    }

    try {
      const excelData = filteredPayroll.map((p) => ({
        'Employee ID': p.empId || '-',
        'Name': p.name || '-',
        'Month': p.monthLabel || '-',
        'Gross (₹)': p.gross || 0,
        'Deductions (₹)': p.deductions || 0,
        'Net (₹)': p.net || 0,
        'Remarks': p.remarks || '-',
      }));

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(excelData);

      ws['!cols'] = [
        { wch: 15 }, { wch: 20 }, { wch: 18 },
        { wch: 15 }, { wch: 18 }, { wch: 15 }, { wch: 25 },
      ];

      XLSX.utils.book_append_sheet(wb, ws, 'Payroll');
      const date = new Date().toISOString().split('T')[0];
      XLSX.writeFile(wb, `payroll-${date}.xlsx`);
      
      toast.success(`Exported ${filteredPayroll.length} records to Excel`);
    } catch (error) {
      toast.error("Failed to export Excel file");
      console.error(error);
    }
  };

  // ✅ Print
  const handlePrint = () => {
    window.print();
  };

  // ✅ Refresh Data
  const handleRefresh = () => {
    loadData();
    toast.success("Data refreshed");
  };

  // ✅ Summary Statistics
  const totalRecords = payroll.length;
  const totalGross = payroll.reduce((sum, p) => sum + (p.gross || 0), 0);
  const totalNet = payroll.reduce((sum, p) => sum + (p.net || 0), 0);

  // ✅ Get unique months for filters
  const uniqueMonths = useMemo(() => {
    const months = new Set(payroll.map(p => p.month));
    return Array.from(months).sort();
  }, [payroll]);

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <DollarSign className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Staff Payroll</h1>
            <p className="text-sm text-muted-foreground">
              Manage staff payroll records for your school.
            </p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border bg-card p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Records</p>
              <p className="text-2xl font-bold">{totalRecords}</p>
            </div>
            <div className="p-2 rounded-lg bg-blue-500/10">
              <FileText className="h-5 w-5 text-blue-500" />
            </div>
          </div>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Gross</p>
              <p className="text-2xl font-bold">₹{totalGross.toLocaleString()}</p>
            </div>
            <div className="p-2 rounded-lg bg-green-500/10">
              <TrendingUp className="h-5 w-5 text-green-500" />
            </div>
          </div>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Net</p>
              <p className="text-2xl font-bold">₹{totalNet.toLocaleString()}</p>
            </div>
            <div className="p-2 rounded-lg bg-purple-500/10">
              <DollarSign className="h-5 w-5 text-purple-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Filter Section */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="p-6">
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex-1 min-w-[180px]">
              <Label className="text-sm font-medium">Employee</Label>
              <Select
                value={selectedEmployee}
                onValueChange={setSelectedEmployee}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="All Employees" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Employees</SelectItem>
                  {staff.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.firstName} {s.lastName} ({s.employeeId || "No ID"})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1 min-w-[180px]">
              <Label className="text-sm font-medium">Month</Label>
              <Select
                value={selectedMonth}
                onValueChange={setSelectedMonth}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="All Months" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Months</SelectItem>
                  {uniqueMonths.map((m) => (
                    <SelectItem key={m} value={m}>
                      {getMonthLabel(m)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1 min-w-[180px]">
              <Label className="text-sm font-medium">Search</Label>
              <div className="relative mt-1.5">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name, ID..."
                  className="pl-9"
                />
              </div>
            </div>

            <Button 
              variant="outline" 
              className="gap-2" 
              onClick={() => {
                setSelectedMonth("all");
                setSelectedEmployee("all");
                setSearch("");
              }}
            >
              <Filter className="h-4 w-4" /> Clear
            </Button>

            <Button 
              variant="outline" 
              className="gap-2"
              onClick={handleRefresh}
            >
              <RefreshCw className="h-4 w-4" /> Refresh
            </Button>
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
              <UserPlus className="h-5 w-5 text-green-500" />
            )}
            <h2 className="font-semibold">{editingId ? "Edit Payroll Record" : "New Payroll Record"}</h2>
            {editingId && (
              <Button 
                type="button" 
                variant="ghost" 
                size="sm" 
                onClick={resetForm} 
                className="ml-auto gap-1 text-muted-foreground"
              >
                <X className="h-4 w-4" /> Cancel Edit
              </Button>
            )}
          </div>
        </div>
        <form onSubmit={handleSave}>
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium flex items-center gap-1">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  Employee <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={form.staffId}
                  onValueChange={(v) => setForm((f) => ({ ...f, staffId: v }))}
                >
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder="Select employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {loading ? (
                      <SelectItem value="loading" disabled>Loading...</SelectItem>
                    ) : staff.length === 0 ? (
                      <SelectItem value="none" disabled>No staff found</SelectItem>
                    ) : (
                      staff.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.firstName} {s.lastName} ({s.employeeId || "No ID"})
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  {staff.length} employee(s) available
                </p>
              </div>
              <div>
                <Label className="text-sm font-medium flex items-center gap-1">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  Month <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={form.month}
                  onValueChange={(v) => setForm((f) => ({ ...f, month: v }))}
                >
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder="Select month" />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTH_OPTIONS.map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <Label className="text-sm font-medium flex items-center gap-1">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  Gross (₹) <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.gross}
                  onChange={(e) => handleGrossChange(e.target.value)}
                  placeholder="e.g. 45000"
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label className="text-sm font-medium flex items-center gap-1">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  Deductions (₹)
                </Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.deductions}
                  onChange={(e) => handleDeductionsChange(e.target.value)}
                  placeholder="e.g. 2000"
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label className="text-sm font-medium flex items-center gap-1">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  Net Amount
                </Label>
                <div className="relative mt-1.5">
                  <Input
                    type="text"
                    value={form.net ? `₹${parseFloat(form.net).toLocaleString()}` : "₹0"}
                    className="bg-muted/20 font-semibold text-primary pr-12"
                    readOnly
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                    Auto
                  </span>
                </div>
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium">Remarks</Label>
              <Input
                value={form.remarks}
                onChange={(e) => setForm((f) => ({ ...f, remarks: e.target.value }))}
                placeholder="Optional note"
                className="mt-1.5"
              />
            </div>

            <div className="flex gap-2 pt-4 border-t">
              <Button 
                type="submit" 
                disabled={saving || !form.staffId || !form.month || !form.gross} 
                className="gap-2"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <UserPlus className="h-4 w-4" />
                )}
                {saving ? "Saving…" : editingId ? "Update Record" : "Add Record"}
              </Button>
              {editingId && (
                <Button type="button" variant="outline" onClick={resetForm} className="gap-2">
                  <X className="h-4 w-4" /> Cancel
                </Button>
              )}
            </div>
          </div>
        </form>
      </div>

      {/* Results Table */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h2 className="font-semibold flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Payroll Records
            {!loading && filteredPayroll.length > 0 && (
              <span className="ml-2 inline-flex items-center justify-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                {filteredPayroll.length}
              </span>
            )}
          </h2>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-2" onClick={handlePrint}>
              <Printer className="h-4 w-4" /> Print
            </Button>
            <Button variant="outline" size="sm" className="gap-2 border-green-500 text-green-600 hover:bg-green-50" onClick={handleExportExcel}>
              <Download className="h-4 w-4" /> Export Excel
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
          </div>
        ) : filteredPayroll.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center rounded-lg border">
            <DollarSign className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-sm text-muted-foreground">No payroll records found</p>
            <p className="text-xs text-muted-foreground mt-1">Add your first payroll record using the form above.</p>
          </div>
        ) : (
          <div className="rounded-lg border overflow-hidden overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/30">
                <tr>
                  <th className="text-left font-medium px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground">Employee ID</th>
                  <th className="text-left font-medium px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground">Name</th>
                  <th className="text-left font-medium px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground">Month</th>
                  <th className="text-left font-medium px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground">Gross (₹)</th>
                  <th className="text-left font-medium px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground">Deductions (₹)</th>
                  <th className="text-left font-medium px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground">Net (₹)</th>
                  <th className="text-right font-medium px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPayroll.map((record) => (
                  <tr key={record.id} className="border-t hover:bg-muted/5 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs">{record.empId || "-"}</td>
                    <td className="px-4 py-3 font-medium">{record.name || "-"}</td>
                    <td className="px-4 py-3">{record.monthLabel || "-"}</td>
                    <td className="px-4 py-3">₹{record.gross?.toLocaleString() || "0"}</td>
                    <td className="px-4 py-3">₹{record.deductions?.toLocaleString() || "0"}</td>
                    <td className="px-4 py-3 font-semibold text-primary">
                      ₹{record.net?.toLocaleString() || "0"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => startEdit(record)} className="h-8 w-8 p-0 hover:bg-blue-50">
                          <Pencil className="h-4 w-4 text-blue-500" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setDeleting(record)} className="h-8 w-8 p-0 hover:bg-red-50">
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this payroll record?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the payroll record for {deleting?.name} ({deleting?.monthLabel}).
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ✅ Default export
export default StaffPayrollPage;