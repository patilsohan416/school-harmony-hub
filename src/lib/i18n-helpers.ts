import i18n from "./i18n";

/** Translate a module title by slug, falling back to the provided English title. */
export function tModule(slug: string, fallback: string): string {
  const key = `modules.${slug}`;
  const v = i18n.t(key, { defaultValue: "" });
  return v && v !== key ? String(v) : fallback;
}

/** Translate a field label by its raw English label, falling back to the label itself. */
export function tField(label: string, fallback?: string): string {
  const key = `fields.${label}`;
  const v = i18n.t(key, { defaultValue: "" });
  return v && v !== key ? String(v) : (fallback ?? label);
}

/** Translate a select-option / status value, falling back to the raw value. */
export function tOption(value: string): string {
  if (!value) return value;
  const key = `options.${value}`;
  const v = i18n.t(key, { defaultValue: "" });
  return v && v !== key ? String(v) : value;
}

/** Translate a role label from ROLE_LABELS, falling back to the English label. */
export function tRole(role: string, fallback: string): string {
  const key = `roles.${role}`;
  const v = i18n.t(key, { defaultValue: "" });
  return v && v !== key ? String(v) : fallback;
}

/** Translate a group label from navigation, falling back to English. */
export function tGroup(group: string, fallback?: string): string {
  const key = `groups.${group}`;
  const v = i18n.t(key, { defaultValue: "" });
  return v && v !== key ? String(v) : (fallback ?? group);
}
