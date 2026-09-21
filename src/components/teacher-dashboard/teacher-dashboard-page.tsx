import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Users, BookOpen, Layers, Clock, ArrowRight, CheckSquare, PenLine,
  CalendarClock, GraduationCap, AlertCircle, FileText, Award, ClipboardList,
  MapPin, CalendarDays,
} from "lucide-react";
import { StatCard } from "@/components/common/stat-card";
import { PageHeader } from "@/components/common/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/store";
import { apiFetch } from "@/lib/api/client";

interface TeacherSectionInfo {
  sectionId: string;
  sectionName: string;
  classId: string;
  className: string;
  isClassTeacher: boolean;
}

interface TeacherSubjectInfo {
  subjectId: string;
  subjectName: string;
  classId: string;
  className: string;
  isPrimary: boolean;
}

interface TimetableEntry {
  id: string;
  startTime: string;
  endTime: string;
  subject: string;
  class: string;
  section: string;
  room?: string | null;
}

interface TeacherDashboardData {
  hasTeacherRecord: boolean;
  profile: {
    name: string;
    employeeId: string;
    designation: string;
    department?: string | null;
    email: string;
    phone: string;
    profileImage?: string | null;
  } | null;
  classes: TeacherSectionInfo[];
  subjects: TeacherSubjectInfo[];
  todayTimetable: TimetableEntry[];
  totalStudents: number;
  totalClasses: number;
  totalSubjects: number;
}

const QUICK_LINKS = [
  { to: "/app/mark-attendance", label: "Attendance", icon: CheckSquare, accent: "primary" as const },
  { to: "/app/marks-entry", label: "Marks Entry", icon: PenLine, accent: "success" as const },
  { to: "/app/view-timetable", label: "Time Table", icon: CalendarClock, accent: "info" as const },
  { to: "/app/student-register", label: "Student Register", icon: GraduationCap, accent: "warning" as const },
  { to: "/app/subject-wise-results", label: "Examination", icon: FileText, accent: "primary" as const },
  { to: "/app/icse-view-reports", label: "ICSE Examination", icon: Award, accent: "info" as const },
  { to: "/app/cbse-subject-wise-results", label: "CBSE Examinations", icon: Award, accent: "success" as const },
  { to: "/app/online-test", label: "Online Test", icon: ClipboardList, accent: "warning" as const },
  { to: "/app/study-material", label: "Study Material", icon: BookOpen, accent: "primary" as const },
];

function isNowInPeriod(startTime: string, endTime: string) {
  const now = new Date();
  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);
  const start = sh * 60 + sm;
  const end = eh * 60 + em;
  const nowMins = now.getHours() * 60 + now.getMinutes();
  return nowMins >= start && nowMins < end;
}

// A small fixed palette so each subject gets a consistent accent colour
// without needing a colour field from the backend.
const ACCENT_PALETTE = [
  { bar: "bg-indigo-500", chip: "bg-indigo-50 text-indigo-700" },
  { bar: "bg-emerald-500", chip: "bg-emerald-50 text-emerald-700" },
  { bar: "bg-amber-500", chip: "bg-amber-50 text-amber-700" },
  { bar: "bg-rose-500", chip: "bg-rose-50 text-rose-700" },
  { bar: "bg-sky-500", chip: "bg-sky-50 text-sky-700" },
  { bar: "bg-violet-500", chip: "bg-violet-50 text-violet-700" },
];

function accentFor(subject: string) {
  let hash = 0;
  for (let i = 0; i < subject.length; i++) hash = (hash * 31 + subject.charCodeAt(i)) >>> 0;
  return ACCENT_PALETTE[hash % ACCENT_PALETTE.length];
}

