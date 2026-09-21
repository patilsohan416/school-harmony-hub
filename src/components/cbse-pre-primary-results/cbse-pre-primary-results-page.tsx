import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api/client";
import { createCrudService, type Record_ } from "@/lib/services/crud.service";
import type { User } from "@/lib/services/auth.service";

// CBSE Pre-Primary Results — Nursery/LKG/UKG have NO numerical marks under
// CBSE (qualitative observations, stars, and smiley faces only), so this
// page fetches every Pre-Primary student straight from Student Management
// and lets a teacher record/save a qualitative rating + remark per student
// per term, via the same generic storage mechanism as ICSE Student
// Promotion — there's no marks table to compute this from.

const remarksService = createCrudService<Record_>("cbse-pre-primary-results");

const RATINGS = ["Excellent", "Very Good", "Good", "Satisfactory", "Needs Improvement"] as const;
type Rating = typeof RATINGS[number];

const RATING_STARS: Record<Rating, string> = {
  "Excellent": "★★★★★",
  "Very Good": "★★★★☆",
  "Good": "★★★☆☆",
  "Satisfactory": "★★☆☆☆",
  "Needs Improvement": "★☆☆☆☆",
};

const TERM_OPTIONS = ["Half Yearly Examination", "Annual Examination"];

function getSchoolInfo() {
  let user: Partial<User> = {};
  try { user = JSON.parse(localStorage.getItem("user") || "{}"); } catch { /* ignore */ }
  return { schoolName: user.schoolName || "YOUR SCHOOL NAME" };
}

interface SectionInfo { id: string; name: string; }
interface ClassInfo { id: string; name: string; sections: SectionInfo[]; }

function isPrePrimaryClass(className: string): boolean {
  const norm = className.toLowerCase();
  return /nursery|play\s*group|pre[- ]?nursery|lkg|l\.k\.g|jr\.?\s*kg|ukg|u\.k\.g|sr\.?\s*kg/.test(norm);
}

interface StudentRow {
  id: string;
  firstName?: string;
  lastName?: string;
  rollNumber?: number | null;
  admissionNo?: string;
  classId?: string;
  sectionId?: string;
  class?: { name: string };
  section?: { name: string };
}

