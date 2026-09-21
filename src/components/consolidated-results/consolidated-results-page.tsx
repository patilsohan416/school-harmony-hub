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
import type { User } from "@/lib/services/auth.service";


interface SectionInfo { id: string; name: string; }
interface ClassInfo { id: string; name: string; sections: SectionInfo[]; }

interface ResultRow {
  studentId: string;
  admissionNo: string;
  rollNumber: number | null;
  name: string;
  marksBySubject: Record<string, number>;
  totalObtained: number;
  totalMax: number;
  percentage: number;
  result: "PASS" | "FAIL" | "NOT ENTERED";
}

interface ConsolidatedData {
  class: string;
  section: string;
  examName: string;
  academicYear: string;
  examExists: boolean;
  subjectNames: string[];
  results: ResultRow[];
  summary: { total: number; passed: number; failed: number; notEntered: number };
}
const EXAM_OPTIONS = [
  "Unit Test 1",
  "Half Yearly Examination",
  "Unit Test 2",
  "Annual Examination",
  "Board Examination",
];

const SCHOOL_EXTRA = { trustName: "YOUR TRUST / SOCIETY NAME", udiseNo: "00000000000", board: "YOUR BOARD (e.g. State Board / CBSE)" };

function getSchoolInfo() {
  let user: Partial<User> = {};
  try { user = JSON.parse(localStorage.getItem("user") || "{}"); } catch { /* ignore */ }
  const addressParts = [user.schoolAddress, user.schoolCity, user.schoolState, user.schoolPincode].filter(Boolean).join(", ");
  return {
    trustName: SCHOOL_EXTRA.trustName,
    schoolName: user.schoolName || "YOUR SCHOOL NAME",
    address: addressParts || "YOUR SCHOOL ADDRESS, TALUKA, DISTRICT",
    phone: user.schoolPhone || "0000000000",
    email: user.schoolEmail || "school@example.com",
    udiseNo: SCHOOL_EXTRA.udiseNo,
    board: SCHOOL_EXTRA.board,
  };
}

function defaultAcademicYear() {
  const now = new Date();
  const y = now.getMonth() >= 5 ? now.getFullYear() : now.getFullYear() - 1;
  return `${y}-${String((y + 1) % 100).padStart(2, "0")}`;
}

