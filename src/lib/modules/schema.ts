import { z } from "zod";
import type { FieldDef, ModuleDef } from "./types";

export function buildSchema(mod: ModuleDef) {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const f of mod.fields) {
    shape[f.name] = fieldSchema(f);
  }
  return z.object(shape);
}

function fieldSchema(f: FieldDef): z.ZodTypeAny {
  let s: z.ZodTypeAny;

  switch (f.type) {
    case "email":
      s = z.string().trim().email({ message: `${f.label} must be a valid email` });
      break;
    case "tel":
      s = z.string().trim().regex(/^[+\d][\d\s\-()]{5,}$/, { message: `${f.label} must be a valid phone number` });
      break;
    case "number": {
      let n = z.coerce.number({ invalid_type_error: `${f.label} must be a number` });
      if (f.min !== undefined) n = n.min(f.min, `${f.label} must be at least ${f.min}`);
      if (f.max !== undefined) n = n.max(f.max, `${f.label} must be at most ${f.max}`);
      s = n;
      break;
    }
    case "date": {
      let dateSchema: z.ZodTypeAny = z.string().trim().min(1, { message: `${f.label} is required` });

      // ✅ Add validation for Date of Birth
      if (f.name === "dateOfBirth") {
        dateSchema = dateSchema
          .refine((val: string) => {
            const birthDate = new Date(val);
            const today = new Date();

            // Cannot be in future
            if (birthDate > today) return false;

            const age = today.getFullYear() - birthDate.getFullYear();
            const monthDiff = today.getMonth() - birthDate.getMonth();

            // Check if age is at least 3 years
            if (age > 3) return true;
            if (age === 3 && monthDiff >= 0) return true;
            return false;
          }, {
            message: "Student must be at least 3 years old for admission",
          })
          .refine((val: string) => {
            const birthDate = new Date(val);
            const today = new Date();
            const age = today.getFullYear() - birthDate.getFullYear();

            // Check if age is reasonable (max 20 years)
            if (age > 20) return false;
            return true;
          }, {
            message: "Student age seems too old (max 20 years)",
          });
      }

      s = dateSchema;
      break;
    }
    case "select":
      s = f.options?.length
        ? z.enum(f.options as [string, ...string[]], { message: `${f.label} is required` })
        : z.string();
      break;
    case "file":
      // Files are validated separately (type/size) in the form UI; the schema
      // just needs to allow a File, a FileList, a string URL (existing photo
      // on edit), or nothing.
      s = z.any();
      break;
    case "textarea":
    case "text":
    default:
      s = z.string().trim().max(1000);
  }

  if (!f.required) {
    s = z.union([s, z.literal(""), z.undefined(), z.null()]).transform((v) => (v === "" || v == null ? undefined : v));
  } else if (f.type === "text" || f.type === "textarea") {
    s = (s as z.ZodString).min(1, { message: `${f.label} is required` });
  }

  return s;
}
