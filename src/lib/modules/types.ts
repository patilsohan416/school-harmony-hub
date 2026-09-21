export type FieldType = "text" | "email" | "tel" | "number" | "date" | "textarea" | "select" | "file";

export interface FieldDef {
  name: string;
  label: string;
  type: "text" | "number" | "date" | "email" | "tel" | "select" | "textarea" | "file";
  required?: boolean;
  unique?: boolean;
  searchable?: boolean;
  min?: number;
  max?: number;
  options?: string[];
  hideInTable?: boolean;
  /** Small helper text shown under the field. */
  helper?: string;
  /** Input placeholder text. */
  placeholder?: string;
  /** Field is shown but disabled (e.g. server auto-generated values). */
  readOnly?: boolean;
  /** For type "file": accepted MIME types, e.g. "image/jpeg,image/png". */
  accept?: string;
  /** For type "file": max file size in bytes. */
  maxFileSize?: number;
}

export interface ModuleDef {
  slug: string;
  title: string;
  group: string;
  icon?: string;
  fields: FieldDef[];
  description?: string;
  permissions?: {
    view?: string[];
    create?: string[];
    update?: string[];
    delete?: string[];
  };
}
