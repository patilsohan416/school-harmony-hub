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
import {
  type Band, type MarkComponent,
  classifyClass, isIsc, getComponentsForSubject, passPercentageForBand, virtualSubjectName,
} from "@/lib/icse-curriculum";

// Separate storage from State Board Marks Entry on purpose — ICSE marks
// live in their own IcseExam/IcseSubject/IcseExamMark tables via the
// dedicated /icse-marks API, never touching the Exam/Subject/ExamMark
// tables the state-board pages use. Same class/exam name can exist under
// both boards with zero risk of collision.
//
// COMPONENT BREAKDOWN — the CISCE (ICSE/ISC) board doesn't grade a subject
// with one number; it splits every subject into components (Written +
// Internal, or Written + Practical) whose weights change by grade band.
// Each component is saved as its own "virtual subject" row, e.g.
// "Physics — Written Exam" and "Physics — Lab Practical", via the same
// /icse-marks/save API used for a single mark. Totals/percentages still
// come out correct because Progress Report and Grade-wise Results sum
// obtained/max across every mark row for a student regardless of naming.

interface SectionInfo { id: string; name: string; }
interface ClassInfo { id: string; name: string; sections: SectionInfo[]; }

type Stream = "Science" | "Commerce" | "Humanities";

// ─────────────────────────────────────────────────────────────────────────
// ICSE/ISC CURRICULUM MAP — the exact subject lists per grade band. Edit
// these arrays if the board's subject list ever changes; everything else
// (roster, grid, saving) adapts automatically.
// ─────────────────────────────────────────────────────────────────────────
const PRE_PRIMARY = ["English (Phonics, Pre-writing, Speaking)", "Mathematics (Numbers, Counting, Shapes)", "Environmental Studies (EVS)", "Art & Craft"];
const PRIMARY_LOWER = ["English", "Hindi", "Mathematics", "Environmental Studies (EVS)", "Computer Studies", "Art Education"]; // Classes 1-2
const PRIMARY_UPPER = ["English", "Hindi", "Mathematics", "Science", "Social Studies", "Computer Studies", "Art Education"]; // Classes 3-5
const MIDDLE_SCHOOL = ["English", "Hindi", "Marathi", "Mathematics", "Science", "History & Civics", "Geography", "Computer Studies", "Arts & Physical Education"]; // Classes 6-8
const ICSE_9_10 = ["English", "Hindi", "History, Civics & Geography", "Mathematics", "Science (Physics, Chemistry, Biology)", "Commercial Studies", "Economics", "Environmental Science", "Group III Elective", "Socially Useful Productive Work (SUPW)"];
const ISC_SCIENCE = ["English", "Physics", "Chemistry", "Mathematics", "Biology", "Computer Science", "Biotechnology"];
const ISC_COMMERCE = ["English", "Accounts", "Commerce", "Economics", "Business Studies", "Mathematics"];
const ISC_HUMANITIES = ["English", "History", "Political Science", "Geography", "Sociology", "Psychology", "Economics", "Legal Studies", "Literature in English", "Elective English"];
const FALLBACK = ["English", "Mathematics", "Science"];
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


function getSubjectsForClass(className: string, stream: Stream): string[] {
  switch (classifyClass(className)) {
    case "pre-primary": return PRE_PRIMARY;
    case "primary-lower": return PRIMARY_LOWER;
    case "primary-upper": return PRIMARY_UPPER;
    case "middle": return MIDDLE_SCHOOL;
    case "icse-9-10": return ICSE_9_10;
    case "isc-11-12":
      if (stream === "Commerce") return ISC_COMMERCE;
      if (stream === "Humanities") return ISC_HUMANITIES;
      return ISC_SCIENCE;
    default: return FALLBACK;
  }
}

