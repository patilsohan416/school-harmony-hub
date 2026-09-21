import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { apiFetch } from "@/lib/api/client";
import { classifyClass, bandLabel, passPercentageForBand } from "@/lib/icse-curriculum";
import {
  grade, groupSubjects, buildReportHtml, type ProgressReport,
} from "@/components/icse-progress-report/icse-progress-report-page";

// ICSE Preliminary Progress — Class 10 & Class 12 (every section), pulled
// straight from Student Management via /icse-marks/preliminary-progress
// (not a manually-maintained list). "View Report" reuses the exact same
// report data/print logic as ICSE Progress Report.

const PRELIM_EXAMS = ["Preliminary Examination 1", "Preliminary Examination 2"];
const ALL_CLASSES = "__all__";
const ALL_SECTIONS = "__all__";

interface SectionInfo { id: string; name: string; }
interface ClassInfo { id: string; name: string; sections: SectionInfo[]; }

function isBoardExamClass(className: string): boolean {
  const m = className.match(/\d+/);
  if (!m) return false;
  const n = parseInt(m[0], 10);
  return n === 10 || n === 12;
}

interface Row {
  studentId: string;
  admissionNo: string;
  rollNumber: number | null;
  name: string;
  className: string;
  sectionName: string;
  obtained: number;
  max: number;
  percentage: number | null;
}

function defaultAcademicYear() {
  const now = new Date();
  const y = now.getMonth() >= 5 ? now.getFullYear() : now.getFullYear() - 1;
  return `${y}-${String((y + 1) % 100).padStart(2, "0")}`;
}

export function IcsePreliminaryProgressPage() {
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [classId, setClassId] = useState(ALL_CLASSES);
  const [sectionId, setSectionId] = useState(ALL_SECTIONS);
  const [examName, setExamName] = useState("");
  const [academicYear, setAcademicYear] = useState(defaultAcademicYear());
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const [reportOpen, setReportOpen] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
  const [report, setReport] = useState<ProgressReport | null>(null);

  useEffect(() => {
    apiFetch<{ data: ClassInfo[] }>("/classes")
      .then((res) => setClasses((res.data || []).filter((c) => isBoardExamClass(c.name))))
      .catch(() => toast.error("Failed to load classes"));
  }, []);

  const sections = useMemo(
    () => classes.find((c) => c.id === classId)?.sections || [],
    [classes, classId]
  );

  async function loadRows() {
    if (!examName) { toast.error("Select an exam"); return; }
    setLoading(true);
    setLoaded(false);
    try {
      const query = new URLSearchParams({ examName, academicYear });
      if (classId !== ALL_CLASSES) query.set("classId", classId);
      if (classId !== ALL_CLASSES && sectionId !== ALL_SECTIONS) query.set("sectionId", sectionId);

      const res = await apiFetch<{ data: { rows: Row[] } }>(`/icse-marks/preliminary-progress?${query}`);
      setRows(res.data.rows || []);
      setLoaded(true);
      if ((res.data.rows || []).length === 0) {
        toast.info("No Class 10 or Class 12 students found");
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to load preliminary progress");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  async function viewReport(row: Row) {
    setReportOpen(true);
    setReportLoading(true);
    setReport(null);
    try {
      const query = new URLSearchParams({ studentId: row.studentId, examName, academicYear });
      const res = await apiFetch<{ data: ProgressReport }>(`/icse-marks/progress-report?${query}`);
      setReport(res.data);
    } catch (err: any) {
      toast.error(err?.message || "Failed to load report");
      setReportOpen(false);
    } finally {
      setReportLoading(false);
    }
  }

  function printReport() {
    if (!report) return;
    const html = buildReportHtml(report, "");
    const printWindow = window.open("", "_blank", "width=850,height=1100");
    if (!printWindow) { toast.error("Please allow pop-ups to print the report"); return; }
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 300);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">ICSE Preliminary Progress</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Every Class 10 and Class 12 student, every section — pulled automatically from Student Management, with their Preliminary exam percentage.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-4 rounded-lg border p-4">
        <div className="w-64">
          <Label>Preliminary Exam</Label>
          <Select value={examName} onValueChange={(v) => { setExamName(v); setLoaded(false); setRows([]); }}>
            <SelectTrigger className="mt-1"><SelectValue placeholder="Select exam" /></SelectTrigger>
            <SelectContent>
              {PRELIM_EXAMS.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="w-36">
          <Label>Academic Year</Label>
          <Input value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} className="mt-1" />
        </div>
        <div className="w-40">
          <Label>Class</Label>
          <Select
            value={classId}
            onValueChange={(v) => { setClassId(v); setSectionId(ALL_SECTIONS); setLoaded(false); setRows([]); }}
          >
            <SelectTrigger className="mt-1"><SelectValue placeholder="Select class" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_CLASSES}>Class 10 &amp; 12 (All)</SelectItem>
              {classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="w-40">
          <Label>Section</Label>
          <Select
            value={sectionId}
            onValueChange={(v) => { setSectionId(v); setLoaded(false); setRows([]); }}
            disabled={classId === ALL_CLASSES}
          >
            <SelectTrigger className="mt-1"><SelectValue placeholder="Select section" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_SECTIONS}>All Sections</SelectItem>
              {sections.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={loadRows} disabled={loading}>
          {loading ? "Loading…" : "Load"}
        </Button>
      </div>

      {loading && (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
        </div>
      )}

      {!loading && loaded && rows.length === 0 && (
        <p className="text-sm text-muted-foreground">No Class 10 or Class 12 students found.</p>
      )}

      {!loading && rows.length > 0 && (
        <div className="rounded-lg border overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr>
                <th className="text-left font-medium px-3 py-2">Roll</th>
                <th className="text-left font-medium px-3 py-2">Student</th>
                <th className="text-left font-medium px-3 py-2">Class</th>
                <th className="text-left font-medium px-3 py-2">Section</th>
                <th className="text-center font-medium px-3 py-2">Percentage</th>
                <th className="text-right font-medium px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.studentId} className="border-t">
                  <td className="px-3 py-2">{r.rollNumber ?? "-"}</td>
                  <td className="px-3 py-2">{r.name}</td>
                  <td className="px-3 py-2">{r.className}</td>
                  <td className="px-3 py-2">{r.sectionName}</td>
                  <td className="px-3 py-2 text-center">
                    {r.percentage !== null ? `${r.percentage}%` : <span className="text-muted-foreground">Not entered</span>}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Button variant="outline" size="sm" onClick={() => viewReport(r)}>View Report</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {report ? `${report.student.name} — ${report.examName}` : "Progress Report"}
            </DialogTitle>
          </DialogHeader>

          {reportLoading && (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
            </div>
          )}

          {!reportLoading && report && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                {report.student.className} - {report.student.sectionName} &nbsp;•&nbsp; Roll No: {report.student.rollNumber ?? "-"} &nbsp;•&nbsp; Admission No: {report.student.admissionNo}
              </p>

              {report.subjects.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No ICSE marks entered yet for "{report.examName}" ({report.academicYear}).
                </p>
              ) : (
                <>
                  {(() => {
                    const band = classifyClass(report.student.className);
                    const passPct = passPercentageForBand(band);
                    return passPct !== null ? (
                      <p className="text-xs text-muted-foreground">
                        {bandLabel(band)} &nbsp;•&nbsp; Pass mark: {passPct}% per subject
                      </p>
                    ) : null;
                  })()}
                  <div className="rounded-lg border overflow-hidden">
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
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setReportOpen(false)}>Close</Button>
            <Button onClick={printReport} disabled={!report || report.subjects.length === 0}>Print Report</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}