import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Search,
  Loader2,
  AlertTriangle,
  X,
  CheckCircle2,
  Clock,
  Users,
  Phone,
  CircleDot,
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
import { apiFetch } from "@/lib/api/client";

/* ============================================================
   TYPES
   ============================================================ */
interface DefaulterRow {
  id: string;
  receiptNo: string | null;
  studentId: string;
  studentName: string;
  admissionNo?: string;
  rollNumber?: number;
  classId: string;
  className: string;
  sectionName: string;
  guardianMobile?: string;
  feeName: string;
  totalFee: number;
  paidAmount: number;
  dueAmount: number;
  dueDate: string | null;
  daysOverdue: number;
  escalation: "REMINDER_1" | "REMINDER_2" | "FINAL_NOTICE";
  status: string;
}

interface DefaulterStats {
  totalDefaulters: number;
  totalDue: number;
  criticalCount: number;
  uniqueStudents: number;
  unpaidCount: number;
  partialCount: number;
  paidCount: number;
  contactedCount: number;
  recoveredCount: number;
}

interface ClassWithSections {
  id: string;
  name: string;
  sections: { id: string; name: string }[];
}

function formatINR(n: number) {
  if (!isFinite(n) || isNaN(n)) return "Rs. 0";
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

function overdueBadge(days: number) {
  if (days <= 3)
    return (
      <Badge
        variant="outline"
        className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]"
      >
        {days} days 🟢
      </Badge>
    );
  if (days <= 7)
    return (
      <Badge
        variant="outline"
        className="bg-amber-50 text-amber-700 border-amber-200 text-[10px]"
      >
        {days} days 🟠
      </Badge>
    );
  return (
    <Badge
      variant="outline"
      className="bg-red-50 text-red-700 border-red-200 text-[10px] font-semibold"
    >
      {days} days 🔴
    </Badge>
  );
}

/* ============================================================
   COMPONENT
   ============================================================ */
