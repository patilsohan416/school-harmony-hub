import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import { ExportMenu } from "@/components/crud/export-menu";
import { getClassesWithSections, createCrudService, type Record_ } from "@/lib/services/crud.service";

const studentsService = createCrudService<Record_>("new-student");
const ALL = "__all__";

interface StudentRow extends Record_ {
  admissionNo?: string;
  rollNumber?: number | null;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  dateOfBirth?: string;
  gender?: string;
  bloodGroup?: string;
  aadhaar?: string;
  category?: string;
  religion?: string;
  nationality?: string;
  guardianName?: string;
  guardianMobile?: string;
  email?: string;
  admissionDate?: string;
  previousSchool?: string;
  status?: string;
  classId?: string;
  sectionId?: string;
  class?: { name: string };
  section?: { name: string };
}

const REVERSE_CATEGORY_MAP: Record<string, string> = {
  GENERAL: "General", OBC: "OBC", SC: "SC", ST: "ST", EWS: "EWS",
};

function fullName(s: StudentRow) {
  return [s.firstName, s.middleName, s.lastName].filter(Boolean).join(" ");
}

function formatDate(value?: string) {
  if (!value) return "-";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

const EXPORT_COLUMNS = [
  { key: "admissionNo", label: "Admission No" },
  { key: "rollNo", label: "Roll No" },
  { key: "name", label: "Student Name" },
  { key: "className", label: "Class" },
  { key: "sectionName", label: "Division" },
  { key: "dob", label: "Date of Birth" },
  { key: "gender", label: "Gender" },
  { key: "bloodGroup", label: "Blood Group" },
  { key: "category", label: "Category" },
  { key: "religion", label: "Religion" },
  { key: "nationality", label: "Nationality" },
  { key: "guardianName", label: "Guardian Name" },
  { key: "guardianMobile", label: "Guardian Mobile" },
  { key: "email", label: "Email" },
  { key: "admissionDate", label: "Admission Date" },
  { key: "status", label: "Status" },
];

export function StudentReportsPage() {
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState(ALL);
  const [sectionFilter, setSectionFilter] = useState(ALL);
  const [genderFilter, setGenderFilter] = useState(ALL);
  const [categoryFilter, setCategoryFilter] = useState(ALL);
  const [viewing, setViewing] = useState<StudentRow | null>(null);

  const classesQuery = useQuery({
    queryKey: ["classes-with-sections"],
    queryFn: getClassesWithSections,
  });

  const studentsQuery = useQuery({
    queryKey: ["student-reports-students"],
    queryFn: async () => (await studentsService.list({ pageSize: 1000 })).rows as StudentRow[],
  });

  const classes = classesQuery.data ?? [];
  const sectionOptions = useMemo(() => {
    if (classFilter === ALL) return [];
    return classes.find((c) => c.id === classFilter)?.sections ?? [];
  }, [classes, classFilter]);

  const filtered = useMemo(() => {
    const students = studentsQuery.data ?? [];
    const q = search.trim().toLowerCase();

    return students.filter((s) => {
      if (classFilter !== ALL && s.classId !== classFilter) return false;
      if (sectionFilter !== ALL && s.sectionId !== sectionFilter) return false;
      if (genderFilter !== ALL && (s.gender || "").toUpperCase() !== genderFilter) return false;
      if (categoryFilter !== ALL && (s.category || "").toUpperCase() !== categoryFilter) return false;
      if (q) {
        const haystack = [s.admissionNo, fullName(s), s.guardianMobile].join(" ").toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [studentsQuery.data, search, classFilter, sectionFilter, genderFilter, categoryFilter]);

  const exportRows = filtered.map((s) => ({
    admissionNo: s.admissionNo || "",
    rollNo: s.rollNumber ?? "",
    name: fullName(s),
    className: s.class?.name || "",
    sectionName: s.section?.name || "",
    dob: formatDate(s.dateOfBirth),
    gender: s.gender || "",
    bloodGroup: s.bloodGroup || "",
    category: s.category ? REVERSE_CATEGORY_MAP[s.category] ?? s.category : "",
    religion: s.religion || "",
    nationality: s.nationality || "",
    guardianName: s.guardianName || "",
    guardianMobile: s.guardianMobile || "",
    email: s.email || "",
    admissionDate: formatDate(s.admissionDate),
    status: s.status || "",
  }));

  const isLoading = classesQuery.isLoading || studentsQuery.isLoading;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Student Reports</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Complete information for all enrolled students, pulled live from Student Management.
          </p>
        </div>
        <ExportMenu
          filename="student-reports"
          title="Student Reports"
          columns={EXPORT_COLUMNS}
          rows={exportRows}
          disabled={isLoading || exportRows.length === 0}
        />
      </div>

      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="Search by Admission No, Name, or Guardian Mobile"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />

        <Select value={classFilter} onValueChange={(v) => { setClassFilter(v); setSectionFilter(ALL); }}>
          <SelectTrigger className="w-40"><SelectValue placeholder="All classes" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All classes</SelectItem>
            {classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={sectionFilter} onValueChange={setSectionFilter} disabled={classFilter === ALL}>
          <SelectTrigger className="w-40"><SelectValue placeholder="All divisions" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All divisions</SelectItem>
            {sectionOptions.map((s) => <SelectItem key={s.id} value={s.id}>Division {s.name}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={genderFilter} onValueChange={setGenderFilter}>
          <SelectTrigger className="w-36"><SelectValue placeholder="All genders" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All genders</SelectItem>
            <SelectItem value="MALE">Male</SelectItem>
            <SelectItem value="FEMALE">Female</SelectItem>
            <SelectItem value="OTHER">Other</SelectItem>
          </SelectContent>
        </Select>

        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-36"><SelectValue placeholder="All categories" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All categories</SelectItem>
            {Object.entries(REVERSE_CATEGORY_MAP).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
        </div>
      )}

      {!isLoading && filtered.length === 0 && (
        <p className="text-sm text-muted-foreground">No students match the current filters.</p>
      )}

      {!isLoading && filtered.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40">
                  <tr>
                    <th className="text-left font-medium px-3 py-2">Admission No</th>
                    <th className="text-left font-medium px-3 py-2">Roll No</th>
                    <th className="text-left font-medium px-3 py-2">Student Name</th>
                    <th className="text-left font-medium px-3 py-2">Class</th>
                    <th className="text-left font-medium px-3 py-2">Division</th>
                    <th className="text-left font-medium px-3 py-2">Gender</th>
                    <th className="text-left font-medium px-3 py-2">Status</th>
                    <th className="text-left font-medium px-3 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((s) => (
                    <tr key={s.id} className="border-t">
                      <td className="px-3 py-2">{s.admissionNo}</td>
                      <td className="px-3 py-2">{s.rollNumber ?? "-"}</td>
                      <td className="px-3 py-2">{fullName(s)}</td>
                      <td className="px-3 py-2">{s.class?.name}</td>
                      <td className="px-3 py-2">{s.section?.name}</td>
                      <td className="px-3 py-2">{s.gender}</td>
                      <td className="px-3 py-2">
                        <Badge variant={s.status === "ACTIVE" ? "default" : "secondary"}>{s.status}</Badge>
                      </td>
                      <td className="px-3 py-2">
                        <Button variant="ghost" size="sm" onClick={() => setViewing(s)}>View</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <Sheet open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <SheetContent className="overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>{viewing ? fullName(viewing) : ""}</SheetTitle>
            <SheetDescription>Admission No: {viewing?.admissionNo}</SheetDescription>
          </SheetHeader>

          {viewing && (
            <div className="mt-6 space-y-5 text-sm">
              <Section title="Basic Information">
                <Detail label="Roll No" value={String(viewing.rollNumber ?? "-")} />
                <Detail label="Class" value={viewing.class?.name} />
                <Detail label="Division" value={viewing.section?.name} />
              </Section>

              <Section title="Personal Details">
                <Detail label="Date of Birth" value={formatDate(viewing.dateOfBirth)} />
                <Detail label="Gender" value={viewing.gender} />
                <Detail label="Blood Group" value={viewing.bloodGroup} />
                <Detail label="Aadhaar No" value={viewing.aadhaar} />
                <Detail label="Category" value={viewing.category ? REVERSE_CATEGORY_MAP[viewing.category] ?? viewing.category : undefined} />
                <Detail label="Religion" value={viewing.religion} />
                <Detail label="Nationality" value={viewing.nationality} />
              </Section>

              <Section title="Parent / Guardian Details">
                <Detail label="Guardian Name" value={viewing.guardianName} />
                <Detail label="Mobile Number" value={viewing.guardianMobile} />
                <Detail label="Email" value={viewing.email} />
              </Section>

              <Section title="Academic Details">
                <Detail label="Admission Date" value={formatDate(viewing.admissionDate)} />
                <Detail label="Previous School" value={viewing.previousSchool} />
                <Detail label="Current Status" value={viewing.status} />
              </Section>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase text-muted-foreground mb-2">{title}</h3>
      <div className="space-y-1.5 border rounded-lg p-3">{children}</div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right">{value || "-"}</span>
    </div>
  );
}
