// ─────────────────────────────────────────────────────────────────────────
// STATE BOARD / CBSE CURRICULUM & MARK-SCHEME MAP
// Mirrors @/lib/icse-curriculum but for the (non-ICSE) Marks Entry page.
// Central place for: grade-band classification, per-band/per-subject mark
// component breakdown (Written/Theory + Internal Assessment/Practical),
// and pass-percentage thresholds — shared by Marks Entry, Progress Report,
// Consolidated Results, etc. so every screen agrees on the same scheme.
//
// COMPONENT BREAKDOWN — CBSE doesn't grade every subject with one number
// either; Class 9-10 is Theory 80 + Internal Assessment 20, Class 11-12
// lab-based science subjects are Theory 70 + Practical 30, everything else
// at 11-12 is Theory 80 + Internal/Project 20. Each component is saved as
// its own "virtual subject" row (e.g. "Physics — Theory" and
// "Physics — Practical") through the same /marks/save API used for a
// single mark, exactly like the ICSE page.
//
// Pass marks: CBSE Class 10 and Class 12 are both 33% (overall & per
// subject) per CBSE's published scheme.
// ─────────────────────────────────────────────────────────────────────────

export type Band = "pre-primary" | "lower-primary" | "middle" | "high" | "higher-secondary" | "unknown";

export interface MarkComponent {
  label: string;
  max: number;
}

// Lab-based subjects at 11-12 get a Theory + Practical split; everything
// else at that level gets Theory + Internal Assessment/Project.
const LAB_SUBJECTS = new Set([
  "Physics", "Chemistry", "Biology", "Computer Science", "Biotechnology",
]);

export function classifyClass(className: string): Band {
  const norm = className.toLowerCase().replace(/class|grade|std\.?/g, "").trim();
  if (/nursery|play\s*group|pre[- ]?nursery|lkg|l\.k\.g|jr\.?\s*kg|ukg|u\.k\.g|sr\.?\s*kg/.test(norm)) {
    return "pre-primary";
  }
  const match = norm.match(/\d+/);
  if (match) {
    const n = parseInt(match[0], 10);
    if (n >= 1 && n <= 5) return "lower-primary";
    if (n >= 6 && n <= 8) return "middle";
    if (n >= 9 && n <= 10) return "high";
    if (n >= 11 && n <= 12) return "higher-secondary";
  }
  return "unknown";
}

export function isHigherSecondary(className: string) {
  return classifyClass(className) === "higher-secondary";
}

/**
 * The mark components a subject is graded on, for a given band. For
 * lower-primary, the exam name decides which single component shows —
 * a Unit/Periodic Test exam shows only the Periodic Test column, a
 * Half-Yearly/Annual exam shows only the Term Exam column — never both
 * at once, matching how CBSE's continuous assessment actually runs.
 */
export function getComponentsForSubject(band: Band, subject: string, examName: string): MarkComponent[] {
  const examLower = (examName || "").toLowerCase();

  // A Unit Test / Periodic Test is always a single Unit Test (20) paper —
  // it doesn't get an Internal Marks column, and it doesn't get the
  // Theory/Internal or Theory/Practical split that a Term/Final/Board
  // exam gets.
  const isUnitTest = /unit test|periodic test/.test(examLower);
  if (isUnitTest) {
    return [{ label: "Unit Test", max: 20 }];
  }

  switch (band) {
    case "pre-primary":
      return [
        { label: "Written", max: 30 },
        { label: "Oral / Activity", max: 20 },
      ];

    case "lower-primary":
      return [{ label: "Term Exam", max: 80 }];

    case "middle":
      return [
        { label: "Written Exam", max: 80 },
        { label: "Internal Assessment", max: 20 },
      ];

    case "high":
      return [
        { label: "Theory", max: 80 },
        { label: "Internal Assessment", max: 20 },
      ];

    case "higher-secondary":
      if (LAB_SUBJECTS.has(subject)) {
        return [
          { label: "Theory", max: 70 },
          { label: "Practical", max: 30 },
        ];
      }
      return [
        { label: "Theory", max: 80 },
        { label: "Internal / Project", max: 20 },
      ];

    default:
      return [{ label: "Marks", max: 100 }];
  }
}

/** CBSE's published pass threshold — 33% overall & per subject, Class 10 and 12 alike. */
export function passPercentageForBand(band: Band): number | null {
  if (band === "high" || band === "higher-secondary") return 33;
  return null;
}

export function virtualSubjectName(subject: string, component: MarkComponent): string {
  return `${subject} — ${component.label}`;
}

const BAND_LABELS: Record<Band, string> = {
  "pre-primary": "Pre-Primary",
  "lower-primary": "Lower Primary",
  "middle": "Middle School",
  "high": "High School",
  "higher-secondary": "Higher Secondary",
  "unknown": "This class",
};

export function bandLabel(band: Band): string {
  return BAND_LABELS[band];
}