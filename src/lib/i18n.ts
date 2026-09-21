import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import en from "@/locales/en.json";
import hi from "@/locales/hi.json";
import mr from "@/locales/mr.json";

export const LANGUAGES = [
  { code: "en", label: "English", native: "English" },
  { code: "hi", label: "Hindi", native: "हिन्दी" },
  { code: "mr", label: "Marathi", native: "मराठी" },
] as const;

export type LangCode = (typeof LANGUAGES)[number]["code"];

if (!i18n.isInitialized) {
  i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      resources: {
        en: { translation: en },
        hi: { translation: hi },
        mr: { translation: mr },
      },
      fallbackLng: "en",
      supportedLngs: ["en", "hi", "mr"],
      interpolation: { escapeValue: false },
      detection: {
        order: ["localStorage", "navigator"],
        lookupLocalStorage: "erp:lang",
        caches: ["localStorage"],
      },
      returnNull: false,
    });
}

if (typeof document !== "undefined") {
  const apply = (lng: string) => {
    document.documentElement.lang = lng;
    document.documentElement.classList.toggle("font-devanagari", lng === "hi" || lng === "mr");
  };
  apply(i18n.language || "en");
  i18n.on("languageChanged", apply);
}

export function formatCurrencyINR(v: number, lang?: string) {
  const locale = lang === "hi" ? "hi-IN" : lang === "mr" ? "mr-IN" : "en-IN";
  return new Intl.NumberFormat(locale, { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(v);
}

export function formatDate(v: string | Date, lang?: string) {
  const d = typeof v === "string" ? new Date(v) : v;
  const locale = lang === "hi" ? "hi-IN" : lang === "mr" ? "mr-IN" : "en-IN";
  return new Intl.DateTimeFormat(locale, { day: "2-digit", month: "short", year: "numeric" }).format(d);
}

export default i18n;
