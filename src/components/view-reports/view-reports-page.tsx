import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { getClassesWithSections, createCrudService, type Record_ } from "@/lib/services/crud.service";
import { ProgressReportModal } from "@/components/progress-report-modal/progress-report-modal";

const studentsService = createCrudService<Record_>("new-student");
const ALL = "__all__";

function defaultAcademicYear() {
  const now = new Date();
  const y = now.getMonth() >= 5 ? now.getFullYear() : now.getFullYear() - 1;
  return `${y}-${String((y + 1) % 100).padStart(2, "0")}`;
}

interface StudentRow extends Record_ {
  firstName?: string;
  lastName?: string;
  rollNumber?: number | null;
  admissionNo?: string;
  classId?: string;
  sectionId?: string;
  class?: { name: string };
  section?: { name: string };
}

export function ViewReportsPage() {
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState(ALL);
  const [academicYear, setAcademicYear] = useState(defaultAcademicYear());
  const [viewingStudentId, setViewingStudentId] = useState<string | null>(null);

  const classesQuery = useQuery({
    queryKey: ["classes-with-sections"],
    queryFn: getClassesWithSections,
  });
  const classes = classesQuery.data ?? [];

  const studentsQuery = useQuery({
    queryKey: ["view-reports-students"],
    queryFn: async () => (await studentsService.list({ pageSize: 1000 })).rows as StudentRow[],
  });

  const filtered = useMemo(() => {
    const students = studentsQuery.data ?? [];
    const q = search.trim().toLowerCase();
    return students.filter((s) => {
      if (classFilter !== ALL && s.classId !== classFilter) return false;
      if (q) {
        const name = `${s.firstName ?? ""} ${s.lastName ?? ""}`.toLowerCase();
        if (!name.includes(q) && !(s.admissionNo ?? "").toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [studentsQuery.data, search, classFilter]);

  const isLoading = classesQuery.isLoading || studentsQuery.isLoading;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">View Reports</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Every student, across every class and section — click a student to view their progress report.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-4 rounded-lg border p-4">
        <div className="w-56">
          <Label>Search</Label>
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name or Admission No" className="mt-1" />
        </div>

        <div className="w-48">
          <Label>Class</Label>
          <Select value={classFilter} onValueChange={setClassFilter}>
            <SelectTrigger className="mt-1"><SelectValue placeholder="All classes" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All classes</SelectItem>
              {classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
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

      {!isLoading && filtered.length === 0 && (
        <p className="text-sm text-muted-foreground">No students match the current filters.</p>
      )}

      {!isLoading && filtered.length > 0 && (
        <div className="rounded-lg border overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr>
                <th className="text-left font-medium px-3 py-2">Admission No</th>
                <th className="text-left font-medium px-3 py-2">Roll No</th>
                <th className="text-left font-medium px-3 py-2">Name</th>
                <th className="text-left font-medium px-3 py-2">Class</th>
                <th className="text-left font-medium px-3 py-2">Section</th>
                <th className="text-left font-medium px-3 py-2">Report</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.id} className="border-t">
                  <td className="px-3 py-2">{s.admissionNo}</td>
                  <td className="px-3 py-2">{s.rollNumber ?? "-"}</td>
                  <td className="px-3 py-2">{s.firstName} {s.lastName}</td>
                  <td className="px-3 py-2">{s.class?.name}</td>
                  <td className="px-3 py-2">{s.section?.name}</td>
                  <td className="px-3 py-2">
                    <Button size="sm" onClick={() => setViewingStudentId(s.id)}>View Report</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ProgressReportModal
        studentId={viewingStudentId}
        academicYear={academicYear}
        onClose={() => setViewingStudentId(null)}
      />
    </div>
  );
}