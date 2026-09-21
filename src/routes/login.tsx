import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GraduationCap, ArrowRight, Shield, Users, Sparkles } from "lucide-react";
import { useAuth } from "@/lib/auth/store";
import { ROLE_LABELS, type Role } from "@/lib/auth/permissions";
import { tRole } from "@/lib/i18n-helpers";
import { LanguageSwitcher } from "@/components/app/language-switcher";
import { GoogleButton } from "@/components/app/google-button";
export function LoginPage() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const login = useAuth((s) => s.login);
  const user = useAuth((s) => s.user);
  const init = useAuth((s) => s.init);

  const [email, setEmail] = useState("principal@sunrise.edu");
  const [password, setPassword] = useState("demo1234");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [role, setRole] = useState<Role>("principal");
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => { init(); }, [init]);
  useEffect(() => { if (user) nav("/app"); }, [user, nav]);

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password, role);
      toast.success(t("auth.welcomeToast", { role: tRole(role, ROLE_LABELS[role]) }));
      nav("/app" );
    } catch { toast.error(t("auth.signInFailed")); }
    finally { setLoading(false); }
  }

  async function handleOtpLogin(e: React.FormEvent) {
    e.preventDefault();
    if (otp.length < 4) { toast.error(t("auth.enterOtp")); return; }
    setLoading(true);
    try {
      await login(`${role}@sunrise.edu`, "otp", role);
      toast.success(t("auth.welcomeToast", { role: tRole(role, ROLE_LABELS[role]) }));
      nav("/app");
    } finally { setLoading(false); }
  }

  const quickRoles: Role[] = ["super_admin", "principal", "teacher", "accountant", "parent", "student"];

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      <div className="hidden lg:flex flex-col justify-between p-12 hero-surface border-r relative overflow-hidden">
        <Link to="/" className="flex items-center gap-2.5 relative z-10">
          <div className="brand-gradient rounded-lg p-1.5"><GraduationCap className="h-5 w-5 text-white" /></div>
          <span className="font-semibold tracking-tight">{t("brand.name")}</span>
        </Link>
        <div className="relative z-10 space-y-6">
          <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
            <Sparkles className="mr-1 h-3 w-3" /> {t("landing.badge")}
          </Badge>
          <h1 className="text-4xl font-bold tracking-tight">{t("brand.tagline")}</h1>
          <p className="text-muted-foreground max-w-md">{t("landing.heroDesc")}</p>
          <div className="grid grid-cols-2 gap-3 max-w-md">
            {[
              { icon: Shield, tt: t("auth.feature.securityTitle"), d: t("auth.feature.securityDesc") },
              { icon: Users, tt: t("auth.feature.stakeholdersTitle"), d: t("auth.feature.stakeholdersDesc") },
            ].map((f) => (
              <div key={f.tt} className="rounded-lg border bg-card/60 p-4 backdrop-blur">
                <f.icon className="h-4 w-4 text-primary mb-2" />
                <div className="text-sm font-medium">{f.tt}</div>
                <div className="text-xs text-muted-foreground mt-1">{f.d}</div>
              </div>
            ))}
          </div>
        </div>
        <p className="text-xs text-muted-foreground relative z-10">{t("landing.footer")}</p>
      </div>

      <div className="flex items-center justify-center p-6 lg:p-12 min-h-screen">
        <Card className="w-full max-w-md p-6 sm:p-8 border-0 shadow-none lg:card-elevated lg:border">
          <div className="flex items-center justify-between mb-6 lg:mb-8">
            <Link to="/" className="lg:hidden flex items-center gap-2.5">
              <div className="brand-gradient rounded-lg p-1.5"><GraduationCap className="h-5 w-5 text-white" /></div>
              <span className="font-semibold tracking-tight">{t("brand.name")}</span>
            </Link>
            <div className="ml-auto"><LanguageSwitcher compact /></div>
          </div>
          <h2 className="text-2xl font-semibold tracking-tight">{t("auth.signInTitle")}</h2>
          <p className="text-sm text-muted-foreground mt-1">{t("auth.signInSubtitle")}</p>

          <div className="mt-6">
            <GoogleButton label={t("common.continueWithGoogle")} onClick={() => toast.info(t("auth.googleDemo"))} />
            <div className="flex items-center gap-3 my-4 text-xs text-muted-foreground">
              <div className="h-px bg-border flex-1" /> {t("common.or")} <div className="h-px bg-border flex-1" />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">{t("auth.signInAs")}</Label>
            <Select value={role} onValueChange={(v) => setRole(v as Role)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.entries(ROLE_LABELS) as [Role, string][]).map(([r, l]) => (
                  <SelectItem key={r} value={r}>{tRole(r, l)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {quickRoles.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={`text-[11px] px-2 py-1 rounded-md border transition ${role === r ? "bg-primary text-primary-foreground border-primary" : "bg-muted hover:bg-accent"}`}
                >
                  {tRole(r, ROLE_LABELS[r])}
                </button>
              ))}
            </div>
          </div>

          <Tabs defaultValue="email" className="mt-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="email">{t("auth.signInWithEmail")}</TabsTrigger>
              <TabsTrigger value="otp">{t("auth.signInWithOtp")}</TabsTrigger>
            </TabsList>
            <TabsContent value="email">
              <form onSubmit={handleEmailLogin} className="space-y-4 pt-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email">{t("common.email")}</Label>
                  <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">{t("common.password")}</Label>
                    <button type="button" className="text-xs text-primary hover:underline">{t("common.forgot")}</button>
                  </div>
                  <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="remember" checked={remember} onCheckedChange={(v) => setRemember(!!v)} />
                  <Label htmlFor="remember" className="text-sm font-normal cursor-pointer">{t("common.remember")}</Label>
                </div>
                <Button type="submit" className="w-full h-10" disabled={loading}>
                  {loading ? t("common.loading") : <>{t("common.signIn")} <ArrowRight className="ml-2 h-4 w-4" /></>}
                </Button>
              </form>
            </TabsContent>
            <TabsContent value="otp">
              <form onSubmit={handleOtpLogin} className="space-y-4 pt-4">
                <div className="space-y-1.5">
                  <Label htmlFor="phone">{t("common.phone")}</Label>
                  <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={t("auth.phonePlaceholder")} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="otp">{t("common.otp")}</Label>
                  <Input id="otp" inputMode="numeric" maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value)} placeholder={t("auth.otpCodePlaceholder")} />
                  <p className="text-xs text-muted-foreground">{t("auth.otpHelper")}</p>
                </div>
                <Button type="submit" className="w-full h-10" disabled={loading}>
                  {loading ? t("common.loading") : t("auth.verifyAndSignIn")}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {t("auth.noAccount")} <Link to="/signup" className="text-primary font-medium hover:underline">{t("common.signUp")}</Link>
          </p>
          <p className="mt-2 text-center text-[11px] text-muted-foreground">
            {t("auth.protected")} · <Link to="/" className="text-primary hover:underline">{t("auth.backHome")}</Link>
          </p>
        </Card>
      </div>
    </div>
  );
}
