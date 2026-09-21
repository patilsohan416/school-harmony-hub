import { z, ZodTypeAny } from "zod";

interface FieldDef {
  name: string;
  label: string;
  type: string;
  required?: boolean;
  min?: number;
  max?: number;
  options?: string[];
}

function fieldToZod(f: FieldDef): ZodTypeAny {
  let schema: ZodTypeAny;

  switch (f.type) {
    case "number":
      schema = z.coerce.number();
      if (f.min !== undefined) schema = (schema as z.ZodNumber).min(f.min);
      if (f.max !== undefined) schema = (schema as z.ZodNumber).max(f.max);
      break;
    case "email":
      schema = z.string().email();
      break;
    case "tel":
      schema = z.string().regex(/^[0-9+\-\s()]{7,15}$/, "Invalid phone number");
      break;
    case "date":
      schema = z.coerce.date();
      break;
    case "select":
      schema = f.options ? z.enum(f.options as [string, ...string[]]) : z.string();
      break;
    default:
      schema = z.string();
  }

  return f.required ? schema : schema.optional().nullable();
}

export function buildSchema(_moduleSlug: string, fields: FieldDef[]) {
  const shape: Record<string, ZodTypeAny> = {};
  for (const f of fields) {
    shape[f.name] = fieldToZod(f);
  }
  return z.object(shape);
}