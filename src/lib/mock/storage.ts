/**
 * Thin localStorage wrapper. All mock services go through this so that
 * swapping to a REST backend later means replacing the service files, not
 * every call site.
 */
const PREFIX = "erp:";

export const storage = {
  get<T>(key: string, fallback: T): T {
    if (typeof window === "undefined") return fallback;
    try {
      const raw = window.localStorage.getItem(PREFIX + key);
      return raw ? (JSON.parse(raw) as T) : fallback;
    } catch {
      return fallback;
    }
  },
  set<T>(key: string, value: T): void {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(PREFIX + key, JSON.stringify(value));
  },
  remove(key: string): void {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(PREFIX + key);
  },
};

export function uid(): string {
  return "id_" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}
