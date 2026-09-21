import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api/client";

interface SectionInfo { id: string; name: string; }
interface ClassInfo { id: string; name: string; sections: SectionInfo[]; }

interface RegisterEntry {
  id: string;
  date: string;
  name: string;
  admissionNo: string;
  rollNumber: number | null;
  class: string;
  status: string;
  remarks: string;
}

const STATUS_OPTIONS = ["Present", "Absent", "Late", "Leave", "Holiday"];

export function AttendanceRegisterPage() {
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [classesLoading, setClassesLoading] = useState(true);
  const [classId, setClassId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [date, setDate] = useState("");
  const [search, setSearch] = useState("");

  const [rows, setRows] = useState<RegisterEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [deleting, setDeleting] = useState<RegisterEntry | null>(null);

  useEffect(() => {
    apiFetch<{ data: ClassInfo[] }>("/classes")
      .then((res) => setClasses(res.data || []))
      .catch(() => toast.error("Failed to load classes"))
      .finally(() => setClassesLoading(false));
  }, []);

  const sections = useMemo(
    () => classes.find((c) => c.id === classId)?.sections || [],
    [classes, classId]
  );

  async function loadRegister() {
    setLoading(true);
    try {
      const query = new URLSearchParams({ page: "1", limit: "200" });
      if (classId) query.set("classId", classId);
      if (sectionId) query.set("sectionId", sectionId);
      if (date) query.set("date", date);
      if (search) query.set("search", search);

      const res = await apiFetch<{ data: RegisterEntry[]; pagination: { total: number } }>(
        `/attendance/register?${query}`
      );
      setRows(res.data || []);
      setTotal(res.pagination?.total || 0);
    } catch (err: any) {
      toast.error(err?.message || "Failed to load attendance register");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  // Load on mount, and whenever a filter changes.
  useEffect(() => {
    loadRegister();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId, sectionId, date]);

  async function handleDelete() {
    if (!deleting) return;
    try {
      await apiFetch(`/attendance/register/${deleting.id}`, { method: "DELETE" });
      toast.success("Attendance record deleted");
      setRows((prev) => prev.filter((r) => r.id !== deleting.id));
      setTotal((t) => t - 1);
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete record");
    } finally {
      setDeleting(null);
    }
  }

  async function handleStatusChange(row: RegisterEntry, status: string) {
    const prevStatus = row.status;
    setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, status } : r)));
    try {
      await apiFetch(`/attendance/register/${row.id}`, {
        method: "PUT",
        body: JSON.stringify({ status: status.toUpperCase() }),
      });
    } catch (err: any) {
      toast.error(err?.message || "Failed to update status");
      setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, status: prevStatus } : r)));
    }
  }

  const statusColor: Record<string, string> = {
    Present: "text-green-600",
    Absent: "text-red-600",
    Late: "text-amber-600",
    Leave: "text-slate-600",
    Holiday: "text-blue-600",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Attendance Register</h1>
        <p className="text-sm text-muted-foreground mt-1">
          History of everything marked via Mark Attendance — filter by class and section.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-4 rounded-lg border p-4">
        <div className="w-48">
          <Label>Class</Label>
          <Select
            value={classId || "all"}
            onValueChange={(v) => { setClassId(v === "all" ? "" : v); setSectionId(""); }}
            disabled={classesLoading}
          >
            <SelectTrigger className="mt-1"><SelectValue placeholder={classesLoading ? "Loading…" : "All classes"} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All classes</SelectItem>
              {classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="w-48">
          <Label>Section</Label>
          <Select
            value={sectionId || "all"}
            onValueChange={(v) => setSectionId(v === "all" ? "" : v)}
            disabled={!classId}
          >
            <SelectTrigger className="mt-1"><SelectValue placeholder="All sections" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All sections</SelectItem>
              {sections.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="w-44">
          <Label>Date</Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1" />
        </div>

        <div className="flex-1 min-w-[180px]">
          <Label>Search Student</Label>
          <div className="flex gap-2 mt-1">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && loadRegister()}
              placeholder="Name or admission no"
            />
            <Button type="button" variant="secondary" onClick={loadRegister}>Search</Button>
          </div>
        </div>
      </div>

      {loading && (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
        </div>
      )}

      {!loading && rows.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No attendance records found for these filters. Records show up here after being saved from Mark Attendance.
        </p>
      )}

      {!loading && rows.length > 0 && (
        <div className="rounded-lg border overflow-hidden overflow-x-auto">
          <div className="px-3 py-2 text-xs text-muted-foreground border-b bg-muted/20">{total} record(s)</div>
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr>
                <th className="text-left font-medium px-3 py-2">Date</th>
                <th className="text-left font-medium px-3 py-2">Roll No</th>
                <th className="text-left font-medium px-3 py-2">Student</th>
                <th className="text-left font-medium px-3 py-2">Class</th>
                <th className="text-left font-medium px-3 py-2">Status</th>
                <th className="text-left font-medium px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="px-3 py-2">{r.date}</td>
                  <td className="px-3 py-2">{r.rollNumber ?? "-"}</td>
                  <td className="px-3 py-2">{r.name}</td>
                  <td className="px-3 py-2">{r.class}</td>
                  <td className="px-3 py-2">
                    <Select value={r.status} onValueChange={(v) => handleStatusChange(r, v)}>
                      <SelectTrigger className={`h-8 w-28 ${statusColor[r.status] || ""}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-3 py-2">
                    <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setDeleting(r)}>
                      Delete
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this attendance record?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the {deleting?.status} entry for {deleting?.name} on {deleting?.date}. This can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}