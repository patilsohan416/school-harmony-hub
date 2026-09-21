import { useState, useMemo, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Download,
  Search,
  Loader2,
  Wallet,
  Receipt,
  TrendingUp,
  CalendarClock,
  X,
  RefreshCw,
  Printer,
  ChevronDown,
  ChevronUp,
  User,
  CreditCard,
  FileText,
  Pencil,
  Check,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
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
interface CollectionRow {
  id: string;
  receiptNo: string;
  date: string;
  studentName: string;
  className: string;
  totalFee: number;
  paidAmount: number;
  paymentMode: string | null;
}

interface StudentSearchResult {
  id: string;
  firstName: string;
  lastName?: string;
  rollNumber?: number;
  admissionNo?: string;
  guardianMobile?: string;
  class?: { name: string };
  section?: { name: string };
}

interface OutstandingFee {
  id: string;
  amount: string;
  paidAmount: string;
  dueDate?: string;
  fee: { name: string };
}

interface ReceiptPreview {
  receiptNo: string;
  date: string;
  studentName: string;
  className: string;
  feeName: string;
  amount: number;
  method: string;
}

/* ============================================================
   FALLBACK FEE HEADS
   ============================================================ */
const FALLBACK_FEE_HEADS = {
  mandatory: [
    { value: "tuition", label: "Tuition Fee" },
    { value: "exam", label: "Exam Fee" },
    { value: "library", label: "Library Fee" },
    { value: "sports", label: "Sports Fee" },
  ],
  optional: [
    { value: "transport", label: "Transport Fee" },
    { value: "hostel", label: "Hostel Fee" },
    { value: "mess", label: "Mess / Meal Fee" },
    { value: "computer", label: "Computer Fee" },
    { value: "lab", label: "Lab Fee" },
  ],
  oneTime: [
    { value: "admission", label: "Admission Fee" },
    { value: "registration", label: "Registration Fee" },
    { value: "uniform", label: "Uniform Fee" },
    { value: "book", label: "Book Fee" },
  ],
  other: [
    { value: "late_fine", label: "Late Fine" },
    { value: "misc", label: "Miscellaneous" },
  ],
};

function getAllFallbackHeads() {
  return [
    ...FALLBACK_FEE_HEADS.mandatory,
    ...FALLBACK_FEE_HEADS.optional,
    ...FALLBACK_FEE_HEADS.oneTime,
    ...FALLBACK_FEE_HEADS.other,
  ];
}

/* ============================================================
   HELPERS
   ============================================================ */
function formatINR(n: number) {
  return `Rs. ${Math.round(n).toLocaleString("en-IN")}`;
}

function formatDate(d: string) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/* ============================================================
   EDITABLE AMOUNT CELL
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
export function FeeCollectionPage() {
  const queryClient = useQueryClient();

  // ---------- list state ----------
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("all");
  const [methodFilter, setMethodFilter] = useState("all");

  // ---------- collect form state ----------
  const [formOpen, setFormOpen] = useState(true);
  const [studentSearch, setStudentSearch] = useState("");
  const [selectedStudent, setSelectedStudent] =
    useState<StudentSearchResult | null>(null);
  const [selectedFeeId, setSelectedFeeId] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("UPI");
  const [reference, setReference] = useState("");
  const [sendSMS, setSendSMS] = useState(true);
  const [sendEmail, setSendEmail] = useState(true);
  const [printReceipt, setPrintReceipt] = useState(true);
  const [collecting, setCollecting] = useState(false);

  // ---------- receipt preview ----------
  const [receipt, setReceipt] = useState<ReceiptPreview | null>(null);

  // ---------- list query ----------
  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["fee-collections", search],
    queryFn: async () =>
      (
        await apiFetch<{ data: CollectionRow[] }>(
          `/accountant/collections?search=${encodeURIComponent(
            search
          )}&limit=200`
        )
      ).data,
  });

  // ---------- form queries ----------
  const { data: searchResults } = useQuery({
    queryKey: ["fee-collection-student-search", studentSearch],
    queryFn: async () =>
      (
        await apiFetch<{ data: StudentSearchResult[] }>(
          `/accountant/students/search?q=${encodeURIComponent(studentSearch)}`
        )
      ).data,
    enabled: studentSearch.trim().length >= 2,
  });

  const {
    data: outstandingFees,
    isLoading: feesLoading,
    refetch: refetchFees,
  } = useQuery({
    queryKey: ["fee-collection-outstanding", selectedStudent?.id],
    queryFn: async () =>
      (
        await apiFetch<{ data: OutstandingFee[] }>(
          `/accountant/students/${selectedStudent!.id}/outstanding-fees`
        )
      ).data,
    enabled: !!selectedStudent,
  });

  // Auto-fill amount when a REAL outstanding fee is selected
  useEffect(() => {
    if (!selectedFeeId || !outstandingFees) return;
    const fee = outstandingFees.find((f) => f.id === selectedFeeId);
    if (fee) {
      setAmount(String(Number(fee.amount) - Number(fee.paidAmount)));
    }
  }, [selectedFeeId, outstandingFees]);

  // Reset selected fee if it disappears (only for real DB ids)
  useEffect(() => {
    if (!selectedFeeId || !outstandingFees) return;
    const isFallback = getAllFallbackHeads().some(
      (f) => f.value === selectedFeeId
    );
    if (isFallback) return;

    const stillThere = outstandingFees.some((f) => f.id === selectedFeeId);
    if (!stillThere) {
      setSelectedFeeId("");
      setAmount("");
    }
  }, [outstandingFees, selectedFeeId]);

  // ---------- derived ----------
  const rows = data || [];

  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      if (classFilter !== "all" && r.className !== classFilter) return false;
      if (methodFilter !== "all" && r.paymentMode !== methodFilter)
        return false;
      return true;
    });
  }, [rows, classFilter, methodFilter]);

  /* ============================================================
     STATS — real totalFee / paidAmount / pending
     ============================================================ */
  const stats = useMemo(() => {
    const today = new Date().toDateString();
    const thisMonth = new Date().getMonth();
    const thisYear = new Date().getFullYear();
    let todayTotal = 0,
      monthTotal = 0,
      totalPending = 0;
    for (const r of filteredRows) {
      if (r.date) {
        const d = new Date(r.date);
        if (d.toDateString() === today) todayTotal += r.paidAmount;
        if (d.getMonth() === thisMonth && d.getFullYear() === thisYear)
          monthTotal += r.paidAmount;
      }
      totalPending += Math.max(0, r.totalFee - r.paidAmount);
    }
    return {
      todayTotal,
      monthTotal,
      totalPending,
      count: filteredRows.length,
    };
  }, [filteredRows]);

  const classes = useMemo(
    () => Array.from(new Set(rows.map((r) => r.className))).sort(),
    [rows]
  );
  const methods = useMemo(
    () =>
      Array.from(
        new Set(rows.map((r) => r.paymentMode).filter(Boolean))
      ).sort() as string[],
    [rows]
  );

  const hasOutstanding = (outstandingFees || []).length > 0;

  /* ============================================================
     HANDLERS
     ============================================================ */
  const resetForm = () => {
    setSelectedStudent(null);
    setSelectedFeeId("");
    setAmount("");
    setReference("");
    setStudentSearch("");
    setSendSMS(true);
    setSendEmail(true);
    setPrintReceipt(true);
  };

  const handleCollect = async () => {
    if (!selectedStudent) {
      toast.error("Please select a student");
      return;
    }
    if (!selectedFeeId) {
      toast.error("Please select a fee head");
      return;
    }

    const matchingOutstanding = (outstandingFees || []).find(
      (f) => f.id === selectedFeeId
    );
    const matchingFallback = getAllFallbackHeads().find(
      (f) => f.value === selectedFeeId
    );

    if (!matchingOutstanding && !matchingFallback) {
      toast.error("Please select a valid fee head");
      setSelectedFeeId("");
      setAmount("");
      return;
    }

    if (!amount || Number(amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    const feeName =
      matchingOutstanding?.fee.name || matchingFallback?.label || "Fee";

    setCollecting(true);
    try {
      const res = await apiFetch<{
        data: { receiptNo: string; date: string };
      }>("/accountant/collect-payment", {
        method: "POST",
        body: JSON.stringify({
          feePaymentId: matchingOutstanding?.id || null,
          feeName: matchingOutstanding ? undefined : feeName,
          studentId: matchingOutstanding ? undefined : selectedStudent.id,
          amountPaid: Number(amount),
          paymentMethod: method,
          transactionId: reference || undefined,
          sendSMS,
          sendEmail,
        }),
      });

      setReceipt({
        receiptNo: res.data.receiptNo,
        date: res.data.date,
        studentName: `${selectedStudent.firstName} ${
          selectedStudent.lastName || ""
        }`.trim(),
        className: `${selectedStudent.class?.name || ""}${
          selectedStudent.section?.name
            ? `-${selectedStudent.section.name}`
            : ""
        }`,
        feeName,
        amount: Number(amount),
        method,
      });

      toast.success("Payment collected successfully");
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["fee-collections"] });
      queryClient.invalidateQueries({ queryKey: ["accountant-dashboard"] });

      if (printReceipt) {
        setTimeout(() => window.print(), 400);
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to collect payment");
      refetchFees();
    } finally {
      setCollecting(false);
    }
  };

  /* ============================================================
     Handle total-fee edit
     ============================================================ */
  const handleTotalFeeUpdate = (
    rowId: string,
    newTotal: number,
    _newDue: number,
    _newStatus: string
  ) => {
    queryClient.setQueryData(["fee-collections", search], (old: any) => {
      if (!old) return old;
      return {
        ...old,
        data: old.data.map((r: CollectionRow) =>
          r.id === rowId ? { ...r, totalFee: newTotal } : r
        ),
      };
    });
    queryClient.invalidateQueries({ queryKey: ["accountant-dashboard"] });
  };

  const handleExport = () => {
    if (filteredRows.length === 0) {
      toast.error("No data to export");
      return;
    }
    const header =
      "Receipt No,Date,Student,Class,Total Fee,Amount Paid,Pending,Payment Mode\n";
    const body = filteredRows
      .map((r) => {
        const pending = Math.max(0, r.totalFee - r.paidAmount);
        return [
          r.receiptNo,
          r.date ? new Date(r.date).toLocaleDateString() : "",
          r.studentName,
          r.className,
          r.totalFee,
          r.paidAmount,
          pending,
          r.paymentMode || "",
        ].join(",");
      })
      .join("\n");
    const blob = new Blob([header + body], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fee-collection-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Exported successfully");
  };

  /* ============================================================
     RENDER
     ============================================================ */
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Fee Collection
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Collect fees and view complete payment history.
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

      {/* Collect Fee Form */}
      <Card className="card-elevated border-primary/20 overflow-hidden">
        <button
          onClick={() => setFormOpen(!formOpen)}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/30 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <Wallet className="h-4 w-4 text-primary" />
            </div>
            <div className="text-left">
              <h3 className="font-semibold tracking-tight">Collect Fee</h3>
              <p className="text-xs text-muted-foreground">
                Record a new payment and generate receipt
              </p>
            </div>
          </div>
          {formOpen ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </button>

        {formOpen && (
          <div className="border-t p-5 space-y-5 bg-muted/10">
            {/* Step 1: Student */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Step 1: Select Student
              </p>

              {!selectedStudent ? (
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search student name / admission no / roll no..."
                    className="pl-9 h-11"
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                  />
                  {studentSearch.trim().length >= 2 &&
                    searchResults &&
                    searchResults.length > 0 && (
                      <div className="mt-2 rounded-lg border divide-y max-h-52 overflow-y-auto bg-card">
                        {searchResults.map((s) => (
                          <button
                            key={s.id}
                            onClick={() => setSelectedStudent(s)}
                            className="w-full text-left px-4 py-3 hover:bg-muted/40 text-sm flex items-center justify-between"
                          >
                            <div>
                              <p className="font-medium">
                                {s.firstName} {s.lastName}
                              </p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {s.class?.name}
                                {s.section?.name
                                  ? `-${s.section.name}`
                                  : ""}{" "}
                                | Roll {s.rollNumber ?? "-"}
                                {s.guardianMobile
                                  ? ` | ${s.guardianMobile}`
                                  : ""}
                              </p>
                            </div>
                            <ChevronDown className="h-4 w-4 text-muted-foreground rotate-[-90deg]" />
                          </button>
                        ))}
                      </div>
                    )}
                  {studentSearch.trim().length >= 2 &&
                    searchResults &&
                    searchResults.length === 0 && (
                      <p className="mt-3 text-xs text-muted-foreground text-center py-3">
                        No students found matching "{studentSearch}"
                      </p>
                    )}
                </div>
              ) : (
                <div className="rounded-lg border bg-card px-4 py-3 flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">
                        {selectedStudent.firstName}{" "}
                        {selectedStudent.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {selectedStudent.class?.name}
                        {selectedStudent.section?.name
                          ? `-${selectedStudent.section.name}`
                          : ""}{" "}
                        | Roll {selectedStudent.rollNumber ?? "-"}
                      </p>
                      {selectedStudent.guardianMobile && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Parent: {selectedStudent.guardianMobile}
                        </p>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={resetForm}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>

            {/* Step 2: Payment */}
            {selectedStudent && (
              <>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    Step 2: Enter Payment
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {/* Fee Head Dropdown */}
                    <div className="space-y-1.5 md:col-span-1">
                      <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                        <FileText className="h-3 w-3" /> Fee Head
                      </label>

                      <Select
                        value={selectedFeeId}
                        onValueChange={setSelectedFeeId}
                        disabled={feesLoading}
                      >
                        <SelectTrigger className="h-11">
                          <SelectValue
                            placeholder={
                              feesLoading
                                ? "Loading..."
                                : "Select fee head"
                            }
                          />
                        </SelectTrigger>

                        <SelectContent className="max-h-80">
                          {hasOutstanding ? (
                            <SelectGroup>
                              <SelectLabel className="text-[10px] uppercase tracking-wide">
                                Outstanding Fees
                              </SelectLabel>
                              {(outstandingFees || []).map((f) => (
                                <SelectItem key={f.id} value={f.id}>
                                  {f.fee.name} - Due{" "}
                                  {formatINR(
                                    Number(f.amount) -
                                      Number(f.paidAmount)
                                  )}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          ) : (
                            <>
                              <SelectGroup>
                                <SelectLabel className="text-[10px] uppercase tracking-wide">
                                  Mandatory
                                </SelectLabel>
                                {FALLBACK_FEE_HEADS.mandatory.map((f) => (
                                  <SelectItem
                                    key={f.value}
                                    value={f.value}
                                  >
                                    {f.label}
                                  </SelectItem>
                                ))}
                              </SelectGroup>

                              <SelectGroup>
                                <SelectLabel className="text-[10px] uppercase tracking-wide">
                                  Optional
                                </SelectLabel>
                                {FALLBACK_FEE_HEADS.optional.map((f) => (
                                  <SelectItem
                                    key={f.value}
                                    value={f.value}
                                  >
                                    {f.label}
                                  </SelectItem>
                                ))}
                              </SelectGroup>

                              <SelectGroup>
                                <SelectLabel className="text-[10px] uppercase tracking-wide">
                                  One-time
                                </SelectLabel>
                                {FALLBACK_FEE_HEADS.oneTime.map((f) => (
                                  <SelectItem
                                    key={f.value}
                                    value={f.value}
                                  >
                                    {f.label}
                                  </SelectItem>
                                ))}
                              </SelectGroup>

                              <SelectGroup>
                                <SelectLabel className="text-[10px] uppercase tracking-wide">
                                  Other
                                </SelectLabel>
                                {FALLBACK_FEE_HEADS.other.map((f) => (
                                  <SelectItem
                                    key={f.value}
                                    value={f.value}
                                  >
                                    {f.label}
                                  </SelectItem>
                                ))}
                              </SelectGroup>
                            </>
                          )}
                        </SelectContent>
                      </Select>

                      {selectedFeeId && (
                        <p className="text-xs text-emerald-600 mt-1">
                          ✓{" "}
                          {outstandingFees?.find(
                            (f) => f.id === selectedFeeId
                          )?.fee.name ||
                            getAllFallbackHeads().find(
                              (f) => f.value === selectedFeeId
                            )?.label}{" "}
                          selected
                        </p>
                      )}
                    </div>

                    {/* Amount */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                        <Wallet className="h-3 w-3" /> Amount (Rs.)
                      </label>
                      <Input
                        type="number"
                        placeholder="0"
                        className="h-11"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        disabled={!selectedFeeId}
                      />
                    </div>

                    {/* Method */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                        <CreditCard className="h-3 w-3" /> Payment Method
                      </label>
                      <Select value={method} onValueChange={setMethod}>
                        <SelectTrigger className="h-11">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="CASH">Cash</SelectItem>
                          <SelectItem value="UPI">UPI</SelectItem>
                          <SelectItem value="CARD">Card</SelectItem>
                          <SelectItem value="CHEQUE">Cheque</SelectItem>
                          <SelectItem value="BANK_TRANSFER">
                            Bank Transfer
                          </SelectItem>
                          <SelectItem value="ONLINE">Online</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Reference */}
                  <div className="space-y-1.5 mt-3">
                    <label className="text-xs font-medium text-muted-foreground">
                      Reference / Transaction ID (optional)
                    </label>
                    <Input
                      placeholder="e.g. UPI ref number, cheque no..."
                      value={reference}
                      onChange={(e) => setReference(e.target.value)}
                      disabled={!selectedFeeId}
                    />
                  </div>
                </div>

                {/* Step 3: Options */}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    Step 3: Post-Payment Actions
                  </p>
                  <div className="flex flex-wrap gap-4">
                    <label className="flex items-center gap-2 cursor-pointer text-sm">
                      <Checkbox
                        checked={sendSMS}
                        onCheckedChange={(v) => setSendSMS(!!v)}
                      />
                      Send SMS
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-sm">
                      <Checkbox
                        checked={sendEmail}
                        onCheckedChange={(v) => setSendEmail(!!v)}
                      />
                      Send Email
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-sm">
                      <Checkbox
                        checked={printReceipt}
                        onCheckedChange={(v) => setPrintReceipt(!!v)}
                      />
                      Print receipt
                    </label>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2 border-t">
                  <Button
                    onClick={handleCollect}
                    disabled={collecting || !selectedFeeId || !amount}
                    className="gap-2 flex-1 md:flex-none md:px-8 h-11"
                  >
                    {collecting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Wallet className="h-4 w-4" />
                    )}
                    {collecting
                      ? "Processing..."
                      : "Collect & Print Receipt"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={resetForm}
                    className="h-11"
                  >
                    Cancel
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 card-elevated">
          <div className="flex items-center gap-2 text-muted-foreground text-xs">
            <Wallet className="h-4 w-4" /> Today
          </div>
          <p className="text-2xl font-bold mt-1">
            {formatINR(stats.todayTotal)}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Collected today
          </p>
        </Card>
        <Card className="p-4 card-elevated">
          <div className="flex items-center gap-2 text-muted-foreground text-xs">
            <TrendingUp className="h-4 w-4" /> This Month
          </div>
          <p className="text-2xl font-bold mt-1">
            {formatINR(stats.monthTotal)}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Collected this month
          </p>
        </Card>
        <Card className="p-4 card-elevated">
          <div className="flex items-center gap-2 text-muted-foreground text-xs">
            <Receipt className="h-4 w-4" /> Records
          </div>
          <p className="text-2xl font-bold mt-1">{stats.count}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Total transactions
          </p>
        </Card>
        <Card className="p-4 card-elevated border-red-200">
          <div className="flex items-center gap-2 text-red-600 text-xs">
            <CalendarClock className="h-4 w-4" /> Total Pending
          </div>
          <p className="text-2xl font-bold mt-1 text-red-600">
            {formatINR(stats.totalPending)}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Across all records
          </p>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4 card-elevated">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by student name or receipt no..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
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
          <Select value={classFilter} onValueChange={setClassFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="All Classes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Classes</SelectItem>
              {classes.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={methodFilter} onValueChange={setMethodFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="All Methods" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Methods</SelectItem>
              {methods.map((m) => (
                <SelectItem key={m} value={m}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Table */}
      <Card className="card-elevated overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="py-16 text-center">
            <Receipt className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm font-medium text-muted-foreground">
              {rows.length === 0
                ? "No fee collection records yet."
                : "No records match your filters."}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {rows.length === 0
                ? "Use the form above to record your first payment."
                : "Try adjusting your search or filters."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground border-b bg-muted/20">
                  <th className="px-4 py-3 font-medium">Receipt No</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Student</th>
                  <th className="px-4 py-3 font-medium">Class</th>
                  <th className="px-4 py-3 font-medium text-right">
                    Total Fee
                  </th>
                  <th className="px-4 py-3 font-medium text-right">
                    Amount Paid
                  </th>
                  <th className="px-4 py-3 font-medium text-right">
                    Pending
                  </th>
                  <th className="px-4 py-3 font-medium">Payment Mode</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => {
                  const pending = Math.max(
                    0,
                    row.totalFee - row.paidAmount
                  );
                  const isPaid = pending === 0 && row.totalFee > 0;
                  return (
                    <tr
                      key={row.id}
                      className="border-b last:border-0 hover:bg-muted/30 transition-colors"
                    >
                      <td className="px-4 py-3 font-mono text-xs">
                        {row.receiptNo}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {row.date ? formatDate(row.date) : "-"}
                      </td>
                      <td className="px-4 py-3 font-medium">
                        {row.studentName}
                      </td>
                      <td className="px-4 py-3">{row.className}</td>

                      {/* ✅ Total Fee — editable */}
                      <td className="px-4 py-3 text-right">
                        <EditableAmountCell
                          rowId={row.id}
                          currentAmount={row.totalFee}
                          paidAmount={row.paidAmount}
                          onSaved={(newTotal, newDue, newStatus) =>
                            handleTotalFeeUpdate(
                              row.id,
                              newTotal,
                              newDue,
                              newStatus
                            )
                          }
                        />
                      </td>

                      {/* ✅ Amount Paid */}
                      <td className="px-4 py-3 text-right font-semibold text-emerald-600">
                        {formatINR(row.paidAmount)}
                      </td>

                      {/* ✅ Pending = Total − Paid */}
                      <td className="px-4 py-3 text-right">
                        <span
                          className={`font-semibold ${
                            isPaid
                              ? "text-emerald-600"
                              : pending > 0
                              ? "text-red-600"
                              : "text-foreground"
                          }`}
                        >
                          {isPaid ? "—" : formatINR(pending)}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <Badge variant="outline" className="text-[10px]">
                          {row.paymentMode || "-"}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Receipt Dialog */}
      <Dialog
        open={!!receipt}
        onOpenChange={(o) => !o && setReceipt(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-primary" />
              Payment Receipt
            </DialogTitle>
          </DialogHeader>

          {receipt && (
            <div id="print-receipt" className="space-y-4">
              <div className="rounded-lg border bg-muted/20 p-4 text-center">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">
                  Receipt Number
                </p>
                <p className="font-mono font-semibold text-lg mt-1">
                  {receipt.receiptNo}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {formatDate(receipt.date)}
                </p>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Student</span>
                  <span className="font-medium">
                    {receipt.studentName}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Class</span>
                  <span className="font-medium">{receipt.className}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Fee</span>
                  <span className="font-medium">{receipt.feeName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Method</span>
                  <Badge variant="outline">{receipt.method}</Badge>
                </div>
                <div className="flex justify-between border-t pt-2 text-base">
                  <span className="font-semibold">Amount Paid</span>
                  <span className="font-bold text-emerald-600">
                    {formatINR(receipt.amount)}
                  </span>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => window.print()}
            >
              <Printer className="h-4 w-4" /> Print
            </Button>
            <Button onClick={() => setReceipt(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default FeeCollectionPage;