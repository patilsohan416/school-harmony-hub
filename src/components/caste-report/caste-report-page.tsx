import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { getClassesWithSections, createCrudService, type Record_ } from "@/lib/services/crud.service";

const studentsService = createCrudService<Record_>("new-student");
const ALL = "__all__";
const CATEGORY_OPTIONS = ["General", "OBC", "SC", "ST", "EWS"];

interface StudentRow extends Record_ {
  firstName?: string;
  lastName?: string;
  admissionNo?: string;
  category?: string;
  caste?: string;
  classId?: string;
  sectionId?: string;
}

const REVERSE_CATEGORY_MAP: Record<string, string> = {
  GENERAL: "General", OBC: "OBC", SC: "SC", ST: "ST", EWS: "EWS",
};

export function CasteReportPage() {
  const queryClient = useQueryClient();
  const [savingId, setSavingId] = useState<string | null>(null);
  const [localCaste, setLocalCaste] = useState<Record<string, string>>({});
  const [classFilter, setClassFilter] = useState<string>(ALL);
  const [sectionFilter, setSectionFilter] = useState<string>(ALL);

  const classesQuery = useQuery({
    queryKey: ["classes-with-sections"],
    queryFn: getClassesWithSections,
  });

  const studentsQuery = useQuery({
    queryKey: ["caste-report-students"],
    queryFn: async () => (await studentsService.list({ pageSize: 1000 })).rows as StudentRow[],
  });

  const classes = classesQuery.data ?? [];

  const sectionOptions = useMemo(() => {
    if (classFilter === ALL) return [];
    return classes.find((c) => c.id === classFilter)?.sections ?? [];
  }, [classes, classFilter]);

  const grouped = useMemo(() => {
    const students = studentsQuery.data ?? [];
    const visibleClasses = classes.filter((c) => classFilter === ALL || c.id === classFilter);

    return visibleClasses.map((c) => ({
      ...c,
      sections: c.sections
        .filter((s) => sectionFilter === ALL || s.id === sectionFilter)
        .map((s) => ({
          ...s,
          students: students
            .filter((st) => st.classId === c.id && st.sectionId === s.id)
            .sort((a, b) => `${a.firstName}`.localeCompare(`${b.firstName}`)),
        })),
    }));
  }, [classes, studentsQuery.data, classFilter, sectionFilter]);

  async function saveCategory(student: StudentRow, category: string) {
    setSavingId(student.id);
    try {
      await studentsService.update(student.id, { category } as Partial<Record_>);
      toast.success(`Category updated for ${student.firstName} ${student.lastName ?? ""}`);
      queryClient.invalidateQueries({ queryKey: ["caste-report-students"] });
    } catch (err: any) {
      toast.error(err?.message || "Failed to update category");
    } finally {
      setSavingId(null);
    }
  }

  async function saveCaste(student: StudentRow, value: string) {
    const trimmed = value.trim();
    if (trimmed === (student.caste || "")) return;

    setSavingId(student.id);
    try {
      await studentsService.update(student.id, { caste: trimmed } as Partial<Record_>);
      toast.success(`Caste updated for ${student.firstName} ${student.lastName ?? ""}`);
      queryClient.invalidateQueries({ queryKey: ["caste-report-students"] });
    } catch (err: any) {
      toast.error(err?.message || "Failed to update caste");
      setLocalCaste((prev) => ({ ...prev, [student.id]: student.caste || "" }));
    } finally {
      setSavingId(null);
    }
  }

  const isLoading = classesQuery.isLoading || studentsQuery.isLoading;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Caste Report</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Pulled live from Student Management, grouped by class and section. Edit Category or Caste and it saves automatically.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Select
          value={classFilter}
          onValueChange={(v) => { setClassFilter(v); setSectionFilter(ALL); }}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All classes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All classes</SelectItem>
            {classes.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={sectionFilter} onValueChange={setSectionFilter} disabled={classFilter === ALL}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All sections" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All sections</SelectItem>
            {sectionOptions.map((s) => (
              <SelectItem key={s.id} value={s.id}>Section {s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
      )}

      {!isLoading && grouped.length === 0 && (
        <p className="text-sm text-muted-foreground">No classes found. Add classes first.</p>
      )}

      {!isLoading &&
        grouped.map((c) => (
          <Card key={c.id}>
            <CardHeader>
              <CardTitle className="text-lg">{c.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {c.sections.length === 0 && (
                <p className="text-sm text-muted-foreground">No sections match the current filter.</p>
              )}
              {c.sections.map((s) => (
                <div key={s.id} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">Section {s.name}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {s.students.length} student{s.students.length === 1 ? "" : "s"}
                    </span>
                  </div>

                  {s.students.length === 0 ? (
                    <p className="text-xs text-muted-foreground pl-1">No students in this section yet.</p>
                  ) : (
                    <div className="rounded-lg border overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/40">
                          <tr>
                            <th className="text-left font-medium px-3 py-2">Admission No</th>
                            <th className="text-left font-medium px-3 py-2">Student</th>
                            <th className="text-left font-medium px-3 py-2 w-40">Category</th>
                            <th className="text-left font-medium px-3 py-2 w-48">Caste</th>
                          </tr>
                        </thead>
                        <tbody>
                          {s.students.map((st) => {
                            const currentCaste =
                              localCaste[st.id] !== undefined ? localCaste[st.id] : st.caste || "";
                            const displayCategory = st.category
                              ? REVERSE_CATEGORY_MAP[st.category] ?? st.category
                              : "";
                            return (
                              <tr key={st.id} className="border-t">
                                <td className="px-3 py-2">{st.admissionNo}</td>
                                <td className="px-3 py-2">{st.firstName} {st.lastName}</td>
                                <td className="px-3 py-2">
                                  <Select
                                    value={displayCategory}
                                    onValueChange={(v) => saveCategory(st, v.toUpperCase())}
                                    disabled={savingId === st.id}
                                  >
                                    <SelectTrigger className="h-8">
                                      <SelectValue placeholder="Select" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {CATEGORY_OPTIONS.map((o) => (
                                        <SelectItem key={o} value={o}>{o}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </td>
                                <td className="px-3 py-2">
                                  <Input
                                    className="h-8"
                                    value={currentCaste}
                                    disabled={savingId === st.id}
                                    onChange={(e) => setLocalCaste((prev) => ({ ...prev, [st.id]: e.target.value }))}
                                    onBlur={(e) => saveCaste(st, e.target.value)}
                                  />
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
    </div>
  );
}
