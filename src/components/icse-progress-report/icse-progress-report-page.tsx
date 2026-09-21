import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ChevronsUpDown, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api/client";
import { createCrudService, type Record_ } from "@/lib/services/crud.service";
import type { User } from "@/lib/services/auth.service";
import { cn } from "@/lib/utils";
import { classifyClass, bandLabel, passPercentageForBand, groupLabelForSubject, parseVirtualSubject, isUnitTestExam } from "@/lib/icse-curriculum";

const commentService = createCrudService<Record_>("icse-progress-report-comments");

interface SectionInfo { id: string; name: string; }
interface ClassInfo { id: string; name: string; sections: SectionInfo[]; }
interface StudentOption { id: string; name: string; admissionNo: string; rollNumber: number | null; }

interface SubjectMark { name: string; obtained: number; max: number; }
export interface ProgressReport {
  student: { id: string; admissionNo: string; rollNumber: number | null; name: string; className: string; sectionName: string; };
  examName: string;
  academicYear: string;
  examExists: boolean;
  subjects: SubjectMark[];
  totalObtained: number;
  totalMax: number;
  overallPercentage: number;
  attendance: { present: number; total: number; percentage: number | null };
}
const EXAM_OPTIONS = [
  "Unit Test 1",
  "Half Yearly Examination",
  "Unit Test 2",
  "Preliminary Examination 1",
  "Preliminary Examination 2",
  "Final Examination",
  "Annual Examination",
  "ICSE Board Examination",
];
const SCHOOL_EXTRA = {
  trustName: "YOUR TRUST / SOCIETY NAME",
  udiseNo: "00000000000",
  board: "YOUR BOARD (e.g. State Board / CBSE)",
};

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

export function grade(pct: number): string {
  if (pct >= 90) return "A+";
  if (pct >= 80) return "A";
  if (pct >= 70) return "B+";
  if (pct >= 60) return "B";
  if (pct >= 50) return "C";
  if (pct >= 35) return "D";
  return "E";
}

export interface GroupedSubject {
  subject: string;
  groupLabel: string | null;
  components: { label: string; obtained: number; max: number }[];
  obtained: number;
  max: number;
}

/** Groups flat "Subject — Component" mark rows back into per-subject
 * cards with a component breakdown and subject subtotal, in first-seen
 * order. Rows with no " — " separator are treated as a single-component
 * subject (component label omitted). */
export function groupSubjects(subjects: SubjectMark[], band: ReturnType<typeof classifyClass>): GroupedSubject[] {
  const order: string[] = [];
  const map = new Map<string, GroupedSubject>();
  for (const s of subjects) {
    const { subject, component } = parseVirtualSubject(s.name);
    if (!map.has(subject)) {
      map.set(subject, { subject, groupLabel: groupLabelForSubject(band, subject), components: [], obtained: 0, max: 0 });
      order.push(subject);
    }
    const g = map.get(subject)!;
    g.components.push({ label: component ?? "Marks", obtained: s.obtained, max: s.max });
    g.obtained += s.obtained;
    g.max += s.max;
  }
  return order.map((name) => map.get(name)!);
}

