import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth/store";
import { createCrudService, type Record_ } from "@/lib/services/crud.service";
import {
  QrCode,
  Copy,
  Printer,
  Plus,
  Save,
  Search,
  Inbox,
  ClipboardList,
  X,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  Link2,
  School,
  ExternalLink,
  Edit,
  Webhook,
} from "lucide-react";

// Admission submissions — generic JSON storage, same tables the Google
// Form sync (Apps Script, see the "Connect Google Form Responses" card
// below) and the in-app /apply page both write to.
const admissionFormService = createCrudService<AdmissionRecord>("admission-form");
// Classes a parent can pick from on the public form.
const classOptionsService = createCrudService<ClassOptionRecord>("admission-open-classes");

interface ClassOptionRecord extends Record_ {
  name: string;
}

interface AdmissionRecord extends Record_ {
  appliedOn?: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  classAppliedName?: string;
  guardian?: string;
  phone?: string;
  mobile?: string;
  dateOfBirth?: string;
  gender?: string;
  email?: string;
  address?: string;
  status?: "Pending" | "Approved" | "Rejected" | "Waitlist";
}

const STATUS_OPTIONS = ["Pending", "Approved", "Rejected", "Waitlist"] as const;

const STATUS_CONFIG = {
  Pending: { icon: Clock, className: "text-yellow-500 bg-yellow-500/10 border-yellow-500/20" },
  Approved: { icon: CheckCircle, className: "text-green-500 bg-green-500/10 border-green-500/20" },
  Rejected: { icon: XCircle, className: "text-red-500 bg-red-500/10 border-red-500/20" },
  Waitlist: { icon: Clock, className: "text-blue-500 bg-blue-500/10 border-blue-500/20" },
};

// The actual admission Google Form for this school.
const DEFAULT_GOOGLE_FORM_URL = "https://docs.google.com/forms/d/e/1FAIpQLScftIhl1UzFZ3Ck25GYMI8eL4_aM8uKJgJ1WriF6xx6vYw7tA/viewform";

function studentName(r: AdmissionRecord) {
  return [r.firstName, r.middleName, r.lastName].filter(Boolean).join(" ") || "—";
}

// Builds the exact Apps Script a school pastes into their Google Form's
// script editor (Form ⋮ menu → Script editor) so every new response is
// pushed straight into this page's Admission Form List — Google gives no
// other way for an outside app to receive Form responses in real time.
function buildAppsScript(schoolId: string, apiBaseUrl: string) {
  return `function onFormSubmitAdmission(e) {
  var itemResponses = e.response.getItemResponses();
  var data = { tenant: "${schoolId}" };

  itemResponses.forEach(function (item) {
    var title = item.getItem().getTitle().toLowerCase();
    var answer = item.getResponse();

    if (title.indexOf("first") > -1) data.firstName = answer;
    else if (title.indexOf("middle") > -1) data.middleName = answer;
    else if (title.indexOf("last") > -1) data.lastName = answer;
    else if (title.indexOf("name") > -1 && !data.firstName) data.applicantName = answer;
    else if (title.indexOf("class") > -1) data.classAppliedName = answer;
    else if (title.indexOf("guardian") > -1 || title.indexOf("parent") > -1) data.guardian = answer;
    else if (title.indexOf("phone") > -1 || title.indexOf("mobile") > -1) data.phone = answer;
    else if (title.indexOf("birth") > -1 || title.indexOf("dob") > -1) data.dateOfBirth = answer;
    else if (title.indexOf("gender") > -1) data.gender = answer;
    else if (title.indexOf("email") > -1) data.email = answer;
    else if (title.indexOf("address") > -1) data.address = answer;
  });

  UrlFetchApp.fetch("${apiBaseUrl}/api/public/admission/apply", {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(data),
    muteHttpExceptions: true,
  });
}`;
}

