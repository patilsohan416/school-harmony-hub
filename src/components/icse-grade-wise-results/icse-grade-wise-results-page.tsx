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

const ALL_CLASSES = "__all__";
const ALL_SECTIONS = "__all__";

interface SectionInfo { id: string; name: string; }
interface ClassInfo { id: string; name: string; sections: SectionInfo[]; }

interface GradeRow { grade: string; count: number; percentage: number; }
interface GradeWiseData {
  examName: string;
  academicYear: string;
  examExists: boolean;
  rows: GradeRow[];
  totalGraded: number;
  classesCovered: number;
}

function defaultAcademicYear() {
  const now = new Date();
  const y = now.getMonth() >= 5 ? now.getFullYear() : now.getFullYear() - 1;
  return `${y}-${String((y + 1) % 100).padStart(2, "0")}`;
}

const GRADE_COLOR: Record<string, string> = {
  "A+": "bg-green-600", "A": "bg-green-500", "B+": "bg-lime-500", "B": "bg-yellow-500",
  "C": "bg-amber-500", "D": "bg-orange-500", "E": "bg-red-500",
};

export function IcseGradeWiseResultsPage() {
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [classId, setClassId] = useState(ALL_CLASSES);
  const [sectionId, setSectionId] = useState(ALL_SECTIONS);
  const [examName, setExamName] = useState("");
  const [academicYear, setAcademicYear] = useState(defaultAcademicYear());

  const [data, setData] = useState<GradeWiseData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    apiFetch<{ data: ClassInfo[] }>("/classes")
      .then((res) => setClasses(res.data || []))
      .catch(() => toast.error("Failed to load classes"));
  }, []);

  const sections = useMemo(
    () => classes.find((c) => c.id === classId)?.sections || [],
    [classes, classId]
  );

  async function loadResults() {
    if (!examName.trim()) { toast.error("Enter an Exam name (e.g. Final Exam)"); return; }

    setLoading(true);
    setData(null);
    try {
      const query = new URLSearchParams({ examName: examName.trim(), academicYear });
      if (classId !== ALL_CLASSES) query.set("classId", classId);
      if (classId !== ALL_CLASSES && sectionId !== ALL_SECTIONS) query.set("sectionId", sectionId);

      const res = await apiFetch<{ data: GradeWiseData }>(`/icse-marks/grade-wise-results?${query}`);
      setData(res.data);
      if (!res.data.examExists) {
        toast.info("No ICSE marks found yet for this exam — enter them in ICSE Marks Entry first");
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
        <h1 className="text-2xl font-bold">ICSE Grade-wise Results</h1>
        <p className="text-sm text-muted-foreground mt-1">
          How many students landed in each grade for an exam — computed the same way ICSE Progress Report grades each student. Leave Class/Section on "All" to combine every class and section.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-4 rounded-lg border p-4">
        <div className="w-44">
          <Label>Class</Label>
          <Select
            value={classId}
            onValueChange={(v) => { setClassId(v); setSectionId(ALL_SECTIONS); setData(null); }}
          >
            <SelectTrigger className="mt-1"><SelectValue placeholder="Select class" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_CLASSES}>All Classes</SelectItem>
              {classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="w-40">
          <Label>Section</Label>
          <Select
            value={sectionId}
            onValueChange={(v) => { setSectionId(v); setData(null); }}
            disabled={classId === ALL_CLASSES}
          >
            <SelectTrigger className="mt-1"><SelectValue placeholder="Select section" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_SECTIONS}>All Sections</SelectItem>
              {sections.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
       <div className="w-64">
  <Label>Exam Name</Label>

  <Select
    value={examName}
    onValueChange={(value) => {
      setExamName(value);
      setData(null);
    }}
  >
    <SelectTrigger className="mt-1 w-full">
      <SelectValue placeholder="Select exam" />
    </SelectTrigger>

    <SelectContent>
      <SelectItem value="Unit Test 1">
        Unit Test 1
      </SelectItem>

      <SelectItem value="Half Yearly Examination">
        Half Yearly Examination
      </SelectItem>

      <SelectItem value="Unit Test 2">
        Unit Test 2
      </SelectItem>

      <SelectItem value="Preliminary Examination 1">
        Preliminary Examination 1
      </SelectItem>

      <SelectItem value="Preliminary Examination 2">
        Preliminary Examination 2
      </SelectItem>

      <SelectItem value="Annual Examination">
        Annual Examination
      </SelectItem>

      <SelectItem value="ICSE Board Examination">
        ICSE Board Examination
      </SelectItem>
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
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
        </div>
      )}

      {!loading && data && !data.examExists && (
        <p className="text-sm text-muted-foreground">
          No ICSE marks found yet for "{data.examName}" ({data.academicYear}). Enter them in ICSE Marks Entry first.
        </p>
      )}

      {!loading && data && data.examExists && data.rows.length > 0 && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {data.totalGraded} student{data.totalGraded === 1 ? "" : "s"} graded across {data.classesCovered} class{data.classesCovered === 1 ? "" : "es"}/section{data.classesCovered === 1 ? "" : "s"}
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