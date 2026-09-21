import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  BarChart3,
  FileText,
  Package,
  DollarSign,
  Trash2,
  Eye,
  Download,
  Printer,
  Calendar,
  TrendingUp,
  AlertTriangle,
  Search,
  RefreshCw,
  Box,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api/client";
import * as XLSX from "xlsx";

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

interface ReportRecord {
  id: string;
  month: string;
  monthLabel: string;
  totalItems: number;
  totalQuantity: number;
  totalValue: number;
  lowStockItems: number;
  categories: Record<string, number>;
  generatedOn: string;
  createdAt: string;
  updatedAt: string;
}

// ✅ Helper: Format currency in Indian Rupees
const formatCurrency = (amount: number): string => {
  if (!amount || amount === 0) return "₹0";
  const num = Number(amount);
  if (isNaN(num)) return "₹0";
  return `₹${num.toLocaleString('en-IN')}`;
};

// ✅ Helper: Format number with commas
const formatNumber = (num: number): string => {
  if (!num || num === 0) return "0";
  return num.toLocaleString('en-IN');
};

function monthLabel(monthValue: string) {
  const [year, month] = monthValue.split("-").map(Number);
  if (!year || !month) return monthValue;
  return new Date(year, month - 1, 1).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
}

function currentMonthValue() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function InventoryReportPage() {
  const queryClient = useQueryClient();
  const [selectedMonth, setSelectedMonth] = useState(currentMonthValue());
  const [generating, setGenerating] = useState(false);
  const [search, setSearch] = useState("");
  const [viewingReport, setViewingReport] = useState<ReportRecord | null>(null);

  // ✅ Fetch all stock in entries
  const stockInQuery = useQuery({
    queryKey: ["stock-in-for-report"],
    queryFn: async () => {
      const response = await apiFetch<{ data: StockInRecord[] }>(
        "/stock-in?limit=1000&sortBy=createdAt&sortOrder=desc"
      );
      return response.data || [];
    },
  });

  // ✅ Fetch saved reports from database
  const reportsQuery = useQuery({
    queryKey: ["inventory-report-list"],
    queryFn: async () => {
      const response = await apiFetch<{ data: ReportRecord[] }>(
        "/inventory-reports?limit=200&sortBy=createdAt&sortOrder=desc"
      );
      return response.data || [];
    },
  });

  // ✅ Calculate statistics from all stock in entries (with proper Number conversion)
  const allStockIn = stockInQuery.data ?? [];

  const totalItems = allStockIn.length;
  
  const totalQuantity = allStockIn.reduce(
    (sum: number, i: StockInRecord) => sum + (Number(i.quantity) || 0),
    0,
  );
  
  // ✅ Properly calculate total value with Number conversion
  const totalValue = allStockIn.reduce(
    (sum: number, i: StockInRecord) => {
      const amount = Number(i.totalAmount) || 0;
      return sum + amount;
    },
    0,
  );
  
  const lowStockItems = allStockIn.filter(
    (i) => (Number(i.quantity) || 0) <= (Number(i.requiredQuantity) || 0),
  ).length;

  // ✅ Category breakdown
  const categoryBreakdown = useMemo(() => {
    const categories: Record<string, number> = {};
    allStockIn.forEach((item: StockInRecord) => {
      const cat = item.category || "Uncategorized";
      categories[cat] = (categories[cat] || 0) + 1;
    });
    return categories;
  }, [allStockIn]);

  // ✅ Items in selected month
  const monthItems = useMemo(() => {
    return allStockIn.filter((item: StockInRecord) => {
      if (!item.createdAt) return false;
      const d = new Date(item.createdAt);
      const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      return value === selectedMonth;
    });
  }, [allStockIn, selectedMonth]);

  const monthTotalItems = monthItems.length;
  
  const monthTotalQuantity = monthItems.reduce(
    (sum: number, i: StockInRecord) => sum + (Number(i.quantity) || 0),
    0,
  );
  
  // ✅ Properly calculate month total value
  const monthTotalValue = monthItems.reduce(
    (sum: number, i: StockInRecord) => {
      const amount = Number(i.totalAmount) || 0;
      return sum + amount;
    },
    0,
  );
  
  const monthLowStock = monthItems.filter(
    (i: StockInRecord) => (Number(i.quantity) || 0) <= (Number(i.requiredQuantity) || 0),
  ).length;

  // Filter reports by search
  const filteredReports = useMemo(() => {
    const list = reportsQuery.data ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (r) =>
        (r.monthLabel ?? "").toLowerCase().includes(q) || (r.month ?? "").toLowerCase().includes(q),
    );
  }, [reportsQuery.data, search]);

  // ✅ Generate Report from Stock In data
  async function handleGenerateReport() {
    setGenerating(true);
    try {
      let stockIn: StockInRecord[] = [];
      try {
        const response = await apiFetch<{ data: StockInRecord[] }>(
          "/stock-in?limit=1000&sortBy=createdAt&sortOrder=desc"
        );
        stockIn = response.data || [];
      } catch (error) {
        console.warn("⚠️ Failed to fetch stock in data:", error);
        toast.error("Failed to fetch stock in data");
        setGenerating(false);
        return;
      }

      const totalItems = stockIn.length;
      const totalQuantity = stockIn.reduce((sum, i) => sum + (Number(i.quantity) || 0), 0);
      const totalValue = stockIn.reduce((sum, i) => sum + (Number(i.totalAmount) || 0), 0);
      const lowStockItems = stockIn.filter(
        (i) => (Number(i.quantity) || 0) <= (Number(i.requiredQuantity) || 0),
      ).length;

      const categories: Record<string, number> = {};
      stockIn.forEach((item) => {
        const cat = item.category || "Uncategorized";
        categories[cat] = (categories[cat] || 0) + 1;
      });

      const newReport = {
        month: selectedMonth,
        monthLabel: monthLabel(selectedMonth),
        totalItems: totalItems,
        totalQuantity: totalQuantity,
        totalValue: totalValue,
        lowStockItems: lowStockItems,
        categories: categories,
        generatedOn: new Date().toISOString().split("T")[0],
      };

      await apiFetch("/inventory-reports", {
        method: "POST",
        body: JSON.stringify(newReport),
      });

      toast.success(`Report generated for ${monthLabel(selectedMonth)}`);
      await queryClient.invalidateQueries({ queryKey: ["inventory-report-list"] });
      await queryClient.invalidateQueries({ queryKey: ["stock-in-for-report"] });
    } catch (err: any) {
      console.error("❌ Error generating report:", err);
      toast.error(err?.message || "Failed to generate report");
    } finally {
      setGenerating(false);
    }
  }

  // ✅ Refresh data from Stock In
  async function handleRefreshData() {
    try {
      await queryClient.invalidateQueries({ queryKey: ["stock-in-for-report"] });
      await queryClient.invalidateQueries({ queryKey: ["inventory-report-list"] });
      toast.success("Data refreshed");
    } catch (error) {
      toast.error("Failed to refresh data");
    }
  }

  // ✅ Delete Report from Database
  async function handleDeleteReport(report: ReportRecord) {
    if (!window.confirm(`Delete the report for ${report.monthLabel || report.month}?`)) return;
    
    try {
      await apiFetch(`/inventory-reports/${report.id}`, {
        method: "DELETE",
      });

      toast.success("Report deleted");
      await queryClient.invalidateQueries({ queryKey: ["inventory-report-list"] });
    } catch (err: any) {
      console.error("❌ Error deleting report:", err);
      toast.error(err?.message || "Failed to delete report");
    }
  }

  // ✅ View Report Modal
  function handleViewReport(report: ReportRecord) {
    setViewingReport(report);
  }

  // ✅ Export to Excel
  function handleExportExcel() {
    const data = filteredReports;
    if (data.length === 0) {
      toast.error("No data to export");
      return;
    }

    try {
      const excelData = data.map((r) => ({
        Month: r.monthLabel || r.month,
        "Total Items": r.totalItems,
        "Total Quantity": r.totalQuantity,
        "Total Value (₹)": Number(r.totalValue).toFixed(2),
        "Low Stock Items": r.lowStockItems,
        Categories: Object.entries(r.categories || {})
          .map(([key, val]) => `${key}: ${val}`)
          .join("; "),
        "Generated On": r.generatedOn,
      }));

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(excelData);

      ws["!cols"] = [
        { wch: 25 },
        { wch: 15 },
        { wch: 15 },
        { wch: 20 },
        { wch: 15 },
        { wch: 40 },
        { wch: 15 },
      ];

      XLSX.utils.book_append_sheet(wb, ws, "Inventory Reports");
      const date = new Date().toISOString().split("T")[0];
      XLSX.writeFile(wb, `inventory-reports-${date}.xlsx`);

      toast.success(`Exported ${data.length} reports to Excel`);
    } catch (error) {
      toast.error("Failed to export Excel file");
      console.error(error);
    }
  }

  // ✅ Print
  function handlePrint() {
    window.print();
  }

  // Summary calculations
  const totalReports = reportsQuery.data?.length || 0;
  const isLoading = stockInQuery.isLoading || reportsQuery.isLoading;

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <BarChart3 className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Inventory Report</h1>
            <p className="text-sm text-muted-foreground">
              Generate reports from Stock In data. Fetches live inventory data.
            </p>
          </div>
        </div>
      </div>

      {/* ✅ Summary Cards - Live from Stock In */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Items</p>
              <p className="text-2xl font-bold">{formatNumber(totalItems)}</p>
            </div>
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Package className="h-5 w-5 text-blue-500" />
            </div>
          </div>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Quantity</p>
              <p className="text-2xl font-bold">{formatNumber(totalQuantity)}</p>
            </div>
            <div className="p-2 rounded-lg bg-green-500/10">
              <Box className="h-5 w-5 text-green-500" />
            </div>
          </div>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Value</p>
              <p className="text-2xl font-bold">{formatCurrency(totalValue)}</p>
            </div>
            <div className="p-2 rounded-lg bg-purple-500/10">
              <DollarSign className="h-5 w-5 text-purple-500" />
            </div>
          </div>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Low Stock</p>
              <p className="text-2xl font-bold text-red-500">{formatNumber(lowStockItems)}</p>
            </div>
            <div className="p-2 rounded-lg bg-red-500/10">
              <AlertTriangle className="h-5 w-5 text-red-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Category Breakdown */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="p-4 border-b bg-muted/20">
          <h2 className="font-semibold flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Category Breakdown
          </h2>
        </div>
        <div className="p-4">
          <div className="flex flex-wrap gap-2">
            {Object.entries(categoryBreakdown).map(([category, count]) => (
              <span
                key={category}
                className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-sm"
              >
                {category}
                <span className="rounded-full bg-primary/20 px-2 py-0.5 text-xs font-medium">
                  {count}
                </span>
              </span>
            ))}
            {Object.keys(categoryBreakdown).length === 0 && (
              <p className="text-sm text-muted-foreground">No items added yet</p>
            )}
          </div>
        </div>
      </div>

      {/* Month selector + live preview */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="p-6 border-b bg-muted/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-500" />
              <h2 className="font-semibold">Generate Report</h2>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={handleRefreshData}
            >
              <RefreshCw className="h-4 w-4" />
              Refresh Data
            </Button>
          </div>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
            <div>
              <Label className="text-sm font-medium flex items-center gap-1">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                Month
              </Label>
              <Input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="mt-1.5"
              />
            </div>
            <div className="rounded-lg border bg-muted/20 p-3">
              <p className="text-xs text-muted-foreground">Items ({monthLabel(selectedMonth)})</p>
              <p className="text-xl font-bold mt-1">{formatNumber(monthTotalItems)}</p>
            </div>
            <div className="rounded-lg border bg-muted/20 p-3">
              <p className="text-xs text-muted-foreground">Quantity</p>
              <p className="text-xl font-bold mt-1">{formatNumber(monthTotalQuantity)}</p>
            </div>
            <div className="rounded-lg border bg-muted/20 p-3">
              <p className="text-xs text-muted-foreground">Value</p>
              <p className="text-xl font-bold mt-1">{formatCurrency(monthTotalValue)}</p>
            </div>
          </div>

          <Button
            onClick={handleGenerateReport}
            disabled={generating || stockInQuery.isLoading}
            className="gap-2"
          >
            <TrendingUp className="h-4 w-4" />
            {generating ? "Generating…" : "Generate Report"}
          </Button>
        </div>
      </div>

      {/* Saved reports list */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h2 className="font-semibold flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Saved Reports
            {!reportsQuery.isLoading && filteredReports.length > 0 && (
              <span className="ml-2 inline-flex items-center justify-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                {filteredReports.length}
              </span>
            )}
          </h2>
          <div className="flex items-center gap-2">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by month..."
                className="pl-9 w-full"
              />
            </div>
            <Button variant="outline" size="sm" className="gap-2" onClick={handlePrint}>
              <Printer className="h-4 w-4" /> Print
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-2 border-green-500 text-green-600 hover:bg-green-50"
              onClick={handleExportExcel}
            >
              <Download className="h-4 w-4" /> Export Excel
            </Button>
          </div>
        </div>

        {reportsQuery.isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : reportsQuery.isError ? (
          <p className="text-sm text-destructive rounded-lg border p-4">
            Failed to load reports. Please try again.
          </p>
        ) : filteredReports.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center rounded-lg border">
            <BarChart3 className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-sm text-muted-foreground">No reports found</p>
            <p className="text-xs text-muted-foreground mt-1">
              Generate your first report using the form above.
            </p>
          </div>
        ) : (
          <div className="rounded-lg border overflow-hidden overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/30">
                <tr>
                  <th className="text-left font-medium px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground">
                    Month
                  </th>
                  <th className="text-left font-medium px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground">
                    Items
                  </th>
                  <th className="text-left font-medium px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground">
                    Quantity
                  </th>
                  <th className="text-left font-medium px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground">
                    Value
                  </th>
                  <th className="text-left font-medium px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground">
                    Low Stock
                  </th>
                  <th className="text-left font-medium px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground">
                    Generated
                  </th>
                  <th className="text-right font-medium px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredReports.map((report) => (
                  <tr key={report.id} className="border-t hover:bg-muted/5 transition-colors">
                    <td className="px-4 py-3 font-medium">{report.monthLabel || report.month}</td>
                    <td className="px-4 py-3">{formatNumber(report.totalItems)}</td>
                    <td className="px-4 py-3">{formatNumber(report.totalQuantity)}</td>
                    <td className="px-4 py-3 font-semibold text-primary">
                      {formatCurrency(report.totalValue)}
                    </td>
                    <td className="px-4 py-3 text-red-500">{formatNumber(report.lowStockItems)}</td>
                    <td className="px-4 py-3">{report.generatedOn}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewReport(report)}
                          className="h-8 w-8 p-0 hover:bg-blue-50"
                        >
                          <Eye className="h-4 w-4 text-blue-500" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteReport(report)}
                          className="h-8 w-8 p-0 hover:bg-red-50"
                        >
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

      {/* View Report Modal */}
      {viewingReport && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => setViewingReport(null)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b bg-muted/20">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Report Details
              </h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setViewingReport(null)}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Month:</span>
                <span className="font-medium">
                  {viewingReport.monthLabel || viewingReport.month}
                </span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Items:</span>
                <span>{formatNumber(viewingReport.totalItems)}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Quantity:</span>
                <span>{formatNumber(viewingReport.totalQuantity)}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Value:</span>
                <span className="font-semibold text-primary">
                  {formatCurrency(viewingReport.totalValue)}
                </span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Low Stock:</span>
                <span className="text-red-500 font-medium">{formatNumber(viewingReport.lowStockItems)}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Generated On:</span>
                <span>{viewingReport.generatedOn}</span>
              </div>

              <div>
                <span className="text-muted-foreground block mb-2">Categories:</span>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(viewingReport.categories || {}).map(([key, val]) => (
                    <span
                      key={key}
                      className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-sm"
                    >
                      {key}
                      <span className="rounded-full bg-primary/20 px-2 py-0.5 text-xs font-medium">
                        {val}
                      </span>
                    </span>
                  ))}
                  {Object.keys(viewingReport.categories || {}).length === 0 && (
                    <p className="text-sm text-muted-foreground">No categories listed</p>
                  )}
                </div>
              </div>
            </div>

            <div className="p-6 border-t bg-muted/20 flex justify-end">
              <Button variant="outline" onClick={() => setViewingReport(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}