import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch, FILE_BASE_URL } from "@/lib/api/client";
import { createCrudService, type Record_ } from "@/lib/services/crud.service";

const dispatchService = createCrudService<Record_>("dispatch-register");

const RECIPIENT_TYPES = ["Student", "Parent", "Staff", "Government Office", "Education Department", "Vendor", "Bank", "Other School", "Other"];
const DOCUMENT_TYPES = ["School Leaving Certificate", "Transfer Certificate", "Bonafide Certificate", "Character Certificate", "Marksheet", "Fee Receipt", "Circular", "Letter", "Invoice", "Notice", "Other"];
const MODES = ["Hand Delivery", "Speed Post", "Registered Post", "Courier", "Email", "WhatsApp"];
const DEPARTMENTS = ["Administration", "Accounts", "Examination", "Principal Office", "Library", "Other"];
const STATUSES = ["Pending", "Dispatched", "Delivered", "Returned", "Cancelled"];

interface StudentLookup {
  admissionNo: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  address?: string;
  guardianMobile?: string;
  guardianEmail?: string;
  class?: { name: string };
}

interface DispatchRecord extends Record_ {
  dispatchNo?: string;
  date?: string;
  to?: string;
  recipientType?: string;
  subject?: string;
  documentType?: string;
  recipientAddress?: string;
  mobile?: string;
  email?: string;
  mode?: string;
  courierService?: string;
  trackingNo?: string;
  dispatchCharges?: number | string;
  department?: string;
  sentBy?: string;
  approvedBy?: string;
  referenceNo?: string;
  relatedAdmissionNo?: string;
  academicYear?: string;
  status?: string;
  deliveryDate?: string;
  acknowledgementReceived?: string;
  document?: File | string;
  acknowledgementFile?: File | string;
  remarks?: string;
}

const emptyForm: DispatchRecord = {
  id: "", createdAt: "", updatedAt: "",
  date: "", to: "", recipientType: "", subject: "", documentType: "",
  recipientAddress: "", mobile: "", email: "", mode: "", courierService: "",
  trackingNo: "", dispatchCharges: "", department: "", sentBy: "", approvedBy: "",
  referenceNo: "", relatedAdmissionNo: "", academicYear: "", status: "Pending",
  deliveryDate: "", acknowledgementReceived: "No", remarks: "",
};

