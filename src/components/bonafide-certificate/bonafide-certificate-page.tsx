import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import type { User } from "@/lib/services/auth.service";

const certService = createCrudService<Record_>("bonafide-certificate");

// ─────────────────────────────────────────────────────────────────────────
// SCHOOL DETAILS — name, address, phone, email come from the logged-in
// school's own record automatically. UDISE No / Board aren't part of the
// Tenant model yet, so they stay as constants here — edit once below.
// ─────────────────────────────────────────────────────────────────────────
const SCHOOL_EXTRA = {
  trustName: "YOUR TRUST / SOCIETY NAME",
  udiseNo: "00000000000",
  board: "YOUR BOARD (e.g. State Board / CBSE)",
};

function getSchoolInfo() {
  let user: Partial<User> = {};
  try {
    user = JSON.parse(localStorage.getItem("user") || "{}");
  } catch {
    // ignore malformed/missing session
  }

  const addressParts = [user.schoolAddress, user.schoolCity, user.schoolState, user.schoolPincode]
    .filter(Boolean)
    .join(", ");

  return {
    trustName: SCHOOL_EXTRA.trustName,
    schoolName: user.schoolName || "YOUR SCHOOL NAME",
    address: addressParts || "YOUR SCHOOL ADDRESS, TALUKA, DISTRICT",
    phone: user.schoolPhone || "0000000000",
    email: user.schoolEmail || "school@example.com",
    udiseNo: SCHOOL_EXTRA.udiseNo,
    board: SCHOOL_EXTRA.board,
  };
}

const PURPOSE_OPTIONS = [
  "Bus Pass", "Passport", "Bank Account Opening", "Scholarship",
  "Visa Application", "Aadhaar / ID Correction", "To Avail Travel Concession", "Other",
];

// Full shape of what the API actually returns for a student — matches
// every column on the Student model, so nothing in the database gets left
// out when we look someone up.
interface StudentLookup {
  id: string;
  admissionNo: string;
  grNo?: string | null;
  firstName: string;
  middleName?: string | null;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  bloodGroup?: string | null;
  category?: string | null;
  aadhaar?: string | null;
  passportNumber?: string | null;
  mobile?: string | null;
  alternateMobile?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  nationality?: string | null;
  religion?: string | null;
  caste?: string | null;
  guardianName?: string | null;
  guardianRelation?: string | null;
  guardianMobile?: string | null;
  guardianEmail?: string | null;
  guardianAddress?: string | null;
  guardianOccupation?: string | null;
  rollNumber?: number | null;
  admissionDate?: string | null;
  admissionType?: string | null;
  status?: string | null;
  previousSchool?: string | null;
  class?: { name: string };
  section?: { name: string };
}

// Only the details actually captured/printed: Student Name, Father's Name,
// Roll No, Class, Section, Purpose (+ an issue date). admissionNo is kept
// only as the lookup key to pull the student in — it isn't shown elsewhere.
interface CertRecord extends Record_ {
  certNo?: string;
  admissionNo?: string;
  name?: string;
  fatherName?: string;
  rollNo?: number | string;
  class?: string;
  division?: string; // "Section"
  academicYear?: string;
  purpose?: string;
  issueDate?: string;
}

const emptyForm: CertRecord = {
  id: "", createdAt: "", updatedAt: "",
  certNo: "", admissionNo: "", name: "", fatherName: "", rollNo: "", class: "", division: "",
  academicYear: "", purpose: "", issueDate: "",
};

function formatDate(value?: string) {
  if (!value) return "-";
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-GB"); // dd/mm/yyyy
}

