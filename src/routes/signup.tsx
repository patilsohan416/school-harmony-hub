import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GraduationCap, ArrowRight, Sparkles, Shield, Users } from "lucide-react";
import { useAuth } from "@/lib/auth/store";
import { LanguageSwitcher } from "@/components/app/language-switcher";
import { GoogleButton } from "@/components/app/google-button";


export function SignupPage() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const login = useAuth((s) => s.login);
  const user = useAuth((s) => s.user);
  const init = useAuth((s) => s.init);

  const [name, setName] = useState("");
  const [org, setOrg] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [agree, setAgree] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => { init(); }, [init]);
  useEffect(() => { if (user) nav("/app"); }, [user, nav]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) { toast.error(t("auth.passwordTooShort")); return; }
    if (password !== confirm) { toast.error(t("auth.passwordsDoNotMatch")); return; }
    if (!agree) { toast.error(t("auth.acceptTerms")); return; }
    setLoading(true);
    try {
      await login(email, password, "school_admin");
      toast.success(t("auth.signUpSuccess"));
      nav("/app");
    } catch { toast.error(t("auth.signUpFailed")); }
    finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      <div className="hidden lg:flex flex-col justify-between p-12 hero-surface border-r relative overflow-hidden">
        <Link to="/" className="flex items-center gap-2.5 relative z-10">
          <div className="brand-gradient rounded-lg p-1.5"><GraduationCap className="h-5 w-5 text-white" /></div>
          <span className="font-semibold tracking-tight">{t("brand.name")}</span>
        </Link>
        <div className="relative z-10 space-y-6">
          <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
            <Sparkles className="mr-1 h-3 w-3" /> {t("auth.freeOnboarding")}
          </Badge>
          <h1 className="text-4xl font-bold tracking-tight">{t("auth.signUpTitle")}</h1>
          <p className="text-muted-foreground max-w-md">
            {t("auth.workspaceIntro")}
          </p>
          <div className="grid grid-cols-2 gap-3 max-w-md">
            {[
              { icon: Shield, t: t("auth.feature.securityTitle"), d: t("auth.feature.securityDesc") },
              { icon: Users, t: t("auth.feature.stakeholdersTitle"), d: t("auth.feature.stakeholdersDesc") },
            ].map((f) => (
              <div key={f.t} className="rounded-lg border bg-card/60 p-4 backdrop-blur">
                <f.icon className="h-4 w-4 text-primary mb-2" />
                <div className="text-sm font-medium">{f.t}</div>
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
          <h2 className="text-2xl font-semibold tracking-tight">{t("auth.signUpTitle")}</h2>
          <p className="text-sm text-muted-foreground mt-1">{t("auth.signUpSubtitle")}</p>

          <div className="mt-6">
            <GoogleButton label={t("common.continueWithGoogle")} onClick={() => toast.info(t("auth.googleSignupDemo"))} />
            <div className="flex items-center gap-3 my-4 text-xs text-muted-foreground">
              <div className="h-px bg-border flex-1" /> {t("common.or")} <div className="h-px bg-border flex-1" />
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="name">{t("auth.fullName")}</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="org">{t("auth.orgName")}</Label>
                <Input id="org" value={org} onChange={(e) => setOrg(e.target.value)} placeholder={t("auth.orgPlaceholder")} required />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">{t("common.email")}</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="password">{t("common.password")}</Label>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirm">{t("auth.confirmPassword")}</Label>
                <Input id="confirm" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Checkbox id="agree" checked={agree} onCheckedChange={(v) => setAgree(!!v)} className="mt-0.5" />
              <Label htmlFor="agree" className="text-sm font-normal cursor-pointer leading-snug">{t("auth.agreeTerms")}</Label>
            </div>
            <Button type="submit" className="w-full h-10" disabled={loading}>
              {loading ? t("common.loading") : <>{t("common.signUp")} <ArrowRight className="ml-2 h-4 w-4" /></>}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {t("auth.haveAccount")} <Link to="/login" className="text-primary font-medium hover:underline">{t("common.signIn")}</Link>
          </p>
        </Card>
      </div>
    </div>
  );
}
