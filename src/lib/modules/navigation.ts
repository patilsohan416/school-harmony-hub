import { MODULES, modulesByGroup, getPermissions } from "./registry";
import type { ModuleDef } from "./types";
import { useAuth } from "@/lib/auth/store";

export interface NavGroup {
  label: string;
  icon: string;
  modules: ModuleDef[];
}

// The order here matches the sidebar spec exactly.
const GROUP_ORDER = [
  "Student Management",
  "Attendance Management",
  "Student Register",
  "Fee Management",
  "Mid-Day Meal",
  "Examination & Results",
  "ICSE Examination & Results",
  "CBSE Examination & Results",
  "Staff Management",
  "Online Test",
  "Timetable",
  "Inventory",
  "Accountant",
  "Teacher Dashboard",
  "Student Dashboard",
];

const GROUP_ICONS: Record<string, string> = {
  "Student Management": "Users",
  "Attendance Management": "CalendarCheck",
  "Student Register": "ClipboardList",
  "Fee Management": "Wallet",
  "Mid-Day Meal": "Utensils",
  "Examination & Results": "GraduationCap",
  "ICSE Examination & Results": "GraduationCap",
  "CBSE Examination & Results": "GraduationCap",
  "Staff Management": "Briefcase",
  "Online Test": "MonitorPlay",
  "Timetable": "CalendarClock",
  "Inventory": "Package",
  "Accountant": "IndianRupee",
  "Teacher Dashboard": "BookOpen",
  "Student Dashboard": "Award",
};

// ✅ FIX: getNavigation reads the logged-in user's role directly from the
// auth store (instead of requiring every caller, like app-sidebar.tsx, to
// pass it in) and filters each group down to only the modules that role
// can actually *view* — previously it only checked whether the role could
// see the *group* at all, so a role with access to "Examination & Results"
// saw every module inside it, including ones with no view permission for
// that role (per each module's own `permissions.view` list in
// registry.ts). Modules with no explicit `permissions` fall back to
// DEFAULT_PERMISSIONS in registry.ts, which does NOT include STUDENT — so
// this alone hides Marks Entry, Progress Report, etc. from students
// without needing to touch each module individually.
export function getNavigation(): NavGroup[] {
  const grouped = modulesByGroup();
  const role = useAuth.getState().user?.role;
  const normalizedRole = role?.toUpperCase();

  return GROUP_ORDER.map((label) => {
    const modulesInGroup = grouped[label] ?? [];
    const visibleModules = normalizedRole
      ? modulesInGroup.filter((m) => getPermissions(m).view.includes(normalizedRole))
      : modulesInGroup;

    return {
      label,
      icon: GROUP_ICONS[label] ?? "Folder",
      modules: visibleModules,
    };
  }).filter((g) => g.modules.length > 0);
}

export function totalModuleCount(): number {
  return MODULES.length;
}