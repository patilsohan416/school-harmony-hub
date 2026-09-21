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

interface SectionInfo { id: string; name: string; }
interface ClassInfo { id: string; name: string; sections: SectionInfo[]; }

interface StudentRow {
  id: string;
  admissionNo: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  dateOfBirth: string;
  admissionDate?: string;
  class?: { name: string };
  section?: { name: string };
  heightCm?: number | string | null;
  weightKg?: number | string | null;
}

function formatDate(value?: string) {
  if (!value) return "-";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("en-GB");
}

function formatNumber(value?: number | string | null) {
  if (value === undefined || value === null || value === "") return "-";
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return "-";
  return num.toFixed(1);
}

const PAGE_SIZE = 50;

export function StudentRegisterPage() {
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [classId, setClassId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");

  const [rows, setRows] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    apiFetch<{ data: ClassInfo[] }>("/classes")
      .then((res) => setClasses(res.data || []))
      .catch(() => toast.error("Failed to load classes"));
  }, []);

  const sections = useMemo(
    () => classes.find((c) => c.id === classId)?.sections || [],
    [classes, classId]
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const query = new URLSearchParams({
      page: String(page),
      limit: String(PAGE_SIZE),
      sortBy: "admissionNo",
      sortOrder: "asc",
    });
    if (classId) query.set("classId", classId);
    if (sectionId) query.set("sectionId", sectionId);
    if (search) query.set("search", search);

    apiFetch<{ data: StudentRow[]; pagination: { total: number } }>(`/students?${query}`)
      .then((res) => {
        if (cancelled) return;
        setRows(res.data || []);
        setTotal(res.pagination?.total || 0);
      })
      .catch((err) => {
        if (cancelled) return;
        toast.error(err?.message || "Failed to load students");
        setRows([]);
      })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [page, classId, sectionId, search]);

  function runSearch() {
    setPage(1);
    setSearch(searchInput.trim());
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Student Register</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Live register pulled from Student Management — add or edit students there, this view stays in sync.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-4 rounded-lg border p-4">
        <div className="w-48">
          <Label>Class</Label>
          <Select
            value={classId || "all"}
            onValueChange={(v) => { setClassId(v === "all" ? "" : v); setSectionId(""); setPage(1); }}
          >
            <SelectTrigger className="mt-1"><SelectValue placeholder="All classes" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All classes</SelectItem>
              {classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="w-48">
          <Label>Section</Label>
          <Select
            value={sectionId || "all"}
            onValueChange={(v) => { setSectionId(v === "all" ? "" : v); setPage(1); }}
            disabled={!classId}
          >
            <SelectTrigger className="mt-1"><SelectValue placeholder="All sections" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All sections</SelectItem>
              {sections.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1 min-w-[220px]">
          <Label>Search</Label>
          <div className="flex gap-2 mt-1">
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && runSearch()}
              placeholder="Admission No or name"
            />
            <Button type="button" variant="secondary" onClick={runSearch}>Search</Button>
          </div>
        </div>
      </div>

      {loading && (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
        </div>
      )}

      {!loading && rows.length === 0 && (
        <p className="text-sm text-muted-foreground">No students found for these filters.</p>
      )}

      {!loading && rows.length > 0 && (
        <div className="space-y-3">
          <div className="rounded-lg border overflow-hidden overflow-x-auto">
            <div className="px-3 py-2 text-xs text-muted-foreground border-b bg-muted/20">{total} student(s)</div>
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr>
                  <th className="text-left font-medium px-3 py-2">Sr. No</th>
                  <th className="text-left font-medium px-3 py-2">Admission No</th>
                  <th className="text-left font-medium px-3 py-2">Student</th>
                  <th className="text-left font-medium px-3 py-2">Class</th>
                  <th className="text-left font-medium px-3 py-2">Date of Birth</th>
                  <th className="text-left font-medium px-3 py-2">Admission Date</th>
                  <th className="text-left font-medium px-3 py-2">Height (cm)</th>
                  <th className="text-left font-medium px-3 py-2">Weight (kg)</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((s, idx) => (
                  <tr key={s.id} className="border-t">
                    <td className="px-3 py-2">{(page - 1) * PAGE_SIZE + idx + 1}</td>
                    <td className="px-3 py-2">{s.admissionNo}</td>
                    <td className="px-3 py-2">
                      {[s.firstName, s.middleName, s.lastName].filter(Boolean).join(" ")}
                    </td>
                    <td className="px-3 py-2">
                      {s.class?.name || "-"}{s.section?.name ? ` - ${s.section.name}` : ""}
                    </td>
                    <td className="px-3 py-2">{formatDate(s.dateOfBirth)}</td>
                    <td className="px-3 py-2">{formatDate(s.admissionDate)}</td>
                    <td className="px-3 py-2">{formatNumber(s.heightCm)}</td>
                    <td className="px-3 py-2">{formatNumber(s.weightKg)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Page {page} of {totalPages}</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  Previous
                </Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}