export type Role =
  | "super_admin"
  | "org_admin"
  | "school_admin"
  | "principal"
  | "vice_principal"
  | "teacher"
  | "class_teacher"
  | "hr"
  | "accountant"
  | "receptionist"
  | "transport_manager"
  | "librarian"
  | "hostel_warden"
  | "parent"
  | "student";

export type Action = "create" | "read" | "update" | "delete" | "export" | "print" | "approve" | "import";

export const ROLE_LABELS: Record<Role, string> = {
  super_admin: "Super Admin",
  org_admin: "Organization Admin",
  school_admin: "School Admin",
  principal: "Principal",
  vice_principal: "Vice Principal",
  teacher: "Teacher",
  class_teacher: "Class Teacher",
  hr: "HR",
  accountant: "Accountant",
  receptionist: "Receptionist",
  transport_manager: "Transport Manager",
  librarian: "Librarian",
  hostel_warden: "Hostel Warden",
  parent: "Parent",
  student: "Student",
};

const ALL: Action[] = ["create", "read", "update", "delete", "export", "print", "approve", "import"];
const READ_ONLY: Action[] = ["read", "export", "print"];

/**
 * Permission matrix: role -> module group -> allowed actions.
 * Groups map to the sidebar sections in navigation.ts.
 */
const MATRIX: Record<Role, Record<string, Action[]>> = {
  super_admin: { "*": ALL },
  org_admin: { "*": ALL },
  school_admin: { "*": ALL },
  principal: { "*": ["create", "read", "update", "delete", "export", "print", "approve"] },
  vice_principal: { "*": ["create", "read", "update", "export", "print", "approve"] },
  teacher: {
    "Student Management": READ_ONLY,
    "Attendance Management": ["create", "read", "update", "export", "print"],
    "Student Register": READ_ONLY,
    "Examination & Results": ["create", "read", "update", "export", "print"],
    "ICSE Examination & Results": ["create", "read", "update", "export", "print"],
    "CBSE Examination & Results": ["create", "read", "update", "export", "print"],
    "Online Test": ALL,
    "Timetable": READ_ONLY,
  },
  class_teacher: {
    "Student Management": ["read", "update", "export", "print"],
    "Attendance Management": ALL,
    "Student Register": READ_ONLY,
    "Examination & Results": ALL,
    "ICSE Examination & Results": ALL,
    "CBSE Examination & Results": ALL,
    "Online Test": ALL,
    "Timetable": READ_ONLY,
  },
  hr: { "Staff Management": ALL },
  accountant: {
    "Accountant": ALL,
    "Fee Management": ALL,
    "Staff Management": ["read", "update", "export", "print"],
  },
  receptionist: {
    "Student Management": ["create", "read", "update", "export", "print"],
    "Attendance Management": READ_ONLY,
  },
  transport_manager: {},
  librarian: {},
  hostel_warden: {},
  parent: {
    "Student Management": READ_ONLY,
    "Attendance Management": READ_ONLY,
    "Fee Management": READ_ONLY,
    "Examination & Results": READ_ONLY,
    "ICSE Examination & Results": READ_ONLY,
    "CBSE Examination & Results": READ_ONLY,
    "Timetable": READ_ONLY,
  },
  student: {
    "Attendance Management": READ_ONLY,
    "Examination & Results": READ_ONLY,
    "ICSE Examination & Results": READ_ONLY,
    "CBSE Examination & Results": READ_ONLY,
    "Timetable": READ_ONLY,
    "Online Test": ["read", "create"],
  },
};

export function can(role: Role, group: string, action: Action): boolean {
  const perms = MATRIX[role];
  if (!perms) return false;
  if (perms["*"]?.includes(action)) return true;
  return perms[group]?.includes(action) ?? false;
}

export function accessibleGroups(role: Role, allGroups: string[]): string[] {
  return allGroups.filter((g) => can(role, g, "read"));
}