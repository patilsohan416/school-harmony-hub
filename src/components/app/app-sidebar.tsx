import { Link, useLocation } from 'react-router-dom';  // ✅ React Router
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarMenuSub, SidebarMenuSubButton, SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, LayoutDashboard, GraduationCap } from "lucide-react";
import * as Icons from "lucide-react";
import { getNavigation } from "@/lib/modules/navigation";
import { useAuth } from "@/lib/auth/store";
import { can } from "@/lib/auth/permissions";
import { cn } from "@/lib/utils";
import { tModule } from "@/lib/i18n-helpers";

function Icon({ name, className }: { name?: string; className?: string }) {
  const C = (name && (Icons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[name]) || Icons.Circle;
  return <C className={className} />;
}

export function AppSidebar() {
  const { t } = useTranslation();
  const location = useLocation();  // ✅ React Router
  const pathname = location.pathname;  // ✅ Get path from location
  const user = useAuth((s) => s.user);
  const role = user?.role ?? "student";
  const groups = getNavigation().filter((g) => can(role, g.label, "read"));

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b">
        <div className="flex items-center gap-2.5 px-2 py-1.5 min-w-0">
          <div className="brand-gradient rounded-lg p-1.5 shadow-sm shrink-0">
            <GraduationCap className="h-5 w-5 text-white" />
          </div>
          <div className="min-w-0 group-data-[collapsible=icon]:hidden">
            <div className="text-sm font-semibold tracking-tight truncate">{t("brand.name")}</div>
            <div className="text-[10px] text-muted-foreground truncate">{user?.schoolName ?? t("common.school")}</div>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === "/app"} tooltip={t("common.dashboard")}>
                  <Link to="/app">
                    <LayoutDashboard />
                    <span>{t("common.dashboard")}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {groups.map((g) => (
          <NavGroup key={g.label} group={g} pathname={pathname} />
        ))}
      </SidebarContent>

      <SidebarFooter className="border-t">
        <div className="px-2 py-1.5 text-[10px] text-muted-foreground group-data-[collapsible=icon]:hidden">
          {t("app.footerVersion")}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

function NavGroup({ group, pathname }: { group: ReturnType<typeof getNavigation>[number]; pathname: string }) {
  const { t } = useTranslation();
  const hasActive = group.modules.some((m) => pathname === `/app/${m.slug}`);
  const [open, setOpen] = useState(hasActive);
  const label = t(`groups.${group.label}`, { defaultValue: group.label });
  
  return (
    <Collapsible open={open} onOpenChange={setOpen} className="group/collapsible">
      <SidebarGroup>
        <SidebarGroupLabel asChild>
          <CollapsibleTrigger className={cn("flex w-full items-center gap-2 hover:text-foreground", hasActive && "text-foreground font-medium")}>
            <Icon name={group.icon} className="h-4 w-4" />
            <span className="truncate">{label}</span>
            <ChevronDown className="ml-auto h-3.5 w-3.5 transition-transform group-data-[state=open]/collapsible:rotate-180" />
          </CollapsibleTrigger>
        </SidebarGroupLabel>
        <CollapsibleContent>
          <SidebarGroupContent>
            <SidebarMenu>
              {group.modules.map((m) => (
                <SidebarMenuItem key={m.slug}>
                  <SidebarMenuSub>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton asChild isActive={pathname === `/app/${m.slug}`}>
                        <Link to={`/app/${m.slug}`}>
                          <Icon name={m.icon} className="h-3.5 w-3.5" />
                          <span>{tModule(m.slug, m.title)}</span>
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  </SidebarMenuSub>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </CollapsibleContent>
      </SidebarGroup>
    </Collapsible>
  );
}