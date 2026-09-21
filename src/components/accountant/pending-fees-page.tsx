import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Search,
  Loader2,
  FileText,
  Wallet,
  TrendingUp,
  AlertTriangle,
  Clock,
  Download,
  RefreshCw,
  X,
  Pencil,
  Check,
  Eye,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
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
interface PendingFeeRow {
  id: string;
  receiptNo: string | null;
  studentId: string;
  studentName: string;
  admissionNo?: string;
  rollNumber?: number;
  classId?: string;
  className: string;
  sectionName: string;
  guardianMobile?: string;
  feeName: string;
  totalFee: number;
  paidAmount: number;
  dueAmount: number;
  dueDate: string | null;
  daysOverdue: number;
  status: string;
}

interface PendingFeeStats {
  totalRecords: number;
  totalFee: number;
  totalPaid: number;
  totalDue: number;
  overdueCount: number;
  studentCount: number;
  dueTodayCount: number;
  dueTodayAmount: number;
}

/* ============================================================
   HELPERS
   ============================================================ */
function formatINR(n: number) {
  return `Rs. ${Math.round(n).toLocaleString("en-IN")}`;
}

function formatDate(d: string | null) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/* ============================================================
   EDITABLE TOTAL FEE CELL
   ============================================================ */
function EditableAmountCell({
  rowId,
  currentAmount,
  paidAmount,
  onSaved,
}: {
  rowId: string;
  currentAmount: number;
  paidAmount: number;
  onSaved: (newTotal: number, newDue: number, newStatus: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(currentAmount));
  const [saving, setSaving] = useState(false);

  const handleStartEdit = () => {
    setValue(String(currentAmount));
    setEditing(true);
  };

  const handleCancel = () => {
    setEditing(false);
    setValue(String(currentAmount));
  };

  const handleSave = async () => {
    const newAmount = Number(value);
    if (!newAmount || newAmount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    if (newAmount < paidAmount) {
      toast.error(
        `Cannot be less than paid amount (${formatINR(paidAmount)})`
      );
      return;
    }
    if (newAmount === currentAmount) {
      setEditing(false);
      return;
    }

    setSaving(true);
    try {
      const res = await apiFetch<{
        data: {
          totalFee: number;
          paidAmount: number;
          dueAmount: number;
          status: string;
        };
      }>(`/accountant/pending-fees/${rowId}/amount`, {
        method: "PATCH",
        body: JSON.stringify({ totalFee: newAmount }),
      });

      toast.success("Total fee updated");
      onSaved(res.data.totalFee, res.data.dueAmount, res.data.status);
      setEditing(false);
    } catch (err: any) {
      toast.error(err?.message || "Failed to update total fee");
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSave();
    } else if (e.key === "Escape") {
      handleCancel();
    }
  };

  if (editing) {
    return (
      <div className="flex items-center gap-1 justify-end">
        <div className="relative">
          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
            Rs.
          </span>
          <Input
            type="number"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
            className="h-8 w-28 pl-8 text-right text-sm"
            disabled={saving}
          />
        </div>
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Check className="h-3.5 w-3.5" />
          )}
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-50"
          onClick={handleCancel}
          disabled={saving}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    );
  }

  return (
    <button
      onClick={handleStartEdit}
      className="group flex items-center gap-1.5 ml-auto hover:bg-muted/50 rounded px-2 py-1 transition-colors"
      title="Click to edit total fee"
    >
      <span>{formatINR(currentAmount)}</span>
      <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
    </button>
  );
}

/* ============================================================
   COMPONENT
   ============================================================ */
