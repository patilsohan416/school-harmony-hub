import { Link } from 'react-router-dom';
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  GraduationCap, Users, Wallet, Utensils, Package, ClipboardCheck,
  Briefcase, MonitorPlay, CalendarClock, Shield, Zap, Layers, ArrowRight, Check, Globe, Moon,
} from "lucide-react";
import { totalModuleCount } from "@/lib/modules/navigation";
import { LanguageSwitcher } from "@/components/app/language-switcher";

export function Welcome() {
  const { t } = useTranslation();
  const total = totalModuleCount();

  const MODULES = [
    { icon: Users, key: "student" },
    { icon: ClipboardCheck, key: "attendance" },
    { icon: Wallet, key: "fees" },
    { icon: GraduationCap, key: "exam" },
    { icon: Utensils, key: "mdm" },
    { icon: Briefcase, key: "staff" },
    { icon: Package, key: "inv" },
    { icon: MonitorPlay, key: "test" },
    { icon: CalendarClock, key: "tt" },
  ];

  const FEATURES = [
    { icon: Shield, key: "rbac" },
    { icon: Globe, key: "i18n" },
    { icon: Moon, key: "theme" },
    { icon: Layers, key: "audit" },
    { icon: Zap, key: "export" },
    { icon: Check, key: "prod" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 backdrop-blur bg-background/85 border-b">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-2">
          <Link to="/" className="flex items-center gap-2 min-w-0">
            <div className="brand-gradient rounded-lg p-1.5 shrink-0"><GraduationCap className="h-5 w-5 text-white" /></div>
            <span className="font-semibold tracking-tight truncate">{t("brand.name")}</span>
            <Badge variant="secondary" className="ml-1 text-[10px] hidden sm:inline-flex">v1.0</Badge>
          </Link>
          <nav className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
            <a href="#modules" className="hover:text-foreground">{t("nav.modules")}</a>
            <a href="#features" className="hover:text-foreground">{t("nav.features")}</a>
            <a href="#pricing" className="hover:text-foreground">{t("nav.pricing")}</a>
          </nav>
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <LanguageSwitcher compact />
            <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex"><Link to="/login">{t("common.signIn")}</Link></Button>
            <Button asChild size="sm"><Link to="/signup">{t("common.getStarted")}<ArrowRight className="ml-1.5 h-3.5 w-3.5" /></Link></Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="hero-surface">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 pt-12 sm:pt-20 pb-16 sm:pb-24 text-center">
          <Badge variant="secondary" className="mb-5 bg-primary/10 text-primary border-primary/20 text-[11px]">
            {t("landing.badge")}
          </Badge>
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-bold tracking-tight text-foreground max-w-4xl mx-auto">
            {t("landing.heroTitle1")}{" "}
            <span className="bg-clip-text text-transparent brand-gradient">{t("landing.heroTitle2")}</span>
          </h1>
          <p className="mt-5 text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
            {t("landing.heroDesc")}
          </p>
          <div className="mt-7 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3">
            <Button asChild size="lg" className="h-11 px-6">
              <Link to="/signup">{t("common.getStarted")} <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="h-11 px-6">
              <Link to="/login">{t("common.signIn")}</Link>
            </Button>
          </div>
          <div className="mt-12 sm:mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 max-w-3xl mx-auto text-center">
            {[
              { v: `${total}+`, l: t("landing.stats.modules") },
              { v: "15", l: t("landing.stats.roles") },
              { v: "3", l: t("landing.stats.boards") },
              { v: "3", l: t("landing.stats.languages") },
            ].map((s) => (
              <div key={s.l}>
                <div className="text-2xl sm:text-3xl font-bold tracking-tight">{s.v}</div>
                <div className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider mt-1">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="modules" className="py-14 sm:py-20 bg-muted/30 border-y">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="max-w-2xl">
            <Badge variant="outline" className="mb-3">{t("nav.modules")}</Badge>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">{t("landing.modulesTitle")}</h2>
            <p className="mt-2 sm:mt-3 text-sm sm:text-base text-muted-foreground">{t("landing.modulesDesc")}</p>
          </div>
          <div className="mt-8 sm:mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {MODULES.map((m) => (
              <div key={m.key} className="group rounded-xl border bg-card p-5 sm:p-6 card-elevated hover:border-primary/30 transition">
                <div className="rounded-lg bg-primary/10 text-primary p-2.5 w-fit"><m.icon className="h-5 w-5" /></div>
                <h3 className="mt-4 font-semibold">{t(`landing.highlights.${m.key}Title`)}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{t(`landing.highlights.${m.key}Desc`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="features" className="py-14 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="max-w-2xl">
            <Badge variant="outline" className="mb-3">{t("landing.featuresBadge")}</Badge>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">{t("landing.featuresTitle")}</h2>
            <p className="mt-2 sm:mt-3 text-sm sm:text-base text-muted-foreground">{t("landing.featuresDesc")}</p>
          </div>
          <div className="mt-8 sm:mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {FEATURES.map((f) => (
              <div key={f.key} className="rounded-xl border bg-card p-5 sm:p-6">
                <f.icon className="h-5 w-5 text-primary" />
                <h3 className="mt-4 font-semibold">{t(`landing.featurePoints.${f.key}Title`)}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{t(`landing.featurePoints.${f.key}Desc`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="py-14 sm:py-20 bg-muted/30 border-t">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 text-center">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight">{t("landing.ctaTitle")}</h2>
          <p className="mt-3 sm:mt-4 text-sm sm:text-base text-muted-foreground">{t("landing.ctaDesc")}</p>
          <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-center">
            <Button asChild size="lg" className="h-11 px-8"><Link to="/signup">{t("common.getStarted")} <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
            <Button asChild variant="outline" size="lg" className="h-11 px-8"><Link to="/login">{t("nav.launchDashboard")}</Link></Button>
          </div>
        </div>
      </section>

      <footer className="border-t py-6 sm:py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 flex flex-wrap items-center justify-between gap-4 text-xs sm:text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="brand-gradient rounded p-1"><GraduationCap className="h-3.5 w-3.5 text-white" /></div>
            <span>{t("landing.footer")}</span>
          </div>
          <div className="flex items-center gap-4 sm:gap-6">
            <a href="#" className="hover:text-foreground">{t("landing.privacy")}</a>
            <a href="#" className="hover:text-foreground">{t("landing.terms")}</a>
            <a href="#" className="hover:text-foreground">{t("landing.contact")}</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
