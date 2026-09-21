import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getClassesWithSections, createCrudService, type Record_ } from "@/lib/services/crud.service";
import { tField } from "@/lib/i18n-helpers";

const studentsService = createCrudService<Record_>("new-student");
const ALL = "__all__";

interface StudentRow extends Record_ {
  firstName?: string;
  lastName?: string;
  admissionNo?: string;
  rollNumber?: number | null;
  classId?: string;
  sectionId?: string;
}

export function RollNumberPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [savingId, setSavingId] = useState<string | null>(null);
  const [localValues, setLocalValues] = useState<Record<string, string>>({});
  const [classFilter, setClassFilter] = useState<string>(ALL);
  const [sectionFilter, setSectionFilter] = useState<string>(ALL);

  const classesQuery = useQuery({
    queryKey: ["classes-with-sections"],
    queryFn: getClassesWithSections,
  });

  const studentsQuery = useQuery({
    queryKey: ["roll-number-students"],
    queryFn: async () => (await studentsService.list({ pageSize: 1000 })).rows as StudentRow[],
  });

  const classes = classesQuery.data ?? [];

  // Section filter options depend on which class is selected.
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
            .sort((a, b) => (a.rollNumber ?? 0) - (b.rollNumber ?? 0)),
        })),
    }));
  }, [classes, studentsQuery.data, classFilter, sectionFilter]);

  async function saveRollNumber(student: StudentRow, value: string) {
    const trimmed = value.trim();
    if (trimmed === "" || trimmed === String(student.rollNumber ?? "")) return;

    const rollNumber = Number(trimmed);
    if (!Number.isInteger(rollNumber) || rollNumber < 1) {
      toast.error(t("rollNumberPage.toastInvalid"));
      return;
    }

    setSavingId(student.id);
    try {
      await studentsService.update(student.id, { rollNumber } as Partial<Record_>);
      toast.success(
        t("rollNumberPage.toastUpdated", { name: `${student.firstName} ${student.lastName ?? ""}`.trim() })
      );
      queryClient.invalidateQueries({ queryKey: ["roll-number-students"] });
    } catch (err: any) {
      toast.error(err?.message || t("rollNumberPage.toastFailed"));
      // Reset the local input back to the saved value on failure.
      setLocalValues((prev) => ({ ...prev, [student.id]: String(student.rollNumber ?? "") }));
    } finally {
      setSavingId(null);
    }
  }

  const isLoading = classesQuery.isLoading || studentsQuery.isLoading;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("rollNumberPage.title")}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t("rollNumberPage.subtitle")}</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Select
          value={classFilter}
          onValueChange={(v) => {
            setClassFilter(v);
            setSectionFilter(ALL); // reset section when class changes
          }}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder={t("rollNumberPage.allClasses")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t("rollNumberPage.allClasses")}</SelectItem>
            {classes.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={sectionFilter} onValueChange={setSectionFilter} disabled={classFilter === ALL}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder={t("rollNumberPage.allSections")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t("rollNumberPage.allSections")}</SelectItem>
            {sectionOptions.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {t("rollNumberPage.section")} {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      )}

      {!isLoading && grouped.length === 0 && (
        <p className="text-sm text-muted-foreground">{t("rollNumberPage.noClasses")}</p>
      )}

      {!isLoading &&
        grouped.map((c) => (
          <Card key={c.id}>
            <CardHeader>
              <CardTitle className="text-lg">{c.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {c.sections.length === 0 && (
                <p className="text-sm text-muted-foreground">{t("rollNumberPage.noSectionsMatch")}</p>
              )}
              {c.sections.map((s) => (
                <div key={s.id} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">
                      {t("rollNumberPage.section")} {s.name}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {t("rollNumberPage.student", { count: s.students.length })}
                    </span>
                  </div>

                  {s.students.length === 0 ? (
                    <p className="text-xs text-muted-foreground pl-1">{t("rollNumberPage.noStudents")}</p>
                  ) : (
                    <div className="rounded-lg border overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/40">
                          <tr>
                            <th className="text-left font-medium px-3 py-2">{tField("Admission No")}</th>
                            <th className="text-left font-medium px-3 py-2">{tField("Student")}</th>
                            <th className="text-left font-medium px-3 py-2 w-32">{tField("Roll No")}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {s.students.map((st) => {
                            const currentValue =
                              localValues[st.id] !== undefined
                                ? localValues[st.id]
                                : String(st.rollNumber ?? "");
                            return (
                              <tr key={st.id} className="border-t">
                                <td className="px-3 py-2">{st.admissionNo}</td>
                                <td className="px-3 py-2">
                                  {st.firstName} {st.lastName}
                                </td>
                                <td className="px-3 py-2">
                                  <Input
                                    type="number"
                                    min={1}
                                    className="h-8 w-20"
                                    value={currentValue}
                                    disabled={savingId === st.id}
                                    onChange={(e) =>
                                      setLocalValues((prev) => ({ ...prev, [st.id]: e.target.value }))
                                    }
                                    onBlur={(e) => saveRollNumber(st, e.target.value)}
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
