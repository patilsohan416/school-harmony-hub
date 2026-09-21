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
  classifyClass, isHigherSecondary, getComponentsForSubject,
  virtualSubjectName, bandLabel, passPercentageForBand,
} from "@/lib/marks-curriculum";

// Marks Entry (State Board / CBSE) — same virtual-subject grid mechanism as
// the ICSE Marks Entry page: each component (e.g. "Theory", "Internal
// Assessment") is saved as its own row via /marks/save, into the shared
// Exam/Subject/ExamMark tables.

const EXAM_OPTIONS = [
  "Unit Test 1",
  "Half Yearly Examination",
  "Unit Test 2",
  "Final Examination",
  "Annual Examination",
  "Board Examination",
  "HSC State Board Examination",
];

interface SectionInfo { id: string; name: string; }
interface ClassInfo { id: string; name: string; sections: SectionInfo[]; }

type Stream = "Science" | "Commerce";

// ─────────────────────────────────────────────────────────────────────────
// CURRICULUM MAP — the exact subject lists per grade band. Edit these
// arrays if your school's subject list ever changes; everything else
// (roster, grid, saving) adapts automatically.
// ─────────────────────────────────────────────────────────────────────────
const PRE_PRIMARY = ["English", "Mathematics", "General Awareness", "Rhymes & Storytelling", "Art & Craft"];
const LOWER_PRIMARY = ["English", "Hindi", "Mathematics", "Environmental Studies (EVS)", "Computer Science", "Art & Craft", "Physical Education"];
const MIDDLE_SCHOOL = ["English", "Hindi", "Marathi", "Mathematics", "Science (Physics, Chemistry, Biology)", "Social Science (History, Civics, Geography)", "Computer Science", "Art Education", "Physical Education"];
const HIGH_SCHOOL = ["English Language & Literature", "Hindi", "Mathematics", "Science (Physics, Chemistry, Biology)", "Social Sciences (History, Democratic Politics, Geography, Economics)", "Skill Subject (Information Technology/AI)"];
const HS_SCIENCE = ["English Core", "Physics", "Chemistry", "Mathematics", "Biology", "Computer Science"];
const HS_COMMERCE = ["English Core", "Accountancy", "Business Studies", "Economics", "Applied Mathematics", "Entrepreneurship"];
const FALLBACK = ["English", "Mathematics", "Science", "Social Science"];

function getSubjectsForClass(band: Band, stream: Stream): string[] {
  switch (band) {
    case "pre-primary": return PRE_PRIMARY;
    case "lower-primary": return LOWER_PRIMARY;
    case "middle": return MIDDLE_SCHOOL;
    case "high": return HIGH_SCHOOL;
    case "higher-secondary": return stream === "Commerce" ? HS_COMMERCE : HS_SCIENCE;
    default: return FALLBACK;
  }
}

function defaultAcademicYear() {
  const now = new Date();
  const y = now.getMonth() >= 5 ? now.getFullYear() : now.getFullYear() - 1; // school year starts ~June
  return `${y}-${String((y + 1) % 100).padStart(2, "0")}`;
}

interface RosterEntry {
  studentId: string;
  admissionNo: string;
  rollNumber: number | null;
  name: string;
  marks: Record<string, number>;
}

export function MarksEntryPage() {
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [classId, setClassId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [stream, setStream] = useState<Stream>("Science");
  const [examName, setExamName] = useState("");
  const [academicYear, setAcademicYear] = useState(defaultAcademicYear());

  // maxByVirtualSubject: editable max marks, keyed by the virtual subject
  // name (e.g. "Physics — Theory").
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
  const needsStream = selectedClass ? isHigherSecondary(selectedClass.name) : false;
  const band = selectedClass ? classifyClass(selectedClass.name) : ("unknown" as Band);
  const passPct = passPercentageForBand(band);

  const subjects = useMemo(
    () => (selectedClass ? getSubjectsForClass(band, stream) : []),
    [selectedClass, band, stream]
  );

  // subjectComponents: subject -> its MarkComponent list for this band and
  // the currently selected exam — a Unit Test exam always shows Unit Test
  // (20) + Internal Marks (20); other exams show the full Theory/Internal
  // (or Theory/Practical) breakdown for the band.
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
    if (!examName.trim()) { toast.error("Select an exam"); return; }

    setLoading(true);
    setLoaded(false);
    try {
      const query = new URLSearchParams({
        classId, sectionId, examName: examName.trim(), academicYear,
        subjects: virtualSubjects.map((v) => v.virtualName).join("|"),
      });
      const res = await apiFetch<{ data: { roster: RosterEntry[]; examExists: boolean; maxMarks: Record<string, number> } }>(
        `/marks/roster?${query}`
      );
      const data = res.data.roster || [];
      setRoster(data);

      // Pre-fill each column's max with whatever was actually saved for
      // this exam before; only fall back to the default the first time a
      // subject/component is ever entered.
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
      else if (res.data.examExists) toast.success("Loaded previously saved marks for this exam");
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
      await apiFetch("/marks/save", {
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
        <h1 className="text-2xl font-bold">Marks Entry</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Pick a class and the subject list — split into Theory/Internal (or Theory/Practical for lab subjects) — appears automatically.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-4 rounded-lg border p-4">
        <div className="w-56">
          <Label>Exam Name</Label>
          <Select value={examName} onValueChange={(v) => { setExamName(v); setLoaded(false); setRoster([]); }}>
            <SelectTrigger className="mt-1"><SelectValue placeholder="Select exam" /></SelectTrigger>
            <SelectContent>
              {EXAM_OPTIONS.map((exam) => <SelectItem key={exam} value={exam}>{exam}</SelectItem>)}
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
          <div className="w-40">
            <Label>Stream</Label>
            <Select value={stream} onValueChange={(v) => { setStream(v as Stream); setLoaded(false); setRoster([]); }}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Science">Science</SelectItem>
                <SelectItem value="Commerce">Commerce</SelectItem>
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
          {" "}&nbsp;•&nbsp; {bandLabel(band)}
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