export function TeacherDashboard() {
  const user = useAuth((s) => s.user);

  const { data, isLoading } = useQuery({
    queryKey: ["teacher-my-dashboard"],
    queryFn: async () => {
      const res = await apiFetch<{ data: TeacherDashboardData }>("/teachers/me/dashboard");
      return res.data;
    },
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading your dashboard…</p>
        </div>
      </div>
    );
  }

  const profile = data?.profile;
  const classes = data?.classes ?? [];
  const subjects = data?.subjects ?? [];
  const todayTimetable = data?.todayTimetable ?? [];
  const today = new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });

  return (
    <div className="space-y-8">
      <PageHeader
        title={`Welcome, ${(user?.name || profile?.name || "there").split(" ")[0]}`}
        description={`${profile?.designation || "Teacher"}${profile?.department ? ` · ${profile.department}` : ""} · ${user?.schoolName ?? ""}`}
        actions={
          <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
            {today}
          </Badge>
        }
      />

      {data && !data.hasTeacherRecord && (
        <Card className="p-4 border-warning/40 bg-warning/5 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-warning mt-0.5 shrink-0" />
          <div className="text-sm">
            <p className="font-medium">No classes assigned yet</p>
            <p className="text-muted-foreground mt-0.5">
              Your login is active, but an admin hasn't assigned you any classes, subjects, or a
              timetable yet. Once that's done, they'll show up here automatically.
            </p>
          </div>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="My Classes" value={data?.totalClasses ?? 0} icon={Layers} accent="primary" />
        <StatCard label="My Subjects" value={data?.totalSubjects ?? 0} icon={BookOpen} accent="info" />
        <StatCard label="My Students" value={data?.totalStudents ?? 0} icon={Users} accent="success" />
        <StatCard label="Periods Today" value={todayTimetable.length} icon={Clock} accent="warning" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Today's timetable */}
        <Card className="lg:col-span-2 p-6 card-elevated">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/10">
                <CalendarDays className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold tracking-tight">Today's Timetable</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Your periods for {today}</p>
              </div>
            </div>
            <Link to="/app/view-timetable">
              <Button variant="ghost" size="sm" className="gap-1 text-xs">
                Full timetable <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>

          {todayTimetable.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-center rounded-2xl border-2 border-dashed">
              <CalendarDays className="h-12 w-12 text-muted-foreground/25 mb-3" />
              <p className="text-sm font-medium text-muted-foreground">No periods scheduled for you today</p>
              <p className="text-xs text-muted-foreground/70 mt-1">Enjoy the free day — check back tomorrow.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {todayTimetable.map((entry) => {
                const active = isNowInPeriod(entry.startTime, entry.endTime);
                const accent = accentFor(entry.subject);
                return (
                  <div
                    key={entry.id}
                    className={`relative flex items-center justify-between overflow-hidden rounded-xl border px-4 py-3.5 text-sm transition-all ${
                      active
                        ? "border-primary/40 bg-primary/5 shadow-sm ring-1 ring-primary/20"
                        : "hover:bg-muted/30"
                    }`}
                  >
                    <span className={`absolute left-0 top-0 h-full w-1.5 ${accent.bar}`} />
                    <div className="flex items-center gap-4 min-w-0 pl-2">
                      <div className="flex flex-col items-center justify-center shrink-0 w-[76px]">
                        <span className="text-xs font-mono font-medium text-foreground">{entry.startTime}</span>
                        <span className="text-[10px] text-muted-foreground">–{entry.endTime}</span>
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold truncate">{entry.subject}</p>
                          {active && (
                            <Badge className="bg-primary text-primary-foreground text-[10px] px-1.5 py-0 h-4 animate-pulse">
                              Now
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <GraduationCap className="h-3 w-3" />
                          {entry.class} - {entry.section}
                          {entry.room && (
                            <span className="flex items-center gap-1 ml-1.5">
                              <MapPin className="h-3 w-3" /> {entry.room}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    <span className={`text-[10px] font-medium px-2 py-1 rounded-full shrink-0 ${accent.chip}`}>
                      {entry.subject}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Quick actions */}
        <Card className="p-6 card-elevated">
          <h3 className="font-semibold tracking-tight">Quick Actions</h3>
          <p className="text-xs text-muted-foreground mt-0.5 mb-4">Jump to your daily tasks</p>
          <div className="space-y-2">
            {QUICK_LINKS.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="flex items-center justify-between rounded-lg border px-3 py-2.5 text-sm hover:bg-muted/30 group"
              >
                <span className="flex items-center gap-2.5">
                  <link.icon className="h-4 w-4 text-muted-foreground" />
                  {link.label}
                </span>
                <ArrowRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition text-muted-foreground" />
              </Link>
            ))}
          </div>
        </Card>
      </div>

      {/* My classes & subjects */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-6 card-elevated">
          <h3 className="font-semibold tracking-tight mb-4">My Classes &amp; Sections</h3>
          {classes.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No sections assigned yet.</p>
          ) : (
            <ul className="space-y-2">
              {classes.map((c) => (
                <li
                  key={c.sectionId}
                  className="flex items-center justify-between text-sm rounded-lg border px-3 py-2.5"
                >
                  <span className="font-medium">{c.className} - {c.sectionName}</span>
                  {c.isClassTeacher && (
                    <Badge variant="outline" className="text-[10px] text-primary border-primary/30 bg-primary/5">
                      Class Teacher
                    </Badge>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-6 card-elevated">
          <h3 className="font-semibold tracking-tight mb-4">My Subjects</h3>
          {subjects.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No subjects assigned yet.</p>
          ) : (
            <ul className="space-y-2">
              {subjects.map((s, i) => (
                <li
                  key={`${s.subjectId}-${s.classId}-${i}`}
                  className="flex items-center justify-between text-sm rounded-lg border px-3 py-2.5"
                >
                  <span className="font-medium">{s.subjectName}</span>
                  <span className="text-xs text-muted-foreground">{s.className}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

export default TeacherDashboard;