function escapeHtml(value: unknown): string {
  const str = value === undefined || value === null || value === "" ? "-" : String(value);
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function buildCertificateHtml(data: ConsolidatedData, row: ResultRow): string {
  const school = getSchoolInfo();
  const subjectRows = data.subjectNames.map((s) => `
    <tr>
      <td>${escapeHtml(s)}</td>
      <td class="num">${escapeHtml(row.marksBySubject[s] ?? "-")}</td>
    </tr>`).join("");

  const resultColor = row.result === "PASS" ? "#0a7a2f" : "#b3261e";

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>Result Certificate - ${escapeHtml(row.name)}</title>
<style>
  @page { size: A4; margin: 12mm; }
  * { box-sizing: border-box; }
  body { font-family: Georgia, 'Times New Roman', serif; color: #000; margin: 0; padding: 0; }
  .sheet { border: 2.5px solid #000; padding: 26px 34px; max-width: 720px; margin: 0 auto; }
  .header { text-align: center; margin-bottom: 8px; }
  .header .trust { font-size: 11px; margin: 0; }
  .header h1 { font-size: 21px; margin: 2px 0; }
  .header p { font-size: 11px; margin: 2px 0; }
  .title-bar { text-align: center; border-top: 1.5px solid #000; border-bottom: 1.5px solid #000; padding: 6px 0; margin: 14px 0; font-weight: bold; font-size: 16px; letter-spacing: 2px; }
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 24px; font-size: 13px; margin-bottom: 16px; }
  table.marks { width: 100%; border-collapse: collapse; margin-bottom: 14px; table-layout: fixed; }
  table.marks col.subject { width: 65%; }
  table.marks col.num { width: 35%; }
  table.marks th, table.marks td { border: 1px solid #000; padding: 9px 10px; font-size: 12.5px; line-height: 1.3; vertical-align: middle; }
  table.marks th { background: #f0f0f0; text-align: left; font-weight: bold; }
  table.marks td.num, table.marks th.num { text-align: center; font-family: 'Courier New', Courier, monospace; }
  .totals { display: flex; justify-content: space-between; font-size: 13px; font-weight: bold; margin-bottom: 20px; padding: 0 4px; font-family: 'Courier New', Courier, monospace; }
  .result-banner { text-align: center; border: 2px solid ${resultColor}; color: ${resultColor}; font-weight: bold; font-size: 20px; letter-spacing: 3px; padding: 10px 0; margin-bottom: 26px; }
  .signatures { display: flex; justify-content: space-between; font-size: 11px; margin-top: 40px; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style>
</head>
<body>
  <div class="sheet">
    <div class="header">
      <p class="trust">${escapeHtml(school.trustName)}</p>
      <h1>${escapeHtml(school.schoolName)}</h1>
      <p>${escapeHtml(school.address)}</p>
      <p>Phone: ${escapeHtml(school.phone)} &nbsp; Email: ${escapeHtml(school.email)}</p>
    </div>

    <div class="title-bar">RESULT CERTIFICATE — ${escapeHtml(data.examName.toUpperCase())}</div>

    <div class="info-grid">
      <div><b>Student Name:</b> ${escapeHtml(row.name)}</div>
      <div><b>Admission No:</b> ${escapeHtml(row.admissionNo)}</div>
      <div><b>Class:</b> ${escapeHtml(data.class)} ${escapeHtml(data.section)}</div>
      <div><b>Roll No:</b> ${escapeHtml(row.rollNumber)}</div>
      <div><b>Academic Year:</b> ${escapeHtml(data.academicYear)}</div>
    </div>

    <table class="marks">
      <colgroup><col class="subject" /><col class="num" /></colgroup>
      <thead><tr><th>Subject</th><th class="num">Marks Obtained</th></tr></thead>
      <tbody>${subjectRows}</tbody>
    </table>

    <div class="totals">
      <span>Total: ${row.totalObtained} / ${row.totalMax}</span>
      <span>Percentage: ${row.percentage}%</span>
    </div>

    <div class="result-banner">${row.result}</div>

    <div class="signatures">
      <span>Class Teacher</span>
      <span>Examination In-Charge</span>
      <span>Principal</span>
    </div>
  </div>
</body>
</html>`;
}

export function ConsolidatedResultsPage() {
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [classId, setClassId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [examName, setExamName] = useState("");
  const [academicYear, setAcademicYear] = useState(defaultAcademicYear());

  const [data, setData] = useState<ConsolidatedData | null>(null);
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
      const res = await apiFetch<{ data: ConsolidatedData }>(`/marks/consolidated-results?${query}`);
      setData(res.data);
      if (!res.data.examExists) {
        toast.info("No marks found yet for this class/exam — enter them in Marks Entry first");
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to load consolidated results");
    } finally {
      setLoading(false);
    }
  }

  function handlePrintCertificate(row: ResultRow) {
    if (!data) return;
    const printWindow = window.open("", "_blank", "width=850,height=1100");
    if (!printWindow) { toast.error("Please allow pop-ups to print the certificate"); return; }
    printWindow.document.open();
    printWindow.document.write(buildCertificateHtml(data, row));
    printWindow.document.close();
    printWindow.onload = () => { printWindow.focus(); printWindow.print(); };
  }

  const resultColor: Record<string, string> = {
    PASS: "text-green-600 font-medium",
    FAIL: "text-red-600 font-medium",
    "NOT ENTERED": "text-muted-foreground",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Consolidated Results</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Whole-class results for an exam, pulled straight from Marks Entry — print a Result Certificate for any student.
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
    onValueChange={(v) => {
      setExamName(v);
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

      {!loading && data && data.examExists && (
        <div className="space-y-4">
          <div className="flex gap-6 text-sm rounded-lg border p-4">
            <span>Total: <b>{data.summary.total}</b></span>
            <span className="text-green-600">Passed: <b>{data.summary.passed}</b></span>
            <span className="text-red-600">Failed: <b>{data.summary.failed}</b></span>
            {data.summary.notEntered > 0 && (
              <span className="text-muted-foreground">Not Entered: <b>{data.summary.notEntered}</b></span>
            )}
          </div>

          <div className="rounded-lg border overflow-hidden overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr>
                  <th className="text-left font-medium px-3 py-2">Roll No</th>
                  <th className="text-left font-medium px-3 py-2">Student</th>
                  <th className="text-center font-medium px-3 py-2">Total</th>
                  <th className="text-center font-medium px-3 py-2">%</th>
                  <th className="text-center font-medium px-3 py-2">Result</th>
                  <th className="text-left font-medium px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.results.map((r) => (
                  <tr key={r.studentId} className="border-t">
                    <td className="px-3 py-2">{r.rollNumber ?? "-"}</td>
                    <td className="px-3 py-2">{r.name}</td>
                    <td className="px-3 py-2 text-center">
                      {r.result === "NOT ENTERED" ? "-" : `${r.totalObtained} / ${r.totalMax}`}
                    </td>
                    <td className="px-3 py-2 text-center">{r.result === "NOT ENTERED" ? "-" : `${r.percentage}%`}</td>
                    <td className={`px-3 py-2 text-center ${resultColor[r.result]}`}>{r.result}</td>
                    <td className="px-3 py-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={r.result === "NOT ENTERED"}
                        onClick={() => handlePrintCertificate(r)}
                      >
                        Print Certificate
                      </Button>
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