import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api/client";
import { createCrudService, type Record_ } from "@/lib/services/crud.service";

const registerService = createCrudService<Record_>("exam-daily-register");

interface SectionInfo { id: string; name: string; }
interface ClassInfo { id: string; name: string; sections: SectionInfo[]; }

// ─────────────────────────────────────────────────────────────────────────
// Same curriculum map used in Marks Entry, so the Subject list here always
// matches what a class is actually being examined on.
// ─────────────────────────────────────────────────────────────────────────
const PRE_PRIMARY = ["English", "Mathematics", "General Awareness", "Rhymes & Storytelling", "Art & Craft"];
const LOWER_PRIMARY = ["English", "Hindi", "Mathematics", "Environmental Studies (EVS)", "Computer Science", "Art & Craft", "Physical Education"];
const MIDDLE_SCHOOL = ["English", "Hindi", "Marathi", "Mathematics", "Science (Physics, Chemistry, Biology)", "Social Science (History, Civics, Geography)", "Computer Science", "Art Education", "Physical Education"];
const HIGH_SCHOOL = ["English Language & Literature", "Hindi", "Mathematics", "Science (Physics, Chemistry, Biology)", "Social Sciences (History, Democratic Politics, Geography, Economics)", "Skill Subject (Information Technology/AI)"];
const HS_SCIENCE = ["English Core", "Physics", "Chemistry", "Mathematics", "Biology", "Computer Science"];
const HS_COMMERCE = ["English Core", "Accountancy", "Business Studies", "Economics", "Applied Mathematics", "Entrepreneurship"];
const FALLBACK = ["English", "Mathematics", "Science", "Social Science"];

type Stream = "Science" | "Commerce";
type Band = "pre-primary" | "lower-primary" | "middle" | "high" | "higher-secondary" | "unknown";

function classifyClass(className: string): Band {
  const norm = className.toLowerCase().replace(/class|grade|std\.?/g, "").trim();
  if (/nursery|play\s*group|pre[- ]?nursery|lkg|l\.k\.g|jr\.?\s*kg|ukg|u\.k\.g|sr\.?\s*kg/.test(norm)) return "pre-primary";
  const match = norm.match(/\d+/);
  if (match) {
    const n = parseInt(match[0], 10);
    if (n >= 1 && n <= 5) return "lower-primary";
    if (n >= 6 && n <= 8) return "middle";
    if (n >= 9 && n <= 10) return "high";
    if (n >= 11 && n <= 12) return "higher-secondary";
  }
  return "unknown";
}
function isHigherSecondary(className: string) { return classifyClass(className) === "higher-secondary"; }
function getSubjectsForClass(className: string, stream: Stream): string[] {
  switch (classifyClass(className)) {
    case "pre-primary": return PRE_PRIMARY;
    case "lower-primary": return LOWER_PRIMARY;
    case "middle": return MIDDLE_SCHOOL;
    case "high": return HIGH_SCHOOL;
    case "higher-secondary": return stream === "Commerce" ? HS_COMMERCE : HS_SCIENCE;
    default: return FALLBACK;
  }
}

interface RosterStudent { studentId: string; rollNumber: number | null; name: string; status: "ATTENDED" | "ABSENT"; }

interface RegisterRecord extends Record_ {
  date?: string;
  classId?: string;
  className?: string;
  sectionId?: string;
  sectionName?: string;
  subject?: string;
  attendedCount?: number;
  absentCount?: number;
  records?: { studentId: string; rollNumber: number | null; name: string; status: "ATTENDED" | "ABSENT" }[];
}

function todayIso() { return new Date().toISOString().slice(0, 10); }

