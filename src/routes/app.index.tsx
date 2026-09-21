import { Link } from 'react-router-dom';
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  Users, Wallet, ClipboardCheck, Briefcase, ArrowRight, TrendingUp,
} from "lucide-react";
import { StatCard } from "@/components/common/stat-card";
import { PageHeader } from "@/components/common/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth/store";
import { ROLE_LABELS, can } from "@/lib/auth/permissions";
import { createCrudService } from "@/lib/services/crud.service";
import { getAuditLog } from "@/lib/services/crud.service";
import type { Record_ } from "@/lib/services/crud.service";
import { getNavigation } from "@/lib/modules/navigation";
import { formatDistanceToNow } from "date-fns";
import { tModule, tGroup, tRole } from "@/lib/i18n-helpers";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";
import { TeacherDashboard } from "@/components/teacher-dashboard/teacher-dashboard-page";
import { PrincipalDashboard } from "@/components/principal-dashboard/principal-dashboard-page";
import { StudentDashboard } from "@/components/student-dashboard/student-dashboard-page";
export function Dashboard() {
  const user = useAuth((s) => s.user);

  // Teachers get a dashboard built around their own classes, subjects,
  // timetable and students rather than the school-wide admin view. This
  // check happens in a wrapper (not inside AdminDashboard) so the admin
  // view's hooks are never conditionally skipped.
  if (user?.role === "teacher" || user?.role === "class_teacher") {
    return <TeacherDashboard />;
  }
   if (user?.role === "principal" || user?.role === "vice_principal") {
    return <PrincipalDashboard />;
  }
  if (user?.role === "student") {
    return <StudentDashboard />;
  }

  return <AdminDashboard />;
}

