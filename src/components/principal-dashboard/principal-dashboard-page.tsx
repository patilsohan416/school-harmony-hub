import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Users, UserCheck, UserX, GraduationCap, Briefcase, ArrowRight, Building2,
} from "lucide-react";
import { StatCard } from "@/components/common/stat-card";
import { PageHeader } from "@/components/common/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth/store";
import { apiFetch } from "@/lib/api/client";

interface DepartmentBreakdown {
  department: string;
  count: number;
}

interface DesignationBreakdown {
  designation: string;
  count: number;
}

interface RecentStaffMember {
  id: string;
  name: string;
  designation: string;
  department?: string | null;
  joiningDate: string | null;
  profileImage?: string | null;
  isActive: boolean;
}

interface PrincipalDashboardData {
  totalStaff: number;
  activeStaff: number;
  inactiveStaff: number;
  teachingStaff: number;
  nonTeachingStaff: number;
  byDepartment: DepartmentBreakdown[];
  byDesignation: DesignationBreakdown[];
  recentStaff: RecentStaffMember[];
}

export function PrincipalDashboard() {
  const user = useAuth((s) => s.user);

  const { data, isLoading } = useQuery({
    queryKey: ["principal-dashboard"],
    queryFn: async () => {
      const res = await apiFetch<{ data: PrincipalDashboardData }>("/staff/dashboard/principal");
      return res.data;
    },
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading staff overview…</p>
        </div>
      </div>
    );
  }

  const byDesignation = data?.byDesignation ?? [];
  const byDepartment = data?.byDepartment ?? [];
  const recentStaff = data?.recentStaff ?? [];

  return (
    <div className="space-y-8">
      <PageHeader
        title={`Welcome, ${(user?.name || "Principal").split(" ")[0]}`}
        description="School-wide staff overview"
        actions={
          <Link to="/app/add-staff">
            <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 cursor-pointer">
              Manage Staff
            </Badge>
          </Link>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Staff" value={data?.totalStaff ?? 0} icon={Users} accent="primary" />
        <StatCard label="Active Staff" value={data?.activeStaff ?? 0} icon={UserCheck} accent="success" />
        <StatCard label="Teaching Staff" value={data?.teachingStaff ?? 0} icon={GraduationCap} accent="info" />
        <StatCard label="Non-Teaching Staff" value={data?.nonTeachingStaff ?? 0} icon={Briefcase} accent="warning" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recently joined */}
        <Card className="lg:col-span-2 p-6 card-elevated">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h3 className="font-semibold tracking-tight">Recently Joined Staff</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Latest 5 additions, most recent first</p>
            </div>
            <Link to="/app/add-staff">
              <span className="flex items-center gap-1 text-xs text-primary hover:underline">
                View all staff <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </Link>
          </div>

          {recentStaff.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No staff members added yet.
            </p>
          ) : (
            <div className="space-y-2">
              {recentStaff.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between rounded-lg border px-4 py-3 text-sm hover:bg-muted/30"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {s.profileImage ? (
                      <img src={s.profileImage} alt={s.name} className="w-9 h-9 rounded-full object-cover shrink-0" />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center shrink-0">
                        <Users className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="font-medium truncate">{s.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {s.designation}{s.department ? ` · ${s.department}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {s.joiningDate && (
                      <span className="text-xs text-muted-foreground">{s.joiningDate}</span>
                    )}
                    <Badge
                      variant="outline"
                      className={
                        s.isActive
                          ? "text-[10px] text-success border-success/30 bg-success/5"
                          : "text-[10px] text-muted-foreground"
                      }
                    >
                      {s.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Quick links */}
        <Card className="p-6 card-elevated">
          <h3 className="font-semibold tracking-tight">Quick Actions</h3>
          <p className="text-xs text-muted-foreground mt-0.5 mb-4">Staff management shortcuts</p>
          <div className="space-y-2">
            <Link
              to="/app/add-staff"
              className="flex items-center justify-between rounded-lg border px-3 py-2.5 text-sm hover:bg-muted/30 group"
            >
              <span className="flex items-center gap-2.5">
                <Users className="h-4 w-4 text-muted-foreground" />
                Add / Manage Staff
              </span>
              <ArrowRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition text-muted-foreground" />
            </Link>
            <Link
              to="/app/view-timetable"
              className="flex items-center justify-between rounded-lg border px-3 py-2.5 text-sm hover:bg-muted/30 group"
            >
              <span className="flex items-center gap-2.5">
                <GraduationCap className="h-4 w-4 text-muted-foreground" />
                Timetable Builder
              </span>
              <ArrowRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition text-muted-foreground" />
            </Link>
            <Link
              to="/app/staff-payroll"
              className="flex items-center justify-between rounded-lg border px-3 py-2.5 text-sm hover:bg-muted/30 group"
            >
              <span className="flex items-center gap-2.5">
                <Briefcase className="h-4 w-4 text-muted-foreground" />
                Staff Payroll
              </span>
              <ArrowRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition text-muted-foreground" />
            </Link>
          </div>
        </Card>
      </div>

      {/* Breakdown by designation & department */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-6 card-elevated">
          <h3 className="font-semibold tracking-tight mb-4">Staff by Designation</h3>
          {byDesignation.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No data yet.</p>
          ) : (
            <ul className="space-y-2">
              {byDesignation.map((d) => (
                <li
                  key={d.designation}
                  className="flex items-center justify-between text-sm rounded-lg border px-3 py-2.5"
                >
                  <span className="font-medium">{d.designation}</span>
                  <Badge variant="secondary">{d.count}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-6 card-elevated">
          <h3 className="font-semibold tracking-tight mb-4 flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            Staff by Department
          </h3>
          {byDepartment.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No data yet.</p>
          ) : (
            <ul className="space-y-2">
              {byDepartment.map((d) => (
                <li
                  key={d.department}
                  className="flex items-center justify-between text-sm rounded-lg border px-3 py-2.5"
                >
                  <span className="font-medium">{d.department}</span>
                  <Badge variant="secondary">{d.count}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

export default PrincipalDashboard;