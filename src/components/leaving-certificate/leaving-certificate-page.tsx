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
import { CertificatePrintView } from "./certificate-print-view";

const certService = createCrudService<Record_>("leaving-certificate");

const PROGRESS_OPTIONS = ["Excellent", "Good", "Average", "Poor"];
const CONDUCT_OPTIONS = ["Excellent", "Good", "Average", "Poor"];
const REASON_OPTIONS = ["Passed / Graduated", "Parent's Request", "Transfer", "Discontinued", "Other"];
const REMARK_OPTIONS = ["Migrating to Another Place", "Not Applicable", "Other"];

interface StudentLookup {
  id: string;
  admissionNo: string;
  grNo?: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  guardianName?: string;
  guardianRelation?: string;
  guardianMobile?: string;
  dateOfBirth: string;
  gender: string;
  rollNumber?: number | null;
  admissionDate?: string;
  class?: { name: string };
  section?: { name: string };
}

interface CertRecord extends Record_ {
  admissionNo?: string;
  grNo?: string;
  name?: string;
  nameEnglish?: string;
  fatherName?: string;
  guardianMobile?: string;
  destinationSchool?: string;
  dateOfBirth?: string;
  gender?: string;
  class?: string;
  division?: string;
  rollNo?: number | string;
  studyingSince?: string;
  certNo?: string;
  progress?: string;
  conduct?: string;
  reason?: string;
  remark?: string;
  dateOfLeaving?: string;
  issueDate?: string;
}

const emptyForm: CertRecord = {
  id: "", createdAt: "", updatedAt: "",
  admissionNo: "", grNo: "", name: "", nameEnglish: "", fatherName: "", guardianMobile: "",
  dateOfBirth: "", gender: "", class: "", division: "", rollNo: "",
  studyingSince: "", certNo: "", progress: "", conduct: "", reason: "",
  remark: "", dateOfLeaving: "", issueDate: "", destinationSchool: "",
};

