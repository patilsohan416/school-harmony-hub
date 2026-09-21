import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { apiFetch } from "@/lib/api/client";

interface OpenClass { id: string; name: string; }

const GENDER_OPTIONS = ["MALE", "FEMALE", "OTHER"];

export function PublicAdmissionApplyPage() {
  const [searchParams] = useSearchParams();
  const tenant = searchParams.get("tenant") || "";

  const [classes, setClasses] = useState<OpenClass[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(true);

  const [applicantName, setApplicantName] = useState("");
  const [classAppliedName, setClassAppliedName] = useState("");
  const [guardian, setGuardian] = useState("");
  const [phone, setPhone] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [gender, setGender] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!tenant) { setLoadingClasses(false); return; }
    apiFetch<{ data: OpenClass[] }>(`/public/admission/classes?tenant=${encodeURIComponent(tenant)}`, { auth: false })
      .then((res) => setClasses(res.data || []))
      .catch(() => setError("Could not load this school's admission form. Please try again later."))
      .finally(() => setLoadingClasses(false));
  }, [tenant]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!applicantName.trim() || !classAppliedName) {
      setError("Applicant name and Class Applied are required.");
      return;
    }

    setSubmitting(true);
    try {
      await apiFetch("/public/admission/apply", {
        auth: false,
        method: "POST",
        body: JSON.stringify({
          tenant, applicantName, classAppliedName, guardian, phone, dateOfBirth, gender,
        }),
      });
      setSubmitted(true);
    } catch (err: any) {
      setError(err?.message || "Failed to submit application. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!tenant) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <p className="text-center text-muted-foreground max-w-sm">
          This admission link is missing school information. Please ask the school for a fresh link or QR code.
        </p>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-sm text-center space-y-2">
          <h1 className="text-xl font-bold">Application Submitted</h1>
          <p className="text-muted-foreground text-sm">
            Thank you — your admission application has been received. The school will contact you regarding next steps.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Admission Application</h1>
          <p className="text-sm text-muted-foreground mt-1">Fill in the details below to apply.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 border rounded-lg p-6">
          <div>
            <label className="text-sm font-medium">Applicant Name *</label>
            <input
              value={applicantName}
              onChange={(e) => setApplicantName(e.target.value)}
              className="mt-1 w-full border rounded-md px-3 py-2 text-sm"
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium">Class Applied *</label>
            <select
              value={classAppliedName}
              onChange={(e) => setClassAppliedName(e.target.value)}
              className="mt-1 w-full border rounded-md px-3 py-2 text-sm bg-white"
              disabled={loadingClasses}
              required
            >
              <option value="">{loadingClasses ? "Loading…" : "Select class"}</option>
              {classes.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium">Guardian Name</label>
            <input
              value={guardian}
              onChange={(e) => setGuardian(e.target.value)}
              className="mt-1 w-full border rounded-md px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Phone</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mt-1 w-full border rounded-md px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Date of Birth</label>
            <input
              type="date"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
              className="mt-1 w-full border rounded-md px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Gender</label>
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              className="mt-1 w-full border rounded-md px-3 py-2 text-sm bg-white"
            >
              <option value="">Select gender</option>
              {GENDER_OPTIONS.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-primary text-primary-foreground rounded-md py-2 text-sm font-medium disabled:opacity-50"
          >
            {submitting ? "Submitting…" : "Submit Application"}
          </button>
        </form>
      </div>
    </div>
  );
}