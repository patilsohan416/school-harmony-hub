import { apiFetch } from "../api/client";
import { getApiEndpoint } from "../modules/registry";

export interface AuditEntry {
  id: string;
  module: string;
  recordId: string;
  action: "create" | "update" | "delete";
  oldData: Record<string, unknown> | null;
  newData: Record<string, unknown> | null;
  userId: string;
  userName: string;
  at: string;
}

export interface ListParams {
  search?: string;
  sortBy?: string;
  sortDir?: "asc" | "desc";
  page?: number;
  pageSize?: number;
  filters?: Record<string, string>;
}

export interface ListResult<T> {
  rows: T[];
  total: number;
  page: number;
  pageSize: number;
}

export type Record_ = { id: string; createdAt: string; updatedAt: string; deletedAt?: string | null } & Record<string, unknown>;

// ===================== CLASS/SECTION LOOKUP (dynamic, from backend) =====================

export interface SectionInfo {
  id: string;
  name: string;
}

export interface ClassInfo {
  id: string;
  name: string;
  sections: SectionInfo[];
}

let classesCache: ClassInfo[] | null = null;
let classesCachePromise: Promise<ClassInfo[]> | null = null;

export async function getClassesWithSections(): Promise<ClassInfo[]> {
  if (classesCache) return classesCache;
  if (classesCachePromise) return classesCachePromise;

  classesCachePromise = apiFetch<{ data: ClassInfo[] }>("/classes").then((res) => {
    classesCache = res.data || [];
    return classesCache;
  });

  return classesCachePromise;
}

// Call this if classes/sections change and you need fresh data
export function clearClassesCache() {
  classesCache = null;
  classesCachePromise = null;
}

// Matches a class by name, code, or numeric grade (handles "9", "9th Grade", "Nursery", etc.)
function findClassMatch(classes: ClassInfo[], selected: string): ClassInfo | undefined {
  const normalized = selected.trim().toLowerCase();
  return classes.find((c) => {
    const name = c.name.trim().toLowerCase();
    return (
      name === normalized ||
      name === `${normalized} grade` ||
      name === `${normalized}th grade` ||
      name === `${normalized}st grade` ||
      name === `${normalized}nd grade` ||
      name === `${normalized}rd grade` ||
      name.replace(/(st|nd|rd|th)\s*grade$/, "").trim() === normalized
    );
  });
}

function findSectionMatch(sections: SectionInfo[], selected: string): SectionInfo | undefined {
  const normalized = selected.trim().toLowerCase();
  return sections.find((s) => s.name.trim().toLowerCase() === normalized);
}

const BLOOD_GROUP_MAP: Record<string, string> = {
  "A+": "A_POSITIVE",
  "A-": "A_NEGATIVE",
  "B+": "B_POSITIVE",
  "B-": "B_NEGATIVE",
  "AB+": "AB_POSITIVE",
  "AB-": "AB_NEGATIVE",
  "O+": "O_POSITIVE",
  "O-": "O_NEGATIVE",
};

const CATEGORY_MAP: Record<string, string> = {
  General: "GENERAL",
  OBC: "OBC",
  SC: "SC",
  ST: "ST",
  EWS: "EWS",
};

async function mapPayloadForModule(
  module: string,
  payload: Record<string, unknown>
): Promise<Record<string, unknown>> {
  if (module !== "new-student") {
    return payload;
  }

  const p = payload as any;

  let classId: string | undefined;
  let sectionId: string | undefined;

  if (p.class !== undefined || p.section !== undefined) {
    const classes = await getClassesWithSections();

    const matchedClass = findClassMatch(classes, String(p.class ?? ""));
    if (!matchedClass) {
      throw new Error(
        `Could not find class "${p.class}". Available classes: ${classes
          .map((c) => c.name)
          .join(", ")}`
      );
    }

    const matchedSection = findSectionMatch(matchedClass.sections, String(p.section ?? ""));
    if (!matchedSection) {
      throw new Error(
        `Could not find section "${p.section}" in class "${matchedClass.name}". Available sections: ${matchedClass.sections
          .map((s) => s.name)
          .join(", ")}`
      );
    }

    classId = matchedClass.id;
    sectionId = matchedSection.id;
  }

  const mapped: Record<string, unknown> = {
    rollNumber: p.rollNumber,
    firstName: p.firstName,
    middleName: p.middleName || undefined,
    lastName: p.lastName,
    dateOfBirth: p.dob,
    gender: p.gender ? p.gender.toUpperCase() : undefined,
    bloodGroup: p.bloodGroup ? BLOOD_GROUP_MAP[p.bloodGroup] ?? p.bloodGroup : undefined,
    heightCm: p.heightCm || undefined,
    weightKg: p.weightKg || undefined,
    category: p.category ? CATEGORY_MAP[p.category] ?? p.category : undefined,
    religion: p.religion,
    caste: p.caste || undefined,
    nationality: p.nationality,
    aadhaar: p.aadhaar || undefined,
    passportNumber: p.passportNumber || undefined,
    mobile: p.mobile || undefined,
    email: p.email,
    photo: p.photo instanceof File ? p.photo : undefined,
    guardianName: p.guardian,
    guardianRelation: p.guardian ? "GUARDIAN" : undefined,
    guardianMobile: p.phone,
    address: p.address || undefined,
    classId,
    sectionId,
  };

  // Drop keys that were never set, so partial updates don't overwrite
  // existing values with undefined.
  return Object.fromEntries(Object.entries(mapped).filter(([, v]) => v !== undefined));
}

