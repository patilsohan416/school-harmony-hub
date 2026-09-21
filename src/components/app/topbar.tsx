import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Bell, LogOut, Moon, Search, Settings, Sun, User } from "lucide-react";
import { useAuth } from "@/lib/auth/store";
import { ROLE_LABELS } from "@/lib/auth/permissions";
import { tRole } from "@/lib/i18n-helpers";
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { LanguageSwitcher } from "./language-switcher";
import { useTranslation } from "react-i18next";

export function Topbar() {
  const { t } = useTranslation();
  const user = useAuth((s) => s.user);
  const logout = useAuth((s) => s.logout);
  const nav = useNavigate();
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("erp:theme");
    const isDark = stored === "dark";
    setDark(isDark);
    document.documentElement.classList.toggle("dark", isDark);
  }, []);

  function toggleTheme() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("erp:theme", next ? "dark" : "light");
  }

  async function handleLogout() {
    await logout();
    nav("/login");
  }

  const initials = user?.name?.split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase() ?? "U";

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-background/85 px-3 md:px-4 backdrop-blur no-print">
      <SidebarTrigger className="shrink-0" />
      <div className="relative hidden md:block flex-1 max-w-md">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder={t("common.search")} className="pl-8 h-9 bg-muted/40 border-transparent focus-visible:bg-background" />
      </div>
      <div className="ml-auto flex items-center gap-0.5 md:gap-1.5">
        <Button variant="ghost" size="icon" className="md:hidden h-9 w-9" aria-label={t("common.search")}>
          <Search className="h-4 w-4" />
        </Button>
        <LanguageSwitcher compact />
        <Button variant="ghost" size="icon" onClick={toggleTheme} className="h-9 w-9" aria-label={t("common.theme")}>
          {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
        <Button variant="ghost" size="icon" className="h-9 w-9 relative" aria-label={t("common.notifications")}>
          <Bell className="h-4 w-4" />
          <span className="absolute top-2 right-2 h-1.5 w-1.5 rounded-full bg-destructive" />
        </Button>
        <div className="w-px h-6 bg-border mx-1 hidden sm:block" />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-lg px-1.5 sm:px-2 py-1 hover:bg-muted transition min-w-0">
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">{initials}</AvatarFallback>
              </Avatar>
              <div className="hidden lg:block text-left min-w-0">
                <div className="text-sm font-medium leading-tight truncate max-w-[140px]">{user?.name}</div>
                <div className="text-[10px] text-muted-foreground leading-tight truncate">{tRole(user?.role ?? "student", ROLE_LABELS[user?.role ?? "student"])}</div>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span className="font-medium truncate">{user?.name}</span>
                <span className="text-xs text-muted-foreground font-normal truncate">{user?.email}</span>
                <Badge variant="secondary" className="mt-1.5 w-fit text-[10px]">{tRole(user?.role ?? "student", ROLE_LABELS[user?.role ?? "student"])}</Badge>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem><User className="mr-2 h-4 w-4" /> {t("common.profile")}</DropdownMenuItem>
            <DropdownMenuItem><Settings className="mr-2 h-4 w-4" /> {t("common.settings")}</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-destructive">
              <LogOut className="mr-2 h-4 w-4" /> {t("common.signOut")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
