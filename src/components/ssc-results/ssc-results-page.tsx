import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { apiFetch } from "@/lib/api/client";
import type { User } from "@/lib/services/auth.service";

interface SectionInfo { id: string; name: string; }
interface ClassInfo { id: string; name: string; sections: SectionInfo[]; }
interface RosterStudent { id: string; rollNumber: number | null; name: string; }

interface ConsolidatedRow {
  studentId: string;
  rollNumber: number | null;
  name: string;
  totalObtained: number;
  totalMax: number;
  percentage: number;
  result: "PASS" | "FAIL" | "NOT ENTERED";
}

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

function buildCertificateHtml(row: ConsolidatedRow, sectionName: string, examName: string, academicYear: string): string {
  const school = getSchoolInfo();
  const resultColor = row.result === "PASS" ? "#0a7a2f" : "#b3261e";

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>SSC Result Certificate - ${escapeHtml(row.name)}</title>
<style>
  @page { size: A4; margin: 12mm; }
  * { box-sizing: border-box; }
  body { font-family: Georgia, 'Times New Roman', serif; color: #000; margin: 0; padding: 0; }
  .sheet { border: 2.5px solid #000; padding: 30px 36px; max-width: 700px; margin: 0 auto; }
  .header { text-align: center; margin-bottom: 8px; }
  .header .trust { font-size: 11px; margin: 0; }
  .header h1 { font-size: 21px; margin: 2px 0; }
  .header p { font-size: 11px; margin: 2px 0; }
  .title-bar { text-align: center; border-top: 1.5px solid #000; border-bottom: 1.5px solid #000; padding: 6px 0; margin: 16px 0; font-weight: bold; font-size: 16px; letter-spacing: 2px; }
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 24px; font-size: 13.5px; margin-bottom: 24px; }
  .totals { text-align: center; font-size: 14px; font-weight: bold; margin-bottom: 22px; font-family: 'Courier New', Courier, monospace; }
  .result-banner { text-align: center; border: 2px solid ${resultColor}; color: ${resultColor}; font-weight: bold; font-size: 22px; letter-spacing: 4px; padding: 12px 0; margin-bottom: 30px; }
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

    <div class="title-bar">SSC RESULT CERTIFICATE — ${escapeHtml(examName.toUpperCase())}</div>

    <div class="info-grid">
      <div><b>Student Name:</b> ${escapeHtml(row.name)}</div>
      <div><b>Roll No:</b> ${escapeHtml(row.rollNumber)}</div>
      <div><b>Class:</b> 10 ${escapeHtml(sectionName)}</div>
      <div><b>Academic Year:</b> ${escapeHtml(academicYear)}</div>
    </div>

    <div class="totals">Total: ${row.totalObtained} / ${row.totalMax} &nbsp;&nbsp; Percentage: ${row.percentage}%</div>

    <div class="result-banner">${escapeHtml(row.result)}</div>

    <div class="signatures">
      <span>Class Teacher</span>
      <span>Examination In-Charge</span>
      <span>Principal</span>
    </div>
  </div>
</body>
</html>`;
}

export function SscResultsPage() {
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [class10Id, setClass10Id] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [sectionStudents, setSectionStudents] = useState<RosterStudent[]>([]);
  const [sectionStudentsLoading, setSectionStudentsLoading] = useState(false);
  const [rollNo, setRollNo] = useState("");
const [examName, setExamName] = useState("");

const examOptions = [
  "Unit Test 1",
  "Half Yearly Examination",
  "Unit Test 2",
  "Final Examination",
  "Annual Examination",
  "Board Examination",
];
  const [academicYear, setAcademicYear] = useState(defaultAcademicYear());

  const [result, setResult] = useState<ConsolidatedRow | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    apiFetch<{ data: ClassInfo[] }>("/classes")
      .then((res) => {
        setClasses(res.data || []);
        const ten = (res.data || []).find((c) => {
          const norm = c.name.toLowerCase().replace(/class|grade|std\.?/g, "").trim();
          return norm.match(/\d+/)?.[0] === "10";
        });
        if (ten) setClass10Id(ten.id);
      })
      .catch(() => toast.error("Failed to load classes"));
  }, []);

  const class10 = classes.find((c) => c.id === class10Id);
  const sections = class10?.sections || [];

  useEffect(() => {
    if (!class10Id || !sectionId) { setSectionStudents([]); return; }
    setSectionStudentsLoading(true);
    apiFetch<{ data: any[] }>(`/students?classId=${class10Id}&sectionId=${sectionId}&limit=500&sortBy=rollNumber&sortOrder=asc`)
      .then((res) => {
        setSectionStudents((res.data || []).map((s) => ({
          id: s.id,
          rollNumber: s.rollNumber,
          name: [s.firstName, s.middleName, s.lastName].filter(Boolean).join(" "),
        })));
      })
      .catch(() => toast.error("Failed to load students for this section"))
      .finally(() => setSectionStudentsLoading(false));
  }, [class10Id, sectionId]);

  async function loadResult() {
    if (!class10Id || !sectionId) { toast.error("Select a Section first"); return; }
    if (!rollNo) { toast.error("Select a Roll No first"); return; }
    if (!examName.trim()) { toast.error("Select an exam"); return; }

    setLoading(true);
    setResult(null);
    try {
      const query = new URLSearchParams({ classId: class10Id, sectionId, examName: examName.trim(), academicYear });
      const res = await apiFetch<{ data: { results: ConsolidatedRow[] } }>(`/marks/consolidated-results?${query}`);
      const match = res.data.results.find((r) => String(r.rollNumber) === rollNo);

      if (!match || match.result === "NOT ENTERED") {
        toast.error("No marks found for this student under this exam — enter them in Marks Entry first");
        return;
      }
      setResult(match);
    } catch (err: any) {
      toast.error(err?.message || "Failed to load result");
    } finally {
      setLoading(false);
    }
  }

  function handlePrint() {
    if (!result) return;
    const sectionName = sections.find((s) => s.id === sectionId)?.name || "";
    const printWindow = window.open("", "_blank", "width=850,height=1100");
    if (!printWindow) { toast.error("Please allow pop-ups to print the certificate"); return; }
    printWindow.document.open();
    printWindow.document.write(buildCertificateHtml(result, sectionName, examName.trim(), academicYear));
    printWindow.document.close();
    printWindow.onload = () => { printWindow.focus(); printWindow.print(); };
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">SSC Results</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Pick the Class 10 section and Roll No — the student's result fills in from Marks Entry automatically.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-4 rounded-lg border p-4">
        <div className="w-48">
          <Label>Class</Label>
          <Select value={class10Id} disabled>
            <SelectTrigger className="mt-1"><SelectValue placeholder={class10 ? class10.name : "Class 10"} /></SelectTrigger>
            <SelectContent>{class10 && <SelectItem value={class10.id}>{class10.name}</SelectItem>}</SelectContent>
          </Select>
        </div>

        <div className="w-40">
          <Label>Section</Label>
          <Select value={sectionId} onValueChange={(v) => { setSectionId(v); setRollNo(""); setResult(null); }}>
            <SelectTrigger className="mt-1"><SelectValue placeholder="Select section" /></SelectTrigger>
            <SelectContent>{sections.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>

        <div className="w-56">
          <Label>Roll No</Label>
          <Select
            value={rollNo}
            onValueChange={(v) => { setRollNo(v); setResult(null); }}
            disabled={!sectionId || sectionStudentsLoading}
          >
            <SelectTrigger className="mt-1">
              <SelectValue placeholder={sectionStudentsLoading ? "Loading…" : "Select roll no"} />
            </SelectTrigger>
            <SelectContent>
              {sectionStudents.map((s) => (
                <SelectItem key={s.id} value={String(s.rollNumber ?? "")}>
                  #{s.rollNumber ?? "-"} — {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

       <div className="w-56">
  <Label>Exam</Label>

  <Select
    value={examName}
    onValueChange={(value) => {
      setExamName(value);
      setResult(null);
    }}
  >
    <SelectTrigger className="mt-1">
      <SelectValue placeholder="Select Exam" />
    </SelectTrigger>

    <SelectContent>
      {examOptions.map((exam) => (
        <SelectItem key={exam} value={exam}>
          {exam}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
</div>

        <div className="w-36">
          <Label>Academic Year</Label>
          <Input value={academicYear} onChange={(e) => { setAcademicYear(e.target.value); setResult(null); }} className="mt-1" />
        </div>

        <Button onClick={loadResult} disabled={loading}>
          {loading ? "Loading…" : "Load Result"}
        </Button>
      </div>

      {result && (
        <div className="rounded-lg border p-4 space-y-3">
          <div className="flex flex-wrap gap-6 text-sm">
            <span><span className="text-muted-foreground">Student:</span> {result.name}</span>
            <span><span className="text-muted-foreground">Roll No:</span> {result.rollNumber}</span>
            <span><span className="text-muted-foreground">Total:</span> {result.totalObtained} / {result.totalMax}</span>
            <span><span className="text-muted-foreground">Percentage:</span> {result.percentage}%</span>
            <span className={result.result === "PASS" ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
              {result.result}
            </span>
          </div>
          <Button onClick={handlePrint}>Print Certificate</Button>
        </div>
      )}
    </div>
  );
}