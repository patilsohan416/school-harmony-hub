// Shared CISCE (ICSE/ISC) grading-structure logic — used by both ICSE Marks
// Entry and ICSE Progress Report so the grade band, component breakdown,
// group labels, and pass percentages never drift out of sync between them.

export type Band =
  | "pre-primary" | "primary-lower" | "primary-upper"
  | "middle" | "icse-9-10" | "isc-11-12" | "unknown";

export function classifyClass(className: string): Band {
  const norm = className.toLowerCase().replace(/class|grade|std\.?/g, "").trim();
  if (/nursery|play\s*group|pre[- ]?nursery|lkg|l\.k\.g|jr\.?\s*kg|ukg|u\.k\.g|sr\.?\s*kg/.test(norm)) {
    return "pre-primary";
  }
  const match = norm.match(/\d+/);
  if (match) {
    const n = parseInt(match[0], 10);
    if (n >= 1 && n <= 2) return "primary-lower";
    if (n >= 3 && n <= 5) return "primary-upper";
    if (n >= 6 && n <= 8) return "middle";
    if (n >= 9 && n <= 10) return "icse-9-10";
    if (n >= 11 && n <= 12) return "isc-11-12";
  }
  return "unknown";
}

export function isIsc(className: string) {
  return classifyClass(className) === "isc-11-12";
}

export function bandLabel(band: Band): string {
  switch (band) {
    case "pre-primary": return "Pre-Primary";
    case "primary-lower": return "Primary (1–2)";
    case "primary-upper": return "Primary (3–5)";
    case "middle": return "Middle School (6–8)";
    case "icse-9-10": return "ICSE (9–10)";
    case "isc-11-12": return "ISC (11–12)";
    default: return "";
  }
}

export interface MarkComponent { key: string; label: string; max: number; }

export const GROUP_I_SUBJECTS = new Set([
  "English", "Hindi", "History, Civics & Geography",
]);
export const GROUP_II_SUBJECTS = new Set([
  "Mathematics", "Science (Physics, Chemistry, Biology)", "Commercial Studies", "Economics",
]);
export const GROUP_III_SUBJECTS = new Set([
  "Group III Elective", "Environmental Science", "Socially Useful Productive Work (SUPW)",
]);

export const ISC_LAB_SUBJECTS = new Set([
  "Physics", "Chemistry", "Biology", "Biotechnology", "Computer Science",
]);

// Skill/craft-type subjects at every band below Class 11 get the 50+50
// split instead of 80+20 — matches Group III at the ICSE 9-10 band, and is
// applied by name pattern for every band below that (Pre-Primary through
// Middle School use plainer subject names like "Computer Studies" or "Art
// Education" rather than a formal Group III list).
const SKILL_SUBJECT_PATTERN = /computer|\bart\b|art\s*&|art\s+education|craft|physical\s+education|\bp\.?e\.?\b|supw|commercial\s+application|\bmusic\b|\bdance\b|\byoga\b/i;

function isSkillSubject(band: Band, subject: string): boolean {
  if (band === "icse-9-10") return GROUP_III_SUBJECTS.has(subject);
  return SKILL_SUBJECT_PATTERN.test(subject);
}

/** Group I / II / III label for a base (non-virtual) subject name, ICSE 9-10 only. */
export function groupLabelForSubject(band: Band, subject: string): string | null {
  if (band !== "icse-9-10") return null;
  if (GROUP_I_SUBJECTS.has(subject)) return "Group I";
  if (GROUP_II_SUBJECTS.has(subject)) return "Group II";
  if (GROUP_III_SUBJECTS.has(subject)) return "Group III";
  return null;
}

/**
 * Component breakdown (name + max marks) for a subject at a given grade
 * band and exam.
 *   Unit Test exams (any band except ISC 11-12): ONE component, Unit Test
 *     — Written 20. A quick periodic check, not the full split below.
 *   Every other exam (Half Yearly, Preliminary, Final, Annual, Board Exam),
 *   Pre-Primary through ICSE (9-10) all share ONE rule:
 *     Core subjects (English, Hindi, Maths, Science, Social Studies...)
 *       = Written 80 + Internal 20
 *     Skill subjects (Computer Studies, Art, Physical Education, SUPW...)
 *       = Written 50 + Internal 50
 * ISC (11-12) keeps its own distinct, explicitly lab-based structure for
 * every exam (Unit Tests included — a 20-mark paper doesn't fit a subject
 * whose lab component alone is worth more than that):
 *   Science labs (Physics/Chem/Bio/Biotech/Comp Sci) = Written 70 + Lab 15
 *     + Project 10 + File 5
 *   Maths/English = Written 80 + Internal Project 20
 *   Commerce/Humanities = Written 80 + Project & Viva 20
 * Pass marks: ICSE (Class 10) 33%, ISC (Class 12) 35%.
 */
export function isUnitTestExam(examName: string): boolean {
  return /unit\s*test/i.test(examName);
}

export function getComponentsForSubject(band: Band, subject: string, examName?: string): MarkComponent[] {
  if (band !== "isc-11-12" && band !== "unknown" && examName && isUnitTestExam(examName)) {
    return [{ key: "unit", label: "Unit Test", max: 20 }];
  }

  switch (band) {
    case "isc-11-12":
      if (ISC_LAB_SUBJECTS.has(subject)) {
        return [
          { key: "written", label: "Written Exam", max: 70 },
          { key: "lab", label: "Lab Practical", max: 15 },
          { key: "project", label: "Project Work", max: 10 },
          { key: "file", label: "Practical File", max: 5 },
        ];
      }
      if (subject === "Mathematics" || subject === "English") {
        return [
          { key: "written", label: "Written Exam", max: 80 },
          { key: "internal", label: "Internal Project Work", max: 20 },
        ];
      }
      return [
        { key: "written", label: "Written Exam", max: 80 },
        { key: "viva", label: "Project & Viva Voce", max: 20 },
      ];
    case "unknown":
      return [{ key: "written", label: "Written Exam", max: 100 }];
    default:
      // pre-primary, primary-lower, primary-upper, middle, icse-9-10 — one
      // uniform rule, same for Half Yearly, Annual, Final, and Board Exam.
      if (isSkillSubject(band, subject)) {
        return [
          { key: "written", label: "Written Exam", max: 50 },
          { key: "internal", label: "Internal", max: 50 },
        ];
      }
      return [
        { key: "written", label: "Written Exam", max: 80 },
        { key: "internal", label: "Internal", max: 20 },
      ];
  }
}

export function passPercentageForBand(band: Band): number | null {
  if (band === "icse-9-10") return 33;
  if (band === "isc-11-12") return 35;
  return null;
}

export function virtualSubjectName(subject: string, component: MarkComponent): string {
  return `${subject} — ${component.label}`;
}

/** Splits a stored mark's name ("Physics — Lab Practical") back into base subject + component label. */
export function parseVirtualSubject(name: string): { subject: string; component: string | null } {
  const parts = name.split(" — ");
  if (parts.length >= 2) {
    return { subject: parts[0], component: parts.slice(1).join(" — ") };
  }
  return { subject: name, component: null };
}