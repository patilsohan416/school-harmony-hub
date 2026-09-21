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
import { createCrudService, type Record_ } from "@/lib/services/crud.service";
import { CertificatePrintView } from "@/components/leaving-certificate/certificate-print-view";

const certService = createCrudService<Record_>("leaving-certificate");
const ALL = "__all__";

interface CertRecord extends Record_ {
  admissionNo?: string;
  name?: string;
  class?: string;
  division?: string;
  rollNo?: number | string;
  dateOfLeaving?: string;
  certNo?: string;
  reason?: string;
  fatherName?: string;
  guardianMobile?: string;
  destinationSchool?: string;
  issueDate?: string;
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
  { key: "class", label: "Class at Leaving" },
  { key: "division", label: "Division" },
  { key: "dateOfLeaving", label: "Leaving Date" },
  { key: "certNo", label: "Leaving Certificate No" },
  { key: "reason", label: "Reason for Leaving" },
  { key: "destinationSchool", label: "Destination School/College" },
  { key: "fatherName", label: "Parent Name" },
  { key: "guardianMobile", label: "Mobile Number" },
  { key: "issueDate", label: "Certificate Issue Date" },
];

export function OutgoingStudentsPage() {
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState(ALL);
  const [reasonFilter, setReasonFilter] = useState(ALL);
  const [viewing, setViewing] = useState<CertRecord | null>(null);
  const [printing, setPrinting] = useState<CertRecord | null>(null);

  const certsQuery = useQuery({
    queryKey: ["leaving-certificates"],
    queryFn: async () => (await certService.list({ pageSize: 1000 })).rows as CertRecord[],
  });

  const records = certsQuery.data ?? [];

  const classOptions = useMemo(
    () => Array.from(new Set(records.map((r) => r.class).filter(Boolean))) as string[],
    [records]
  );
  const reasonOptions = useMemo(
    () => Array.from(new Set(records.map((r) => r.reason).filter(Boolean))) as string[],
    [records]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return records.filter((r) => {
      if (classFilter !== ALL && r.class !== classFilter) return false;
      if (reasonFilter !== ALL && r.reason !== reasonFilter) return false;
      if (q) {
        const haystack = [r.admissionNo, r.name].join(" ").toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [records, search, classFilter, reasonFilter]);

  const exportRows = filtered.map((r) => ({
    admissionNo: r.admissionNo || "",
    rollNo: r.rollNo ?? "",
    name: r.name || "",
    class: r.class || "",
    division: r.division || "",
    dateOfLeaving: formatDate(r.dateOfLeaving),
    certNo: r.certNo || "",
    reason: r.reason || "",
    destinationSchool: r.destinationSchool || "",
    fatherName: r.fatherName || "",
    guardianMobile: r.guardianMobile || "",
    issueDate: formatDate(r.issueDate),
  }));

  const isLoading = certsQuery.isLoading;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Outgoing Student Records</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Every student a Leaving Certificate has been created for, pulled from School Leaving Certificate records.
          </p>
        </div>
        <ExportMenu
          filename="outgoing-students"
          title="Outgoing Student Records"
          columns={EXPORT_COLUMNS}
          rows={exportRows}
          disabled={isLoading || exportRows.length === 0}
        />
      </div>

      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="Search by Admission No or Student Name"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />

        <Select value={classFilter} onValueChange={setClassFilter}>
          <SelectTrigger className="w-44"><SelectValue placeholder="All classes" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All classes</SelectItem>
            {classOptions.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={reasonFilter} onValueChange={setReasonFilter}>
          <SelectTrigger className="w-56"><SelectValue placeholder="All reasons" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All reasons</SelectItem>
            {reasonOptions.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
        </div>
      )}

      {!isLoading && filtered.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No outgoing students found. Records appear here once a Leaving Certificate is created for a student.
        </p>
      )}

      {!isLoading && filtered.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40">
                  <tr>
                    <th className="text-left font-medium px-3 py-2">Admission No</th>
                    <th className="text-left font-medium px-3 py-2">Student Name</th>
                    <th className="text-left font-medium px-3 py-2">Class</th>
                    <th className="text-left font-medium px-3 py-2">Leaving Date</th>
                    <th className="text-left font-medium px-3 py-2">Reason</th>
                    <th className="text-left font-medium px-3 py-2">Certificate No</th>
                    <th className="text-left font-medium px-3 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => (
                    <tr key={r.id} className="border-t">
                      <td className="px-3 py-2">{r.admissionNo}</td>
                      <td className="px-3 py-2">{r.name}</td>
                      <td className="px-3 py-2">{r.class}</td>
                      <td className="px-3 py-2">{formatDate(r.dateOfLeaving)}</td>
                      <td className="px-3 py-2"><Badge variant="outline">{r.reason}</Badge></td>
                      <td className="px-3 py-2">{r.certNo}</td>
                      <td className="px-3 py-2 space-x-1">
                        <Button variant="ghost" size="sm" onClick={() => setViewing(r)}>View</Button>
                        <Button variant="ghost" size="sm" onClick={() => setPrinting(r)}>Print</Button>
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
            <SheetTitle>{viewing?.name}</SheetTitle>
            <SheetDescription>Admission No: {viewing?.admissionNo}</SheetDescription>
          </SheetHeader>

          {viewing && (
            <div className="mt-6 space-y-5 text-sm">
              <Section title="Student Information">
                <Detail label="Roll No" value={String(viewing.rollNo ?? "-")} />
                <Detail label="Class at Leaving" value={viewing.class} />
                <Detail label="Division" value={viewing.division} />
              </Section>

              <Section title="Leaving Information">
                <Detail label="Leaving Date" value={formatDate(viewing.dateOfLeaving)} />
                <Detail label="Leaving Certificate No" value={viewing.certNo} />
                <Detail label="Reason for Leaving" value={viewing.reason} />
                <Detail label="Destination School/College" value={viewing.destinationSchool} />
              </Section>

              <Section title="Parent Details">
                <Detail label="Parent Name" value={viewing.fatherName} />
                <Detail label="Mobile Number" value={viewing.guardianMobile} />
              </Section>

              <Section title="Certificate Information">
                <Detail label="Certificate Issued" value="Yes" />
                <Detail label="Issue Date" value={formatDate(viewing.issueDate)} />
              </Section>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {printing && <CertificatePrintView record={printing} onClose={() => setPrinting(null)} />}
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
