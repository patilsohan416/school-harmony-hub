import { useEffect, useMemo, useState } from "react";
import { ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api/client";

interface SectionInfo { id: string; name: string; }
interface ClassInfo { id: string; name: string; order?: number; sections: SectionInfo[]; }

interface StudentRow {
  id: string;
  admissionNo: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  rollNumber?: number | null;
  class?: { name: string };
  section?: { name: string };
}

function studentName(s: StudentRow) {
  return [s.firstName, s.middleName, s.lastName].filter(Boolean).join(" ");
}

function defaultAcademicYear() {
  const now = new Date();
  const y = now.getMonth() >= 5 ? now.getFullYear() : now.getFullYear() - 1;
  return `${y}-${y + 1}`;
}

function nextAcademicYear(year: string) {
  const m = year.match(/^(\d{4})/);
  if (!m) return "";
  const y = parseInt(m[1], 10) + 1;
  return `${y}-${y + 1}`;
}

function parseGrade(className: string): number | null {
  const norm = className.toLowerCase().replace(/class|grade|std\.?/g, "").trim();
  const m = norm.match(/\d+/);
  return m ? parseInt(m[0], 10) : null;
}

export function IcseStudentPromotionPage() {
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [classesLoading, setClassesLoading] = useState(true);

  // Current class details
  const [academicYear, setAcademicYear] = useState(defaultAcademicYear());
  const [classId, setClassId] = useState("");
  const [sectionId, setSectionId] = useState("");

  // Target class details
  const [targetYear, setTargetYear] = useState(nextAcademicYear(defaultAcademicYear()));
  const [targetClassId, setTargetClassId] = useState("");
  const [targetSectionId, setTargetSectionId] = useState("");

  const [students, setStudents] = useState<StudentRow[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [promoting, setPromoting] = useState(false);

  useEffect(() => {
    apiFetch<{ data: ClassInfo[] }>("/classes")
      .then((res) => setClasses(res.data || []))
      .catch(() => toast.error("Failed to load classes"))
      .finally(() => setClassesLoading(false));
  }, []);

  const selectedClass = classes.find((c) => c.id === classId);
  const sections = useMemo(() => selectedClass?.sections || [], [selectedClass]);

  const selectedTargetClass = classes.find((c) => c.id === targetClassId);
  const targetSections = useMemo(() => selectedTargetClass?.sections || [], [selectedTargetClass]);

  // Suggest the next class up by grade number once a current class is chosen.
  useEffect(() => {
    if (!selectedClass) { setTargetClassId(""); return; }
    const currentGrade = parseGrade(selectedClass.name);
    if (currentGrade === null) return;
    const next = classes.find((c) => parseGrade(c.name) === currentGrade + 1);
    if (next) setTargetClassId(next.id);
  }, [selectedClass, classes]);

  // Load students whenever the current class/section changes.
  useEffect(() => {
    if (!classId || !sectionId) { setStudents([]); setSelected({}); return; }
    let cancelled = false;
    setStudentsLoading(true);
    const query = new URLSearchParams({
      classId, sectionId, limit: "500", sortBy: "rollNumber", sortOrder: "asc",
    });
    apiFetch<{ data: StudentRow[] }>(`/students?${query}`)
      .then((res) => {
        if (cancelled) return;
        setStudents(res.data || []);
        setSelected({});
      })
      .catch((err) => {
        if (cancelled) return;
        toast.error(err?.message || "Failed to load students");
        setStudents([]);
      })
      .finally(() => { if (!cancelled) setStudentsLoading(false); });
    return () => { cancelled = true; };
  }, [classId, sectionId]);

  const allSelected = students.length > 0 && students.every((s) => selected[s.id]);
  const someSelected = students.some((s) => selected[s.id]);
  const selectedCount = students.filter((s) => selected[s.id]).length;

  function toggleAll(checked: boolean) {
    const next: Record<string, boolean> = {};
    if (checked) students.forEach((s) => { next[s.id] = true; });
    setSelected(next);
  }

  function toggleOne(id: string, checked: boolean) {
    setSelected((prev) => ({ ...prev, [id]: checked }));
  }

  async function handlePromote() {
    if (!targetClassId || !targetSectionId) {
      toast.error("Select the target class and division first");
      return;
    }
    if (targetClassId === classId && targetSectionId === sectionId) {
      toast.error("Target class & division must be different from the current one");
      return;
    }
    const chosen = students.filter((s) => selected[s.id]);
    if (chosen.length === 0) {
      toast.error("Select at least one student to promote");
      return;
    }

    setPromoting(true);
    let succeeded = 0;
    let failed = 0;
    for (const s of chosen) {
      try {
        await apiFetch(`/students/${s.id}`, {
          method: "PUT",
          body: JSON.stringify({ classId: targetClassId, sectionId: targetSectionId }),
        });
        succeeded++;
      } catch {
        failed++;
      }
    }
    setPromoting(false);

    if (succeeded > 0) {
      toast.success(`Promoted ${succeeded} student(s) to ${selectedTargetClass?.name} - ${targetSections.find((sec) => sec.id === targetSectionId)?.name}`);
    }
    if (failed > 0) {
      toast.error(`Failed to promote ${failed} student(s)`);
    }

    // Refresh the current list — promoted students no longer belong here.
    if (classId && sectionId) {
      const query = new URLSearchParams({
        classId, sectionId, limit: "500", sortBy: "rollNumber", sortOrder: "asc",
      });
      try {
        const res = await apiFetch<{ data: StudentRow[] }>(`/students?${query}`);
        setStudents(res.data || []);
        setSelected({});
      } catch {
        // ignore — list will just look stale until next filter change
      }
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">ICSE Student Promotion</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Promote ICSE/ISC students in bulk from their current class &amp; division into a new class &amp; division for the next academic year.
        </p>
      </div>

      <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-4">
        <div className="flex-1 rounded-lg border p-4 space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground">Current Class Details</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Label>Academic Year</Label>
              <Input
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Class</Label>
              <Select
                value={classId}
                onValueChange={(v) => { setClassId(v); setSectionId(""); }}
                disabled={classesLoading}
              >
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select class" /></SelectTrigger>
                <SelectContent>
                  {classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Division</Label>
              <Select value={sectionId} onValueChange={setSectionId} disabled={!classId}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select division" /></SelectTrigger>
                <SelectContent>
                  {sections.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="flex justify-center shrink-0">
          <ArrowRight className="h-6 w-6 text-muted-foreground rotate-90 lg:rotate-0" />
        </div>

        <div className="flex-1 rounded-lg border p-4 space-y-3 bg-muted/20">
          <h2 className="text-sm font-semibold text-muted-foreground">Promote To</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Label>Target Year</Label>
              <Input
                value={targetYear}
                onChange={(e) => setTargetYear(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Target Class</Label>
              <Select
                value={targetClassId}
                onValueChange={(v) => { setTargetClassId(v); setTargetSectionId(""); }}
                disabled={classesLoading}
              >
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select class" /></SelectTrigger>
                <SelectContent>
                  {classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Target Division</Label>
              <Select value={targetSectionId} onValueChange={setTargetSectionId} disabled={!targetClassId}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select division" /></SelectTrigger>
                <SelectContent>
                  {targetSections.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">Select students to promote to the next class</p>
          {!studentsLoading && students.length > 0 && (
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox
                checked={allSelected ? true : someSelected ? "indeterminate" : false}
                onCheckedChange={(c) => toggleAll(!!c)}
              />
              Select All
            </label>
          )}
        </div>

        {!classId || !sectionId ? (
          <p className="text-sm text-muted-foreground rounded-lg border p-6 text-center">
            Choose a Class and Division above to load its students.
          </p>
        ) : studentsLoading ? (
          <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
        ) : students.length === 0 ? (
          <p className="text-sm text-muted-foreground rounded-lg border p-6 text-center">
            No students found in this class &amp; division.
          </p>
        ) : (
          <div className="rounded-lg border overflow-hidden overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr>
                  <th className="text-left font-medium px-3 py-2 w-10">
                    <span className="sr-only">Select</span>
                  </th>
                  <th className="text-left font-medium px-3 py-2">Roll No</th>
                  <th className="text-left font-medium px-3 py-2">Student Name</th>
                  <th className="text-left font-medium px-3 py-2">Division</th>
                  <th className="text-left font-medium px-3 py-2">Current Class</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s) => (
                  <tr key={s.id} className="border-t">
                    <td className="px-3 py-2">
                      <Checkbox
                        checked={!!selected[s.id]}
                        onCheckedChange={(c) => toggleOne(s.id, !!c)}
                      />
                    </td>
                    <td className="px-3 py-2">{s.rollNumber ?? "-"}</td>
                    <td className="px-3 py-2">{studentName(s)}</td>
                    <td className="px-3 py-2">{s.section?.name || "-"}</td>
                    <td className="px-3 py-2">{s.class?.name || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="flex items-center justify-end gap-3">
        {selectedCount > 0 && (
          <span className="text-sm text-muted-foreground">{selectedCount} student(s) selected</span>
        )}
        <Button onClick={handlePromote} disabled={promoting || students.length === 0}>
          {promoting ? "Promoting…" : "Promote Students"}
        </Button>
      </div>
    </div>
  );
}