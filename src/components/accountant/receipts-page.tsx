import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Search,
  Loader2,
  Receipt,
  Download,
  RefreshCw,
  Printer,
  Wallet,
  TrendingUp,
  CalendarClock,
  X,
  Eye,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { apiFetch } from "@/lib/api/client";

/* ============================================================
   TYPES
   ============================================================ */
interface ReceiptRow {
  id: string;
  receiptNo: string;
  date: string;
  studentId: string;
  studentName: string;
  admissionNo?: string;
  className: string;
  feeName: string;
  amount: number;
  totalAmount: number;
  status: string;
  paymentMode: string | null;
  transactionId?: string | null;
  remarks?: string | null;
}

interface ReceiptStats {
  totalCount: number;
  todayCount: number;
  monthCount: number;
  totalAmount: number;
  todayAmount: number;
  monthAmount: number;
}

/* ============================================================
   HELPERS
   ============================================================ */
function formatINR(n: number) {
  return `Rs. ${Math.round(n).toLocaleNumberString?.("en-IN") ?? Math.round(n).toLocaleString("en-IN")}`;
}

function formatDate(d: string) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(d: string) {
  if (!d) return "-";
  return new Date(d).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/* ============================================================
   PRINT HELPER — prints ONLY the receipt element by id
   ============================================================ */
function printElementById(elementId: string) {
  const el = document.getElementById(elementId);
  if (!el) {
    window.print();
    return;
  }

  const printWindow = window.open("", "_blank", "width=800,height=900");
  if (!printWindow) {
    // popup blocked — fall back to in-page print with CSS
    window.print();
    return;
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Receipt</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            padding: 32px;
            color: #111;
          }
          .receipt-box {
            max-width: 520px;
            margin: 0 auto;
            border: 1px solid #e5e7eb;
            border-radius: 12px;
            padding: 24px;
          }
          .header {
            text-align: center;
            padding-bottom: 16px;
            border-bottom: 2px dashed #e5e7eb;
            margin-bottom: 20px;
          }
          .header h1 { font-size: 20px; margin-bottom: 4px; }
          .header p { font-size: 12px; color: #666; }
          .receipt-no {
            background: #f3f4f6;
            border-radius: 8px;
            padding: 12px;
            text-align: center;
            margin-bottom: 20px;
          }
          .receipt-no .label {
            font-size: 10px;
            color: #666;
            text-transform: uppercase;
            letter-spacing: 0.05em;
          }
          .receipt-no .value {
            font-family: ui-monospace, monospace;
            font-size: 18px;
            font-weight: 600;
            margin-top: 4px;
          }
          .receipt-no .date { font-size: 11px; color: #666; margin-top: 4px; }
          .row {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            font-size: 13px;
            border-bottom: 1px solid #f3f4f6;
          }
          .row .label { color: #666; }
          .row .value { font-weight: 500; }
          .total {
            display: flex;
            justify-content: space-between;
            padding: 14px 0;
            font-size: 16px;
            border-top: 2px solid #111;
            margin-top: 12px;
          }
          .total .value { color: #059669; font-weight: 700; }
          .footer {
            text-align: center;
            font-size: 11px;
            color: #999;
            margin-top: 24px;
            padding-top: 16px;
            border-top: 1px dashed #e5e7eb;
          }
          @media print {
            body { padding: 0; }
            .receipt-box { border: none; }
          }
        </style>
      </head>
      <body>
        ${el.innerHTML}
      </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 250);
}

/* ============================================================
   COMPONENT
   ============================================================ */
export function ReceiptsPage() {
  const [search, setSearch] = useState("");
  const [methodFilter, setMethodFilter] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [page, setPage] = useState(1);
  const [selectedReceipt, setSelectedReceipt] = useState<ReceiptRow | null>(
    null
  );

  const limit = 20;

  /* ---------- queries ---------- */
  const {
    data: receiptsData,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ["receipts", search, methodFilter, fromDate, toDate, page],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        search,
        method: methodFilter,
        from: fromDate,
        to: toDate,
      });
      return await apiFetch<{
        data: ReceiptRow[];
        pagination: {
          page: number;
          limit: number;
          total: number;
          totalPages: number;
        };
      }>(`/accountant/receipts?${params}`);
    },
  });

  const { data: stats } = useQuery({
    queryKey: ["receipt-stats"],
    queryFn: async () =>
      (
        await apiFetch<{ data: ReceiptStats }>(
          "/accountant/receipts/stats"
        )
      ).data,
  });

  /* ---------- derived ---------- */
  const rows = receiptsData?.data || [];
  const pagination = receiptsData?.pagination;

  /* ---------- handlers ---------- */
  const handleClearFilters = () => {
    setSearch("");
    setMethodFilter("all");
    setFromDate("");
    setToDate("");
    setPage(1);
  };

  const handleExport = () => {
    if (rows.length === 0) {
      toast.error("No receipts to export");
      return;
    }
    const header =
      "Receipt No,Date,Student,Admission No,Class,Fee,Amount,Method,Status\n";
    const body = rows
      .map((r) =>
        [
          r.receiptNo,
          new Date(r.date).toLocaleDateString(),
          r.studentName,
          r.admissionNo || "",
          r.className,
          r.feeName,
          r.amount,
          r.paymentMode || "",
          r.status,
        ].join(",")
      )
      .join("\n");
    const blob = new Blob([header + body], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `receipts-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Exported successfully");
  };

  const handleQuickPrint = (row: ReceiptRow) => {
    // Set selected then print after React renders it into the hidden print area
    setSelectedReceipt(row);
    setTimeout(() => {
      printElementById("receipt-print-area");
    }, 200);
  };

  const handlePrintFromDialog = () => {
    if (!selectedReceipt) return;
    printElementById("receipt-print-area");
  };

  const hasFilters =
    search || methodFilter !== "all" || fromDate || toDate;

  /* ---------- render ---------- */
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Receipts</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            View and issue payment receipts
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => refetch()}
            disabled={isRefetching}
          >
            <RefreshCw
              className={`h-4 w-4 ${isRefetching ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
          <Button
            variant="outline"
            className="gap-2"
            onClick={handleExport}
          >
            <Download className="h-4 w-4" /> Export
          </Button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4 card-elevated">
            <div className="flex items-center gap-2 text-muted-foreground text-xs">
              <Receipt className="h-4 w-4" /> Total Receipts
            </div>
            <p className="text-2xl font-bold mt-1">{stats.totalCount}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {formatINR(stats.totalAmount)} collected
            </p>
          </Card>
          <Card className="p-4 card-elevated">
            <div className="flex items-center gap-2 text-muted-foreground text-xs">
              <Wallet className="h-4 w-4" /> Today
            </div>
            <p className="text-2xl font-bold mt-1">{stats.todayCount}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {formatINR(stats.todayAmount)}
            </p>
          </Card>
          <Card className="p-4 card-elevated">
            <div className="flex items-center gap-2 text-muted-foreground text-xs">
              <TrendingUp className="h-4 w-4" /> This Month
            </div>
            <p className="text-2xl font-bold mt-1">{stats.monthCount}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {formatINR(stats.monthAmount)}
            </p>
          </Card>
          <Card className="p-4 card-elevated">
            <div className="flex items-center gap-2 text-muted-foreground text-xs">
              <CalendarClock className="h-4 w-4" /> Avg per Receipt
            </div>
            <p className="text-2xl font-bold mt-1">
              {formatINR(
                stats.totalCount > 0
                  ? stats.totalAmount / stats.totalCount
                  : 0
              )}
            </p>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card className="p-4 card-elevated">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="relative lg:col-span-2">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search receipt no / student / admission no..."
              className="pl-9"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <Select
            value={methodFilter}
            onValueChange={(v) => {
              setMethodFilter(v);
              setPage(1);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="All Methods" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Methods</SelectItem>
              <SelectItem value="CASH">Cash</SelectItem>
              <SelectItem value="UPI">UPI</SelectItem>
              <SelectItem value="CARD">Card</SelectItem>
              <SelectItem value="CHEQUE">Cheque</SelectItem>
              <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
              <SelectItem value="ONLINE">Online</SelectItem>
            </SelectContent>
          </Select>
          <Input
            type="date"
            value={fromDate}
            onChange={(e) => {
              setFromDate(e.target.value);
              setPage(1);
            }}
          />
          <Input
            type="date"
            value={toDate}
            onChange={(e) => {
              setToDate(e.target.value);
              setPage(1);
            }}
          />
        </div>
        {hasFilters && (
          <div className="mt-3 flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearFilters}
              className="gap-2"
            >
              <X className="h-3 w-3" /> Clear filters
            </Button>
          </div>
        )}
      </Card>

      {/* Table */}
      <Card className="card-elevated overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : rows.length === 0 ? (
          <div className="py-16 text-center">
            <Receipt className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm font-medium text-muted-foreground">
              {hasFilters
                ? "No receipts match your filters."
                : "No receipts yet."}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {hasFilters
                ? "Try adjusting your search or date range."
                : "Collect a payment to generate your first receipt."}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground border-b bg-muted/20">
                    <th className="px-4 py-3 font-medium">Receipt No</th>
                    <th className="px-4 py-3 font-medium">Date</th>
                    <th className="px-4 py-3 font-medium">Student</th>
                    <th className="px-4 py-3 font-medium">Class</th>
                    <th className="px-4 py-3 font-medium">Fee</th>
                    <th className="px-4 py-3 font-medium text-right">
                      Amount
                    </th>
                    <th className="px-4 py-3 font-medium">Method</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr
                      key={row.id}
                      className="border-b last:border-0 hover:bg-muted/30 transition-colors"
                    >
                      <td className="px-4 py-3 font-mono text-xs">
                        {row.receiptNo}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {formatDate(row.date)}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium">{row.studentName}</p>
                        {row.admissionNo && (
                          <p className="text-xs text-muted-foreground">
                            {row.admissionNo}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">{row.className}</td>
                      <td className="px-4 py-3">{row.feeName}</td>
                      <td className="px-4 py-3 text-right font-semibold">
                        {formatINR(row.amount)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="text-[10px]">
                          {row.paymentMode || "-"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${
                            row.status === "PAID"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-amber-50 text-amber-700 border-amber-200"
                          }`}
                        >
                          {row.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="gap-1.5"
                            onClick={() => setSelectedReceipt(row)}
                          >
                            <Eye className="h-3.5 w-3.5" /> View
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="gap-1.5"
                            onClick={() => handleQuickPrint(row)}
                            title="Print receipt"
                          >
                            <Printer className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t">
                <p className="text-xs text-muted-foreground">
                  Page {pagination.page} of {pagination.totalPages} ·{" "}
                  {pagination.total} receipts
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setPage((p) =>
                        Math.min(pagination.totalPages, p + 1)
                      )
                    }
                    disabled={page >= pagination.totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>

      {/* ✅ HIDDEN PRINT AREA — always rendered when a receipt is selected */}
      {selectedReceipt && (
        <div
          id="receipt-print-area"
          style={{ display: "none" }}
          aria-hidden="true"
        >
          <div className="receipt-box">
            <div className="header">
              <h1>Payment Receipt</h1>
              <p>Official fee payment confirmation</p>
            </div>
            <div className="receipt-no">
              <div className="label">Receipt Number</div>
              <div className="value">{selectedReceipt.receiptNo}</div>
              <div className="date">
                {formatDateTime(selectedReceipt.date)}
              </div>
            </div>
            <div className="row">
              <span className="label">Student</span>
              <span className="value">
                {selectedReceipt.studentName}
              </span>
            </div>
            {selectedReceipt.admissionNo && (
              <div className="row">
                <span className="label">Admission No</span>
                <span className="value">
                  {selectedReceipt.admissionNo}
                </span>
              </div>
            )}
            <div className="row">
              <span className="label">Class</span>
              <span className="value">{selectedReceipt.className}</span>
            </div>
            <div className="row">
              <span className="label">Fee</span>
              <span className="value">{selectedReceipt.feeName}</span>
            </div>
            <div className="row">
              <span className="label">Payment Method</span>
              <span className="value">
                {selectedReceipt.paymentMode || "-"}
              </span>
            </div>
            {selectedReceipt.transactionId && (
              <div className="row">
                <span className="label">Reference</span>
                <span className="value">
                  {selectedReceipt.transactionId}
                </span>
              </div>
            )}
            <div className="row">
              <span className="label">Status</span>
              <span className="value">{selectedReceipt.status}</span>
            </div>
            <div className="total">
              <span>Amount Paid</span>
              <span className="value">
                {formatINR(selectedReceipt.amount)}
              </span>
            </div>
            <div className="footer">
              This is a computer-generated receipt. No signature required.
            </div>
          </div>
        </div>
      )}

      {/* Receipt Detail Dialog */}
      <Dialog
        open={!!selectedReceipt}
        onOpenChange={(o) => !o && setSelectedReceipt(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-primary" />
              Payment Receipt
            </DialogTitle>
          </DialogHeader>

          {selectedReceipt ? (
            <div className="space-y-4">
              <div className="rounded-lg border bg-muted/20 p-4 text-center">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">
                  Receipt Number
                </p>
                <p className="font-mono font-semibold text-lg mt-1">
                  {selectedReceipt.receiptNo}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {formatDateTime(selectedReceipt.date)}
                </p>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Student</span>
                  <span className="font-medium">
                    {selectedReceipt.studentName}
                  </span>
                </div>
                {selectedReceipt.admissionNo && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Admission No
                    </span>
                    <span className="font-medium">
                      {selectedReceipt.admissionNo}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Class</span>
                  <span className="font-medium">
                    {selectedReceipt.className}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Fee</span>
                  <span className="font-medium">
                    {selectedReceipt.feeName}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Method</span>
                  <Badge variant="outline">
                    {selectedReceipt.paymentMode || "-"}
                  </Badge>
                </div>
                {selectedReceipt.transactionId && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Reference
                    </span>
                    <span className="font-mono text-xs">
                      {selectedReceipt.transactionId}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <Badge
                    variant="outline"
                    className={
                      selectedReceipt.status === "PAID"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-amber-50 text-amber-700 border-amber-200"
                    }
                  >
                    {selectedReceipt.status}
                  </Badge>
                </div>
                <div className="flex justify-between border-t pt-2 text-base">
                  <span className="font-semibold">Amount Paid</span>
                  <span className="font-bold text-emerald-600">
                    {formatINR(selectedReceipt.amount)}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              Loading...
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              className="gap-2"
              onClick={handlePrintFromDialog}
              disabled={!selectedReceipt}
            >
              <Printer className="h-4 w-4" /> Print
            </Button>
            <Button onClick={() => setSelectedReceipt(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default ReceiptsPage;