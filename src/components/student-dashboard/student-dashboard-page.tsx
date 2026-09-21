import { Link } from "react-router-dom";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BookOpen, CalendarCheck, GraduationCap, Clock, ArrowRight, FileText,
  CalendarClock, Download,
} from "lucide-react";
import { StatCard } from "@/components/common/stat-card";
import { PageHeader } from "@/components/common/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/store";
import { apiFetch } from "@/lib/api/client";

const DAYS: { value: string; label: string; short: string }[] = [
  { value: "MONDAY", label: "Monday", short: "Mon" },
  { value: "TUESDAY", label: "Tuesday", short: "Tue" },
  { value: "WEDNESDAY", label: "Wednesday", short: "Wed" },
  { value: "THURSDAY", label: "Thursday", short: "Thu" },
  { value: "FRIDAY", label: "Friday", short: "Fri" },
  { value: "SATURDAY", label: "Saturday", short: "Sat" },
];

interface AttendanceSummary {
  present: number;
  absent: number;
  late: number;
  leave: number;
  total: number;
  percentage: number;
}

interface RecentMark {
  id: string;
  examName: string;
  subjectName: string;
  totalMarks: number | null;
  maxMarks: number | null;
  percentage: number | null;
  grade: string | null;
}

interface StudentDashboardData {
  hasStudentRecord: boolean;
  profile: {
    name: string;
    admissionNo: string;
    rollNumber: number | null;
    className: string;
    sectionName: string;
    email: string;
    profileImage?: string | null;
  } | null;
  attendance: AttendanceSummary;
  recentMarks: RecentMark[];
}

interface ScheduleEntry {
  id: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  roomNo?: string | null;
  subject: { id: string; name: string };
  staff?: { id: string; firstName: string; lastName?: string | null } | null;
}

