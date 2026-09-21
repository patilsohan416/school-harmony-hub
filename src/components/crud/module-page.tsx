import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { PageHeader } from "@/components/common/page-header";
import { DataTable, type Column } from "./data-table";
import { CrudForm } from "./crud-form";
import { ExportMenu } from "./export-menu";
import { createCrudService, type Record_ } from "@/lib/services/crud.service";
import type { ModuleDef } from "@/lib/modules/types";
import { useAuth } from "@/lib/auth/store";
import { can } from "@/lib/auth/permissions";
import { tModule, tGroup, tField } from "@/lib/i18n-helpers";

interface Props {
  module: ModuleDef;
}

export function ModulePage({ module: mod }: Props) {
  const { t } = useTranslation();
  const modTitle = tModule(mod.slug, mod.title);
  const qc = useQueryClient();
  const user = useAuth((s) => s.user);
  const role = user?.role ?? "student";

  const canCreate = can(role, mod.group, "create");
  const canEdit = can(role, mod.group, "update");
  const canDelete = can(role, mod.group, "delete");
  const canExport = can(role, mod.group, "export");

  const searchable = useMemo(() => mod.fields.filter((f) => f.searchable).map((f) => f.name), [mod]);
  const service = useMemo(() => createCrudService<Record_>(mod.slug, searchable), [mod.slug, searchable]);

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<string | undefined>();
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Record_ | null>(null);
  const [deleting, setDeleting] = useState<Record_ | null>(null);

  useEffect(() => { setPage(1); }, [search, mod.slug]);

  const query = useQuery({
  queryKey: [mod.slug, { page, search, sortBy, sortDir }],
  queryFn: async () => {
    const data = await service.list({
      page,
      pageSize: 10,
      search,
      sortBy,
      sortDir,
    });

    console.log("========== STUDENTS ==========");
   console.log("Student Object");
   console.log(data.rows[0]);
    console.log("==============================");

    return data;
  },
});

  const createMut = useMutation({
    mutationFn: (v: Partial<Record_>) => service.create(v),
    onSuccess: () => { toast.success(t("crud.createdToast", { title: modTitle })); qc.invalidateQueries({ queryKey: [mod.slug] }); setDialogOpen(false); },
    onError: (e: Error) => toast.error(e.message || t("crud.failedCreate")),
  });
  const updateMut = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<Record_> }) => service.update(id, patch),
    onSuccess: () => { toast.success(t("crud.updatedToast", { title: modTitle })); qc.invalidateQueries({ queryKey: [mod.slug] }); setDialogOpen(false); setEditing(null); },
    onError: (e: Error) => toast.error(e.message || t("crud.failedUpdate")),
  });
  const deleteMut = useMutation({
    mutationFn: (id: string) => service.remove(id),
    onSuccess: () => { toast.success(t("crud.deletedToast", { title: modTitle })); qc.invalidateQueries({ queryKey: [mod.slug] }); setDeleting(null); },
    onError: (e: Error) => toast.error(e.message || t("crud.failedDelete")),
  });

  const columns: Column<Record_>[] = mod.fields
  .filter((f) => !f.hideInTable)
  .map((f) => ({
    key: f.name,
    label: f.label,
    sortable: true,

    render: (row: any) => {
      // These special cases translate the real Student API's nested/split
      // shape (row.firstName + row.lastName, row.class as an object, etc.)
      // into display strings — but that shape is unique to the New Student
      // module. Every other (generic) module stores these fields as plain
      // flat values already, so applying this here would wrongly blank
      // them out. Only special-case when we're actually in that module.
      if (mod.slug === "new-student") {
        switch (f.name) {
          case "name":
            return `${row.firstName ?? ""} ${row.lastName ?? ""}`.trim();

          case "class":
            return row.class?.name ?? "";

          case "section":
            return row.section?.name ?? "";

          case "dob":
            return row.dateOfBirth
              ? new Date(row.dateOfBirth).toLocaleDateString()
              : "";

          case "guardian":
            return row.guardianName ?? "";

          case "phone":
            return row.mobile ?? row.guardianMobile ?? "";
        }
      }

      return row[f.name];
    },
  }));

  const exportColumns = mod.fields.map((f) => ({ key: f.name, label: tField(f.label) }));

  function handleSort(key: string) {
    if (sortBy === key) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortBy(key); setSortDir("asc"); }
  }

  function openCreate() { setEditing(null); setDialogOpen(true); }
  function openEdit(row: Record_) { setEditing(service.toFormValues(row) as Record_); setDialogOpen(true); }

 async function handleSubmit(values: Record<string, unknown>) {
  console.log("========== FORM DATA ==========");
  console.log(values);
  console.log("===============================");

  if (editing) {
    await updateMut.mutateAsync({
      id: editing.id,
      patch: values,
    });
  } else {
    await createMut.mutateAsync(values);
  }
}

  return (
    <div className="space-y-6">
      <PageHeader
        title={modTitle}
        description={mod.description ?? t("crud.manageDesc", { title: modTitle })}
        crumbs={[
          { label: t("common.dashboard"), to: "/app" },
          { label: tGroup(mod.group) },
          { label: modTitle },
        ]}
        actions={
          <div className="flex items-center gap-2">
            {canExport && (
              <ExportMenu
                filename={mod.slug}
                title={modTitle}
                columns={exportColumns}
                rows={query.data?.rows ?? []}
                disabled={!query.data?.rows.length}
              />
            )}
            {canCreate && (
              <Button onClick={openCreate}>
                <Plus className="mr-2 h-4 w-4" /> {t("common.new")}
              </Button>
            )}
          </div>
        }
      />

      <DataTable
        columns={columns}
        rows={query.data?.rows ?? []}
        total={query.data?.total ?? 0}
        page={page}
        pageSize={10}
        loading={query.isLoading}
        search={search}
        onSearch={setSearch}
        sortBy={sortBy}
        sortDir={sortDir}
        onSort={handleSort}
        onPage={setPage}
        onEdit={canEdit ? openEdit : undefined}
        onDelete={canDelete ? setDeleting : undefined}
        emptyAction={canCreate ? { label: t("common.createRecord"), onClick: openCreate } : undefined}
        canEdit={canEdit}
        canDelete={canDelete}
        searchPlaceholder={searchable.length ? t("crud.searchBy", { fields: searchable.map((s) => tField(s, s)).join(", ") }) : t("common.search")}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? t("crud.editTitle", { title: modTitle }) : t("crud.newTitle", { title: modTitle })}</DialogTitle>
            <DialogDescription>
              {editing ? t("crud.editDesc") : t("crud.newDesc")}
            </DialogDescription>
          </DialogHeader>
          <CrudForm
            module={mod}
            defaultValues={editing ?? undefined}
            onSubmit={handleSubmit}
            onCancel={() => setDialogOpen(false)}
            submitLabel={editing ? t("common.update") : t("common.create")}
            disabled={createMut.isPending || updateMut.isPending}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("crud.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("crud.deleteDesc")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleting && deleteMut.mutate(deleting.id)}
            >
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}