function AdminDashboard() {
  const { t, i18n } = useTranslation();
  const user = useAuth((s) => s.user);

  const numberLocale =
    i18n.language?.startsWith("hi") ? "hi-IN" : i18n.language?.startsWith("mr") ? "mr-IN" : "en-IN";
  const nf = new Intl.NumberFormat(numberLocale);

  const students = useQuery({
    queryKey: ["stat-students"],
    queryFn: () => createCrudService("new-student").count(),
    retry: false,
  });

  const admissions = useQuery({
    queryKey: ["stat-admissions"],
    queryFn: () => createCrudService("admission-form").count(),
    retry: false,
  });

  const fees = useQuery({
    queryKey: ["stat-fees"],
    queryFn: async () => {
      try {
        const list = await createCrudService<Record_ & { amount: number }>("fee-collection").list({ pageSize: 1000 });
        return list.rows.reduce((s, r) => s + (Number(r.amount) || 0), 0);
      } catch {
        return 0;
      }
    },
    retry: false,
  });

  const staff = useQuery({
    queryKey: ["stat-staff"],
    queryFn: () => createCrudService("add-staff").count(),
    retry: false,
  });

  const audit = getAuditLog().slice(0, 8);
  const role = user?.role ?? "student";
  // ✅ FIX: filter module groups down to what this role can actually see,
  // the same way app-sidebar.tsx does. Previously this called
  // getNavigation() with no filter at all, so every group (Student
  // Management, Attendance, Mid-Day Meal, Examinations, ICSE, CBSE, etc.)
  // showed up here regardless of who was logged in — including roles like
  // "accountant" that should only see Fee Management, Staff Management,
  // and Accountant.
  const groups = getNavigation().filter((g) => can(role, g.label, "read"));

  const chartData = [
    { key: "Apr", month: t("dashboard.months.Apr"), collected: 185000, pending: 42000 },
    { key: "May", month: t("dashboard.months.May"), collected: 210000, pending: 38000 },
    { key: "Jun", month: t("dashboard.months.Jun"), collected: 245000, pending: 51000 },
    { key: "Jul", month: t("dashboard.months.Jul"), collected: fees.data ?? 288000, pending: 33000 },
    { key: "Aug", month: t("dashboard.months.Aug"), collected: 262000, pending: 40000 },
    { key: "Sep", month: t("dashboard.months.Sep"), collected: 295000, pending: 28000 },
  ];

  const isLoading = students.isLoading || admissions.isLoading || fees.isLoading || staff.isLoading;

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">{t("dashboard.loading")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title={t("dashboard.welcomeUser", { name: user?.name?.split(" ")[0] ?? t("dashboard.thereFallback") })}
        description={t("dashboard.signedInAs", {
          role: tRole(role, ROLE_LABELS[role]),
          school: user?.schoolName ?? "",
        })}
        actions={
          <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
            {t("dashboard.academicYear")}
          </Badge>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label={t("dashboard.stat.students")} value={nf.format(students.data ?? 0)} icon={Users} accent="primary" trend={{ value: t("dashboard.trend.students"), positive: true }} />
        <StatCard label={t("dashboard.stat.admissions")} value={nf.format(admissions.data ?? 0)} icon={ClipboardCheck} accent="info" />
        <StatCard label={t("dashboard.stat.fees")} value={nf.format(fees.data ?? 0)} icon={Wallet} accent="success" trend={{ value: t("dashboard.trend.fees"), positive: true }} />
        <StatCard label={t("dashboard.stat.staff")} value={nf.format(staff.data ?? 0)} icon={Briefcase} accent="warning" />
      </div>

      {/* Chart + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 p-6 card-elevated">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h3 className="font-semibold tracking-tight">{t("dashboard.chartTitle")}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">{t("dashboard.chartSub")}</p>
            </div>
            <Badge variant="outline" className="text-success border-success/30 bg-success/5">
              <TrendingUp className="mr-1 h-3 w-3" /> {t("dashboard.chartBadge")}
            </Badge>
          </div>
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
                  formatter={(v: number, name: string) => [
                    `₹${nf.format(v)}`,
                    name === "collected" ? t("dashboard.collected") : t("dashboard.pending"),
                  ]}
                />
                <Bar dataKey="collected" name={t("dashboard.collected")} fill="var(--chart-1)" radius={[6, 6, 0, 0]} maxBarSize={40} />
                <Bar dataKey="pending" name={t("dashboard.pending")} fill="var(--chart-3)" radius={[6, 6, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-6 card-elevated">
          <h3 className="font-semibold tracking-tight">{t("dashboard.activityTitle")}</h3>
          <p className="text-xs text-muted-foreground mt-0.5 mb-4">{t("dashboard.activitySub")}</p>
          <div className="space-y-3">
            {audit.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">{t("dashboard.noActivity")}</p>
            ) : audit.map((a) => (
              <div key={a.id} className="flex items-start gap-3 text-sm">
                <div className={`mt-1 h-2 w-2 rounded-full ${a.action === "create" ? "bg-success" : a.action === "update" ? "bg-info" : "bg-destructive"}`} />
                <div className="min-w-0 flex-1">
                  <p className="text-foreground">
                    <span className="font-medium">{a.userName}</span>{" "}
                    <span className="text-muted-foreground">
                      {a.action === "create"
                        ? t("dashboard.actionCreated")
                        : a.action === "update"
                          ? t("dashboard.actionUpdated")
                          : t("dashboard.actionDeleted")}
                    </span>{" "}
                    <span className="font-medium">{tModule(a.module, a.module)}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(a.at), { addSuffix: true })}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Quick access to modules */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold tracking-tight">{t("dashboard.allModules")}</h2>
          <p className="text-xs text-muted-foreground">{t("dashboard.jumpTo")}</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {groups.map((g) => (
            <Card key={g.label} className="p-5 card-elevated">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-sm tracking-tight">{tGroup(g.label)}</h3>
                <Badge variant="secondary" className="text-[10px]">{g.modules.length}</Badge>
              </div>
              <ul className="space-y-1.5">
                {g.modules.slice(0, 4).map((m) => (
                  <li key={m.slug}>
                    <Link to={`/app/${m.slug}`}
                      className="flex items-center justify-between text-sm text-muted-foreground hover:text-foreground group">
                      <span>{tModule(m.slug, m.title)}</span>
                      <ArrowRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition" />
                    </Link>
                  </li>
                ))}
                {g.modules.length > 4 && (
                  <li className="text-xs text-muted-foreground pt-1">{t("dashboard.moreItems", { count: g.modules.length - 4 })}</li>
                )}
              </ul>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}