function buildRequestBody(payload: Record<string, unknown>): BodyInit {
  const hasFile = Object.values(payload).some((v) => v instanceof File);

  if (!hasFile) {
    return JSON.stringify(payload);
  }

  const formData = new FormData();
  for (const [key, value] of Object.entries(payload)) {
    if (value === undefined || value === null) continue;
    if (value instanceof File) {
      formData.append(key, value);
    } else if (typeof value === "object") {
      formData.append(key, JSON.stringify(value));
    } else {
      formData.append(key, String(value));
    }
  }
  return formData;
}

const REVERSE_BLOOD_GROUP_MAP: Record<string, string> = Object.fromEntries(
  Object.entries(BLOOD_GROUP_MAP).map(([k, v]) => [v, k])
);

const REVERSE_CATEGORY_MAP: Record<string, string> = Object.fromEntries(
  Object.entries(CATEGORY_MAP).map(([k, v]) => [v, k])
);

function toDateInputValue(value: unknown): string | undefined {
  if (!value) return undefined;
  const d = new Date(value as string);
  if (isNaN(d.getTime())) return undefined;
  return d.toISOString().slice(0, 10);
}

function titleCase(value: unknown): string | undefined {
  if (typeof value !== "string" || !value) return undefined;
  return value.charAt(0) + value.slice(1).toLowerCase();
}

// Converts a full class name like "5th Grade" back into the plain value
// ("5") used by the Class dropdown's options, so editing a student shows
// the correct selection instead of a blank dropdown. Names that already
// match an option as-is (Nursery, LKG, UKG) pass through unchanged.
function classNameToOption(name: string | undefined): string | undefined {
  if (!name) return undefined;
  const stripped = name.trim().replace(/\s*(st|nd|rd|th)\s*grade$/i, "").trim();
  return stripped || name;
}

/**
 * Reverse of mapPayloadForModule: takes a raw record as returned by the
 * server (nested class/section objects, backend field names, enum values)
 * and converts it into the flat, display-friendly shape the New Student
 * form's fields expect, so editing an existing record actually pre-fills
 * correctly instead of showing blank inputs.
 */
function mapRecordToFormValues(module: string, row: Record<string, unknown>): Record<string, unknown> {
  if (module !== "new-student") {
    return row;
  }

  const r = row as any;

  return {
    ...row,
    class: classNameToOption(r.class?.name),
    section: r.section?.name,
    dob: toDateInputValue(r.dateOfBirth),
    gender: titleCase(r.gender),
    bloodGroup: r.bloodGroup ? REVERSE_BLOOD_GROUP_MAP[r.bloodGroup] ?? r.bloodGroup : undefined,
    category: r.category ? REVERSE_CATEGORY_MAP[r.category] ?? r.category : undefined,
    guardian: r.guardianName,
    phone: r.guardianMobile,
    // The saved photo is a URL string, not a File — the file input itself
    // stays empty (browsers won't pre-fill file pickers), but we keep the
    // URL here so the form can show a preview of the current photo.
    photo: r.profileImage || undefined,
  };
}

export function createCrudService<T extends Record_>(module: string, searchableFields: string[] = []) {
  const endpoint = getApiEndpoint(module);

  return {
    toFormValues(row: T): Record<string, unknown> {
      return mapRecordToFormValues(module, row);
    },

    async list(params: ListParams = {}): Promise<ListResult<T>> {
      const { search = "", sortBy, sortDir = "asc", page = 1, pageSize = 10, filters = {} } = params;

      const query = new URLSearchParams({
        page: String(page),
        limit: String(pageSize),
        ...(search && { search }),
        ...(sortBy && { sortBy }),
        ...(sortDir && { sortOrder: sortDir }),
        ...Object.fromEntries(
          Object.entries(filters).filter(([_, v]) => v)
        ),
      });

      const result = await apiFetch<{ data: T[]; pagination: { total: number; page: number; limit: number } }>(
        `/${endpoint}?${query}`
      );

      return {
        rows: result.data || [],
        total: result.pagination?.total || 0,
        page: result.pagination?.page || page,
        pageSize: result.pagination?.limit || pageSize,
      };
    },

    async get(id: string): Promise<T | null> {
      try {
        const result = await apiFetch<{ data: T }>(`/${endpoint}/${id}`);
        return result.data || null;
      } catch {
        return null;
      }
    },

    async create(payload: Partial<T>): Promise<T> {
      const mappedPayload = await mapPayloadForModule(module, payload);

      console.log("========== CREATE REQUEST ==========");
      console.log("Module:", module);
      console.log("Endpoint:", endpoint);
      console.log("Payload:", mappedPayload);

      try {
        const result = await apiFetch<{
          success: boolean;
          data: T;
          message?: string;
        }>(`/${endpoint}`, {
          method: "POST",
          body: buildRequestBody(mappedPayload),
        });

        if (!result || !result.data) {
          throw new Error("Server returned an empty response.");
        }

        return result.data;
      } catch (error: any) {
        console.error("Create Student Error:", error);

        throw new Error(
          error?.message || "Failed to create student."
        );
      }
    },

    async update(id: string, patch: Partial<T>): Promise<T> {
      const mappedPatch = await mapPayloadForModule(module, patch as Record<string, unknown>);
      const result = await apiFetch<{ data: T }>(`/${endpoint}/${id}`, {
        method: "PUT",
        body: buildRequestBody(mappedPatch),
      });
      return result.data;
    },

    async remove(id: string): Promise<void> {
      await apiFetch(`/${endpoint}/${id}`, {
        method: "DELETE",
      });
    },

    async count(): Promise<number> {
      try {
        const result = await apiFetch<{ pagination: { total: number } }>(`/${endpoint}?limit=1`);
        return result.pagination?.total || 0;
      } catch {
        return 0;
      }
    },
  };
}

export function getAuditLog(): AuditEntry[] {
  return [];
}