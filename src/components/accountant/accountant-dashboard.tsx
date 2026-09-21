import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Wallet, TrendingDown, TrendingUp, AlertTriangle, Receipt, Banknote, Landmark,
  CalendarClock, Search, Loader2, Trophy, Send, Bell, Moon,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { apiFetch } from "@/lib/api/client";
import { useAuth } from "@/lib/auth/store";

interface DashboardData {
  stats: {
    collectedThisMonth: number;
    pendingAmount: number;
    pendingStudentsCount: number;
    todayCollected: number;
    todayTxnCount: number;
    defaultersCount: number;
    cashInHand: number;
    bankBalance: number;
    totalActiveStudents: number;
    fullyPaidStudents: number;
    dueTodayAmount: number;
    dueTodayCount: number;
  };
  collectionTrend: { month: string; total: number }[];
  topPayingClasses: { className: string; percentage: number }[];
  recentTransactions: {
    id: string; receiptNo: string; studentName: string; className: string;
    amount: number; method: string | null; status: string;
  }[];
  topDefaulters: { id: string; studentName: string; className: string; outstanding: number; daysOverdue: number }[];
}

interface StudentSearchResult {
  id: string;
  firstName: string;
  lastName?: string;
  admissionNo: string;
  rollNumber?: number;
  guardianMobile?: string;
  class?: { name: string };
  section?: { name: string };
}

interface OutstandingFee {
  id: string;
  amount: string;
  paidAmount: string;
  dueDate: string;
  fee: { name: string };
}