// ─────────────────────────────────────────────────────────────────────────
// MARK SCHEME — per grade band (and per subject within a band, where the
// board splits subjects into groups), the components a subject is graded
// on and each component's default max marks. Matches the CISCE breakdown:
//   Pre-Primary        50  = Written 20-25        + Orals/Activities 25-30
//   Primary (1-5)      100 = Unit Tests 20         + Half-Yearly/Annual 80
//   Middle (6-8)       100 = External/Written 80   + Internal (proj/lab) 20
//   ICSE (9-10) Grp I/II 100 = Written 80          + Internal Project 20
//   ICSE (9-10) Grp III 100 = Written 50           + School Practical 50
//   ISC (11-12) Science labs 100 = Written 70      + Lab 15 + Project 10 + File 5
//   ISC (11-12) Math/English 100 = Written 80      + Internal Project 20
//   ISC (11-12) Commerce/Humanities 100 = Written 80 + Project & Viva 20
// Pass marks: ICSE (Class 10) 33%, ISC (Class 12) 35%.
// ─────────────────────────────────────────────────────────────────────────
// Component breakdown, group labels, and pass-percentages now live in
// @/lib/icse-curriculum (shared with ICSE Progress Report).

function defaultAcademicYear() {
  const now = new Date();
  const y = now.getMonth() >= 5 ? now.getFullYear() : now.getFullYear() - 1;
  return `${y}-${String((y + 1) % 100).padStart(2, "0")}`;
}

interface RosterEntry {
  studentId: string;
  admissionNo: string;
  rollNumber: number | null;
  name: string;
  marks: Record<string, number>;
}