export function AdmissionFormPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const schoolId = user?.schoolId || "";

  const [search, setSearch] = useState("");
  const [newClassName, setNewClassName] = useState("");
  const [addingClass, setAddingClass] = useState(false);
  const [isEditingUrl, setIsEditingUrl] = useState(false);
  const [googleFormUrlDraft, setGoogleFormUrlDraft] = useState("");
  const [apiBaseUrlDraft, setApiBaseUrlDraft] = useState(window.location.origin);

  // Google Form URL — editable per-school, persisted locally. Falls back
  // to the school's default form if nothing has been saved yet.
  const savedFormUrl = localStorage.getItem("admission_google_form_url") || DEFAULT_GOOGLE_FORM_URL;

  const qrImageUrl = savedFormUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(savedFormUrl)}`
    : "";

  const appsScript = buildAppsScript(schoolId || "YOUR_SCHOOL_ID", apiBaseUrlDraft);

  // Classes for admission
  const classOptionsQuery = useQuery({
    queryKey: ["admission-open-classes"],
    queryFn: async () => {
      const result = await classOptionsService.list({ pageSize: 100 });
      return result.rows;
    },
  });

  // Admissions list
  const submissionsQuery = useQuery({
    queryKey: ["admission-form-list"],
    queryFn: async () => {
      const result = await admissionFormService.list({ pageSize: 500, sortBy: "createdAt", sortDir: "desc" });
      return result.rows;
    },
  });

  const filteredSubmissions = useMemo(() => {
    const list = submissionsQuery.data ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter((r) =>
      studentName(r).toLowerCase().includes(q) ||
      (r.classAppliedName ?? "").toLowerCase().includes(q) ||
      (r.phone ?? "").toLowerCase().includes(q) ||
      (r.mobile ?? "").toLowerCase().includes(q) ||
      (r.guardian ?? "").toLowerCase().includes(q)
    );
  }, [submissionsQuery.data, search]);

  // --- Functions ---

  function openGoogleForm() {
    window.open(savedFormUrl, "_blank");
  }

  function copyLink() {
    navigator.clipboard.writeText(savedFormUrl)
      .then(() => toast.success("Admission form link copied"))
      .catch(() => toast.error("Failed to copy link"));
  }

  function copySchoolId() {
    if (!schoolId) return;
    navigator.clipboard.writeText(schoolId)
      .then(() => toast.success("School ID copied"))
      .catch(() => toast.error("Failed to copy"));
  }

  function copyAppsScript() {
    navigator.clipboard.writeText(appsScript)
      .then(() => toast.success("Apps Script copied — paste it into the Form's Script editor"))
      .catch(() => toast.error("Failed to copy"));
  }

  function printQr() {
    if (!qrImageUrl) return;
    const printWindow = window.open("", "_blank", "width=500,height=650");
    if (!printWindow) {
      toast.error("Please allow pop-ups to print the QR code");
      return;
    }
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Admission Form QR Code</title>
          <style>
            body { text-align:center; font-family:sans-serif; padding:40px; background:#f8fafc; }
            .container { max-width:400px; margin:0 auto; background:white; padding:30px; border-radius:16px; box-shadow:0 4px 24px rgba(0,0,0,0.1); }
            .school-name { color:#0f172a; font-size:20px; font-weight:bold; margin-bottom:4px; }
            .subtitle { color:#64748b; font-size:14px; margin-bottom:20px; }
            .qr-wrapper { background:white; padding:16px; border-radius:12px; border:2px solid #e2e8f0; display:inline-block; }
            img { width:220px; height:220px; display:block; }
            .link { color:#3b82f6; font-size:12px; word-break:break-all; background:#f1f5f9; padding:10px; border-radius:8px; margin-top:16px; }
            .footer { margin-top:20px; color:#94a3b8; font-size:12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="school-name">${user?.schoolName || "School"}</div>
            <div class="subtitle">Scan to Apply for Admission</div>
            <div class="qr-wrapper">
              <img src="${qrImageUrl}" alt="QR Code" />
            </div>
            <div class="link">${savedFormUrl}</div>
            <div class="footer">Scan QR code to open the admission form</div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 500);
  }

  function saveGoogleFormUrl() {
    if (!googleFormUrlDraft.trim()) {
      toast.error("Please enter a valid URL");
      return;
    }
    localStorage.setItem("admission_google_form_url", googleFormUrlDraft.trim());
    setIsEditingUrl(false);
    toast.success("Google Form URL updated");
  }

  async function addClassOption() {
    if (!newClassName.trim()) {
      toast.error("Please enter a class name");
      return;
    }
    setAddingClass(true);
    try {
      await classOptionsService.create({ name: newClassName.trim() } as Partial<ClassOptionRecord>);
      toast.success(`"${newClassName.trim()}" added for admission`);
      setNewClassName("");
      queryClient.invalidateQueries({ queryKey: ["admission-open-classes"] });
    } catch (err: any) {
      toast.error(err?.message || "Failed to add class");
    } finally {
      setAddingClass(false);
    }
  }

  async function removeClassOption(id: string, name: string) {
    if (!window.confirm(`Remove "${name}" from the admission form?`)) return;
    try {
      await classOptionsService.remove(id);
      toast.success(`"${name}" removed`);
      queryClient.invalidateQueries({ queryKey: ["admission-open-classes"] });
    } catch (err: any) {
      toast.error(err?.message || "Failed to remove class");
    }
  }

  async function updateStatus(record: AdmissionRecord, status: string) {
    try {
      // Send the full record back, not just { status } — the generic
      // backend replaces the whole stored JSON blob on update rather than
      // merging it, so sending status alone would silently wipe out the
      // applicant's name, guardian, phone, and every other saved field.
      await admissionFormService.update(record.id, { ...record, status } as Partial<AdmissionRecord>);
      toast.success(`Status updated to ${status}`);
      queryClient.invalidateQueries({ queryKey: ["admission-form-list"] });
    } catch (err: any) {
      toast.error(err?.message || "Failed to update status");
    }
  }

  const classOptions = classOptionsQuery.data ?? [];

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-500/10">
            <ClipboardList className="h-6 w-6 text-blue-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Admission Form</h1>
            <p className="text-sm text-muted-foreground">
              Share the QR code or link below — anyone who scans it can apply for admission through the Google Form.
            </p>
          </div>
        </div>
      </div>

      {/* Google Form URL Configuration */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="p-6 border-b bg-muted/20">
          <div className="flex items-center gap-2">
            <Link2 className="h-5 w-5 text-green-500" />
            <h2 className="font-semibold">Google Form Configuration</h2>
          </div>
        </div>
        <div className="p-6">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            <div className="flex-1 w-full">
              {isEditingUrl ? (
                <Input
                  value={googleFormUrlDraft}
                  onChange={(e) => setGoogleFormUrlDraft(e.target.value)}
                  placeholder="Enter Google Form URL..."
                  className="w-full"
                />
              ) : (
                <div className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg">
                  <span className="text-sm text-muted-foreground truncate flex-1">{savedFormUrl}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { setGoogleFormUrlDraft(savedFormUrl); setIsEditingUrl(true); }}
                    className="h-8 w-8 p-0"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
            {isEditingUrl ? (
              <div className="flex gap-2">
                <Button variant="default" size="sm" onClick={saveGoogleFormUrl}>
                  Save URL
                </Button>
                <Button variant="outline" size="sm" onClick={() => setIsEditingUrl(false)}>
                  Cancel
                </Button>
              </div>
            ) : (
              <Button variant="outline" size="sm" onClick={openGoogleForm} className="gap-2 shrink-0">
                <ExternalLink className="h-4 w-4" />
                Open Form
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            The QR code below points at this Google Form. Make sure the form is set to accept responses publicly.
          </p>
        </div>
      </div>

      {/* Connect Google Form Responses — Apps Script sync */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="p-6 border-b bg-muted/20">
          <div className="flex items-center gap-2">
            <Webhook className="h-5 w-5 text-purple-500" />
            <h2 className="font-semibold">Connect Google Form Responses</h2>
          </div>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-sm text-muted-foreground">
            Google doesn't let outside apps read Form responses directly. The fix is a small script attached to your
            Form that fires the moment someone submits, and pushes their answers straight into the Admission Form
            List below. Set it up once:
          </p>

          <ol className="text-sm text-muted-foreground space-y-1.5 list-decimal list-inside">
            <li>Open your Google Form, click the ⋮ menu (top right) → <span className="font-medium text-foreground">Script editor</span>.</li>
            <li>Delete anything already in the editor and paste the script below.</li>
            <li>In the script editor toolbar, click <span className="font-medium text-foreground">Run</span> once (choose <code className="text-xs bg-muted px-1 rounded">onFormSubmitAdmission</code>) to authorize it — Google will ask for permission.</li>
            <li>Click the clock icon (<span className="font-medium text-foreground">Triggers</span>) → Add Trigger → function <code className="text-xs bg-muted px-1 rounded">onFormSubmitAdmission</code>, event source "From form", event type "On form submit" → Save.</li>
          </ol>

          <div>
            <label className="text-xs font-medium text-muted-foreground">Your School ID (already filled into the script below)</label>
            <div className="flex items-center gap-2 mt-1 p-2 bg-muted/30 rounded-lg">
              <span className="text-sm font-mono flex-1 truncate">{schoolId || "Loading…"}</span>
              <Button variant="ghost" size="sm" onClick={copySchoolId} className="h-8 w-8 p-0" disabled={!schoolId}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">
              Backend URL the script sends responses to — update this if your live site's address is different
            </label>
            <Input
              value={apiBaseUrlDraft}
              onChange={(e) => setApiBaseUrlDraft(e.target.value)}
              className="mt-1 font-mono text-sm"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-muted-foreground">Apps Script — paste this in full</label>
              <Button variant="outline" size="sm" onClick={copyAppsScript} className="gap-1.5 h-7">
                <Copy className="h-3.5 w-3.5" /> Copy Script
              </Button>
            </div>
            <pre className="text-xs bg-muted/40 border rounded-lg p-3 overflow-x-auto font-mono leading-relaxed whitespace-pre">
{appsScript}
            </pre>
          </div>

          <p className="text-xs text-muted-foreground">
            The script matches your Form's question titles by keyword (e.g. any question with "class" in its title
            fills Class Applied, "guardian" or "parent" fills Guardian, etc.) — reword a question if it isn't being
            picked up correctly.
          </p>
        </div>
      </div>

      {/* QR Code Card */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="p-6 border-b bg-muted/20">
          <div className="flex items-center gap-2">
            <QrCode className="h-5 w-5 text-blue-500" />
            <h2 className="font-semibold">QR Code for Admission Form</h2>
          </div>
        </div>
        <div className="p-6">
          <div className="flex flex-col items-center gap-4">
            <div className="relative p-4 bg-white rounded-xl shadow-md">
              <img
                src={qrImageUrl}
                alt="Admission form QR code"
                width={200}
                height={200}
                className="rounded-lg"
              />
            </div>
            <p className="text-sm text-muted-foreground">Scan to Open Google Form</p>
            <div className="flex flex-wrap gap-2 justify-center">
              <Button variant="outline" onClick={copyLink} className="gap-2">
                <Copy className="h-4 w-4" /> Copy Form Link
              </Button>
              <Button variant="secondary" onClick={printQr} className="gap-2">
                <Printer className="h-4 w-4" /> Print QR
              </Button>
              <Button variant="default" onClick={openGoogleForm} className="gap-2">
                <ExternalLink className="h-4 w-4" /> Open Form
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Add Class Card */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="p-6 border-b bg-muted/20">
          <div className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-green-500" />
            <h2 className="font-semibold">Add New Class for Admission</h2>
          </div>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-xs text-muted-foreground">
            These are the class options a parent can pick from on the public form.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <Input
                value={newClassName}
                onChange={(e) => setNewClassName(e.target.value)}
                placeholder="Enter class name (e.g. Nursery, LKG, 1st...)"
                className="w-full"
                onKeyDown={(e) => { if (e.key === "Enter") addClassOption(); }}
              />
            </div>
            <Button onClick={addClassOption} disabled={addingClass} className="gap-2">
              <Save className="h-4 w-4" />
              {addingClass ? "Saving…" : "Save"}
            </Button>
          </div>

          {classOptionsQuery.isLoading ? (
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-20 rounded-full" />
              ))}
            </div>
          ) : classOptions.length > 0 ? (
            <div className="flex flex-wrap gap-2 pt-2">
              {classOptions.map((c) => (
                <span
                  key={c.id}
                  className="inline-flex items-center gap-1.5 rounded-full border bg-primary/5 px-3 py-1 text-sm transition-colors hover:bg-primary/10"
                >
                  <School className="h-3.5 w-3.5 text-primary" />
                  {c.name}
                  <button
                    onClick={() => removeClassOption(c.id, c.name || "")}
                    className="ml-1 text-muted-foreground hover:text-red-500 transition-colors"
                    aria-label={`Remove ${c.name}`}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </span>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <div className="p-3 rounded-full bg-muted/20">
                <School className="h-8 w-8 text-muted-foreground/50" />
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                No classes added yet — the public form will show no options until you add at least one.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Admission Form List Card */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="p-6 border-b bg-muted/20">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-500" />
              <h2 className="font-semibold">Admission Form List</h2>
              {!submissionsQuery.isLoading && filteredSubmissions.length > 0 && (
                <span className="ml-2 inline-flex items-center justify-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                  {filteredSubmissions.length}
                </span>
              )}
            </div>
            <div className="relative flex-1 sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, class, mobile..."
                className="pl-9 w-full"
              />
            </div>
          </div>
        </div>
        <div className="p-6">
          {submissionsQuery.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : submissionsQuery.isError ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-sm text-destructive">Failed to load admission submissions. Please try again.</p>
            </div>
          ) : filteredSubmissions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="p-4 rounded-full bg-muted/20 mb-4">
                <Inbox className="h-12 w-12 text-muted-foreground/50" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">No Admission Data Found</h3>
              <p className="text-sm text-muted-foreground mt-1">No admission forms have been submitted yet.</p>
            </div>
          ) : (
            <div className="rounded-lg border overflow-hidden overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/30">
                  <tr>
                    <th className="text-left font-medium px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground">Applied On</th>
                    <th className="text-left font-medium px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground">Applicant</th>
                    <th className="text-left font-medium px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground">Class Applied</th>
                    <th className="text-left font-medium px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground">Guardian</th>
                    <th className="text-left font-medium px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground">Phone</th>
                    <th className="text-left font-medium px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSubmissions.map((r) => {
                    const status = (r.status || "Pending") as keyof typeof STATUS_CONFIG;
                    const StatusIcon = STATUS_CONFIG[status]?.icon || Clock;
                    const statusClass = STATUS_CONFIG[status]?.className || "";

                    return (
                      <tr key={r.id} className="border-t hover:bg-muted/10 transition-colors">
                        <td className="px-4 py-3 text-muted-foreground">{r.appliedOn || "-"}</td>
                        <td className="px-4 py-3 font-medium">{studentName(r)}</td>
                        <td className="px-4 py-3">{r.classAppliedName || "-"}</td>
                        <td className="px-4 py-3">{r.guardian || "-"}</td>
                        <td className="px-4 py-3">{r.phone || r.mobile || "-"}</td>
                        <td className="px-4 py-3">
                          <Select value={status} onValueChange={(v) => updateStatus(r, v)}>
                            <SelectTrigger className={`h-8 w-32 gap-1.5 text-xs ${statusClass} border-0 bg-transparent hover:bg-muted/20`}>
                              <StatusIcon className="h-3.5 w-3.5" />
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {STATUS_OPTIONS.map((s) => {
                                const Icon = STATUS_CONFIG[s]?.icon || Clock;
                                return (
                                  <SelectItem key={s} value={s} className="gap-2">
                                    <div className="flex items-center gap-2">
                                      <Icon className="h-4 w-4" />
                                      <span>{s}</span>
                                    </div>
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}