export function LeavingCertificatePage() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState<CertRecord | null>(null);
  const [printing, setPrinting] = useState<CertRecord | null>(null);
  const [form, setForm] = useState<CertRecord>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [lookupState, setLookupState] = useState<"idle" | "loading" | "found" | "not-found">("idle");
  const [saving, setSaving] = useState(false);

  const listQuery = useQuery({
    queryKey: ["leaving-certificates"],
    queryFn: async () => (await certService.list({ pageSize: 500 })).rows as CertRecord[],
  });

  function openCreate() {
    setForm(emptyForm);
    setEditingId(null);
    setLookupState("idle");
    setDialogOpen(true);
  }

  function openEdit(row: CertRecord) {
    setForm(row);
    setEditingId(row.id);
    setLookupState(row.admissionNo ? "found" : "idle");
    setDialogOpen(true);
  }

  function set<K extends keyof CertRecord>(key: K, value: CertRecord[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function lookupAdmissionNo() {
    const admissionNo = (form.admissionNo || "").trim();
    if (!admissionNo) {
      toast.error("Enter an Admission No first");
      return;
    }

    setLookupState("loading");
    try {
      const res = await apiFetch<{ data: StudentLookup }>(`/students/lookup/${encodeURIComponent(admissionNo)}`);
      const s = res.data;
      const fullName = [s.firstName, s.middleName, s.lastName].filter(Boolean).join(" ");

      setForm((prev) => ({
        ...prev,
        admissionNo: s.admissionNo,
        grNo: s.grNo || "",
        name: fullName,
        nameEnglish: fullName,
        fatherName: s.guardianRelation === "FATHER" ? s.guardianName || "" : s.guardianName || "",
        guardianMobile: s.guardianMobile || "",
        dateOfBirth: s.dateOfBirth ? s.dateOfBirth.slice(0, 10) : "",
        gender: s.gender ? s.gender.charAt(0) + s.gender.slice(1).toLowerCase() : "",
        class: s.class?.name || "",
        division: s.section?.name || "",
        rollNo: s.rollNumber ?? "",
        studyingSince: s.admissionDate ? s.admissionDate.slice(0, 10) : "",
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
    if (!form.certNo) {
      toast.error("Certificate No is required");
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
      queryClient.invalidateQueries({ queryKey: ["leaving-certificates"] });
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
      queryClient.invalidateQueries({ queryKey: ["leaving-certificates"] });
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete certificate");
    } finally {
      setDeleting(null);
    }
  }

  const rows = listQuery.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">School Leaving Certificate</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Enter an Admission No to auto-fill the student's details, then fill in the certificate specifics.
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
                <th className="text-left font-medium px-3 py-2">Admission No</th>
                <th className="text-left font-medium px-3 py-2">Student Name</th>
                <th className="text-left font-medium px-3 py-2">Class</th>
                <th className="text-left font-medium px-3 py-2">Division</th>
                <th className="text-left font-medium px-3 py-2">Date of Leaving</th>
                <th className="text-left font-medium px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="px-3 py-2">{r.certNo}</td>
                  <td className="px-3 py-2">{r.admissionNo}</td>
                  <td className="px-3 py-2">{r.name}</td>
                  <td className="px-3 py-2">{r.class}</td>
                  <td className="px-3 py-2">{r.division}</td>
                  <td className="px-3 py-2">{r.dateOfLeaving}</td>
                  <td className="px-3 py-2 space-x-2">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(r)}>Edit</Button>
                    <Button variant="ghost" size="sm" onClick={() => setPrinting(r)}>Print</Button>
                    <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setDeleting(r)}>Delete</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit" : "New"} School Leaving Certificate</DialogTitle>
            <DialogDescription>
              Look up the student by Admission No — their details fill in automatically.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Admission No *</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  value={form.admissionNo || ""}
                  onChange={(e) => { set("admissionNo", e.target.value); setLookupState("idle"); }}
                  onBlur={lookupAdmissionNo}
                  placeholder="e.g. ADM-2026-0001"
                />
                <Button type="button" variant="secondary" onClick={lookupAdmissionNo} disabled={lookupState === "loading"}>
                  {lookupState === "loading" ? "Looking up…" : "Fetch"}
                </Button>
              </div>
              {lookupState === "found" && <p className="text-xs text-green-600 mt-1">Student found — details filled in below.</p>}
              {lookupState === "not-found" && <p className="text-xs text-destructive mt-1">No student found with that Admission No.</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>GR No</Label>
                <Input value={form.grNo || ""} disabled className="mt-1 bg-muted" />
              </div>
              <div>
                <Label>Roll No</Label>
                <Input value={String(form.rollNo ?? "")} disabled className="mt-1 bg-muted" />
              </div>
              <div>
                <Label>Student Name</Label>
                <Input value={form.name || ""} disabled className="mt-1 bg-muted" />
              </div>
              <div>
                <Label>Student Name (English)</Label>
                <Input value={form.nameEnglish || ""} disabled className="mt-1 bg-muted" />
              </div>
              <div>
                <Label>Father's Name</Label>
                <Input value={form.fatherName || ""} disabled className="mt-1 bg-muted" />
              </div>
              <div>
                <Label>Guardian Mobile</Label>
                <Input value={form.guardianMobile || ""} disabled className="mt-1 bg-muted" />
              </div>
              <div>
                <Label>Date of Birth</Label>
                <Input value={form.dateOfBirth || ""} disabled className="mt-1 bg-muted" />
              </div>
              <div>
                <Label>Gender</Label>
                <Input value={form.gender || ""} disabled className="mt-1 bg-muted" />
              </div>
              <div>
                <Label>Class</Label>
                <Input value={form.class || ""} disabled className="mt-1 bg-muted" />
              </div>
              <div>
                <Label>Division</Label>
                <Input value={form.division || ""} disabled className="mt-1 bg-muted" />
              </div>
              <div>
                <Label>Admission Date (Studying Since)</Label>
                <Input value={form.studyingSince || ""} disabled className="mt-1 bg-muted" />
              </div>
            </div>

            <hr />

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Certificate No *</Label>
                <Input value={form.certNo || ""} onChange={(e) => set("certNo", e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label>Date of Leaving</Label>
                <Input type="date" value={form.dateOfLeaving || ""} onChange={(e) => set("dateOfLeaving", e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label>Progress</Label>
                <Select value={form.progress || ""} onValueChange={(v) => set("progress", v)}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {PROGRESS_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Conduct</Label>
                <Select value={form.conduct || ""} onValueChange={(v) => set("conduct", v)}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {CONDUCT_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Reason</Label>
                <Select value={form.reason || ""} onValueChange={(v) => set("reason", v)}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {REASON_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Remark</Label>
                <Select value={form.remark || ""} onValueChange={(v) => set("remark", v)}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {REMARK_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Certificate Print Date</Label>
                <Input type="date" value={form.issueDate || ""} onChange={(e) => set("issueDate", e.target.value)} className="mt-1" />
              </div>
              <div className="col-span-2">
                <Label>Destination School / College</Label>
                <Input value={form.destinationSchool || ""} onChange={(e) => set("destinationSchool", e.target.value)} className="mt-1" placeholder="Optional" />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "Saving…" : editingId ? "Update" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

      {printing && <CertificatePrintView record={printing} onClose={() => setPrinting(null)} />}
    </div>
  );
}
