import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import { Check, ChevronsUpDown } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api/client";
import type { User } from "@/lib/services/auth.service";
import { cn } from "@/lib/utils";

function getSchoolInfo() {
  let user: Partial<User> = {};
  try { user = JSON.parse(localStorage.getItem("user") || "{}"); } catch { /* ignore */ }
  const addressParts = [user.schoolAddress, user.schoolCity, user.schoolState, user.schoolPincode].filter(Boolean).join(", ");
  return {
    schoolName: user.schoolName || "YOUR SCHOOL NAME",
    address: addressParts || "",
  };
}

// CBSE Middle & High School Results — Class 6 through Class 10, every
// section, pulled straight from Student Management + the shared /marks
// tables (same tables CBSE Marks Entry saves into). "Print Certificate"
// opens a formal print-ready certificate for that student using the
// already-fetched subject breakdown — no extra request needed.

const CBSE_EXAM_OPTIONS = [
  "Unit Test 1",
  "Half Yearly Examination",
  "Unit Test 2",
  "Final Examination",
  "Annual Examination",
  "CBSE Board Examination",
];

const ALL_CLASSES = "__all__";
const ALL_SECTIONS = "__all__";

interface SectionInfo { id: string; name: string; }
interface ClassInfo { id: string; name: string; sections: SectionInfo[]; }

function isHighSchoolClass(className: string): boolean {
  const m = className.match(/\d+/);
  if (!m) return false;
  const n = parseInt(m[0], 10);
  return n >= 6 && n <= 10;
}

interface SubjectMark { name: string; obtained: number; max: number; }
interface ResultRow {
  studentId: string;
  admissionNo: string;
  rollNumber: number | null;
  name: string;
  className: string;
  sectionName: string;
  subjects: SubjectMark[];
  totalObtained: number;
  totalMax: number;
  percentage: number | null;
  grade: string | null;
}

function defaultAcademicYear() {
  const now = new Date();
  const y = now.getMonth() >= 5 ? now.getFullYear() : now.getFullYear() - 1;
  return `${y}-${String((y + 1) % 100).padStart(2, "0")}`;
}

function escapeHtml(value: unknown): string {
  return String(value ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]!));
}