export function buildReportHtml(report: ProgressReport, comment: string): string {
  const school = getSchoolInfo();
  const band = classifyClass(report.student.className);
  const passPct = passPercentageForBand(band);
  const isPrimary = band === "primary-lower" || band === "primary-upper";
  const grouped = groupSubjects(report.subjects, band);

  const rows = grouped.map((g) => {
    const pct = g.max > 0 ? Math.round((g.obtained / g.max) * 10000) / 100 : 0;
    const componentLines = g.components.length > 1
      ? g.components.map((c) => `${escapeHtml(c.label)}: ${escapeHtml(c.obtained)}/${escapeHtml(c.max)}`).join(" &nbsp;•&nbsp; ")
      : "";
    return `
    <tr>
      <td>
        <div>${escapeHtml(g.subject)}${g.groupLabel ? ` <span class="group-tag">(${escapeHtml(g.groupLabel)})</span>` : ""}</div>
        ${componentLines ? `<div class="component-line">${componentLines}</div>` : ""}
      </td>
      <td class="num">${escapeHtml(g.max)}</td>
      <td class="num">${escapeHtml(g.obtained)}</td>
      <td class="num">${pct}%</td>
      <td class="num">${grade(pct)}</td>
    </tr>`;
  }).join("");

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>Progress Report - ${escapeHtml(report.student.name)}</title>
<style>
  @page { size: A4; margin: 12mm; }
  * { box-sizing: border-box; }
  body { font-family: Georgia, 'Times New Roman', serif; color: #000; margin: 0; padding: 0; }
  .sheet { border: 2.5px solid #000; padding: 24px 32px; max-width: 780px; margin: 0 auto; }
  .header { text-align: center; margin-bottom: 8px; }
  .header .trust { font-size: 11px; margin: 0; }
  .header h1 { font-size: 21px; margin: 2px 0; }
  .header p { font-size: 11px; margin: 2px 0; }
  .title-bar { text-align: center; border-top: 1.5px solid #000; border-bottom: 1.5px solid #000; padding: 6px 0; margin: 14px 0; font-weight: bold; font-size: 16px; letter-spacing: 2px; }
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 24px; font-size: 13px; margin-bottom: 16px; }
  table.marks { width: 100%; border-collapse: collapse; margin-bottom: 14px; table-layout: fixed; }
  table.marks col.subject { width: 34%; }
  table.marks col.num { width: 16.5%; }
  table.marks th, table.marks td {
    border: 1px solid #000;
    padding: 9px 10px;
    font-size: 12.5px;
    line-height: 1.3;
    vertical-align: middle;
    font-weight: normal;
  }
  table.marks th { background: #f0f0f0; text-align: left; font-weight: bold; }
  table.marks td.num, table.marks th.num {
    text-align: center;
    font-family: 'Courier New', Courier, monospace;
    white-space: nowrap;
  }
  table.marks tfoot td { font-weight: bold; background: #fafafa; }
  .group-tag { font-size: 10.5px; color: #444; font-weight: normal; }
  .component-line { font-size: 10.5px; color: #444; margin-top: 2px; font-family: 'Courier New', Courier, monospace; }
  .pass-note { text-align: center; font-size: 11px; color: #444; margin: -6px 0 12px; }
  .totals {
    display: flex;
    justify-content: space-between;
    font-size: 13px;
    font-weight: bold;
    margin-bottom: 16px;
    padding: 0 4px;
    font-family: 'Courier New', Courier, monospace;
  }
  .attendance-comment { display: flex; gap: 24px; font-size: 12.5px; margin-bottom: 24px; }
  .attendance-comment .box { flex: 1; border: 1px solid #999; padding: 10px 12px; min-height: 60px; }
  .attendance-comment .box b { display: block; margin-bottom: 4px; }
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

    <div class="title-bar">PROGRESS REPORT — ${escapeHtml(report.examName.toUpperCase())}</div>
    ${(passPct !== null || isPrimary) ? `<div class="pass-note">${escapeHtml(bandLabel(band))}${passPct !== null ? ` &nbsp;•&nbsp; Pass mark: ${passPct}% per subject` : ""}${isPrimary ? ` &nbsp;•&nbsp; ${isUnitTestExam(report.examName) ? "Unit Exams/Class Tests (20)" : "Half-Yearly &amp; Annual Exam (80)"}` : ""}</div>` : ""}

    <div class="info-grid">
      <div><b>Student Name:</b> ${escapeHtml(report.student.name)}</div>
      <div><b>Admission No:</b> ${escapeHtml(report.student.admissionNo)}</div>
      <div><b>Class:</b> ${escapeHtml(report.student.className)} ${escapeHtml(report.student.sectionName)}</div>
      <div><b>Roll No:</b> ${escapeHtml(report.student.rollNumber)}</div>
      <div><b>Academic Year:</b> ${escapeHtml(report.academicYear)}</div>
    </div>

    <table class="marks">
      <colgroup>
        <col class="subject" />
        <col class="num" /><col class="num" /><col class="num" /><col class="num" />
      </colgroup>
      <thead>
        <tr><th>Subject</th><th class="num">Max Marks</th><th class="num">Marks Obtained</th><th class="num">%</th><th class="num">Grade</th></tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>

    <div class="totals">
      <span>Total: ${report.totalObtained} / ${report.totalMax}</span>
      <span>Overall Percentage: ${report.overallPercentage}%</span>
      <span>Overall Grade: ${grade(report.overallPercentage)}</span>
    </div>

    <div class="attendance-comment">
      <div class="box">
        <b>Attendance</b>
        ${report.attendance.percentage !== null
          ? `${report.attendance.present} / ${report.attendance.total} days present (${report.attendance.percentage}%)`
          : "No attendance recorded for this academic year"}
      </div>
      <div class="box">
        <b>Teacher's Comment</b>
        ${escapeHtml(comment || "-")}
      </div>
    </div>

    <div class="signatures">
      <span>Class Teacher</span>
      <span>Parent/Guardian</span>
      <span>Principal</span>
    </div>
  </div>
</body>
</html>`;
}

export function IcseProgressReportPage() {
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [classId, setClassId] = useState("");
  const [classPickerOpen, setClassPickerOpen] = useState(false);
  const [sectionId, setSectionId] = useState("");
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [studentId, setStudentId] = useState("");
  const [examName, setExamName] = useState("");
  const [academicYear, setAcademicYear] = useState(defaultAcademicYear());
  const [comment, setComment] = useState("");

  const [report, setReport] = useState<ProgressReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    apiFetch<{ data: ClassInfo[] }>("/classes")
      .then((res) => setClasses(res.data || []))
      .catch(() => toast.error("Failed to load classes"));
  }, []);

  const sections = useMemo(() => classes.find((c) => c.id === classId)?.sections || [], [classes, classId]);

  useEffect(() => {
    if (!classId || !sectionId) { setStudents([]); return; }
    apiFetch<{ data: any[] }>(`/students?classId=${classId}&sectionId=${sectionId}&limit=500&sortBy=rollNumber&sortOrder=asc`)
      .then((res) => {
        setStudents((res.data || []).map((s) => ({
          id: s.id,
          admissionNo: s.admissionNo,
          rollNumber: s.rollNumber,
          name: [s.firstName, s.middleName, s.lastName].filter(Boolean).join(" "),
        })));
      })
      .catch(() => toast.error("Failed to load students"));
  }, [classId, sectionId]);

  async function loadReport() {
    if (!studentId) { toast.error("Select a student"); return; }
    if (!examName.trim()) { toast.error("Enter an Exam name (e.g. Unit Test 1, Preliminary Examination 1)"); return; }

    setLoading(true);
    setReport(null);
    try {
      const query = new URLSearchParams({ studentId, examName: examName.trim(), academicYear });
      const res = await apiFetch<{ data: ProgressReport }>(`/icse-marks/progress-report?${query}`);
      setReport(res.data);

      if (!res.data.examExists) {
        toast.info("No ICSE marks found yet for this student/exam — enter them in ICSE Marks Entry first");
      }

      try {
        const key = `${studentId}__${examName.trim()}__${academicYear}`;
        const existing = await commentService.list({ pageSize: 500 });
        const match = (existing.rows as any[]).find((r) => r.key === key);
        setComment(match?.comment || "");
      } catch {
        setComment("");
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to load progress report");
    } finally {
      setLoading(false);
    }
  }

  async function saveComment() {
    if (!report) return;
    const key = `${studentId}__${examName.trim()}__${academicYear}`;
    try {
      const existing = await commentService.list({ pageSize: 500 });
      const match = (existing.rows as any[]).find((r) => r.key === key);
      const payload = { key, studentId, examName: examName.trim(), academicYear, comment };
      if (match) await commentService.update(match.id, payload);
      else await commentService.create(payload);
      toast.success("Comment saved");
    } catch (err: any) {
      toast.error(err?.message || "Failed to save comment");
    }
  }

  function handlePrint() {
    if (!report) return;
    const printWindow = window.open("", "_blank", "width=850,height=1100");
    if (!printWindow) { toast.error("Please allow pop-ups to print the report"); return; }
    printWindow.document.open();
    printWindow.document.write(buildReportHtml(report, comment));
    printWindow.document.close();
    printWindow.onload = () => { printWindow.focus(); printWindow.print(); };
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">ICSE Progress Report</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Pulls marks from ICSE Marks Entry and attendance automatically — works for any ICSE exam.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-4 rounded-lg border p-4">
        <div className="w-44">
          <Label>Class</Label>
          <Popover open={classPickerOpen} onOpenChange={setClassPickerOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={classPickerOpen}
                className="mt-1 w-full justify-between font-normal"
              >
                {classes.find((c) => c.id === classId)?.name || "Select class"}
                <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-0">
              <Command>
                <CommandInput placeholder="Search class…" />
                <CommandList>
                  <CommandEmpty>No class found.</CommandEmpty>
                  <CommandGroup>
                    {classes.map((c) => (
                      <CommandItem
                        key={c.id}
                        value={c.name}
                        onSelect={() => {
                          setClassId(c.id);
                          setSectionId("");
                          setStudentId("");
                          setReport(null);
                          setClassPickerOpen(false);
                        }}
                      >
                        <Check className={cn("mr-2 h-4 w-4", classId === c.id ? "opacity-100" : "opacity-0")} />
                        {c.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
        <div className="w-40">
          <Label>Section</Label>
          <Select value={sectionId} onValueChange={(v) => { setSectionId(v); setStudentId(""); setReport(null); }} disabled={!classId}>
            <SelectTrigger className="mt-1"><SelectValue placeholder="Select section" /></SelectTrigger>
            <SelectContent>{sections.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="w-56">
          <Label>Student</Label>
          <Select value={studentId} onValueChange={(v) => { setStudentId(v); setReport(null); }} disabled={!sectionId}>
            <SelectTrigger className="mt-1"><SelectValue placeholder="Select student" /></SelectTrigger>
            <SelectContent>
              {students.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.rollNumber ? `#${s.rollNumber} — ` : ""}{s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
       <div className="w-56">
  <Label>Exam Name</Label>

  <Select
    value={examName}
    onValueChange={(value) => {
      setExamName(value);
      setReport(null);
      setComment("");
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
        <Button onClick={loadReport} disabled={!studentId || loading}>
          {loading ? "Loading…" : "Load Report"}
        </Button>
      </div>

      {loading && (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
        </div>
      )}

      {!loading && report && (
        <div className="space-y-4">
          <div className="rounded-lg border p-4 space-y-1 text-sm">
            <p><span className="text-muted-foreground">Student:</span> {report.student.name} ({report.student.admissionNo})</p>
            <p><span className="text-muted-foreground">Class:</span> {report.student.className} {report.student.sectionName} &nbsp; <span className="text-muted-foreground">Roll No:</span> {report.student.rollNumber ?? "-"}</p>
          </div>

          {report.subjects.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No ICSE marks entered yet for "{report.examName}" ({report.academicYear}). Go to ICSE Marks Entry to add them first.
            </p>
          ) : (
            <>
              {(() => {
                const band = classifyClass(report.student.className);
                const passPct = passPercentageForBand(band);
                const isPrimary = band === "primary-lower" || band === "primary-upper";
                if (passPct === null && !isPrimary) return null;
                return (
                  <p className="text-xs text-muted-foreground">
                    {bandLabel(band)}
                    {passPct !== null && <> &nbsp;•&nbsp; Pass mark: {passPct}% per subject</>}
                    {isPrimary && (
                      <> &nbsp;•&nbsp; {isUnitTestExam(report.examName) ? "Unit Exams/Class Tests (20)" : "Half-Yearly & Annual Exam (80)"}</>
                    )}
                  </p>
                );
              })()}
              <div className="rounded-lg border overflow-hidden overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40">
                    <tr>
                      <th className="text-left font-medium px-3 py-2">Subject</th>
                      <th className="text-center font-medium px-3 py-2">Max</th>
                      <th className="text-center font-medium px-3 py-2">Obtained</th>
                      <th className="text-center font-medium px-3 py-2">%</th>
                      <th className="text-center font-medium px-3 py-2">Grade</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupSubjects(report.subjects, classifyClass(report.student.className)).map((g) => {
                      const pct = g.max > 0 ? Math.round((g.obtained / g.max) * 10000) / 100 : 0;
                      return (
                        <tr key={g.subject} className="border-t align-top">
                          <td className="px-3 py-2">
                            <div className="font-medium">
                              {g.subject}
                              {g.groupLabel && <span className="ml-2 text-xs font-normal text-muted-foreground">({g.groupLabel})</span>}
                            </div>
                            {g.components.length > 1 && (
                              <div className="text-xs text-muted-foreground mt-0.5">
                                {g.components.map((c) => `${c.label}: ${c.obtained}/${c.max}`).join("  •  ")}
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-2 text-center">{g.max}</td>
                          <td className="px-3 py-2 text-center">{g.obtained}</td>
                          <td className="px-3 py-2 text-center">{pct}%</td>
                          <td className="px-3 py-2 text-center">{grade(pct)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t font-medium bg-muted/20">
                      <td className="px-3 py-2">Total</td>
                      <td className="px-3 py-2 text-center">{report.totalMax}</td>
                      <td className="px-3 py-2 text-center">{report.totalObtained}</td>
                      <td className="px-3 py-2 text-center">{report.overallPercentage}%</td>
                      <td className="px-3 py-2 text-center">{grade(report.overallPercentage)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg border p-4 text-sm">
              <p className="font-medium mb-1">Attendance ({report.academicYear})</p>
              {report.attendance.percentage !== null ? (
                <p>{report.attendance.present} / {report.attendance.total} days present — <b>{report.attendance.percentage}%</b></p>
              ) : (
                <p className="text-muted-foreground">No attendance recorded for this academic year.</p>
              )}
            </div>
            <div className="rounded-lg border p-4">
              <Label>Teacher's Comment</Label>
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                onBlur={saveComment}
                placeholder="e.g. Shows consistent improvement, needs to focus more on Mathematics."
                className="mt-1"
                rows={3}
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={handlePrint} disabled={report.subjects.length === 0}>Print ICSE Progress Report</Button>
          </div>
        </div>
      )}
    </div>
  );
}