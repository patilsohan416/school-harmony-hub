import { Outlet, useNavigate } from 'react-router-dom';
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app/app-sidebar";
import { Topbar } from "@/components/app/topbar";
import { useAuth } from "@/lib/auth/store";




export function AppLayout() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const user = useAuth((s) => s.user);
  const loading = useAuth((s) => s.loading);
  const init = useAuth((s) => s.init);

  useEffect(() => {
    if (!loading && !user) nav("/login");
  }, [loading, user, nav]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-sm text-muted-foreground">{t("app.loadingWorkspace")}</div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-muted/20">
        <AppSidebar />
        <SidebarInset className="flex flex-col min-w-0">
          <Topbar />
          <main className="flex-1 p-4 sm:p-6 md:p-8 max-w-[1600px] w-full mx-auto">
            <Outlet />
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
