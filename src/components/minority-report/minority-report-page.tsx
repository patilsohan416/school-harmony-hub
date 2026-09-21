import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { getClassesWithSections, createCrudService, type Record_ } from "@/lib/services/crud.service";

const studentsService = createCrudService<Record_>("new-student");
const ALL = "__all__";
const CATEGORY_OPTIONS = ["General", "OBC", "SC", "ST", "EWS"];

// Recognized minority religions under Indian law (National Commission for
// Minority Educational Institutions Act): Muslim, Christian, Sikh, Buddhist,
// Parsi (Zoroastrian), Jain.
const MINORITY_RELIGIONS = ["muslim", "christian", "sikh", "buddhist", "parsi", "zoroastrian", "jain"];
// Reserved categories, tracked separately from religion-based minority status.
const MINORITY_CATEGORIES = ["OBC", "SC", "ST", "EWS"];

interface StudentRow extends Record_ {
  firstName?: string;
  lastName?: string;
  admissionNo?: string;
  religion?: string;
  category?: string;
  classId?: string;
  sectionId?: string;
}

const REVERSE_CATEGORY_MAP: Record<string, string> = {
  GENERAL: "General", OBC: "OBC", SC: "SC", ST: "ST", EWS: "EWS",
};

function isReligionMinority(religion?: string) {
  if (!religion) return false;
  return MINORITY_RELIGIONS.includes(religion.trim().toLowerCase());
}

function isCategoryMinority(category?: string) {
  if (!category) return false;
  return MINORITY_CATEGORIES.includes(category.toUpperCase());
}

export function MinorityReportPage() {
  const queryClient = useQueryClient();
  const [savingId, setSavingId] = useState<string | null>(null);
  const [localReligion, setLocalReligion] = useState<Record<string, string>>({});
  const [classFilter, setClassFilter] = useState<string>(ALL);
  const [sectionFilter, setSectionFilter] = useState<string>(ALL);
  const [showAll, setShowAll] = useState(false);

  const classesQuery = useQuery({
    queryKey: ["classes-with-sections"],
    queryFn: getClassesWithSections,
  });

  const studentsQuery = useQuery({
    queryKey: ["minority-report-students"],
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

    return visibleClasses
      .map((c) => ({
        ...c,
        sections: c.sections
          .filter((s) => sectionFilter === ALL || s.id === sectionFilter)
          .map((s) => ({
            ...s,
            students: students
              .filter((st) => st.classId === c.id && st.sectionId === s.id)
              .filter((st) => showAll || isReligionMinority(st.religion) || isCategoryMinority(st.category))
              .sort((a, b) => `${a.firstName}`.localeCompare(`${b.firstName}`)),
          }))
          .filter((s) => s.students.length > 0 || sectionFilter !== ALL),
      }))
      .filter((c) => c.sections.length > 0 || classFilter !== ALL);
  }, [classes, studentsQuery.data, classFilter, sectionFilter, showAll]);

  async function saveReligion(student: StudentRow, value: string) {
    const trimmed = value.trim();
    if (trimmed === (student.religion || "")) return;

    setSavingId(student.id);
    try {
      await studentsService.update(student.id, { religion: trimmed } as Partial<Record_>);
      toast.success(`Religion updated for ${student.firstName} ${student.lastName ?? ""}`);
      queryClient.invalidateQueries({ queryKey: ["minority-report-students"] });
    } catch (err: any) {
      toast.error(err?.message || "Failed to update religion");
      setLocalReligion((prev) => ({ ...prev, [student.id]: student.religion || "" }));
    } finally {
      setSavingId(null);
    }
  }

  async function saveCategory(student: StudentRow, category: string) {
    setSavingId(student.id);
    try {
      await studentsService.update(student.id, { category } as Partial<Record_>);
      toast.success(`Category updated for ${student.firstName} ${student.lastName ?? ""}`);
      queryClient.invalidateQueries({ queryKey: ["minority-report-students"] });
    } catch (err: any) {
      toast.error(err?.message || "Failed to update category");
    } finally {
      setSavingId(null);
    }
  }

  const isLoading = classesQuery.isLoading || studentsQuery.isLoading;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Minority Report</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Pulled live from Student Management. A student counts as minority by Religion (Muslim, Christian, Sikh,
          Buddhist, Parsi, Jain) or by reserved Category (OBC/SC/ST/EWS).
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Select value={classFilter} onValueChange={(v) => { setClassFilter(v); setSectionFilter(ALL); }}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All classes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All classes</SelectItem>
            {classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={sectionFilter} onValueChange={setSectionFilter} disabled={classFilter === ALL}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All sections" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All sections</SelectItem>
            {sectionOptions.map((s) => <SelectItem key={s.id} value={s.id}>Section {s.name}</SelectItem>)}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2 ml-2">
          <Switch id="show-all" checked={showAll} onCheckedChange={setShowAll} />
          <Label htmlFor="show-all" className="text-sm cursor-pointer">
            Show all students (not just minority)
          </Label>
        </div>
      </div>

      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
      )}

      {!isLoading && grouped.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No minority students found{classFilter !== ALL ? " in this class/section" : ""}. Toggle "Show all students" to check everyone.
        </p>
      )}

      {!isLoading &&
        grouped.map((c) => (
          <Card key={c.id}>
            <CardHeader>
              <CardTitle className="text-lg">{c.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {c.sections.map((s) => (
                <div key={s.id} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">Section {s.name}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {s.students.length} student{s.students.length === 1 ? "" : "s"}
                    </span>
                  </div>

                  {s.students.length === 0 ? (
                    <p className="text-xs text-muted-foreground pl-1">No matching students in this section.</p>
                  ) : (
                    <div className="rounded-lg border overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/40">
                          <tr>
                            <th className="text-left font-medium px-3 py-2">Admission No</th>
                            <th className="text-left font-medium px-3 py-2">Student</th>
                            <th className="text-left font-medium px-3 py-2 w-48">Religion</th>
                            <th className="text-left font-medium px-3 py-2 w-40">Category</th>
                            <th className="text-left font-medium px-3 py-2 w-28">Minority</th>
                          </tr>
                        </thead>
                        <tbody>
                          {s.students.map((st) => {
                            const currentReligion =
                              localReligion[st.id] !== undefined ? localReligion[st.id] : st.religion || "";
                            const displayCategory = st.category ? REVERSE_CATEGORY_MAP[st.category] ?? st.category : "";
                            const religionMinority = isReligionMinority(st.religion);
                            const categoryMinority = isCategoryMinority(st.category);
                            const isMinority = religionMinority || categoryMinority;

                            return (
                              <tr key={st.id} className="border-t">
                                <td className="px-3 py-2">{st.admissionNo}</td>
                                <td className="px-3 py-2">{st.firstName} {st.lastName}</td>
                                <td className="px-3 py-2">
                                  <Input
                                    className="h-8"
                                    value={currentReligion}
                                    disabled={savingId === st.id}
                                    onChange={(e) => setLocalReligion((prev) => ({ ...prev, [st.id]: e.target.value }))}
                                    onBlur={(e) => saveReligion(st, e.target.value)}
                                  />
                                </td>
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
                                      {CATEGORY_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                                    </SelectContent>
                                  </Select>
                                </td>
                                <td className="px-3 py-2">
                                  {isMinority ? (
                                    <Badge>{religionMinority && categoryMinority ? "Both" : religionMinority ? "Religion" : "Category"}</Badge>
                                  ) : (
                                    <span className="text-xs text-muted-foreground">No</span>
                                  )}
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