function formatINR(n: number) {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

export function AccountantDashboard() {
  const queryClient = useQueryClient();
  const user = useAuth((s) => s.user);

  const [search, setSearch] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<StudentSearchResult | null>(null);
  const [selectedFeeId, setSelectedFeeId] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("UPI");
  const [reference, setReference] = useState("");
  const [collecting, setCollecting] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["accountant-dashboard"],
    queryFn: async () => (await apiFetch<{ data: DashboardData }>("/accountant/dashboard")).data,
  });

  const { data: notifications } = useQuery({
    queryKey: ["accountant-header-notifications"],
    queryFn: async () => (await apiFetch<{ data: { isRead: boolean }[] }>("/accountant-modules/notifications")).data,
  });
  const unreadCount = (notifications || []).filter((n) => !n.isRead).length;

  const { data: searchResults } = useQuery({
    queryKey: ["accountant-student-search", search],
    queryFn: async () =>
      (await apiFetch<{ data: StudentSearchResult[] }>(`/accountant/students/search?q=${encodeURIComponent(search)}`)).data,
    enabled: search.trim().length >= 2,
  });

  const { data: outstandingFees } = useQuery({
    queryKey: ["accountant-outstanding-fees", selectedStudent?.id],
    queryFn: async () =>
      (await apiFetch<{ data: OutstandingFee[] }>(`/accountant/students/${selectedStudent!.id}/outstanding-fees`)).data,
    enabled: !!selectedStudent,
  });

  const resetForm = () => {
    setSelectedStudent(null);
    setSelectedFeeId("");
    setAmount("");
    setReference("");
    setSearch("");
  };

  const handleCollect = async () => {
    if (!selectedFeeId || !amount) {
      toast.error("Pick a fee and enter an amount");
      return;
    }
    setCollecting(true);
    try {
      await apiFetch("/accountant/collect-payment", {
        method: "POST",
        body: JSON.stringify({
          feePaymentId: selectedFeeId,
          amountPaid: Number(amount),
          paymentMethod: method,
          transactionId: reference || undefined,
        }),
      });
      toast.success("Payment collected");
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["accountant-dashboard"] });
    } catch (err: any) {
      toast.error(err?.message || "Failed to collect payment");
    } finally {
      setCollecting(false);
    }
  };

  const stats = data?.stats;
  const collectionTrend = data?.collectionTrend || [];
  const topPayingClasses = data?.topPayingClasses || [];
  const recentTransactions = data?.recentTransactions || [];
  const topDefaulters = data?.topDefaulters || [];
  const today = new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const maxTrend = Math.max(...collectionTrend.map((t) => t.total), 1);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Good Morning, {(user?.name || "there").split(" ")[0]}! 👋</h1>
          <p className="text-sm text-muted-foreground">Here's your financial overview for {today}</p>
        </div>
        <div className="hidden sm:flex items-center gap-2 text-muted-foreground">
          <Button variant="ghost" size="icon" className="relative h-9 w-9">
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 rounded-full bg-destructive text-[10px] leading-4 text-white text-center px-1">
                {unreadCount}
              </span>
            )}
          </Button>
        </div>
      </div>

      {isLoading || !stats ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* Row 1: primary stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-4 card-elevated">
              <div className="flex items-center gap-2 text-muted-foreground text-xs"><Wallet className="h-4 w-4" /> Collected</div>
              <p className="text-2xl font-bold mt-1">{formatINR(stats.collectedThisMonth)}</p>
              <p className="text-xs text-muted-foreground mt-0.5">This month</p>
            </Card>
            <Card className="p-4 card-elevated">
              <div className="flex items-center gap-2 text-muted-foreground text-xs"><TrendingDown className="h-4 w-4" /> Pending</div>
              <p className="text-2xl font-bold mt-1">{formatINR(stats.pendingAmount)}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{stats.pendingStudentsCount} students</p>
            </Card>
            <Card className="p-4 card-elevated">
              <div className="flex items-center gap-2 text-muted-foreground text-xs"><TrendingUp className="h-4 w-4" /> Today</div>
              <p className="text-2xl font-bold mt-1">{formatINR(stats.todayCollected)}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{stats.todayTxnCount} txns</p>
            </Card>
            <Card className="p-4 card-elevated border-warning/40">
              <div className="flex items-center gap-2 text-warning text-xs"><AlertTriangle className="h-4 w-4" /> Defaulters</div>
              <p className="text-2xl font-bold mt-1">{stats.defaultersCount}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Follow up needed</p>
            </Card>
          </div>

          {/* Row 2: secondary stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-4 card-elevated">
              <div className="flex items-center gap-2 text-muted-foreground text-xs"><Receipt className="h-4 w-4" /> Paid</div>
              <p className="text-2xl font-bold mt-1">{stats.fullyPaidStudents}/{stats.totalActiveStudents}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {stats.totalActiveStudents > 0 ? Math.round((stats.fullyPaidStudents / stats.totalActiveStudents) * 100) : 0}%
              </p>
            </Card>
            <Card className="p-4 card-elevated">
              <div className="flex items-center gap-2 text-muted-foreground text-xs"><Banknote className="h-4 w-4" /> Cash</div>
              <p className="text-2xl font-bold mt-1">{formatINR(stats.cashInHand)}</p>
              <p className="text-xs text-muted-foreground mt-0.5">In hand (all time)</p>
            </Card>
            <Card className="p-4 card-elevated">
              <div className="flex items-center gap-2 text-muted-foreground text-xs"><Landmark className="h-4 w-4" /> Non-cash</div>
              <p className="text-2xl font-bold mt-1">{formatINR(stats.bankBalance)}</p>
              <p className="text-xs text-muted-foreground mt-0.5">UPI/Card/Cheque/Transfer</p>
            </Card>
            <Card className="p-4 card-elevated">
              <div className="flex items-center gap-2 text-muted-foreground text-xs"><CalendarClock className="h-4 w-4" /> Due Today</div>
              <p className="text-2xl font-bold mt-1">{formatINR(stats.dueTodayAmount)}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{stats.dueTodayCount} students</p>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Quick Fee Collection */}
            <Card className="p-6 card-elevated">
              <h3 className="font-semibold tracking-tight mb-4">Quick Fee Collection</h3>

              {!selectedStudent ? (
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search student name / admission no…"
                    className="pl-9"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                  {searchResults && searchResults.length > 0 && (
                    <div className="mt-2 rounded-lg border divide-y max-h-64 overflow-y-auto">
                      {searchResults.map((s) => (
                        <button
                          key={s.id}
                          onClick={() => setSelectedStudent(s)}
                          className="w-full text-left px-3 py-2.5 hover:bg-muted/40 text-sm"
                        >
                          <p className="font-medium">{s.firstName} {s.lastName}</p>
                          <p className="text-xs text-muted-foreground">
                            {s.class?.name}{s.section?.name ? `-${s.section.name}` : ""} · Roll {s.rollNumber ?? "-"}
                            {s.guardianMobile ? ` · ${s.guardianMobile}` : ""}
                          </p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="rounded-lg border px-4 py-3">
                    <p className="font-medium">{selectedStudent.firstName} {selectedStudent.lastName}</p>
                    <p className="text-xs text-muted-foreground">
                      {selectedStudent.class?.name}{selectedStudent.section?.name ? `-${selectedStudent.section.name}` : ""} · Roll {selectedStudent.rollNumber ?? "-"}
                    </p>
                    {selectedStudent.guardianMobile && (
                      <p className="text-xs text-muted-foreground mt-0.5">Parent: {selectedStudent.guardianMobile}</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Fee</label>
                    <Select value={selectedFeeId} onValueChange={setSelectedFeeId}>
                      <SelectTrigger><SelectValue placeholder="Select outstanding fee" /></SelectTrigger>
                      <SelectContent>
                        {(outstandingFees || []).map((f) => (
                          <SelectItem key={f.id} value={f.id}>
                            {f.fee.name} — Due {formatINR(Number(f.amount) - Number(f.paidAmount))}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">Amount</label>
                      <Input type="number" placeholder="₹ 0" value={amount} onChange={(e) => setAmount(e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">Method</label>
                      <Select value={method} onValueChange={setMethod}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="CASH">Cash</SelectItem>
                          <SelectItem value="UPI">UPI</SelectItem>
                          <SelectItem value="CARD">Card</SelectItem>
                          <SelectItem value="CHEQUE">Cheque</SelectItem>
                          <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                          <SelectItem value="ONLINE">Online</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Reference / Transaction ID (optional)</label>
                    <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="e.g. UPI ref number" />
                  </div>

                  <div className="flex gap-2">
                    <Button onClick={handleCollect} disabled={collecting} className="flex-1 gap-2">
                      {collecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wallet className="h-4 w-4" />}
                      Collect & Save
                    </Button>
                    <Button variant="outline" onClick={resetForm}>Cancel</Button>
                  </div>
                </div>
              )}
            </Card>

            {/* Collection Trend */}
            <Card className="p-6 card-elevated">
              <h3 className="font-semibold tracking-tight mb-4">Collection Trend</h3>
              <div className="flex items-end gap-3 h-40">
                {collectionTrend.map((t) => (
                  <div key={t.month} className="flex flex-col items-center gap-1.5 flex-1">
                    <div className="text-[10px] font-medium">{formatINR(t.total / 100000)}L</div>
                    <div
                      className="w-full rounded-t-md bg-primary/70"
                      style={{ height: `${Math.max((t.total / maxTrend) * 100, 3)}%` }}
                    />
                    <div className="text-[10px] text-muted-foreground">{t.month}</div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Recent Transactions */}
            <Card className="lg:col-span-2 p-6 card-elevated">
              <h3 className="font-semibold tracking-tight mb-4">Recent Transactions</h3>
              {recentTransactions.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No transactions yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-muted-foreground border-b">
                        <th className="py-2 pr-3 font-medium">Receipt</th>
                        <th className="py-2 pr-3 font-medium">Student</th>
                        <th className="py-2 pr-3 font-medium">Class</th>
                        <th className="py-2 pr-3 font-medium">Amount</th>
                        <th className="py-2 font-medium">Method</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentTransactions.map((t) => (
                        <tr key={t.id} className="border-b last:border-0">
                          <td className="py-2 pr-3 font-mono text-xs">{t.receiptNo}</td>
                          <td className="py-2 pr-3">{t.studentName}</td>
                          <td className="py-2 pr-3">{t.className}</td>
                          <td className="py-2 pr-3 font-medium">{formatINR(t.amount)}</td>
                          <td className="py-2"><Badge variant="outline" className="text-[10px]">{t.method}</Badge></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>

            {/* Top Paying Classes */}
            <Card className="p-6 card-elevated">
              <div className="flex items-center gap-2 mb-4">
                <Trophy className="h-4 w-4 text-primary" />
                <h3 className="font-semibold tracking-tight">Top Paying Classes</h3>
              </div>
              {topPayingClasses.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">Not enough data yet.</p>
              ) : (
                <div className="space-y-3">
                  {topPayingClasses.map((c, i) => (
                    <div key={c.className}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-medium">{i + 1}. {c.className}</span>
                        <span className="text-muted-foreground">{c.percentage}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${c.percentage}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* Top Defaulters */}
          <Card className="p-6 card-elevated">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-warning" />
                <h3 className="font-semibold tracking-tight">Top Defaulters</h3>
              </div>
              <Button variant="outline" size="sm" className="gap-1.5" disabled={topDefaulters.length === 0}>
                <Send className="h-3.5 w-3.5" /> Send Bulk Reminders
              </Button>
            </div>
            {topDefaulters.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No overdue payments 🎉</p>
            ) : (
              <div className="space-y-2">
                {topDefaulters.map((d) => (
                  <div key={d.id} className="flex items-center justify-between rounded-lg border px-4 py-2.5 text-sm">
                    <div>
                      <p className="font-medium">{d.studentName}</p>
                      <p className="text-xs text-muted-foreground">{d.className} · {d.daysOverdue} days overdue</p>
                    </div>
                    <p className="font-semibold text-warning">{formatINR(d.outstanding)}</p>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}

export default AccountantDashboard;