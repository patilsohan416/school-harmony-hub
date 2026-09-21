// CBSE grading structure — kept completely separate from
// @/lib/icse-curriculum (CISCE) and @/lib/state-board-curriculum (SSC/HSC)
// on purpose: each board has its own subject list and marking scheme, and
// the three must never drift into each other, even though all three Marks
// Entry pages share the same virtual-subject grid mechanism (subject +
// component -> one saved row) and the same underlying /marks API.
//
//   Nursery / Pre-Primary   Play-based — qualitative only, no numerical
//                           marks or formal exams.
//   Class 1–5 (Primary)     100 marks/subject = 80 Written + 20 Internal.
//                           EVS only appears from Class 3 onward.
//   Class 6–8 (Middle)      100 marks/subject = 80 Written + 20 Internal.
//   Class 9–10 (Secondary)  100 marks/subject = 80 Written + 20 Internal —
//                           matches the official CBSE board-exam split.
//   Class 11–12 (Sr. Sec.)  Lab subjects (Physics/Chemistry/Biology/
//                           Biotechnology/Computer Science) = Theory 70 +
//                           Practical 30; every other subject = Theory 80
//                           + Internal 20.
//
// Unit Test exams (any band except 11–12) are a single 20-mark paper,
// same as the other boards — the 80/20 split only applies to formal exams
// (Half Yearly/Term, Final, Annual, Board Exam).

export type CbseBand =
  | "pre-primary" | "primary-lower" | "primary-upper"
  | "middle" | "secondary" | "senior-secondary" | "unknown";

export type CbseStream = "Science" | "Commerce" | "Humanities";

function getClassNumber(className: string): number | null {
  const norm = className.toLowerCase().replace(/class|grade|std\.?/g, "").trim();
  const match = norm.match(/\d+/);
  return match ? parseInt(match[0], 10) : null;
}

export function classifyCbseClass(className: string): CbseBand {
  const norm = className.toLowerCase().replace(/class|grade|std\.?/g, "").trim();
  if (/nursery|play\s*group|pre[- ]?nursery|lkg|l\.k\.g|jr\.?\s*kg|ukg|u\.k\.g|sr\.?\s*kg/.test(norm)) {
    return "pre-primary";
  }
  const n = getClassNumber(className);
  if (n !== null) {
    if (n >= 1 && n <= 2) return "primary-lower";
    if (n >= 3 && n <= 5) return "primary-upper";
    if (n >= 6 && n <= 8) return "middle";
    if (n >= 9 && n <= 10) return "secondary";
    if (n >= 11 && n <= 12) return "senior-secondary";
  }
  return "unknown";
}

export function isCbseSeniorSecondary(className: string) {
  return classifyCbseClass(className) === "senior-secondary";
}

export function cbseBandLabel(band: CbseBand): string {
  switch (band) {
    case "pre-primary": return "Nursery / Pre-Primary";
    case "primary-lower": return "Primary (1–2)";
    case "primary-upper": return "Primary (3–5)";
    case "middle": return "Middle School (6–8)";
    case "secondary": return "Secondary (9–10)";
    case "senior-secondary": return "Senior Secondary (11–12)";
    default: return "";
  }
}

export const CBSE_LAB_SUBJECTS = new Set([
  "Physics", "Chemistry", "Biology", "Biotechnology", "Computer Science",
]);

export function isUnitTestExam(examName: string): boolean {
  return /unit\s*test/i.test(examName);
}

export interface MarkComponent { key: string; label: string; max: number; }

export function getComponentsForSubject(band: CbseBand, subject: string, examName?: string): MarkComponent[] {
  if (band === "pre-primary") return []; // qualitative only — no numerical marks

  if (band !== "senior-secondary" && band !== "unknown" && examName && isUnitTestExam(examName)) {
    return [{ key: "unit", label: "Unit Test", max: 20 }];
  }

  if (band === "senior-secondary") {
    if (CBSE_LAB_SUBJECTS.has(subject)) {
      return [
        { key: "theory", label: "Theory", max: 70 },
        { key: "practical", label: "Practical", max: 30 },
      ];
    }
    return [
      { key: "theory", label: "Theory", max: 80 },
      { key: "internal", label: "Internal", max: 20 },
    ];
  }

  if (band === "unknown") return [{ key: "written", label: "Written Exam", max: 100 }];

  // primary-lower, primary-upper, middle, secondary — same 80/20 split,
  // consistent for every formal exam name.
  return [
    { key: "written", label: "Written", max: 80 },
    { key: "internal", label: "Internal", max: 20 },
  ];
}

export function passPercentageForBand(band: CbseBand): number | null {
  if (band === "secondary") return 33; // CBSE Class 10 board pass mark
  if (band === "senior-secondary") return 33; // CBSE Class 12 board pass mark
  return null;
}

export function virtualSubjectName(subject: string, component: MarkComponent): string {
  return `${subject} — ${component.label}`;
}

export function parseVirtualSubject(name: string): { subject: string; component: string | null } {
  const parts = name.split(" — ");
  if (parts.length >= 2) return { subject: parts[0], component: parts.slice(1).join(" — ") };
  return { subject: name, component: null };
}