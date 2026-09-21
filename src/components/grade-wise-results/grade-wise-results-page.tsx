import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api/client";

interface SectionInfo { id: string; name: string; }
interface ClassInfo { id: string; name: string; sections: SectionInfo[]; }

interface GradeRow { grade: string; count: number; percentage: number; }
interface GradeWiseData {
  class: string;
  section: string;
  examName: string;
  academicYear: string;
  examExists: boolean;
  rows: GradeRow[];
  totalGraded: number;
}
const EXAM_OPTIONS = [
  "Unit Test 1",
  "Half Yearly Examination",
  "Unit Test 2",
  "Annual Examination",
  "Board Examination",
];

function defaultAcademicYear() {
  const now = new Date();
  const y = now.getMonth() >= 5 ? now.getFullYear() : now.getFullYear() - 1;
  return `${y}-${String((y + 1) % 100).padStart(2, "0")}`;
}

const GRADE_COLOR: Record<string, string> = {
  "A+": "bg-green-600", "A": "bg-green-500", "B+": "bg-lime-500", "B": "bg-yellow-500",
  "C": "bg-amber-500", "D": "bg-orange-500", "E": "bg-red-500",
};

export function GradeWiseResultsPage() {
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [classId, setClassId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [examName, setExamName] = useState("");
  const [academicYear, setAcademicYear] = useState(defaultAcademicYear());

  const [data, setData] = useState<GradeWiseData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    apiFetch<{ data: ClassInfo[] }>("/classes")
      .then((res) => setClasses(res.data || []))
      .catch(() => toast.error("Failed to load classes"));
  }, []);

  const sections = useMemo(() => classes.find((c) => c.id === classId)?.sections || [], [classes, classId]);

  async function loadResults() {
    if (!classId || !sectionId) { toast.error("Select a Class and Section first"); return; }
    if (!examName.trim()) { toast.error("Enter an Exam name (e.g. Final Exam)"); return; }

    setLoading(true);
    setData(null);
    try {
      const query = new URLSearchParams({ classId, sectionId, examName: examName.trim(), academicYear });
      const res = await apiFetch<{ data: GradeWiseData }>(`/marks/grade-wise-results?${query}`);
      setData(res.data);
      if (!res.data.examExists) {
        toast.info("No marks found yet for this class/exam — enter them in Marks Entry first");
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to load grade-wise results");
    } finally {
      setLoading(false);
    }
  }

  const maxCount = data ? Math.max(1, ...data.rows.map((r) => r.count)) : 1;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Grade-wise Results</h1>
        <p className="text-sm text-muted-foreground mt-1">
          How many students landed in each grade for an exam — computed the same way Progress Report grades each student.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-4 rounded-lg border p-4">
        <div className="w-44">
          <Label>Class</Label>
          <Select value={classId} onValueChange={(v) => { setClassId(v); setSectionId(""); setData(null); }}>
            <SelectTrigger className="mt-1"><SelectValue placeholder="Select class" /></SelectTrigger>
            <SelectContent>{classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="w-40">
          <Label>Section</Label>
          <Select value={sectionId} onValueChange={(v) => { setSectionId(v); setData(null); }} disabled={!classId}>
            <SelectTrigger className="mt-1"><SelectValue placeholder="Select section" /></SelectTrigger>
            <SelectContent>{sections.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
       <div className="w-52">
  <Label>Exam Name</Label>

  <Select
    value={examName}
    onValueChange={(value) => {
      setExamName(value);
      setData(null);
    }}
  >
    <SelectTrigger className="mt-1">
      <SelectValue placeholder="Select exam" />
    </SelectTrigger>

    <SelectContent>
      {EXAM_OPTIONS.map((exam) => (
        <SelectItem key={exam} value={exam}>
          {exam}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
</div>
        <div className="w-36">
          <Label>Academic Year</Label>
          <Input value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} className="mt-1" />
        </div>
        <Button onClick={loadResults} disabled={!classId || !sectionId || loading}>
          {loading ? "Loading…" : "Load Results"}
        </Button>
      </div>

      {loading && (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
        </div>
      )}

      {!loading && data && !data.examExists && (
        <p className="text-sm text-muted-foreground">
          No marks found yet for "{data.examName}" ({data.academicYear}) in {data.class} {data.section}. Enter them in Marks Entry first.
        </p>
      )}

      {!loading && data && data.examExists && data.rows.length > 0 && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {data.totalGraded} student{data.totalGraded === 1 ? "" : "s"} graded in {data.class} {data.section}
          </p>

          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr>
                  <th className="text-left font-medium px-3 py-2">Grade</th>
                  <th className="text-center font-medium px-3 py-2">Count</th>
                  <th className="text-center font-medium px-3 py-2">Percentage</th>
                  <th className="text-left font-medium px-3 py-2">Distribution</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((r) => (
                  <tr key={r.grade} className="border-t">
                    <td className="px-3 py-2 font-medium">{r.grade}</td>
                    <td className="px-3 py-2 text-center">{r.count}</td>
                    <td className="px-3 py-2 text-center">{r.percentage}%</td>
                    <td className="px-3 py-2">
                      <div className="w-full bg-muted rounded h-3 overflow-hidden">
                        <div
                          className={`h-full ${GRADE_COLOR[r.grade] || "bg-slate-500"}`}
                          style={{ width: `${(r.count / maxCount) * 100}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}