export function ExamDailyRegisterPage() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState<RegisterRecord | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [classId, setClassId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [stream, setStream] = useState<Stream>("Science");
  const [subject, setSubject] = useState("");
  const [date, setDate] = useState(todayIso());

  const [roster, setRoster] = useState<RosterStudent[]>([]);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const listQuery = useQuery({
    queryKey: ["exam-daily-register"],
    queryFn: async () => (await registerService.list({ pageSize: 500 })).rows as RegisterRecord[],
  });

  useEffect(() => {
    if (!dialogOpen) return;
    apiFetch<{ data: ClassInfo[] }>("/classes")
      .then((res) => setClasses(res.data || []))
      .catch(() => toast.error("Failed to load classes"));
  }, [dialogOpen]);

  const selectedClass = classes.find((c) => c.id === classId);
  const sections = selectedClass?.sections || [];
  const needsStream = selectedClass ? isHigherSecondary(selectedClass.name) : false;
  const subjects = useMemo(
    () => (selectedClass ? getSubjectsForClass(selectedClass.name, stream) : []),
    [selectedClass, stream]
  );

  function openCreate() {
    setEditingId(null);
    setClassId(""); setSectionId(""); setSubject(""); setDate(todayIso());
    setRoster([]);
    setDialogOpen(true);
  }

  async function loadRoster() {
    if (!classId || !sectionId) { toast.error("Select a Class and Section first"); return; }
    if (!subject) { toast.error("Select a Subject first"); return; }

    setRosterLoading(true);
    try {
      const res = await apiFetch<{ data: any[] }>(
        `/students?classId=${classId}&sectionId=${sectionId}&limit=500&sortBy=rollNumber&sortOrder=asc`
      );
      const students = (res.data || []).map((s) => ({
        studentId: s.id,
        rollNumber: s.rollNumber,
        name: [s.firstName, s.middleName, s.lastName].filter(Boolean).join(" "),
        status: "ATTENDED" as const,
      }));
      setRoster(students);
      if (students.length === 0) toast.info("No active students found in this class/section");
    } catch (err: any) {
      toast.error(err?.message || "Failed to load students");
      setRoster([]);
    } finally {
      setRosterLoading(false);
    }
  }

  function toggleStatus(studentId: string) {
    setRoster((prev) => prev.map((r) =>
      r.studentId === studentId ? { ...r, status: r.status === "ATTENDED" ? "ABSENT" : "ATTENDED" } : r
    ));
  }

  function markAllAttended() {
    setRoster((prev) => prev.map((r) => ({ ...r, status: "ATTENDED" as const })));
  }

  async function handleSave() {
    if (!classId || !sectionId || !subject || roster.length === 0) {
      toast.error("Load the student list before saving");
      return;
    }

    const attendedCount = roster.filter((r) => r.status === "ATTENDED").length;
    const absentCount = roster.length - attendedCount;

    setSaving(true);
    try {
      const payload = {
        date, classId, className: selectedClass?.name || "",
        sectionId, sectionName: sections.find((s) => s.id === sectionId)?.name || "",
        subject, attendedCount, absentCount, records: roster,
      };
      if (editingId) await registerService.update(editingId, payload);
      else await registerService.create(payload);

      toast.success("Exam daily register saved");
      queryClient.invalidateQueries({ queryKey: ["exam-daily-register"] });
      setDialogOpen(false);
    } catch (err: any) {
      toast.error(err?.message || "Failed to save register");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleting) return;
    try {
      await registerService.remove(deleting.id);
      toast.success("Entry deleted");
      queryClient.invalidateQueries({ queryKey: ["exam-daily-register"] });
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete entry");
    } finally {
      setDeleting(null);
    }
  }

  const rows = listQuery.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Exam Daily Register</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Mark exam-day attendance for a class/subject — the student list comes straight from Student Management.
          </p>
        </div>
        <Button onClick={openCreate}>+ New</Button>
      </div>

      {listQuery.isLoading && (
        <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
      )}

      {!listQuery.isLoading && rows.length === 0 && (
        <p className="text-sm text-muted-foreground">No entries yet. Click "New" to mark exam attendance for a class/subject.</p>
      )}

      {!listQuery.isLoading && rows.length > 0 && (
        <div className="rounded-lg border overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr>
                <th className="text-left font-medium px-3 py-2">Date</th>
                <th className="text-left font-medium px-3 py-2">Class</th>
                <th className="text-left font-medium px-3 py-2">Subject</th>
                <th className="text-center font-medium px-3 py-2">Attended</th>
                <th className="text-center font-medium px-3 py-2">Absent</th>
                <th className="text-left font-medium px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="px-3 py-2">{r.date}</td>
                  <td className="px-3 py-2">{r.className} {r.sectionName}</td>
                  <td className="px-3 py-2">{r.subject}</td>
                  <td className="px-3 py-2 text-center text-green-600">{r.attendedCount}</td>
                  <td className="px-3 py-2 text-center text-red-600">{r.absentCount}</td>
                  <td className="px-3 py-2">
                    <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setDeleting(r)}>Delete</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── New entry dialog ────────────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Exam Daily Register Entry</DialogTitle>
            <DialogDescription>
              Pick a class, section, and subject — the subject list adapts automatically to the grade.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex flex-wrap gap-4">
              <div className="w-40">
                <Label>Class</Label>
                <Select value={classId} onValueChange={(v) => { setClassId(v); setSectionId(""); setSubject(""); setRoster([]); }}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select class" /></SelectTrigger>
                  <SelectContent>{classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="w-36">
                <Label>Section</Label>
                <Select value={sectionId} onValueChange={(v) => { setSectionId(v); setRoster([]); }} disabled={!classId}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{sections.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              {needsStream && (
                <div className="w-36">
                  <Label>Stream</Label>
                  <Select value={stream} onValueChange={(v) => { setStream(v as Stream); setSubject(""); }}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Science">Science</SelectItem>
                      <SelectItem value="Commerce">Commerce</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="w-48">
                <Label>Subject</Label>
                <Select value={subject} onValueChange={(v) => { setSubject(v); setRoster([]); }} disabled={!classId}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select subject" /></SelectTrigger>
                  <SelectContent>{subjects.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="w-40">
                <Label>Exam Date</Label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1" />
              </div>
              <div className="flex items-end">
                <Button type="button" variant="secondary" onClick={loadRoster} disabled={!classId || !sectionId || !subject || rosterLoading}>
                  {rosterLoading ? "Loading…" : "Load Students"}
                </Button>
              </div>
            </div>

            {rosterLoading && (
              <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
            )}

            {!rosterLoading && roster.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    {roster.filter((r) => r.status === "ATTENDED").length} attended, {roster.filter((r) => r.status === "ABSENT").length} absent
                  </p>
                  <Button variant="outline" size="sm" onClick={markAllAttended}>Mark All Attended</Button>
                </div>

                <div className="rounded-lg border overflow-hidden max-h-80 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/40 sticky top-0">
                      <tr>
                        <th className="text-left font-medium px-3 py-2">Roll No</th>
                        <th className="text-left font-medium px-3 py-2">Student</th>
                        <th className="text-center font-medium px-3 py-2">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {roster.map((r) => (
                        <tr key={r.studentId} className="border-t">
                          <td className="px-3 py-2">{r.rollNumber ?? "-"}</td>
                          <td className="px-3 py-2">{r.name}</td>
                          <td className="px-3 py-2 text-center">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className={r.status === "ATTENDED" ? "bg-green-600 hover:bg-green-600 text-white" : "bg-red-600 hover:bg-red-600 text-white"}
                              onClick={() => toggleStatus(r.studentId)}
                            >
                              {r.status === "ATTENDED" ? "Present" : "Absent"}
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

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || roster.length === 0}>
              {saving ? "Saving…" : "Save Register"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete confirmation ─────────────────────────────────────── */}
      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this entry?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the {deleting?.subject} attendance record for {deleting?.className} {deleting?.sectionName} on {deleting?.date}. This can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}