export function DefaultersPage() {
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("all");
  const [sectionFilter, setSectionFilter] = useState("all");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("all");
  const [overdueFilter, setOverdueFilter] = useState("all");
  const [page, setPage] = useState(1);

  const limit = 50;

  /* ------------------------------------------------------------
     CLASSES + SECTIONS — real data
     ------------------------------------------------------------ */
  const { data: classes } = useQuery({
    queryKey: ["accountant-classes"],
    queryFn: async () =>
      (
        await apiFetch<{ data: ClassWithSections[] }>("/accountant/classes")
      ).data,
  });

  const sections =
    classes?.find((c) => c.name === classFilter)?.sections || [];

  /* ------------------------------------------------------------
     MAIN QUERY — uses /accountant/defaulters ✅
     ------------------------------------------------------------ */
  const { data, isLoading } = useQuery({
    queryKey: [
      "defaulters",
      search,
      classFilter,
      sectionFilter,
      paymentStatusFilter,
      overdueFilter,
      page,
    ],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        search,
        classId: classFilter,
        sectionId: sectionFilter,
        paymentStatus: paymentStatusFilter,
        overdueFilter,
      });
      return await apiFetch<{
        data: DefaulterRow[];
        pagination: {
          page: number;
          limit: number;
          total: number;
          totalPages: number;
        };
      }>(`/accountant/defaulters?${params}`);
    },
  });

  const { data: stats } = useQuery({
    queryKey: ["defaulter-stats"],
    queryFn: async () =>
      (
        await apiFetch<{ data: DefaulterStats }>(
          "/accountant/defaulters/stats"
        )
      ).data,
  });

  /* ------------------------------------------------------------
     DERIVED
     ------------------------------------------------------------ */
  const rows = (data?.data || []).map((r: any) => ({
    ...r,
    totalFee: Number(r.totalFee ?? r.amount ?? 0),
    paidAmount: Number(r.paidAmount ?? 0),
    dueAmount: Number(r.dueAmount ?? 0),
  }));
  const pagination = data?.pagination;

  const clearFilters = () => {
    setSearch("");
    setClassFilter("all");
    setSectionFilter("all");
    setPaymentStatusFilter("all");
    setOverdueFilter("all");
    setPage(1);
  };

  const hasFilters =
    search ||
    classFilter !== "all" ||
    sectionFilter !== "all" ||
    paymentStatusFilter !== "all" ||
    overdueFilter !== "all";

  /* ------------------------------------------------------------
     RENDER
     ------------------------------------------------------------ */
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <AlertTriangle className="h-6 w-6 text-amber-600" />
          Defaulters
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Students overdue on fee payments
        </p>
      </div>

      {/* Stats — 6 cards */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
          <Card className="p-4 card-elevated">
            <div className="flex items-center gap-2 text-amber-600 text-xs">
              <AlertTriangle className="h-4 w-4" /> Total Defaulters
            </div>
            <p className="text-2xl font-bold mt-1">
              {stats.totalDefaulters}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {stats.uniqueStudents} unique students
            </p>
          </Card>

          <Card className="p-4 card-elevated border-red-200">
            <div className="flex items-center gap-2 text-red-600 text-xs">
              <Users className="h-4 w-4" /> Amount Due
            </div>
            <p className="text-2xl font-bold mt-1 text-red-600">
              {formatINR(stats.totalDue)}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Overdue total
            </p>
          </Card>

          <Card className="p-4 card-elevated">
            <div className="flex items-center gap-2 text-red-600 text-xs">
              <CircleDot className="h-4 w-4" /> Not Paid
            </div>
            <p className="text-2xl font-bold mt-1 text-red-600">
              {stats.unpaidCount}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Zero paid so far
            </p>
          </Card>

          <Card className="p-4 card-elevated">
            <div className="flex items-center gap-2 text-amber-600 text-xs">
              <CircleDot className="h-4 w-4" /> Partially Paid
            </div>
            <p className="text-2xl font-bold mt-1 text-amber-600">
              {stats.partialCount}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Some amount paid
            </p>
          </Card>

          <Card className="p-4 card-elevated">
            <div className="flex items-center gap-2 text-red-600 text-xs">
              <Clock className="h-4 w-4" /> Critical
            </div>
            <p className="text-2xl font-bold mt-1 text-red-600">
              {stats.criticalCount}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Over 30 days
            </p>
          </Card>

          <Card className="p-4 card-elevated border-emerald-200">
            <div className="flex items-center gap-2 text-emerald-600 text-xs">
              <CheckCircle2 className="h-4 w-4" /> Fully Paid
            </div>
            <p className="text-2xl font-bold mt-1 text-emerald-600">
              {stats.paidCount}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Was overdue, now cleared
            </p>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card className="p-4 card-elevated">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by roll no, name, or admission no..."
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

          {/* Class Dropdown */}
          <Select
            value={classFilter}
            onValueChange={(v) => {
              setClassFilter(v);
              setSectionFilter("all");
              setPage(1);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="All Classes" />
            </SelectTrigger>
            <SelectContent className="max-h-80">
              <SelectItem value="all">All Classes</SelectItem>
              {(classes || []).map((c) => (
                <SelectItem key={c.id} value={c.name}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Section Dropdown */}
          <Select
            value={sectionFilter}
            onValueChange={(v) => {
              setSectionFilter(v);
              setPage(1);
            }}
            disabled={classFilter === "all"}
          >
            <SelectTrigger>
              <SelectValue placeholder="All Sections" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sections</SelectItem>
              {sections.map((s) => (
                <SelectItem key={s.id} value={s.name}>
                  Section {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Payment Status */}
          <Select
            value={paymentStatusFilter}
            onValueChange={(v) => {
              setPaymentStatusFilter(v);
              setPage(1);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Payment: All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Payments</SelectItem>
              <SelectItem value="unpaid">🔴 Not Paid</SelectItem>
              <SelectItem value="partial">🟡 Partial</SelectItem>
              <SelectItem value="paid">✅ Fully Paid</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Second row — Overdue */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-3">
          <Select
            value={overdueFilter}
            onValueChange={(v) => {
              setOverdueFilter(v);
              setPage(1);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Overdue: All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Overdue</SelectItem>
              <SelectItem value="0-3">0 - 3 days</SelectItem>
              <SelectItem value="4-7">4 - 7 days</SelectItem>
              <SelectItem value="8-30">8 - 30 days</SelectItem>
              <SelectItem value="30+">30+ days</SelectItem>
            </SelectContent>
          </Select>

          {hasFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="gap-2 justify-start"
            >
              <X className="h-3 w-3" /> Clear filters
            </Button>
          )}
        </div>
      </Card>

      {/* Table */}
      <Card className="card-elevated overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : rows.length === 0 ? (
          <div className="py-16 text-center">
            <CheckCircle2 className="h-12 w-12 text-emerald-500/30 mx-auto mb-3" />
            <p className="text-sm font-medium text-emerald-600">
              No defaulters found 🎉
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {hasFilters
                ? "Try adjusting your filters."
                : "All fees are up to date."}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground border-b bg-muted/20">
                    <th className="px-3 py-3 font-medium">Roll</th>
                    <th className="px-3 py-3 font-medium">Student</th>
                    <th className="px-3 py-3 font-medium">Class</th>
                    <th className="px-3 py-3 font-medium">Section</th>
                    <th className="px-3 py-3 font-medium">Fee</th>
                    <th className="px-3 py-3 font-medium text-right">Total Fee</th>
                    <th className="px-3 py-3 font-medium text-right">Paid</th>
                    <th className="px-3 py-3 font-medium text-right">Pending</th>
                    <th className="px-3 py-3 font-medium">Due Date</th>
                    <th className="px-3 py-3 font-medium">Overdue</th>
                    <th className="px-3 py-3 font-medium">Contact</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const isPaid =
                      row.dueAmount === 0 && row.totalFee > 0;
                    const isPartial =
                      row.paidAmount > 0 && row.dueAmount > 0;

                    return (
                      <tr
                        key={row.id}
                        className="border-b last:border-0 hover:bg-muted/30 transition-colors"
                      >
                        <td className="px-3 py-3 font-mono font-medium">
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
                        </td>
                        <td className="px-3 py-3 text-muted-foreground">
                          {row.sectionName || "-"}
                        </td>
                        <td className="px-3 py-3">{row.feeName}</td>
                        <td className="px-3 py-3 text-right text-muted-foreground">
                          {formatINR(row.totalFee)}
                        </td>
                        <td
                          className={`px-3 py-3 text-right font-semibold ${
                            isPaid
                              ? "text-emerald-600"
                              : isPartial
                              ? "text-amber-600"
                              : "text-muted-foreground"
                          }`}
                        >
                          {formatINR(row.paidAmount)}
                        </td>
                        <td className="px-3 py-3 text-right">
                          <span
                            className={`font-semibold ${
                              row.dueAmount > 0
                                ? "text-red-600"
                                : "text-emerald-600"
                            }`}
                          >
                            {row.dueAmount > 0
                              ? formatINR(row.dueAmount)
                              : "—"}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-muted-foreground">
                          {formatDate(row.dueDate)}
                        </td>
                        <td className="px-3 py-3">
                          {overdueBadge(row.daysOverdue)}
                        </td>
                        <td className="px-3 py-3 text-muted-foreground text-xs">
                          {row.guardianMobile ? (
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {row.guardianMobile}
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                      </tr>
                    );
                  })}
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

      {/* Legend */}
      <Card className="p-3 card-elevated">
        <div className="flex flex-wrap gap-4 text-xs">
          <span className="font-medium text-muted-foreground">Legend:</span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            0-3 days
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            4-7 days
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-500"></span>
            8+ days overdue
          </span>
        </div>
      </Card>
    </div>
  );
}

export default DefaultersPage;