function buildCertificateHtml(row: ResultRow, examName: string, academicYear: string): string {
  const school = getSchoolInfo();
  const subjectRows = row.subjects.map((s) => `
    <tr>
      <td>${escapeHtml(s.name)}</td>
      <td class="num">${escapeHtml(s.max)}</td>
      <td class="num">${escapeHtml(s.obtained)}</td>
    </tr>`).join("");

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Certificate - ${escapeHtml(row.name)}</title>
<style>
  @page { size: A4; margin: 0; }
  body { font-family: Georgia, 'Times New Roman', serif; margin: 0; padding: 50px; color: #1a1a2e; }
  .border { border: 6px double #1a3a6b; padding: 40px; min-height: 720px; position: relative; }
  .header { text-align: center; margin-bottom: 24px; }
  .school-name { font-size: 26px; font-weight: bold; letter-spacing: 1px; color: #1a3a6b; }
  .school-address { font-size: 12px; color: #444; margin-top: 2px; }
  .title { text-align: center; font-size: 22px; font-weight: bold; text-transform: uppercase; letter-spacing: 3px; margin: 28px 0; color: #1a3a6b; border-top: 2px solid #1a3a6b; border-bottom: 2px solid #1a3a6b; padding: 10px 0; }
  .body-text { font-size: 15px; line-height: 2; text-align: center; margin: 0 20px 24px; }
  .body-text b { color: #1a3a6b; }
  table.marks { width: 100%; border-collapse: collapse; margin: 20px auto; max-width: 480px; font-size: 13px; }
  table.marks th, table.marks td { border: 1px solid #999; padding: 6px 10px; }
  table.marks th { background: #eef2fa; }
  table.marks td.num, table.marks th.num { text-align: center; }
  .result-line { text-align: center; font-size: 16px; margin: 18px 0; }
  .result-line b { font-size: 20px; color: #1a3a6b; }
  .footer { display: flex; justify-content: space-between; margin-top: 60px; padding: 0 20px; font-size: 13px; }
  .footer div { text-align: center; border-top: 1px solid #333; padding-top: 6px; width: 180px; }
</style>
</head>
<body>
  <div class="border">
    <div class="header">
      <div class="school-name">${escapeHtml(school.schoolName)}</div>
      ${school.address ? `<div class="school-address">${escapeHtml(school.address)}</div>` : ""}
      <div>CBSE Affiliated School</div>
    </div>
    <div class="title">Certificate of Academic Achievement</div>
    <p class="body-text">
      This is to certify that <b>${escapeHtml(row.name)}</b>
      (Admission No. <b>${escapeHtml(row.admissionNo)}</b>, Roll No. <b>${escapeHtml(row.rollNumber ?? "-")}</b>),
      a student of <b>${escapeHtml(row.className)} - ${escapeHtml(row.sectionName)}</b>,
      has successfully appeared for the <b>${escapeHtml(examName)}</b> (Academic Year ${escapeHtml(academicYear)})
      under the CBSE curriculum, with the following results:
    </p>

    <table class="marks">
      <thead><tr><th>Subject</th><th class="num">Max Marks</th><th class="num">Marks Obtained</th></tr></thead>
      <tbody>${subjectRows}</tbody>
      <tfoot>
        <tr><td><b>Total</b></td><td class="num"><b>${escapeHtml(row.totalMax)}</b></td><td class="num"><b>${escapeHtml(row.totalObtained)}</b></td></tr>
      </tfoot>
    </table>

    <p class="result-line">
      Percentage: <b>${row.percentage !== null ? row.percentage + "%" : "-"}</b>
      &nbsp;&nbsp;|&nbsp;&nbsp;
      Grade: <b>${escapeHtml(row.grade ?? "-")}</b>
    </p>

    <div class="footer">
      <div>Class Teacher</div>
      <div>Date: ${new Date().toLocaleDateString()}</div>
      <div>Principal</div>
    </div>
  </div>
</body>
</html>`;
}

// Reusable searchable combobox: click to open, type to filter, click to pick.
function SearchableSelect({
  value,
  onChange,
  options,
  placeholder,
  searchPlaceholder = "Search…",
  disabled,
  triggerClassName,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  triggerClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "w-full justify-between font-normal",
            !selected && "text-muted-foreground",
            triggerClassName
          )}
        >
          <span className="truncate">{selected ? selected.label : placeholder}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[220px] p-0" align="start">
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.label}
                  onSelect={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === option.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export function CbseHighSchoolResultsPage() {
  const [search, setSearch] = useState("");
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [classId, setClassId] = useState(ALL_CLASSES);
  const [sectionId, setSectionId] = useState(ALL_SECTIONS);
  const [examName, setExamName] = useState("");
  const [academicYear, setAcademicYear] = useState(defaultAcademicYear());
  const [rows, setRows] = useState<ResultRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    apiFetch<{ data: ClassInfo[] }>("/classes")
      .then((res) => setClasses((res.data || []).filter((c) => isHighSchoolClass(c.name))))
      .catch(() => toast.error("Failed to load classes"));
  }, []);

  const sections = useMemo(
    () => classes.find((c) => c.id === classId)?.sections || [],
    [classes, classId]
  );

  const classOptions = useMemo(
    () => [
      { value: ALL_CLASSES, label: "Class 6 – 10 (All)" },
      ...classes.map((c) => ({ value: c.id, label: c.name })),
    ],
    [classes]
  );

  const sectionOptions = useMemo(
    () => [
      { value: ALL_SECTIONS, label: "All Sections" },
      ...sections.map((s) => ({ value: s.id, label: s.name })),
    ],
    [sections]
  );

  async function loadResults() {
    if (!examName) { toast.error("Select an exam"); return; }
    setLoading(true);
    setLoaded(false);
    try {
      const query = new URLSearchParams({ examName, academicYear });
      if (classId !== ALL_CLASSES) query.set("classId", classId);
      if (classId !== ALL_CLASSES && sectionId !== ALL_SECTIONS) query.set("sectionId", sectionId);

      const res = await apiFetch<{ data: { rows: ResultRow[] } }>(`/cbse-marks/high-school-results?${query}`);
      setRows(res.data.rows || []);
      setLoaded(true);
      if ((res.data.rows || []).length === 0) toast.info("No Class 6–10 students found");
    } catch (err: any) {
      toast.error(err?.message || "Failed to load results");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => r.name.toLowerCase().includes(q) || r.admissionNo.toLowerCase().includes(q));
  }, [rows, search]);

  function printCertificate(row: ResultRow) {
    if (row.percentage === null) { toast.error("No marks entered yet for this student"); return; }
    const html = buildCertificateHtml(row, examName, academicYear);
    const printWindow = window.open("", "_blank", "width=850,height=1100");
    if (!printWindow) { toast.error("Please allow pop-ups to print the certificate"); return; }
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 300);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">CBSE Middle &amp; High School Results</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Every Class 6 to Class 10 student, every section — pulled automatically from Student Management and Marks Entry.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-4 rounded-lg border p-4">
       
        <div className="w-56">
          <Label>Exam</Label>
          <Select value={examName} onValueChange={(v) => { setExamName(v); setLoaded(false); setRows([]); }}>
            <SelectTrigger className="mt-1"><SelectValue placeholder="Select exam" /></SelectTrigger>
            <SelectContent>
              {CBSE_EXAM_OPTIONS.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="w-36">
          <Label>Academic Year</Label>
          <Input value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} className="mt-1" />
        </div>
        <div className="w-48">
          <Label>Class</Label>
          <div className="mt-1">
            <SearchableSelect
              value={classId}
              onChange={(v) => { setClassId(v); setSectionId(ALL_SECTIONS); setLoaded(false); setRows([]); }}
              options={classOptions}
              placeholder="Select class"
              searchPlaceholder="Search classes…"
            />
          </div>
        </div>
        <div className="w-48">
          <Label>Section</Label>
          <div className="mt-1">
            <SearchableSelect
              value={sectionId}
              onChange={(v) => { setSectionId(v); setLoaded(false); setRows([]); }}
              options={sectionOptions}
              placeholder="Select section"
              searchPlaceholder="Search sections…"
              disabled={classId === ALL_CLASSES}
            />
          </div>
        </div>
        <Button onClick={loadResults} disabled={loading}>
          {loading ? "Loading…" : "Load"}
        </Button>
      </div>

      {loading && (
        <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
      )}

      {!loading && loaded && filtered.length === 0 && (
        <p className="text-sm text-muted-foreground">No Class 6–10 students found.</p>
      )}

      {!loading && filtered.length > 0 && (
        <div className="rounded-lg border overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr>
                <th className="text-left font-medium px-3 py-2">Student</th>
                <th className="text-left font-medium px-3 py-2">Class</th>
                <th className="text-center font-medium px-3 py-2">Percentage</th>
                <th className="text-center font-medium px-3 py-2">Grade</th>
                <th className="text-right font-medium px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.studentId} className="border-t">
                  <td className="px-3 py-2">{r.name}</td>
                  <td className="px-3 py-2">{r.className} - {r.sectionName}</td>
                  <td className="px-3 py-2 text-center">
                    {r.percentage !== null ? `${r.percentage}%` : <span className="text-muted-foreground">Not entered</span>}
                  </td>
                  <td className="px-3 py-2 text-center">{r.grade ?? "-"}</td>
                  <td className="px-3 py-2 text-right">
                    <Button size="sm" onClick={() => printCertificate(r)} disabled={r.percentage === null}>
                      Print Certificate
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}