export function IcseMarksEntryPage() {
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [classId, setClassId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [stream, setStream] = useState<Stream>("Science");
  const [examName, setExamName] = useState("");
  const [academicYear, setAcademicYear] = useState(defaultAcademicYear());

  // maxByVirtualSubject: editable max marks, keyed by the virtual subject
  // name (e.g. "Physics — Written Exam").
  const [maxByVirtualSubject, setMaxByVirtualSubject] = useState<Record<string, number>>({});
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  // marksGrid: studentId -> virtualSubjectName -> raw input string
  const [marksGrid, setMarksGrid] = useState<Record<string, Record<string, string>>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    apiFetch<{ data: ClassInfo[] }>("/classes")
      .then((res) => setClasses(res.data || []))
      .catch(() => toast.error("Failed to load classes"));
  }, []);

  const selectedClass = classes.find((c) => c.id === classId);
  const sections = selectedClass?.sections || [];
  const needsStream = selectedClass ? isIsc(selectedClass.name) : false;
  const band = selectedClass ? classifyClass(selectedClass.name) : "unknown";
  const passPct = passPercentageForBand(band);

  const subjects = useMemo(
    () => (selectedClass ? getSubjectsForClass(selectedClass.name, stream) : []),
    [selectedClass, stream]
  );

  // subjectComponents: subject -> its MarkComponent list for this band and
  // (for Primary) the currently selected exam — Unit Test exams show only
  // the Unit Exams/Class Tests column, other exams show only Half-Yearly &
  // Annual Exam, never both at once.
  const subjectComponents = useMemo(() => {
    const map: Record<string, MarkComponent[]> = {};
    subjects.forEach((s) => { map[s] = getComponentsForSubject(band, s, examName); });
    return map;
  }, [subjects, band, examName]);

  // flat list of every virtual subject (subject + component) for this class
  const virtualSubjects = useMemo(() => {
    const list: { subject: string; component: MarkComponent; virtualName: string }[] = [];
    subjects.forEach((s) => {
      (subjectComponents[s] || []).forEach((c) => {
        list.push({ subject: s, component: c, virtualName: virtualSubjectName(s, c) });
      });
    });
    return list;
  }, [subjects, subjectComponents]);

  async function loadRoster() {
    if (!classId || !sectionId) { toast.error("Select a Class and Section first"); return; }
    if (!examName.trim()) { toast.error("Enter an Exam name (e.g. Prelim 1)"); return; }

    setLoading(true);
    setLoaded(false);
    try {
      const query = new URLSearchParams({
        classId, sectionId, examName: examName.trim(), academicYear,
        subjects: virtualSubjects.map((v) => v.virtualName).join("|"),
      });
      const res = await apiFetch<{ data: { roster: RosterEntry[]; examExists: boolean; maxMarks: Record<string, number> } }>(
        `/icse-marks/roster?${query}`
      );
      const data = res.data.roster || [];
      setRoster(data);

      // Pre-fill each column's max with whatever the teacher actually saved
      // for this exam before; only fall back to the CISCE default the first
      // time a subject/component is ever entered.
      const savedMax = res.data.maxMarks || {};
      const initialMax: Record<string, number> = {};
      virtualSubjects.forEach(({ virtualName, component }) => {
        initialMax[virtualName] = savedMax[virtualName] ?? maxByVirtualSubject[virtualName] ?? component.max;
      });
      setMaxByVirtualSubject(initialMax);

      const grid: Record<string, Record<string, string>> = {};
      data.forEach((r) => {
        grid[r.studentId] = {};
        virtualSubjects.forEach(({ virtualName }) => {
          grid[r.studentId][virtualName] = r.marks[virtualName] !== undefined ? String(r.marks[virtualName]) : "";
        });
      });
      setMarksGrid(grid);
      setLoaded(true);

      if (data.length === 0) toast.info("No active students found in this class/section");
      else if (res.data.examExists) toast.success("Loaded previously saved ICSE marks for this exam");
    } catch (err: any) {
      toast.error(err?.message || "Failed to load roster");
      setRoster([]);
    } finally {
      setLoading(false);
    }
  }

  function setMark(studentId: string, virtualName: string, value: string) {
    setMarksGrid((prev) => ({
      ...prev,
      [studentId]: { ...prev[studentId], [virtualName]: value },
    }));
  }

  function subjectTotal(studentId: string, subject: string): { obtained: number; max: number } {
    let obtained = 0, max = 0;
    (subjectComponents[subject] || []).forEach((c) => {
      const vName = virtualSubjectName(subject, c);
      const raw = marksGrid[studentId]?.[vName];
      const num = raw !== undefined && raw !== "" ? Number(raw) : 0;
      obtained += isNaN(num) ? 0 : num;
      max += maxByVirtualSubject[vName] ?? c.max;
    });
    return { obtained, max };
  }

  function grandTotal(studentId: string): { obtained: number; max: number } {
    let obtained = 0, max = 0;
    subjects.forEach((s) => {
      const t = subjectTotal(studentId, s);
      obtained += t.obtained;
      max += t.max;
    });
    return { obtained, max };
  }

  async function handleSave() {
    const records: { studentId: string; subjectName: string; marks: number }[] = [];
    for (const r of roster) {
      for (const { virtualName } of virtualSubjects) {
        const raw = marksGrid[r.studentId]?.[virtualName];
        if (raw !== undefined && raw !== "") {
          const num = Number(raw);
          if (!isNaN(num)) records.push({ studentId: r.studentId, subjectName: virtualName, marks: num });
        }
      }
    }

    if (records.length === 0) {
      toast.error("Enter at least one mark before saving");
      return;
    }

    setSaving(true);
    try {
      await apiFetch("/icse-marks/save", {
        method: "POST",
        body: JSON.stringify({
          classId, sectionId, examName: examName.trim(), academicYear,
          subjects: virtualSubjects.map(({ virtualName, component }) => ({
            name: virtualName,
            maxMarks: maxByVirtualSubject[virtualName] ?? component.max,
          })),
          records,
        }),
      });
      toast.success(`Saved ${records.length} mark${records.length === 1 ? "" : "s"}`);
    } catch (err: any) {
      toast.error(err?.message || "Failed to save marks");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">ICSE Marks Entry</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Pick a class and the ICSE/ISC subject list — split into Written/Internal/Practical components per the CISCE grading structure — appears automatically. Stored separately from State Board marks.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-4 rounded-lg border p-4">
        <div className="w-52">
          <Label>Exam Name</Label>
          <Select
            value={examName}
            onValueChange={(value) => {
              setExamName(value);
              setLoaded(false);
              setRoster([]);
            }}
          >
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Select exam" />
            </SelectTrigger>
            <SelectContent>
              {ICSE_EXAM_OPTIONS.map((exam) => (
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

        <div className="w-44">
          <Label>Class</Label>
          <Select
            value={classId}
            onValueChange={(v) => { setClassId(v); setSectionId(""); setLoaded(false); setRoster([]); }}
          >
            <SelectTrigger className="mt-1"><SelectValue placeholder="Select class" /></SelectTrigger>
            <SelectContent>
              {classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="w-40">
          <Label>Section</Label>
          <Select value={sectionId} onValueChange={(v) => { setSectionId(v); setLoaded(false); setRoster([]); }} disabled={!classId}>
            <SelectTrigger className="mt-1"><SelectValue placeholder="Select section" /></SelectTrigger>
            <SelectContent>
              {sections.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {needsStream && (
          <div className="w-44">
            <Label>Stream</Label>
            <Select value={stream} onValueChange={(v) => { setStream(v as Stream); setLoaded(false); setRoster([]); }}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Science">Science</SelectItem>
                <SelectItem value="Commerce">Commerce</SelectItem>
                <SelectItem value="Humanities">Humanities</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        <Button onClick={loadRoster} disabled={!classId || !sectionId || loading}>
          {loading ? "Loading…" : "Load Students"}
        </Button>
      </div>

      {selectedClass && subjects.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Subjects for {selectedClass.name}{needsStream ? ` (${stream})` : ""}: {subjects.join(", ")}
          {passPct !== null && <> &nbsp;•&nbsp; Pass mark: {passPct}%</>}
        </p>
      )}

      {loading && (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      )}

      {!loading && loaded && roster.length === 0 && (
        <p className="text-sm text-muted-foreground">No active students found for this class and section.</p>
      )}

      {!loading && roster.length > 0 && (
        <div className="space-y-4">
          <div className="rounded-lg border overflow-x-auto">
            <table className="text-sm border-collapse">
              <thead className="bg-muted/40">
                <tr>
                  <th rowSpan={2} className="text-left font-medium px-3 py-2 sticky left-0 bg-muted/40 z-10 min-w-[60px] align-bottom">Roll</th>
                  <th rowSpan={2} className="text-left font-medium px-3 py-2 sticky left-[60px] bg-muted/40 z-10 min-w-[180px] border-r align-bottom">Student</th>
                  {subjects.map((s) => (
                    <th
                      key={s}
                      colSpan={(subjectComponents[s] || []).length}
                      className="text-center font-medium px-3 py-2 border-l"
                    >
                      {s}
                    </th>
                  ))}
                  <th rowSpan={2} className="text-center font-medium px-3 py-2 border-l min-w-[110px] align-bottom">Grand Total</th>
                </tr>
                <tr>
                  {subjects.map((s) =>
                    (subjectComponents[s] || []).map((c) => {
                      const vName = virtualSubjectName(s, c);
                      return (
                        <th key={vName} className="text-center font-medium px-2 py-2 min-w-[120px] border-l">
                          <div className="mb-1 text-xs">{c.label}</div>
                          <div className="flex items-center justify-center gap-1 font-normal text-xs text-muted-foreground">
                            Max:
                            <Input
                              type="number"
                              value={maxByVirtualSubject[vName] ?? c.max}
                              onChange={(e) =>
                                setMaxByVirtualSubject((prev) => ({ ...prev, [vName]: Number(e.target.value) || 0 }))
                              }
                              className="h-6 w-14 px-1 text-xs"
                            />
                          </div>
                        </th>
                      );
                    })
                  )}
                </tr>
              </thead>
              <tbody>
                {roster.map((r) => {
                  const total = grandTotal(r.studentId);
                  const pct = total.max > 0 ? Math.round((total.obtained / total.max) * 10000) / 100 : 0;
                  return (
                    <tr key={r.studentId} className="border-t">
                      <td className="px-3 py-2 sticky left-0 bg-white z-10">{r.rollNumber ?? "-"}</td>
                      <td className="px-3 py-2 sticky left-[60px] bg-white z-10 border-r">{r.name}</td>
                      {subjects.map((s) =>
                        (subjectComponents[s] || []).map((c) => {
                          const vName = virtualSubjectName(s, c);
                          return (
                            <td key={vName} className="px-2 py-1.5 border-l text-center">
                              <Input
                                type="number"
                                min={0}
                                max={maxByVirtualSubject[vName] ?? c.max}
                                value={marksGrid[r.studentId]?.[vName] ?? ""}
                                onChange={(e) => setMark(r.studentId, vName, e.target.value)}
                                className="h-8 w-16 mx-auto text-center"
                              />
                            </td>
                          );
                        })
                      )}
                      <td className="px-3 py-2 border-l text-center font-medium">
                        {total.obtained} / {total.max}
                        <div className="text-xs text-muted-foreground">{pct}%</div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "Save All Marks"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
} 