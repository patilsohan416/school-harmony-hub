import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api/client";
const ICSE_EXAM_OPTIONS = [
  "Unit Test 1",
  "Half Yearly Examination",
  "Unit Test 2",
  "Preliminary Examination 1",
  "Preliminary Examination 2",
  "Final Examination",
  "Annual Examination",
  "ICSE Board Examination",
];

interface ResultRow {
  subject: string;
  class: string;
  studentCount: number;
  average: number;
  highest: number;
  lowest: number;
}

interface SubjectWiseData {
  examName: string;
  academicYear: string;
  examExists: boolean;
  rows: ResultRow[];
}

function defaultAcademicYear() {
  const now = new Date();
  const y = now.getMonth() >= 5 ? now.getFullYear() : now.getFullYear() - 1;
  return `${y}-${String((y + 1) % 100).padStart(2, "0")}`;
}

export function IcseSubjectWiseResultsPage() {
  const [examName, setExamName] = useState("");
  const [academicYear, setAcademicYear] = useState(defaultAcademicYear());
  const [data, setData] = useState<SubjectWiseData | null>(null);
  const [loading, setLoading] = useState(false);

  async function loadResults() {
    if (!examName.trim()) { toast.error("Enter an Exam name (e.g. Prelim 1)"); return; }

    setLoading(true);
    setData(null);
    try {
      const query = new URLSearchParams({ examName: examName.trim(), academicYear });
      const res = await apiFetch<{ data: SubjectWiseData }>(`/icse-marks/subject-wise-results?${query}`);
      setData(res.data);
      if (!res.data.examExists) {
        toast.info("No ICSE marks found yet for this exam in any class — enter them in ICSE Marks Entry first");
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to load subject-wise results");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">ICSE Subject-wise Results</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Average, highest, and lowest marks per subject, across every ICSE class and section — pulled from ICSE Marks Entry.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-4 rounded-lg border p-4">
       <div className="w-64">
  <Label>Exam Name</Label>

  <select
    value={examName}
    onChange={(e) => setExamName(e.target.value)}
    className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
  >
    <option value="">Select Exam</option>

    {ICSE_EXAM_OPTIONS.map((exam) => (
      <option key={exam} value={exam}>
        {exam}
      </option>
    ))}
  </select>
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

      {!loading && data && !data.examExists && (
        <p className="text-sm text-muted-foreground">
          No ICSE marks found yet for "{data.examName}" ({data.academicYear}) in any class. Enter them in ICSE Marks Entry first.
        </p>
      )}

      {!loading && data && data.examExists && data.rows.length > 0 && (
        <div className="rounded-lg border overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr>
                <th className="text-left font-medium px-3 py-2">Subject</th>
                <th className="text-left font-medium px-3 py-2">Class</th>
                <th className="text-center font-medium px-3 py-2">Students</th>
                <th className="text-center font-medium px-3 py-2">Average</th>
                <th className="text-center font-medium px-3 py-2">Highest</th>
                <th className="text-center font-medium px-3 py-2">Lowest</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((r) => (
                <tr key={`${r.subject}__${r.class}`} className="border-t">
                  <td className="px-3 py-2">{r.subject}</td>
                  <td className="px-3 py-2">{r.class}</td>
                  <td className="px-3 py-2 text-center">{r.studentCount}</td>
                  <td className="px-3 py-2 text-center">{r.average}</td>
                  <td className="px-3 py-2 text-center text-green-600">{r.highest}</td>
                  <td className="px-3 py-2 text-center text-red-600">{r.lowest}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}