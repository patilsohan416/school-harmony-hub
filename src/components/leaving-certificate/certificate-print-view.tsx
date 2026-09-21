import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/store";
import type { Record_ } from "@/lib/services/crud.service";

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

function formatDate(value?: string) {
  if (!value) return "-";
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function CertificatePrintView({
  record,
  onClose,
}: {
  record: CertRecord;
  onClose: () => void;
}) {
  const user = useAuth((s) => s.user);
  const schoolName = user?.schoolName || "School Name Not Set";
  const schoolAddressParts = [
    user?.schoolAddress,
    user?.schoolCity,
    user?.schoolState,
    user?.schoolPincode,
  ].filter(Boolean);
  const schoolPhone = user?.schoolPhone;
  const schoolEmail = user?.schoolEmail;

  useEffect(() => {
    const handleAfterPrint = () => onClose();
    window.addEventListener("afterprint", handleAfterPrint);
    return () => window.removeEventListener("afterprint", handleAfterPrint);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center overflow-y-auto py-8"
      id="cert-print-overlay"
    >
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #cert-print-area, #cert-print-area * { visibility: visible; }
          #cert-print-area {
            position: absolute; top: 0; left: 0; width: 100%;
            box-shadow: none !important; margin: 0 !important;
          }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl mx-4">
        <div className="no-print flex items-center justify-end gap-2 p-3 border-b">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button onClick={() => window.print()}>Print</Button>
        </div>

        <div id="cert-print-area" className="p-10 text-sm text-black">
          <div className="text-center border-b-2 border-black pb-3 mb-4">
            <h1 className="text-2xl font-bold">{schoolName}</h1>
            {schoolAddressParts.length > 0 && (
              <p className="text-xs mt-1">{schoolAddressParts.join(", ")}</p>
            )}
            <div className="flex justify-center gap-6 text-xs mt-1">
              {schoolPhone && <span>Phone: {schoolPhone}</span>}
              {schoolEmail && <span>Email: {schoolEmail}</span>}
            </div>
            <div className="inline-block bg-black text-white px-4 py-1 mt-3 font-semibold tracking-wide">
              SCHOOL LEAVING CERTIFICATE
            </div>
          </div>

          <div className="flex justify-between text-xs mb-4">
            <span>
              Admission No: <strong>{record.admissionNo || "-"}</strong>
            </span>
            <span>
              GR No: <strong>{record.grNo || "-"}</strong>
            </span>
            <span>
              Certificate No: <strong>{record.certNo || "-"}</strong>
            </span>
          </div>

          <table className="w-full border-collapse border border-black text-sm">
            <tbody>
              <Row label="Student's Full Name" value={record.name} />
              <Row label="Student's Name (English)" value={record.nameEnglish} />
              <Row label="Father's / Guardian's Name" value={record.fatherName} />
              <Row label="Date of Birth" value={formatDate(record.dateOfBirth)} />
              <Row label="Gender" value={record.gender} />
              <Row label="Class" value={record.class} />
              <Row label="Division" value={record.division} />
              <Row label="Roll No" value={String(record.rollNo ?? "-")} />
              <Row
                label="Admission Date (Studying Since)"
                value={formatDate(record.studyingSince)}
              />
              <Row label="Date of Leaving" value={formatDate(record.dateOfLeaving)} />
              <Row label="Progress" value={record.progress} />
              <Row label="Conduct" value={record.conduct} />
              <Row label="Reason for Leaving" value={record.reason} />
              <Row label="Remark" value={record.remark} />
              {record.destinationSchool && (
                <Row label="Destination School / College" value={record.destinationSchool} />
              )}
            </tbody>
          </table>

          <p className="text-xs mt-4">
            This is to certify that the above information is in accordance with the school records.
          </p>

          <div className="flex justify-between mt-16 text-sm">
            <div className="text-center">
              <div className="border-t border-black w-40 pt-1">Clerk</div>
            </div>
            <div className="text-center">
              <div className="border-t border-black w-40 pt-1">Principal / Headmaster</div>
            </div>
          </div>

          <p className="text-xs mt-6">
            Date:{" "}
            {formatDate(record.issueDate) !== "-"
              ? formatDate(record.issueDate)
              : formatDate(new Date().toISOString())}
          </p>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value?: string }) {
  return (
    <tr className="border border-black">
      <td className="border border-black px-3 py-1.5 font-medium w-1/3 bg-muted/30">{label}</td>
      <td className="border border-black px-3 py-1.5">{value || "-"}</td>
    </tr>
  );
}
