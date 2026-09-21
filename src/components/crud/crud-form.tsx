import { useForm, type DefaultValues, type SubmitHandler } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ModuleDef } from "@/lib/modules/types";
import { buildSchema } from "@/lib/modules/schema";
import { cn } from "@/lib/utils";
import { tField, tOption } from "@/lib/i18n-helpers";
import i18n from "@/lib/i18n";
import { FILE_BASE_URL } from "@/lib/api/client";
import type { z } from "zod";

interface Props<T extends Record<string, unknown>> {
  module: ModuleDef;
  defaultValues?: Partial<T>;
  onSubmit: (values: T) => Promise<void> | void;
  onCancel?: () => void;
  submitLabel?: string;
  disabled?: boolean;
}

export function CrudForm<T extends Record<string, unknown>>({
  module,
  defaultValues,
  onSubmit,
  onCancel,
  submitLabel,
  disabled,
}: Props<T>) {
  const { t } = useTranslation();
  const schema = buildSchema(module);
  type FormValues = z.infer<typeof schema>;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: (defaultValues ?? {}) as DefaultValues<FormValues>,
    mode: "onBlur",
  });

  const handleSubmit: SubmitHandler<FormValues> = async (values) => {
    await onSubmit(values as T);
  };

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {module.fields.map((f) => {
          const err = form.formState.errors[f.name as keyof FormValues]?.message as string | undefined;
          const isWide = f.type === "textarea";
          return (
            <div key={f.name} className={cn("space-y-1.5", isWide && "md:col-span-2")}>
              <Label htmlFor={f.name} className="text-sm">
                {tField(f.label)}
                {f.required && <span className="text-destructive ml-0.5">*</span>}
              </Label>
              {renderInput(f, form)}
              {f.helper && !err && <p className="text-xs text-muted-foreground">{tField(f.helper)}</p>}
              {err && <p className="text-xs text-destructive">{err}</p>}
            </div>
          );
        })}
      </div>
      <div className="flex items-center justify-end gap-2 pt-2 border-t">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={disabled}>
            {t("common.cancel")}
          </Button>
        )}
        <Button type="submit" disabled={disabled || form.formState.isSubmitting}>
          {form.formState.isSubmitting ? t("common.saving") : (submitLabel ?? t("common.save"))}
        </Button>
      </div>
    </form>
  );
}

function renderInput(f: import("@/lib/modules/types").FieldDef, form: ReturnType<typeof useForm>) {
  if (f.type === "file") {
    const currentValue = form.watch(f.name);
    const isExistingUrl = typeof currentValue === "string" && currentValue.length > 0;
    const fileName = currentValue instanceof File ? currentValue.name : undefined;

    return (
      <div className="space-y-2">
        {isExistingUrl && (
          <div className="flex items-center gap-2">
            <img
              src={`${FILE_BASE_URL}${currentValue}`}
              alt="Current photo"
              className="h-16 w-16 rounded-md object-cover border"
            />
            <span className="text-xs text-muted-foreground">Current photo — choose a file below to replace it</span>
          </div>
        )}
        <input
          id={f.name}
          type="file"
          accept={f.accept ?? "image/jpeg,image/png"}
          disabled={f.readOnly}
          className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-sm"
          onChange={(e) => {
            const file = e.target.files?.[0];
            form.setValue(f.name, file, { shouldValidate: true });
          }}
        />
        {fileName && <p className="text-xs text-muted-foreground">Selected: {fileName}</p>}
      </div>
    );
  }

  const common = {
    id: f.name,
    ...form.register(f.name, f.type === "number" ? { valueAsNumber: false } : undefined),
    placeholder: f.placeholder ? tField(f.placeholder) : undefined,
    disabled: f.readOnly,
  };
  switch (f.type) {
    case "textarea":
      return <Textarea rows={3} {...common} />;
    case "select": {
      const value = form.watch(f.name);
      return (
        <Select value={value ?? ""} onValueChange={(v) => form.setValue(f.name, v, { shouldValidate: true })} disabled={f.readOnly}>
          <SelectTrigger id={f.name}>
            <SelectValue placeholder={i18n.t("common.select", { label: tField(f.label).toLowerCase() })} />
          </SelectTrigger>
          <SelectContent>
            {f.options?.map((o) => (
              <SelectItem key={o} value={o}>
                {tOption(o)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }
    case "number":
      return <Input type="number" min={f.min} max={f.max} {...common} />;
    case "date":
      return <Input type="date" {...common} />;
    case "email":
      return <Input type="email" {...common} />;
    case "tel":
      return <Input type="tel" {...common} />;
    default:
      return <Input type="text" {...common} />;
  }
}