function escapeHtml(value: unknown): string {
  const str = value === undefined || value === null || value === "" ? "-" : String(value);
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ─────────────────────────────────────────────────────────────────────────
// Builds a standalone HTML document for the certificate — printed in its
// own window, separate from the app UI.
// ─────────────────────────────────────────────────────────────────────────
function buildCertificateHtml(record: CertRecord): string {
  const school = getSchoolInfo();
  const studentName = record.name || "________________";
  const fatherName = record.fatherName || "________________";
  const rollNo = record.rollNo !== undefined && record.rollNo !== "" ? String(record.rollNo) : "______";
  const classLine = `${record.class || "____"}${record.division ? " - " + record.division : ""}`;
  const academicYear = record.academicYear || "________";
  const purpose = record.purpose || "________________";

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>Bonafide Certificate - ${escapeHtml(studentName)}</title>
<style>
  @page { size: A4 landscape; margin: 10mm; }
  * { box-sizing: border-box; }
  body {
    font-family: Georgia, 'Times New Roman', serif;
    color: #1a1a1a;
    margin: 0;
    padding: 24px;
    background: #f3f1ec;
  }
  .frame {
    border: 8px solid #1a1a1a;
    padding: 6px;
    max-width: 900px;
    margin: 0 auto;
    background: #fffdf8;
  }
  .frame-inner {
    border: 1.5px dotted #444;
    padding: 40px 56px;
    position: relative;
    min-height: 520px;
  }
  .corner {
    position: absolute;
    font-size: 20px;
    color: #1a1a1a;
  }
  .corner.tl { top: 10px; left: 14px; }
  .corner.tr { top: 10px; right: 14px; }
  .corner.bl { bottom: 10px; left: 14px; }
  .corner.br { bottom: 10px; right: 14px; }

  .school-line { text-align: center; font-size: 11px; letter-spacing: 1px; color: #444; margin: 0 0 2px; }
  .school-name { text-align: center; font-size: 22px; font-weight: bold; letter-spacing: 1px; margin: 0 0 4px; }
  .school-address { text-align: center; font-size: 11px; color: #444; margin: 0 0 18px; }

  .title {
    text-align: center;
    font-size: 32px;
    letter-spacing: 6px;
    font-weight: bold;
    margin: 10px 0 6px;
  }
  .title-rule { width: 220px; height: 2px; background: #1a1a1a; margin: 0 auto 30px; }

  .body-text {
    font-size: 16px;
    line-height: 2.3;
    text-align: center;
    max-width: 720px;
    margin: 0 auto 34px;
  }
  .body-text .blank { display: inline-block; border-bottom: 1px solid #1a1a1a; min-width: 160px; padding: 0 4px; font-weight: bold; }

  .seal {
    display: flex;
    justify-content: center;
    margin: 8px 0 30px;
  }
  .seal-ribbon svg { width: 46px; height: 66px; }

  .footer {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    margin-top: 30px;
    padding: 0 10px;
    font-size: 11px;
  }
  .footer .col { text-align: center; width: 30%; }
  .footer .line { border-top: 1px solid #1a1a1a; margin-bottom: 6px; height: 34px; }
  .footer .label { text-transform: uppercase; letter-spacing: 0.5px; color: #333; }

  .cert-meta { display: flex; justify-content: space-between; font-size: 10.5px; color: #555; margin-bottom: 10px; }

  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style>
</head>
<body>
  <div class="frame">
    <div class="frame-inner">
      <span class="corner tl">&#10022;</span>
      <span class="corner tr">&#10022;</span>
      <span class="corner bl">&#10022;</span>
      <span class="corner br">&#10022;</span>

      <div class="cert-meta">
        <span>Certificate No: ${escapeHtml(record.certNo)}</span>
        <span>Date: ${escapeHtml(formatDate(record.issueDate))}</span>
      </div>

      <p class="school-line">${escapeHtml(school.trustName)}</p>
      <p class="school-name">${escapeHtml(school.schoolName)}</p>
      <p class="school-address">${escapeHtml(school.address)} &nbsp;|&nbsp; Phone: ${escapeHtml(school.phone)} &nbsp;|&nbsp; Email: ${escapeHtml(school.email)}</p>

      <div class="title">BONAFIDE CERTIFICATE</div>
      <div class="title-rule"></div>

      <p class="body-text">
        This is to certify that Mr./Ms. <span class="blank">${escapeHtml(studentName)}</span>,
        S/O or D/O of Mr./Ms. <span class="blank">${escapeHtml(fatherName)}</span>,
        bearing roll number <span class="blank">${escapeHtml(rollNo)}</span>
        is a student of Class <span class="blank">${escapeHtml(classLine)}</span>
        for the academic year <span class="blank">${escapeHtml(academicYear)}</span>.
        He/She is a bonafide student of <span class="blank">${escapeHtml(school.schoolName)}</span>,
        issued for the purpose of <span class="blank">${escapeHtml(purpose)}</span>.
      </p>

      <div class="seal">
        <div class="seal-ribbon">
          <svg viewBox="0 0 60 90" xmlns="http://www.w3.org/2000/svg">
            <circle cx="30" cy="28" r="24" fill="#1a1a1a" />
            <circle cx="30" cy="28" r="18" fill="none" stroke="#fffdf8" stroke-width="1.5" />
            <path d="M14 46 L14 88 L30 74 L46 88 L46 46 Z" fill="#1a1a1a" />
          </svg>
        </div>
      </div>

      <div class="footer">
        <div class="col">
          <div class="line"></div>
          <div class="label">Signature<br/>Registrar / Principal / Dean</div>
        </div>
        <div class="col">
          <div class="line"></div>
          <div class="label">${escapeHtml(school.schoolName)}<br/>${escapeHtml(school.address)}<br/>(Official Seal)</div>
        </div>
        <div class="col">
          <div class="line"></div>
          <div class="label">Date</div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;
}

export function BonafideCertificatePage() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState<CertRecord | null>(null);
  const [form, setForm] = useState<CertRecord>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [lookupState, setLookupState] = useState<"idle" | "loading" | "found" | "not-found">("idle");
  const [studentDetails, setStudentDetails] = useState<StudentLookup | null>(null);
  const [saving, setSaving] = useState(false);

  const listQuery = useQuery({
    queryKey: ["bonafide-certificates"],
    queryFn: async () => (await certService.list({ pageSize: 500 })).rows as CertRecord[],
  });

  // Auto-generates the next certificate number, e.g. BC-2026-0001, based on
  // how many certificates already exist for the current year. No manual
  // typing — this runs the moment the "New" dialog opens.
  function generateCertNo(): string {
    const year = new Date().getFullYear();
    const prefix = `BC-${year}-`;
    const existing = listQuery.data ?? [];
    const countThisYear = existing.filter((r) => (r.certNo || "").startsWith(prefix)).length;
    return `${prefix}${String(countThisYear + 1).padStart(4, "0")}`;
  }

  function openCreate() {
    setForm({ ...emptyForm, certNo: generateCertNo() });
    setEditingId(null);
    setLookupState("idle");
    setStudentDetails(null);
    setDialogOpen(true);
  }

  function openEdit(row: CertRecord) {
    setForm(row);
    setEditingId(row.id);
    setLookupState(row.admissionNo ? "found" : "idle");
    setStudentDetails(null);
    if (row.admissionNo) lookupAdmissionNo(row.admissionNo, { silent: true });
    setDialogOpen(true);
  }

  function set<K extends keyof CertRecord>(key: K, value: CertRecord[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function lookupAdmissionNo(admissionNoArg?: string, opts?: { silent?: boolean }) {
    const admissionNo = (admissionNoArg ?? form.admissionNo ?? "").trim();
    if (!admissionNo) {
      if (!opts?.silent) toast.error("Enter an Admission No first");
      return;
    }

    setLookupState("loading");
    try {
      const res = await apiFetch<{ data: StudentLookup }>(`/students/lookup/${encodeURIComponent(admissionNo)}`);
      const s = res.data;
      const fullName = [s.firstName, s.middleName, s.lastName].filter(Boolean).join(" ");

      setStudentDetails(s);
      setForm((prev) => ({
        ...prev,
        admissionNo: s.admissionNo,
        name: fullName,
        fatherName: s.guardianRelation === "MOTHER" ? "" : s.guardianName || "",
        rollNo: s.rollNumber ?? "",
        class: s.class?.name || "",
        division: s.section?.name || "",
      }));
      setLookupState("found");
    } catch (err: any) {
      setLookupState("not-found");
      toast.error(err?.message || `No student found with admission number ${admissionNo}`);
    }
  }

  async function handleSave() {
    if (!form.admissionNo) {
      toast.error("Look up a valid Admission No first");
      return;
    }
    if (!form.purpose) {
      toast.error("Purpose is required");
      return;
    }

    setSaving(true);
    try {
      const { id, createdAt, updatedAt, ...payload } = form;
      if (editingId) {
        await certService.update(editingId, payload);
        toast.success("Certificate updated");
      } else {
        await certService.create(payload);
        toast.success("Certificate created");
      }
      queryClient.invalidateQueries({ queryKey: ["bonafide-certificates"] });
      setDialogOpen(false);
    } catch (err: any) {
      toast.error(err?.message || "Failed to save certificate");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleting) return;
    try {
      await certService.remove(deleting.id);
      toast.success("Certificate deleted");
      queryClient.invalidateQueries({ queryKey: ["bonafide-certificates"] });
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete certificate");
    } finally {
      setDeleting(null);
    }
  }

  function handlePrint(record: CertRecord | null) {
    if (!record) return;

    const printWindow = window.open("", "_blank", "width=850,height=1100");
    if (!printWindow) {
      toast.error("Please allow pop-ups for this site to print the certificate");
      return;
    }

    printWindow.document.open();
    printWindow.document.write(buildCertificateHtml(record));
    printWindow.document.close();

    printWindow.onload = () => {
      printWindow.focus();
      printWindow.print();
    };
  }

  const rows = listQuery.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Bonafide Certificate</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Enter an Admission No to auto-fill the student's details, then set the purpose.
          </p>
        </div>
        <Button onClick={openCreate}>+ New</Button>
      </div>

      {listQuery.isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      )}

      {!listQuery.isLoading && rows.length === 0 && (
        <p className="text-sm text-muted-foreground">No certificates yet. Click "New" to create one.</p>
      )}

      {!listQuery.isLoading && rows.length > 0 && (
        <div className="rounded-lg border overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr>
                <th className="text-left font-medium px-3 py-2">Certificate No</th>
                <th className="text-left font-medium px-3 py-2">Student Name</th>
                <th className="text-left font-medium px-3 py-2">Father's Name</th>
                <th className="text-left font-medium px-3 py-2">Roll No</th>
                <th className="text-left font-medium px-3 py-2">Class</th>
                <th className="text-left font-medium px-3 py-2">Section</th>
                <th className="text-left font-medium px-3 py-2">Purpose</th>
                <th className="text-left font-medium px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="px-3 py-2">{r.certNo}</td>
                  <td className="px-3 py-2">{r.name}</td>
                  <td className="px-3 py-2">{r.fatherName}</td>
                  <td className="px-3 py-2">{r.rollNo}</td>
                  <td className="px-3 py-2">{r.class}</td>
                  <td className="px-3 py-2">{r.division}</td>
                  <td className="px-3 py-2">{r.purpose}</td>
                  <td className="px-3 py-2 space-x-2">
                    <Button variant="ghost" size="sm" onClick={() => handlePrint(r)}>Print</Button>
                    <Button variant="ghost" size="sm" onClick={() => openEdit(r)}>Edit</Button>
                    <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setDeleting(r)}>Delete</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Edit / Create form dialog ───────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit" : "New"} Bonafide Certificate</DialogTitle>
            <DialogDescription>
              Look up the student by Admission No — their details fill in automatically.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Certificate No</Label>
              <Input value={form.certNo || ""} disabled className="mt-1 bg-muted" />
            </div>

            <div>
              <Label>Admission No *</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  value={form.admissionNo || ""}
                  onChange={(e) => { set("admissionNo", e.target.value); setLookupState("idle"); }}
                  onBlur={() => lookupAdmissionNo()}
                  placeholder="e.g. ADM-2026-0001"
                />
                <Button type="button" variant="secondary" onClick={() => lookupAdmissionNo()} disabled={lookupState === "loading"}>
                  {lookupState === "loading" ? "Looking up…" : "Fetch"}
                </Button>
              </div>
              {lookupState === "found" && <p className="text-xs text-green-600 mt-1">Student found — details filled in below.</p>}
              {lookupState === "not-found" && <p className="text-xs text-destructive mt-1">No student found with that Admission No.</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Student Name</Label>
                <Input value={form.name || ""} disabled className="mt-1 bg-muted" />
              </div>
              <div>
                <Label>Father's Name</Label>
                <Input value={form.fatherName || ""} disabled className="mt-1 bg-muted" />
              </div>
              <div>
                <Label>Roll No</Label>
                <Input value={String(form.rollNo ?? "")} disabled className="mt-1 bg-muted" />
              </div>
              <div>
                <Label>Class</Label>
                <Input value={form.class || ""} disabled className="mt-1 bg-muted" />
              </div>
              <div>
                <Label>Section</Label>
                <Input value={form.division || ""} disabled className="mt-1 bg-muted" />
              </div>
            </div>

            {studentDetails && (
              <div className="border rounded-md p-3 bg-muted/30">
                <p className="text-xs font-medium text-muted-foreground mb-2">
                  Full student record (from database) — for reference only, not printed on the certificate
                </p>
                <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs">
                  <p><span className="text-muted-foreground">GR No:</span> {studentDetails.grNo || "-"}</p>
                  <p><span className="text-muted-foreground">Middle Name:</span> {studentDetails.middleName || "-"}</p>
                  <p><span className="text-muted-foreground">Last Name:</span> {studentDetails.lastName || "-"}</p>
                  <p><span className="text-muted-foreground">Date of Birth:</span> {formatDate(studentDetails.dateOfBirth)}</p>
                  <p><span className="text-muted-foreground">Gender:</span> {studentDetails.gender || "-"}</p>
                  <p><span className="text-muted-foreground">Blood Group:</span> {studentDetails.bloodGroup || "-"}</p>
                  <p><span className="text-muted-foreground">Category:</span> {studentDetails.category || "-"}</p>
                  <p><span className="text-muted-foreground">Nationality:</span> {studentDetails.nationality || "-"}</p>
                  <p><span className="text-muted-foreground">Religion:</span> {studentDetails.religion || "-"}</p>
                  <p><span className="text-muted-foreground">Caste:</span> {studentDetails.caste || "-"}</p>
                  <p><span className="text-muted-foreground">Aadhaar:</span> {studentDetails.aadhaar || "-"}</p>
                  <p><span className="text-muted-foreground">Passport No:</span> {studentDetails.passportNumber || "-"}</p>
                  <p><span className="text-muted-foreground">Mobile:</span> {studentDetails.mobile || "-"}</p>
                  <p><span className="text-muted-foreground">Alternate Mobile:</span> {studentDetails.alternateMobile || "-"}</p>
                  <p><span className="text-muted-foreground">Email:</span> {studentDetails.email || "-"}</p>
                  <p><span className="text-muted-foreground">Address:</span> {studentDetails.address || "-"}</p>
                  <p><span className="text-muted-foreground">City:</span> {studentDetails.city || "-"}</p>
                  <p><span className="text-muted-foreground">State:</span> {studentDetails.state || "-"}</p>
                  <p><span className="text-muted-foreground">Pincode:</span> {studentDetails.pincode || "-"}</p>
                  <p><span className="text-muted-foreground">Guardian Relation:</span> {studentDetails.guardianRelation || "-"}</p>
                  <p><span className="text-muted-foreground">Guardian Mobile:</span> {studentDetails.guardianMobile || "-"}</p>
                  <p><span className="text-muted-foreground">Guardian Email:</span> {studentDetails.guardianEmail || "-"}</p>
                  <p><span className="text-muted-foreground">Guardian Address:</span> {studentDetails.guardianAddress || "-"}</p>
                  <p><span className="text-muted-foreground">Guardian Occupation:</span> {studentDetails.guardianOccupation || "-"}</p>
                  <p><span className="text-muted-foreground">Admission Date:</span> {formatDate(studentDetails.admissionDate || undefined)}</p>
                  <p><span className="text-muted-foreground">Admission Type:</span> {studentDetails.admissionType || "-"}</p>
                  <p><span className="text-muted-foreground">Status:</span> {studentDetails.status || "-"}</p>
                  <p><span className="text-muted-foreground">Previous School:</span> {studentDetails.previousSchool || "-"}</p>
                </div>
              </div>
            )}

            <hr />

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Academic Year</Label>
                <Input value={form.academicYear || ""} onChange={(e) => set("academicYear", e.target.value)} placeholder="e.g. 2025-26" className="mt-1" />
              </div>
              <div>
                <Label>Purpose *</Label>
                <Select value={form.purpose || ""} onValueChange={(v) => set("purpose", v)}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {PURPOSE_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Issue Date</Label>
                <Input type="date" value={form.issueDate || ""} onChange={(e) => set("issueDate", e.target.value)} className="mt-1" />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "Saving…" : editingId ? "Update" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete confirmation ─────────────────────────────────────── */}
      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this certificate?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the certificate record for {deleting?.name}. This can't be undone.
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