interface RemarkRecord extends Record_ {
  studentId?: string;
  studentName?: string;
  className?: string;
  sectionName?: string;
  term?: string;
  academicYear?: string;
  rating?: Rating;
  remark?: string;
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

function buildReportHtml(studentName: string, className: string, sectionName: string, term: string, academicYear: string, rating: Rating, remark: string): string {
  const school = getSchoolInfo();
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Report - ${escapeHtml(studentName)}</title>
<style>
  @page { size: A4; margin: 0; }
  body { font-family: Georgia, 'Times New Roman', serif; margin: 0; padding: 50px; color: #1a1a2e; }
  .border { border: 6px double #1a3a6b; padding: 40px; min-height: 620px; text-align: center; }
  .school-name { font-size: 26px; font-weight: bold; color: #1a3a6b; }
  .title { font-size: 20px; font-weight: bold; text-transform: uppercase; letter-spacing: 3px; margin: 24px 0; color: #1a3a6b; border-top: 2px solid #1a3a6b; border-bottom: 2px solid #1a3a6b; padding: 10px 0; }
  .body-text { font-size: 15px; line-height: 2; margin: 0 20px 24px; }
  .body-text b { color: #1a3a6b; }
  .stars { font-size: 40px; color: #f5a623; margin: 24px 0; letter-spacing: 6px; }
  .rating-label { font-size: 18px; font-weight: bold; color: #1a3a6b; }
  .remark-box { border: 1px solid #999; border-radius: 8px; padding: 16px; margin: 24px auto; max-width: 500px; font-size: 14px; text-align: left; min-height: 60px; }
  .footer { display: flex; justify-content: space-between; margin-top: 60px; padding: 0 20px; font-size: 13px; }
  .footer div { text-align: center; border-top: 1px solid #333; padding-top: 6px; width: 180px; }
</style>
</head>
<body>
  <div class="border">
    <div class="school-name">${escapeHtml(school.schoolName)}</div>
    <div class="title">Pre-Primary Progress Report</div>
    <p class="body-text">
      Student: <b>${escapeHtml(studentName)}</b> &nbsp;|&nbsp;
      Class: <b>${escapeHtml(className)} - ${escapeHtml(sectionName)}</b> &nbsp;|&nbsp;
      ${escapeHtml(term)}, ${escapeHtml(academicYear)}
    </p>
    <div class="stars">${RATING_STARS[rating]}</div>
    <div class="rating-label">${escapeHtml(rating)}</div>
    <div class="remark-box">${escapeHtml(remark || "No remarks entered yet.")}</div>
    <div class="footer">
      <div>Class Teacher</div>
      <div>Date: ${new Date().toLocaleDateString()}</div>
      <div>Principal</div>
    </div>
  </div>
</body>
</html>`;
}

export function CbsePrePrimaryResultsPage() {
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [classId, setClassId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [term, setTerm] = useState("Term 1");
  const [academicYear, setAcademicYear] = useState(defaultAcademicYear());

  const [drafts, setDrafts] = useState<Record<string, { rating: Rating; remark: string }>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<{ data: ClassInfo[] }>("/classes")
      .then((res) => setClasses((res.data || []).filter((c) => isPrePrimaryClass(c.name))))
      .catch(() => toast.error("Failed to load classes"));
  }, []);

  const sections = useMemo(() => classes.find((c) => c.id === classId)?.sections || [], [classes, classId]);

  const studentsQuery = useQuery({
    queryKey: ["cbse-pre-primary-students", classId, sectionId],
    queryFn: async () => {
      const params = new URLSearchParams({ pageSize: "500" });
      if (classId) params.set("classId", classId);
      if (sectionId) params.set("sectionId", sectionId);
      const res = await apiFetch<{ data: StudentRow[] }>(`/students?${params}`);
      return res.data || [];
    },
    enabled: classes.length > 0,
  });

  const remarksQuery = useQuery({
    queryKey: ["cbse-pre-primary-remarks"],
    queryFn: async () => (await remarksService.list({ pageSize: 1000 })).rows as RemarkRecord[],
  });

  const students = useMemo(() => {
    const list = studentsQuery.data ?? [];
    const q = search.trim().toLowerCase();
    let filtered = list;
    if (!classId) {
      const prePrimaryClassIds = new Set(classes.map((c) => c.id));
      filtered = filtered.filter((s) => s.classId && prePrimaryClassIds.has(s.classId));
    }
    if (q) {
      filtered = filtered.filter((s) => `${s.firstName ?? ""} ${s.lastName ?? ""}`.toLowerCase().includes(q));
    }
    return filtered;
  }, [studentsQuery.data, search, classId, classes]);

  const remarksByStudent = useMemo(() => {
    const map = new Map<string, RemarkRecord>();
    for (const r of remarksQuery.data ?? []) {
      if (r.studentId && r.term === term && r.academicYear === academicYear) map.set(r.studentId, r);
    }
    return map;
  }, [remarksQuery.data, term, academicYear]);

  function getDraft(studentId: string): { rating: Rating; remark: string } {
    if (drafts[studentId]) return drafts[studentId];
    const saved = remarksByStudent.get(studentId);
    return { rating: (saved?.rating as Rating) || "Good", remark: saved?.remark || "" };
  }

  function updateDraft(studentId: string, patch: Partial<{ rating: Rating; remark: string }>) {
    setDrafts((prev) => ({ ...prev, [studentId]: { ...getDraft(studentId), ...patch } }));
  }

  async function saveRemark(s: StudentRow) {
    const draft = getDraft(s.id);
    setSavingId(s.id);
    try {
      const existing = remarksByStudent.get(s.id);
      const payload = {
        studentId: s.id,
        studentName: `${s.firstName ?? ""} ${s.lastName ?? ""}`.trim(),
        className: s.class?.name || "",
        sectionName: s.section?.name || "",
        term,
        academicYear,
        rating: draft.rating,
        remark: draft.remark,
      };
      if (existing) await remarksService.update(existing.id, payload);
      else await remarksService.create(payload);
      toast.success("Remark saved");
      queryClient.invalidateQueries({ queryKey: ["cbse-pre-primary-remarks"] });
    } catch (err: any) {
      toast.error(err?.message || "Failed to save remark");
    } finally {
      setSavingId(null);
    }
  }

  function printReport(s: StudentRow) {
    const draft = getDraft(s.id);
    const name = `${s.firstName ?? ""} ${s.lastName ?? ""}`.trim();
    const html = buildReportHtml(name, s.class?.name || "", s.section?.name || "", term, academicYear, draft.rating, draft.remark);
    const printWindow = window.open("", "_blank", "width=850,height=1100");
    if (!printWindow) { toast.error("Please allow pop-ups to print the report"); return; }
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 300);
  }

  const isLoading = studentsQuery.isLoading || remarksQuery.isLoading;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">CBSE Pre-Primary Results</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Nursery/LKG/UKG are evaluated qualitatively (stars &amp; remarks, no numerical marks) — students are pulled automatically from Student Management.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-4 rounded-lg border p-4">
        
        <div className="w-40">
          <Label>Class</Label>
          <Select value={classId} onValueChange={(v) => { setClassId(v); setSectionId(""); }}>
            <SelectTrigger className="mt-1"><SelectValue placeholder="All classes" /></SelectTrigger>
            <SelectContent>
              {classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="w-40">
          <Label>Section</Label>
          <Select value={sectionId} onValueChange={setSectionId} disabled={!classId}>
            <SelectTrigger className="mt-1"><SelectValue placeholder="All sections" /></SelectTrigger>
            <SelectContent>
              {sections.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="w-36">
          <Label>Term</Label>
          <Select value={term} onValueChange={setTerm}>
            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              {TERM_OPTIONS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="w-36">
          <Label>Academic Year</Label>
          <Input value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} className="mt-1" />
        </div>
      </div>

      {isLoading && (
        <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
      )}

      {!isLoading && students.length === 0 && (
        <p className="text-sm text-muted-foreground">No Pre-Primary students found.</p>
      )}

      {!isLoading && students.length > 0 && (
        <div className="rounded-lg border overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr>
                <th className="text-left font-medium px-3 py-2">Student</th>
                <th className="text-left font-medium px-3 py-2">Class</th>
                <th className="text-left font-medium px-3 py-2">Rating</th>
                <th className="text-left font-medium px-3 py-2">Remarks</th>
                <th className="text-right font-medium px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => {
                const draft = getDraft(s.id);
                return (
                  <tr key={s.id} className="border-t align-top">
                    <td className="px-3 py-2">{s.firstName} {s.lastName}</td>
                    <td className="px-3 py-2">{s.class?.name} - {s.section?.name}</td>
                    <td className="px-3 py-2">
                      <Select value={draft.rating} onValueChange={(v) => updateDraft(s.id, { rating: v as Rating })}>
                        <SelectTrigger className="h-8 w-44"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {RATINGS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        value={draft.remark}
                        onChange={(e) => updateDraft(s.id, { remark: e.target.value })}
                        placeholder="e.g. Enjoys storytelling, participates well"
                        className="h-8 w-64"
                      />
                    </td>
                    <td className="px-3 py-2 text-right space-x-2 whitespace-nowrap">
                      <Button size="sm" onClick={() => saveRemark(s)} disabled={savingId === s.id}>
                        {savingId === s.id ? "Saving…" : "Save"}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => printReport(s)}>Print</Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}