export function PendingFeesPage() {
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dueFilter, setDueFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedRow, setSelectedRow] = useState<PendingFeeRow | null>(null);

  const limit = 20;

  /* ---------- queries ---------- */
  const {
    data: pendingData,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: [
      "pending-fees",
      search,
      classFilter,
      statusFilter,
      dueFilter,
      page,
    ],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        search,
        classId: classFilter,
        status: statusFilter,
        dueFilter,
      });
      return await apiFetch<{
        data: PendingFeeRow[];
        pagination: {
          page: number;
          limit: number;
          total: number;
          totalPages: number;
        };
      }>(`/accountant/pending-fees?${params}`);
    },
  });

  const { data: stats } = useQuery({
    queryKey: ["pending-fee-stats"],
    queryFn: async () =>
      (
        await apiFetch<{ data: PendingFeeStats }>(
          "/accountant/pending-fees/stats"
        )
      ).data,
  });

  /* ---------- derived ---------- */
  const rows = pendingData?.data || [];
  const pagination = pendingData?.pagination;

  const classOptions = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => {
      if (r.className) {
        set.add(
          r.sectionName ? `${r.className}-${r.sectionName}` : r.className
        );
      }
    });
    return Array.from(set).sort();
  }, [rows]);

  const allSelected = rows.length > 0 && rows.every((r) => selectedIds.has(r.id));

  /* ---------- handlers ---------- */
  const handleRowUpdate = (
    rowId: string,
    newTotal: number,
    newDue: number,
    newStatus: string
  ) => {
    // Update cached query data
    queryClient.setQueryData(
      ["pending-fees", search, classFilter, statusFilter, dueFilter, page],
      (old: any) => {
        if (!old) return old;
        return {
          ...old,
          data: old.data.map((r: PendingFeeRow) =>
            r.id === rowId
              ? {
                  ...r,
                  totalFee: newTotal,
                  dueAmount: newDue,
                  status: newStatus,
                }
              : r
          ),
        };
      }
    );
    // Refresh stats
    queryClient.invalidateQueries({ queryKey: ["pending-fee-stats"] });
  };

  const handleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(rows.map((r) => r.id)));
    }
  };

  const handleSelectOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleClearFilters = () => {
    setSearch("");
    setClassFilter("all");
    setStatusFilter("all");
    setDueFilter("all");
    setPage(1);
  };

  const handleExport = () => {
    if (rows.length === 0) {
      toast.error("No data to export");
      return;
    }
    const header =
      "Roll,Student,Admission No,Class,Fee Head,Total Fee,Paid,Due,Due Date,Overdue Days,Status\n";
    const body = rows
      .map((r) =>
        [
          r.rollNumber ?? "",
          r.studentName,
          r.admissionNo || "",
          `${r.className}${r.sectionName ? `-${r.sectionName}` : ""}`,
          r.feeName,
          r.totalFee,
          r.paidAmount,
          r.dueAmount,
          r.dueDate ? new Date(r.dueDate).toLocaleDateString() : "",
          r.daysOverdue,
          r.status,
        ].join(",")
      )
      .join("\n");
    const blob = new Blob([header + body], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pending-fees-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Exported successfully");
  };

  const hasFilters =
    search ||
    classFilter !== "all" ||
    statusFilter !== "all" ||
    dueFilter !== "all";

  /* ---------- render ---------- */
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Pending Fees
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Track outstanding student fee dues
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card className="p-4 card-elevated">
            <div className="flex items-center gap-2 text-muted-foreground text-xs">
              <FileText className="h-4 w-4" /> Total Records
            </div>
            <p className="text-2xl font-bold mt-1">{stats.totalRecords}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Pending payments
            </p>
          </Card>

          <Card className="p-4 card-elevated">
            <div className="flex items-center gap-2 text-muted-foreground text-xs">
              <Wallet className="h-4 w-4" /> Total Fee
            </div>
            <p className="text-2xl font-bold mt-1">
              {formatINR(stats.totalFee)}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Original amount
            </p>
          </Card>

          <Card className="p-4 card-elevated">
            <div className="flex items-center gap-2 text-emerald-600 text-xs">
              <TrendingUp className="h-4 w-4" /> Paid
            </div>
            <p className="text-2xl font-bold mt-1 text-emerald-600">
              {formatINR(stats.totalPaid)}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Collected
            </p>
          </Card>

          <Card className="p-4 card-elevated border-red-200">
            <div className="flex items-center gap-2 text-red-600 text-xs">
              <AlertTriangle className="h-4 w-4" /> Remaining Due
            </div>
            <p className="text-2xl font-bold mt-1 text-red-600">
              {formatINR(stats.totalDue)}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {stats.studentCount} students
            </p>
          </Card>

          <Card className="p-4 card-elevated">
            <div className="flex items-center gap-2 text-amber-600 text-xs">
              <Clock className="h-4 w-4" /> Overdue
            </div>
            <p className="text-2xl font-bold mt-1 text-amber-600">
              {stats.overdueCount}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Records
            </p>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card className="p-4 card-elevated">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search student / receipt / admission no..."
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
            value={classFilter}
            onValueChange={(v) => {
              setClassFilter(v);
              setPage(1);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="All Classes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Classes</SelectItem>
              {classOptions.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={statusFilter}
            onValueChange={(v) => {
              setStatusFilter(v);
              setPage(1);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="PARTIAL">Partial</SelectItem>
              <SelectItem value="OVERDUE">Overdue</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={dueFilter}
            onValueChange={(v) => {
              setDueFilter(v);
              setPage(1);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Due Date" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Due Dates</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
              <SelectItem value="today">Due Today</SelectItem>
              <SelectItem value="week">Due This Week</SelectItem>
              <SelectItem value="month">Due This Month</SelectItem>
            </SelectContent>
          </Select>
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

      {/* Bulk actions bar */}
      {selectedIds.size > 0 && (
        <Card className="p-3 card-elevated bg-primary/5 border-primary/20">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <p className="text-sm font-medium">
              {selectedIds.size} record
              {selectedIds.size > 1 ? "s" : ""} selected
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => toast.info("SMS reminders not yet enabled")}
              >
                📱 Send SMS
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => toast.info("Email not yet enabled")}
              >
                ✉️ Email
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedIds(new Set())}
              >
                <X className="h-3 w-3" /> Clear
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Table */}
      <Card className="card-elevated overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : rows.length === 0 ? (
          <div className="py-16 text-center">
            <FileText className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm font-medium text-muted-foreground">
              {hasFilters
                ? "No pending fees match your filters."
                : "No pending fees right now."}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {hasFilters
                ? "Try adjusting your search or filters."
                : "All fees are collected."}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground border-b bg-muted/20">
                    <th className="px-3 py-3 w-10">
                      <Checkbox
                        checked={allSelected}
                        onCheckedChange={handleSelectAll}
                      />
                    </th>
                    <th className="px-3 py-3 font-medium">Roll</th>
                    <th className="px-3 py-3 font-medium">Student</th>
                    <th className="px-3 py-3 font-medium">Class</th>
                    <th className="px-3 py-3 font-medium">Fee Head</th>
                    <th className="px-3 py-3 font-medium text-right">
                      Total Fee
                    </th>
                    <th className="px-3 py-3 font-medium text-right">
                      Paid
                    </th>
                    <th className="px-3 py-3 font-medium text-right">
                      Due
                    </th>
                    <th className="px-3 py-3 font-medium">Due Date</th>
                    <th className="px-3 py-3 font-medium">Overdue</th>
                    <th className="px-3 py-3 font-medium text-right">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr
                      key={row.id}
                      className="border-b last:border-0 hover:bg-muted/30 transition-colors"
                    >
                      <td className="px-3 py-3">
                        <Checkbox
                          checked={selectedIds.has(row.id)}
                          onCheckedChange={() => handleSelectOne(row.id)}
                        />
                      </td>

                      <td className="px-3 py-3 text-muted-foreground">
                        {row.rollNumber ?? "-"}
                      </td>

                      <td className="px-3 py-3">
                        <p className="font-medium">{row.studentName}</p>
                        {row.admissionNo && (
                          <p className="text-xs text-muted-foreground">
                            {row.admissionNo}
                          </p>
                        )}
                      </td>

                      <td className="px-3 py-3 text-muted-foreground">
                        {row.className}
                        {row.sectionName ? `-${row.sectionName}` : ""}
                      </td>

                      <td className="px-3 py-3">{row.feeName}</td>

                      {/* ✅ EDITABLE Total Fee */}
                      <td className="px-3 py-3 text-right">
                        <EditableAmountCell
                          rowId={row.id}
                          currentAmount={row.totalFee}
                          paidAmount={row.paidAmount}
                          onSaved={(newTotal, newDue, newStatus) =>
                            handleRowUpdate(
                              row.id,
                              newTotal,
                              newDue,
                              newStatus
                            )
                          }
                        />
                      </td>

                      {/* Paid */}
                      <td className="px-3 py-3 text-right text-emerald-600 font-medium">
                        {formatINR(row.paidAmount)}
                      </td>

                      {/* Due */}
                      <td className="px-3 py-3 text-right">
                        <span
                          className={`font-semibold ${
                            row.daysOverdue > 7
                              ? "text-red-600"
                              : "text-foreground"
                          }`}
                        >
                          {formatINR(row.dueAmount)}
                        </span>
                      </td>

                      <td className="px-3 py-3 text-muted-foreground">
                        {formatDate(row.dueDate)}
                      </td>

                      <td className="px-3 py-3">
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${
                            row.daysOverdue === 0
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : row.daysOverdue <= 7
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : "bg-red-50 text-red-700 border-red-200"
                          }`}
                        >
                          {row.daysOverdue} days
                        </Badge>
                      </td>

                      <td className="px-3 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1.5"
                          onClick={() => setSelectedRow(row)}
                        >
                          <Eye className="h-3.5 w-3.5" /> View
                        </Button>
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
                  {pagination.total} records
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

      {/* View Details Dialog */}
      <Dialog
        open={!!selectedRow}
        onOpenChange={(o) => !o && setSelectedRow(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Pending Fee Details</DialogTitle>
          </DialogHeader>

          {selectedRow && (
            <div className="space-y-4">
              <div className="rounded-lg border bg-muted/20 px-4 py-3">
                <p className="font-medium">{selectedRow.studentName}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {selectedRow.className}
                  {selectedRow.sectionName
                    ? `-${selectedRow.sectionName}`
                    : ""}{" "}
                  · Roll {selectedRow.rollNumber ?? "-"}
                  {selectedRow.admissionNo
                    ? ` · ${selectedRow.admissionNo}`
                    : ""}
                </p>
                {selectedRow.guardianMobile && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Parent: {selectedRow.guardianMobile}
                  </p>
                )}
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Fee Head</span>
                  <span className="font-medium">{selectedRow.feeName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Fee</span>
                  <span className="font-medium">
                    {formatINR(selectedRow.totalFee)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Paid</span>
                  <span className="font-medium text-emerald-600">
                    {formatINR(selectedRow.paidAmount)}
                  </span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="text-muted-foreground">Due</span>
                  <span className="font-bold text-red-600">
                    {formatINR(selectedRow.dueAmount)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Due Date</span>
                  <span>{formatDate(selectedRow.dueDate)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Overdue</span>
                  <Badge
                    variant="outline"
                    className={`${
                      selectedRow.daysOverdue === 0
                        ? "bg-emerald-50 text-emerald-700"
                        : selectedRow.daysOverdue <= 7
                        ? "bg-amber-50 text-amber-700"
                        : "bg-red-50 text-red-700"
                    }`}
                  >
                    {selectedRow.daysOverdue} days
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <Badge variant="outline">{selectedRow.status}</Badge>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setSelectedRow(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default PendingFeesPage;