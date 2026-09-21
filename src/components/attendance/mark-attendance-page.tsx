import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api/client";
import { getClassesWithSections } from "@/lib/services/crud.service";

type Status = "PRESENT" | "ABSENT" | "LATE" | "LEAVE";

const STATUS_OPTIONS: { value: Status; label: string; activeClass: string }[] = [
  { value: "PRESENT", label: "Present", activeClass: "bg-green-600 hover:bg-green-600 text-white" },
  { value: "ABSENT", label: "Absent", activeClass: "bg-red-600 hover:bg-red-600 text-white" },
  { value: "LATE", label: "Late", activeClass: "bg-amber-500 hover:bg-amber-500 text-white" },
  { value: "LEAVE", label: "Leave", activeClass: "bg-slate-500 hover:bg-slate-500 text-white" },
];

interface RosterEntry {
  studentId: string;
  admissionNo: string;
  rollNumber: number | null;
  name: string;
  profileImage?: string | null;
  status: Status | null;
  remarks: string;
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function MarkAttendancePage() {
  const queryClient = useQueryClient();

  const [classId, setClassId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [date, setDate] = useState(todayIso());

  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const classesQuery = useQuery({
    queryKey: ["classes-with-sections"],
    queryFn: getClassesWithSections,
  });
  const classes = classesQuery.data ?? [];
  const classesLoading = classesQuery.isLoading;

  const sections = useMemo(
    () => classes.find((c) => c.id === classId)?.sections || [],
    [classes, classId]
  );

  async function loadRoster() {
    if (!classId || !sectionId) {
      toast.error("Select a Class and Section first");
      return;
    }
    setRosterLoading(true);
    setLoaded(false);
    try {
      const res = await apiFetch<{ data: { roster: RosterEntry[] } }>(
        `/attendance/roster?classId=${encodeURIComponent(classId)}&sectionId=${encodeURIComponent(sectionId)}&date=${encodeURIComponent(date)}`
      );
      setRoster(res.data.roster || []);
      setLoaded(true);
      if ((res.data.roster || []).length === 0) {
        toast.info("No active students found in this class/section");
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to load student roster");
      setRoster([]);
    } finally {
      setRosterLoading(false);
    }
  }

  function setStatus(studentId: string, status: Status) {
    setRoster((prev) => prev.map((r) => (r.studentId === studentId ? { ...r, status } : r)));
  }

  function markAllPresent() {
    setRoster((prev) => prev.map((r) => ({ ...r, status: "PRESENT" as Status })));
  }

  async function handleSave() {
    const records = roster.filter((r) => r.status).map((r) => ({
      studentId: r.studentId,
      status: r.status as Status,
      remarks: r.remarks || undefined,
    }));

    if (records.length === 0) {
      toast.error("Mark at least one student before saving");
      return;
    }

    setSaving(true);
    try {
      await apiFetch("/attendance/mark", {
        method: "POST",
        body: JSON.stringify({ classId, sectionId, date, records }),
      });
      toast.success(`Attendance saved for ${records.length} student(s)`);
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
    } catch (err: any) {
      toast.error(err?.message || "Failed to save attendance");
    } finally {
      setSaving(false);
    }
  }

  const presentCount = roster.filter((r) => r.status === "PRESENT").length;
  const absentCount = roster.filter((r) => r.status === "ABSENT").length;
  const unmarkedCount = roster.filter((r) => !r.status).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Mark Attendance</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Pick a class and section — the student list comes straight from Student Management.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-4 rounded-lg border p-4">
        <div className="w-48">
          <Label>Class</Label>
          <Select
            value={classId}
            onValueChange={(v) => { setClassId(v); setSectionId(""); setLoaded(false); setRoster([]); }}
            disabled={classesLoading}
          >
            <SelectTrigger className="mt-1"><SelectValue placeholder={classesLoading ? "Loading…" : "Select class"} /></SelectTrigger>
            <SelectContent>
              {classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="w-48">
          <Label>Section</Label>
          <Select
            value={sectionId}
            onValueChange={(v) => { setSectionId(v); setLoaded(false); setRoster([]); }}
            disabled={!classId}
          >
            <SelectTrigger className="mt-1"><SelectValue placeholder="Select section" /></SelectTrigger>
            <SelectContent>
              {sections.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="w-44">
          <Label>Date</Label>
          <Input
            type="date"
            value={date}
            max={todayIso()}
            onChange={(e) => { setDate(e.target.value); setLoaded(false); setRoster([]); }}
            className="mt-1"
          />
        </div>

        <Button onClick={loadRoster} disabled={!classId || !sectionId || rosterLoading}>
          {rosterLoading ? "Loading…" : "Load Students"}
        </Button>
      </div>

      {rosterLoading && (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      )}

      {!rosterLoading && loaded && roster.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No active students found for this class and section.
        </p>
      )}

      {!rosterLoading && roster.length > 0 && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex gap-4 text-sm">
              <span className="text-muted-foreground">Total: <b className="text-foreground">{roster.length}</b></span>
              <span className="text-green-600">Present: <b>{presentCount}</b></span>
              <span className="text-red-600">Absent: <b>{absentCount}</b></span>
              <span className="text-muted-foreground">Unmarked: <b className="text-foreground">{unmarkedCount}</b></span>
            </div>
            <Button variant="outline" size="sm" onClick={markAllPresent}>Mark All Present</Button>
          </div>

          <div className="rounded-lg border overflow-hidden overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr>
                  <th className="text-left font-medium px-3 py-2">Roll No</th>
                  <th className="text-left font-medium px-3 py-2">Student Name</th>
                  <th className="text-left font-medium px-3 py-2">Admission No</th>
                  <th className="text-left font-medium px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {roster.map((r) => (
                  <tr key={r.studentId} className="border-t">
                    <td className="px-3 py-2">{r.rollNumber ?? "-"}</td>
                    <td className="px-3 py-2">{r.name}</td>
                    <td className="px-3 py-2 text-muted-foreground">{r.admissionNo}</td>
                    <td className="px-3 py-2">
                      <div className="flex gap-1.5">
                        {STATUS_OPTIONS.map((opt) => (
                          <Button
                            key={opt.value}
                            type="button"
                            size="sm"
                            variant="outline"
                            className={r.status === opt.value ? opt.activeClass : ""}
                            onClick={() => setStatus(r.studentId, opt.value)}
                          >
                            {opt.label}
                          </Button>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "Save Attendance"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}