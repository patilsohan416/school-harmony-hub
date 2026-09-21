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

interface ResultRow {
  studentId: string;
  name: string;
  admissionNo: string;
  rollNumber: number | null;
  class: string;
  percentage: number;
  result: "PASS" | "FAIL";
}

interface ClassChecked {
  class: string;
  section: string;
  studentsInSection: number;
  examFound: boolean;
}

interface Grade58Data {
  examName: string;
  academicYear: string;
  examExists: boolean;
  results: ResultRow[];
  classesChecked: ClassChecked[];
  allClassNames: string[];
  summary: { total: number; passed: number; failed: number };
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

function parseGrade(className: string): number | null {
  const norm = className.toLowerCase().replace(/class|grade|std\.?/g, "").trim();
  const m = norm.match(/\d+/);
  return m ? parseInt(m[0], 10) : null;
}

export function Grade58ResultsPage() {
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [classId, setClassId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [examName, setExamName] = useState("");
  const [academicYear, setAcademicYear] = useState(defaultAcademicYear());

  const [data, setData] = useState<Grade58Data | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState("");

  useEffect(() => {
    apiFetch<{ data: ClassInfo[] }>("/classes")
      .then((res) => setClasses(res.data || []))
      .catch(() => toast.error("Failed to load classes"));
  }, []);

  // Only Grade 5 / Grade 8 classes show up here — this page is scoped to
  // those two by design, so there's nothing else to pick from.
  const grade58Classes = useMemo(
    () => classes.filter((c) => { const g = parseGrade(c.name); return g === 5 || g === 8 || g === 9 || g === 10; }),
    [classes]
  );
  const sections = classId ? grade58Classes.find((c) => c.id === classId)?.sections || [] : [];

  async function loadResults() {
    if (!examName.trim()) { toast.error("Enter an Exam name (e.g. Final Exam)"); return; }

    setLoading(true);
    setData(null);
    setSelectedStudentId("");
    try {
      const query = new URLSearchParams({ examName: examName.trim(), academicYear });
      const res = await apiFetch<{ data: Grade58Data }>(`/marks/grade-5-8-results?${query}`);
      setData(res.data);
      if (res.data.results.length === 0) {
        toast.info("No student results found yet — see the breakdown below for what's missing");
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to load results");
    } finally {
      setLoading(false);
    }
  }

  // Class/Section here narrow down the already-combined data for display —
  // the backend always fetches both grades, every section, in one call.
  const filteredResults = useMemo(() => {
    if (!data) return [];
    const selectedClassName = classes.find((c) => c.id === classId)?.name;
    const selectedSectionName = sections.find((s) => s.id === sectionId)?.name;

    return data.results.filter((r) => {
      if (selectedClassName && !r.class.startsWith(selectedClassName)) return false;
      if (selectedSectionName && !r.class.endsWith(`- ${selectedSectionName}`)) return false;
      return true;
    });
  }, [data, classId, sectionId, classes, sections]);

  const rollOrdered = useMemo(
    () => [...filteredResults].sort((a, b) => a.class.localeCompare(b.class) || (a.rollNumber ?? 0) - (b.rollNumber ?? 0)),
    [filteredResults]
  );

  const selectedStudent = rollOrdered.find((r) => r.studentId === selectedStudentId) || null;

  const summary = useMemo(() => ({
    total: filteredResults.length,
    passed: filteredResults.filter((r) => r.result === "PASS").length,
    failed: filteredResults.filter((r) => r.result === "FAIL").length,
  }), [filteredResults]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Grade 5, 8, 9 & 10 Results</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Combined Pass/Fail results across every section of Grade 5, 8, 9, and 10, pulled from Marks Entry.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-4 rounded-lg border p-4">
        <div className="w-48">
          <Label>Class</Label>
          <Select
            value={classId || "all"}
            onValueChange={(v) => { setClassId(v === "all" ? "" : v); setSectionId(""); }}
          >
            <SelectTrigger className="mt-1"><SelectValue placeholder="Select class" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All (5, 8, 9 & 10)</SelectItem>
              {grade58Classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="w-44">
          <Label>Section</Label>
          <Select value={sectionId || "all"} onValueChange={(v) => setSectionId(v === "all" ? "" : v)} disabled={!classId}>
            <SelectTrigger className="mt-1"><SelectValue placeholder="Select section" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All sections</SelectItem>
              {sections.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

       <div className="w-56">
  <Label>Exam Name</Label>

  <Select
    value={examName}
    onValueChange={(value) => {
      setExamName(value);
      setData(null);
      setSelectedStudentId("");
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

        <Button onClick={loadResults} disabled={loading}>
          {loading ? "Loading…" : "Load Results"}
        </Button>
      </div>

      {loading && (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
        </div>
      )}

      {!loading && data && filteredResults.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No results found for "{data.examName}" ({data.academicYear}) with these filters. Enter marks in Marks Entry first.
        </p>
      )}

      {!loading && data && filteredResults.length > 0 && (
        <div className="space-y-4">
          <div className="flex gap-6 text-sm rounded-lg border p-4">
            <span>Total: <b>{summary.total}</b></span>
            <span className="text-green-600">Passed: <b>{summary.passed}</b></span>
            <span className="text-red-600">Failed: <b>{summary.failed}</b></span>
          </div>

          <div className="rounded-lg border p-4">
            <Label>Find a student (by roll number)</Label>
            <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Select a student" /></SelectTrigger>
              <SelectContent>
                {rollOrdered.map((r) => (
                  <SelectItem key={r.studentId} value={r.studentId}>
                    {r.class} — Roll #{r.rollNumber ?? "-"} — {r.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedStudent && (
              <div className="mt-3 flex gap-6 text-sm border-t pt-3">
                <span><span className="text-muted-foreground">Class:</span> {selectedStudent.class}</span>
                <span><span className="text-muted-foreground">Roll No:</span> {selectedStudent.rollNumber ?? "-"}</span>
                <span><span className="text-muted-foreground">Percentage:</span> {selectedStudent.percentage}%</span>
                <span className={selectedStudent.result === "PASS" ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
                  {selectedStudent.result}
                </span>
              </div>
            )}
          </div>

          <div className="rounded-lg border overflow-hidden overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr>
                  <th className="text-left font-medium px-3 py-2">Roll No</th>
                  <th className="text-left font-medium px-3 py-2">Student</th>
                  <th className="text-left font-medium px-3 py-2">Class</th>
                  <th className="text-center font-medium px-3 py-2">Percentage</th>
                  <th className="text-center font-medium px-3 py-2">Result</th>
                </tr>
              </thead>
              <tbody>
                {rollOrdered.map((r) => (
                  <tr key={r.studentId} className="border-t">
                    <td className="px-3 py-2">{r.rollNumber ?? "-"}</td>
                    <td className="px-3 py-2">{r.name}</td>
                    <td className="px-3 py-2">{r.class}</td>
                    <td className="px-3 py-2 text-center">{r.percentage}%</td>
                    <td className={`px-3 py-2 text-center font-medium ${r.result === "PASS" ? "text-green-600" : "text-red-600"}`}>
                      {r.result}
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