function formatDate(value?: string) {
  if (!value) return "-";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function DispatchRegisterPage() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState<DispatchRecord | null>(null);
  const [form, setForm] = useState<DispatchRecord>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [lookupState, setLookupState] = useState<"idle" | "loading" | "found" | "not-found">("idle");

  const listQuery = useQuery({
    queryKey: ["dispatch-register"],
    queryFn: async () => (await dispatchService.list({ pageSize: 500 })).rows as DispatchRecord[],
  });

  const rows = listQuery.data ?? [];

  function set<K extends keyof DispatchRecord>(key: K, value: DispatchRecord[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function openCreate() {
    setForm(emptyForm);
    setEditingId(null);
    setLookupState("idle");
    setDialogOpen(true);
  }

  function openEdit(row: DispatchRecord) {
    setForm(row);
    setEditingId(row.id);
    setLookupState(row.relatedAdmissionNo ? "found" : "idle");
    setDialogOpen(true);
  }

  async function generateDispatchNo(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `DSP-${year}-`;
    const existing = rows.filter((r) => (r.dispatchNo || "").startsWith(prefix));
    const next = existing.length + 1;
    return `${prefix}${String(next).padStart(4, "0")}`;
  }

  async function lookupStudent() {
    const admissionNo = (form.relatedAdmissionNo || "").trim();
    if (!admissionNo) {
      toast.error("Enter an Admission Number first");
      return;
    }

    setLookupState("loading");
    try {
      const res = await apiFetch<{ data: StudentLookup }>(`/students/lookup/${encodeURIComponent(admissionNo)}`);
      const s = res.data;
      const fullName = [s.firstName, s.middleName, s.lastName].filter(Boolean).join(" ");

      setForm((prev) => ({
        ...prev,
        relatedAdmissionNo: s.admissionNo,
        to: fullName,
        recipientType: "Student",
        recipientAddress: s.address || prev.recipientAddress,
        mobile: s.guardianMobile || prev.mobile,
        email: s.guardianEmail || prev.email,
      }));
      setLookupState("found");
      toast.success("Student found — Recipient details filled in");
    } catch (err: any) {
      setLookupState("not-found");
      toast.error(err?.message || `No student found with admission number ${admissionNo}`);
    }
  }

  async function handleSave() {
    if (!form.to) {
      toast.error("Recipient Name is required");
      return;
    }
    if (!form.date) {
      toast.error("Dispatch Date is required");
      return;
    }

    setSaving(true);
    try {
      const { id, createdAt, updatedAt, ...payload } = form;

      if (editingId) {
        await dispatchService.update(editingId, payload);
        toast.success("Dispatch record updated");
      } else {
        const dispatchNo = await generateDispatchNo();
        await dispatchService.create({ ...payload, dispatchNo });
        toast.success("Dispatch record created");
      }
      queryClient.invalidateQueries({ queryKey: ["dispatch-register"] });
      setDialogOpen(false);
    } catch (err: any) {
      toast.error(err?.message || "Failed to save dispatch record");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleting) return;
    try {
      await dispatchService.remove(deleting.id);
      toast.success("Dispatch record deleted");
      queryClient.invalidateQueries({ queryKey: ["dispatch-register"] });
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete dispatch record");
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dispatch Register</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track outgoing documents. Enter an Admission Number to auto-fill a student recipient's details.
          </p>
        </div>
        <Button onClick={openCreate}>+ New</Button>
      </div>

      {listQuery.isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
        </div>
      )}

      {!listQuery.isLoading && rows.length === 0 && (
        <p className="text-sm text-muted-foreground">No dispatch records yet. Click "New" to create one.</p>
      )}

      {!listQuery.isLoading && rows.length > 0 && (
        <div className="rounded-lg border overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr>
                <th className="text-left font-medium px-3 py-2">Dispatch No</th>
                <th className="text-left font-medium px-3 py-2">Date</th>
                <th className="text-left font-medium px-3 py-2">Recipient</th>
                <th className="text-left font-medium px-3 py-2">Subject</th>
                <th className="text-left font-medium px-3 py-2">Mode</th>
                <th className="text-left font-medium px-3 py-2">Status</th>
                <th className="text-left font-medium px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="px-3 py-2">{r.dispatchNo}</td>
                  <td className="px-3 py-2">{formatDate(r.date)}</td>
                  <td className="px-3 py-2">{r.to}</td>
                  <td className="px-3 py-2">{r.subject}</td>
                  <td className="px-3 py-2">{r.mode}</td>
                  <td className="px-3 py-2"><Badge variant="outline">{r.status}</Badge></td>
                  <td className="px-3 py-2 space-x-2">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(r)}>Edit</Button>
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
            <DialogTitle>{editingId ? "Edit" : "New"} Dispatch Record</DialogTitle>
            <DialogDescription>
              {editingId ? "Dispatch No: " + form.dispatchNo : "Dispatch No will be generated automatically on save."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            <FormSection title="Basic Information">
              <div>
                <Label>Dispatch Date *</Label>
                <Input type="date" value={form.date || ""} onChange={(e) => set("date", e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label>Recipient Type</Label>
                <SelectField value={form.recipientType} onChange={(v) => set("recipientType", v)} options={RECIPIENT_TYPES} />
              </div>
              <div>
                <Label>Recipient Name *</Label>
                <Input value={form.to || ""} onChange={(e) => set("to", e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label>Document Type</Label>
                <SelectField value={form.documentType} onChange={(v) => set("documentType", v)} options={DOCUMENT_TYPES} />
              </div>
              <div className="col-span-2">
                <Label>Subject</Label>
                <Input value={form.subject || ""} onChange={(e) => set("subject", e.target.value)} className="mt-1" />
              </div>
            </FormSection>

            <FormSection title="Recipient Details">
              <div className="col-span-2">
                <Label>Recipient Address</Label>
                <Textarea value={form.recipientAddress || ""} onChange={(e) => set("recipientAddress", e.target.value)} className="mt-1" rows={2} />
              </div>
              <div>
                <Label>Mobile Number</Label>
                <Input value={form.mobile || ""} onChange={(e) => set("mobile", e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label>Email ID</Label>
                <Input type="email" value={form.email || ""} onChange={(e) => set("email", e.target.value)} className="mt-1" />
              </div>
            </FormSection>

            <FormSection title="Dispatch Details">
              <div>
                <Label>Mode of Dispatch</Label>
                <SelectField value={form.mode} onChange={(v) => set("mode", v)} options={MODES} />
              </div>
              <div>
                <Label>Courier / Postal Service</Label>
                <Input value={form.courierService || ""} onChange={(e) => set("courierService", e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label>Tracking / Consignment Number</Label>
                <Input value={form.trackingNo || ""} onChange={(e) => set("trackingNo", e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label>Dispatch Charges</Label>
                <Input type="number" value={String(form.dispatchCharges ?? "")} onChange={(e) => set("dispatchCharges", e.target.value)} className="mt-1" placeholder="Optional" />
              </div>
            </FormSection>

            <FormSection title="School Details">
              <div>
                <Label>Department</Label>
                <SelectField value={form.department} onChange={(v) => set("department", v)} options={DEPARTMENTS} />
              </div>
              <div>
                <Label>Sent By</Label>
                <Input value={form.sentBy || ""} onChange={(e) => set("sentBy", e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label>Approved By</Label>
                <Input value={form.approvedBy || ""} onChange={(e) => set("approvedBy", e.target.value)} className="mt-1" />
              </div>
            </FormSection>

            <FormSection title="Reference Information">
              <div>
                <Label>Reference Number</Label>
                <Input value={form.referenceNo || ""} onChange={(e) => set("referenceNo", e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label>Academic Year</Label>
                <Input value={form.academicYear || ""} onChange={(e) => set("academicYear", e.target.value)} className="mt-1" placeholder="e.g. 2026-27" />
              </div>
              <div className="col-span-2">
                <Label>Related Student — Admission Number</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    value={form.relatedAdmissionNo || ""}
                    onChange={(e) => { set("relatedAdmissionNo", e.target.value); setLookupState("idle"); }}
                    onBlur={lookupStudent}
                    placeholder="Optional — fills Recipient details automatically"
                  />
                  <Button type="button" variant="secondary" onClick={lookupStudent} disabled={lookupState === "loading"}>
                    {lookupState === "loading" ? "Looking up…" : "Fetch"}
                  </Button>
                </div>
                {lookupState === "found" && <p className="text-xs text-green-600 mt-1">Student found — Recipient fields filled in above.</p>}
                {lookupState === "not-found" && <p className="text-xs text-destructive mt-1">No student found with that Admission No.</p>}
              </div>
            </FormSection>

            <FormSection title="Status">
              <div>
                <Label>Dispatch Status</Label>
                <SelectField value={form.status} onChange={(v) => set("status", v)} options={STATUSES} />
              </div>
              <div>
                <Label>Delivery Date</Label>
                <Input type="date" value={form.deliveryDate || ""} onChange={(e) => set("deliveryDate", e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label>Acknowledgement Received</Label>
                <SelectField value={form.acknowledgementReceived} onChange={(v) => set("acknowledgementReceived", v)} options={["Yes", "No"]} />
              </div>
            </FormSection>

            <FormSection title="Attachments">
              <FileField
                label="Upload Document / PDF"
                value={form.document}
                onChange={(f) => set("document", f)}
              />
              <FileField
                label="Upload Acknowledgement Receipt (Optional)"
                value={form.acknowledgementFile}
                onChange={(f) => set("acknowledgementFile", f)}
              />
            </FormSection>

            <FormSection title="Other">
              <div className="col-span-2">
                <Label>Remarks / Notes</Label>
                <Textarea value={form.remarks || ""} onChange={(e) => set("remarks", e.target.value)} className="mt-1" rows={2} />
              </div>
            </FormSection>
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
            <AlertDialogTitle>Delete this dispatch record?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the dispatch record for {deleting?.to}. This can't be undone.
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

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase text-muted-foreground mb-2">{title}</h3>
      <div className="grid grid-cols-2 gap-4 border rounded-lg p-3">{children}</div>
    </div>
  );
}

function SelectField({ value, onChange, options }: { value?: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <Select value={value || ""} onValueChange={onChange}>
      <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
      <SelectContent>
        {options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

function FileField({ label, value, onChange }: { label: string; value?: File | string; onChange: (f: File | undefined) => void }) {
  const isExistingUrl = typeof value === "string" && value.length > 0;
  const fileName = value instanceof File ? value.name : undefined;

  return (
    <div>
      <Label>{label}</Label>
      {isExistingUrl && (
        <a href={`${FILE_BASE_URL}${value}`} target="_blank" rel="noreferrer" className="block text-xs text-primary underline mt-1">
          View current file
        </a>
      )}
      <input
        type="file"
        accept="application/pdf,image/jpeg,image/png"
        className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-sm mt-1"
        onChange={(e) => onChange(e.target.files?.[0])}
      />
      {fileName && <p className="text-xs text-muted-foreground mt-1">Selected: {fileName}</p>}
      <p className="text-xs text-muted-foreground mt-1">PDF/JPG/PNG, max 5 MB</p>
    </div>
  );
}