export function StudentDashboard() {
  const user = useAuth((s) => s.user);

  const { data, isLoading } = useQuery({
    queryKey: ["student-my-dashboard"],
    queryFn: async () => {
      const res = await apiFetch<{ data: StudentDashboardData }>("/students/me/dashboard");
      return res.data;
    },
    retry: false,
  });

  const { data: scheduleData, isLoading: scheduleLoading } = useQuery({
    queryKey: ["student-my-timetable"],
    queryFn: async () => {
      const res = await apiFetch<{ data: ScheduleEntry[] }>("/timetable/my-student-schedule");
      return res.data || [];
    },
    retry: false,
  });

  const scheduleEntries = scheduleData ?? [];

  const periods = useMemo(() => {
    const uniqueTimes = Array.from(
      new Set(scheduleEntries.map((e) => `${e.startTime}__${e.endTime}`))
    ).map((pair) => {
      const [startTime, endTime] = pair.split("__");
      return { startTime, endTime };
    });
    return uniqueTimes.sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [scheduleEntries]);

  const cellLookup = useMemo(() => {
    const map = new Map<string, ScheduleEntry>();
    for (const e of scheduleEntries) {
      map.set(`${e.dayOfWeek}__${e.startTime}`, e);
    }
    return map;
  }, [scheduleEntries]);

  const handleDownloadPdf = () => {
    window.print();
  };

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
  const attendance = data?.attendance ?? { present: 0, absent: 0, late: 0, leave: 0, total: 0, percentage: 0 };
  const recentMarks = data?.recentMarks ?? [];
  const today = new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });

  const byDayAndPeriod = (day: string, startTime: string) => cellLookup.get(`${day}__${startTime}`);
  const todayDayValue = new Date().toLocaleDateString("en-US", { weekday: "long" }).toUpperCase();
  const todayCount = scheduleEntries.filter((e) => e.dayOfWeek === todayDayValue).length;

  return (
    <div className="space-y-8">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #my-timetable-print, #my-timetable-print * { visibility: visible; }
          #my-timetable-print {
            position: absolute; top: 0; left: 0; width: 100%;
          }
          #my-timetable-print table {
            width: 100% !important;
            table-layout: fixed !important;
            border-collapse: collapse !important;
          }
          #my-timetable-print th,
          #my-timetable-print td {
            border: 1px solid #999 !important;
            padding: 6px 8px !important;
            font-size: 11px !important;
          }
        }
      `}</style>

      <PageHeader
        title={`Welcome, ${(user?.name || profile?.name || "there").split(" ")[0]}`}
        description={
          profile
            ? `${profile.className} - ${profile.sectionName} · Roll No. ${profile.rollNumber ?? "-"}`
            : "Student Dashboard"
        }
        actions={
          <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
            {today}
          </Badge>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Attendance" value={`${attendance.percentage}%`} icon={CalendarCheck} accent="primary" />
        <StatCard label="Present Days" value={attendance.present} icon={CalendarCheck} accent="success" />
        <StatCard label="Absent Days" value={attendance.absent} icon={CalendarCheck} accent="warning" />
        <StatCard label="Periods Today" value={todayCount} icon={Clock} accent="info" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Weekly timetable — grid view */}
        <Card className="lg:col-span-2 p-6 card-elevated print:hidden">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h3 className="font-semibold tracking-tight">My Timetable</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {profile ? `${profile.className} - ${profile.sectionName}` : "Your full weekly schedule"}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={handleDownloadPdf} disabled={scheduleEntries.length === 0} className="gap-1 text-xs">
                <Download className="h-3.5 w-3.5" /> Download PDF
              </Button>
              {/* ✅ FIXED: was /app/my-timetable */}
              <Link to="/app/view-timetable">
                <span className="flex items-center gap-1 text-xs text-primary hover:underline whitespace-nowrap">
                  Full view <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </Link>
            </div>
          </div>

          {scheduleLoading ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Loading timetable…</p>
          ) : scheduleEntries.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No timetable has been assigned to your class yet.
            </p>
          ) : (
            <div id="my-timetable-print" className="overflow-x-auto rounded-xl border">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-primary text-primary-foreground">
                    <th className="text-left font-semibold px-3 py-2.5 sticky left-0 bg-primary z-10 rounded-tl-xl">
                      Period
                    </th>
                    {DAYS.map((day, i) => (
                      <th
                        key={day.value}
                        className={`text-left font-semibold px-2 py-2.5 min-w-[100px] ${
                          i === DAYS.length - 1 ? "rounded-tr-xl" : ""
                        }`}
                      >
                        <span className="hidden sm:inline">{day.label}</span>
                        <span className="sm:hidden">{day.short}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {periods.map((period, rowIdx) => (
                    <tr key={`${period.startTime}-${period.endTime}`} className={rowIdx % 2 === 0 ? "bg-white" : "bg-muted/20"}>
                      <td className="px-3 py-2.5 border-t font-mono font-medium whitespace-nowrap sticky left-0 bg-inherit">
                        {period.startTime}
                        <div className="text-[10px] text-muted-foreground font-normal">–{period.endTime}</div>
                      </td>
                      {DAYS.map((day) => {
                        const entry = byDayAndPeriod(day.value, period.startTime);
                        return (
                          <td key={day.value} className="px-2 py-2.5 border-t align-top">
                            {entry ? (
                              <div>
                                <p className="font-medium truncate">{entry.subject.name}</p>
                                <p className="text-[10px] text-muted-foreground truncate">
                                  {entry.staff
                                    ? `${entry.staff.firstName} ${entry.staff.lastName || ""}`.trim()
                                    : ""}
                                  {entry.roomNo ? ` · ${entry.roomNo}` : ""}
                                </p>
                              </div>
                            ) : (
                              <span className="text-muted-foreground/40">—</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Quick links */}
        <Card className="p-6 card-elevated print:hidden">
          <h3 className="font-semibold tracking-tight">Quick Actions</h3>
          <p className="text-xs text-muted-foreground mt-0.5 mb-4">Jump to your resources</p>
          <div className="space-y-2">
            {/* ✅ FIXED: was /app/my-timetable */}
            <Link
              to="/app/view-timetable"
              className="flex items-center justify-between rounded-lg border px-3 py-2.5 text-sm hover:bg-muted/30 group"
            >
              <span className="flex items-center gap-2.5">
                <CalendarClock className="h-4 w-4 text-muted-foreground" />
                My Timetable
              </span>
              <ArrowRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition text-muted-foreground" />
            </Link>
            <Link
              to="/app/my-results"
              className="flex items-center justify-between rounded-lg border px-3 py-2.5 text-sm hover:bg-muted/30 group"
            >
              <span className="flex items-center gap-2.5">
                <FileText className="h-4 w-4 text-muted-foreground" />
                My Results
              </span>
              <ArrowRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition text-muted-foreground" />
            </Link>
            <Link
              to="/app/study-material"
              className="flex items-center justify-between rounded-lg border px-3 py-2.5 text-sm hover:bg-muted/30 group"
            >
              <span className="flex items-center gap-2.5">
                <BookOpen className="h-4 w-4 text-muted-foreground" />
                Study Material
              </span>
              <ArrowRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition text-muted-foreground" />
            </Link>
            <Link
              to="/app/take-test"
              className="flex items-center justify-between rounded-lg border px-3 py-2.5 text-sm hover:bg-muted/30 group"
            >
              <span className="flex items-center gap-2.5">
                <GraduationCap className="h-4 w-4 text-muted-foreground" />
                Take Test
              </span>
              <ArrowRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition text-muted-foreground" />
            </Link>
          </div>
        </Card>
      </div>

      {/* Recent marks */}
      <Card className="p-6 card-elevated print:hidden">
        <h3 className="font-semibold tracking-tight mb-4">Recent Exam Results</h3>
        {recentMarks.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">No results published yet.</p>
        ) : (
          <ul className="space-y-2">
            {recentMarks.map((m) => (
              <li
                key={m.id}
                className="flex items-center justify-between text-sm rounded-lg border px-3 py-2.5"
              >
                <div>
                  <p className="font-medium">{m.subjectName}</p>
                  <p className="text-xs text-muted-foreground">{m.examName}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium">
                    {m.totalMarks ?? "-"}{m.maxMarks ? ` / ${m.maxMarks}` : ""}
                  </p>
                  {m.grade && (
                    <Badge variant="outline" className="text-[10px] mt-0.5">{m.grade}</Badge>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

export default StudentDashboard;