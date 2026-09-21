import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious,
} from "@/components/ui/pagination";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ArrowDown, ArrowUp, ArrowUpDown, MoreHorizontal, Pencil, Search, Trash2 } from "lucide-react";
import { EmptyState } from "@/components/common/empty-state";
import { cn } from "@/lib/utils";
import { tField, tOption } from "@/lib/i18n-helpers";
import i18n from "@/lib/i18n";

export interface Column<T> {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (row: T) => React.ReactNode;
  className?: string;
}

interface Props<T extends { id: string }> {
  columns: Column<T>[];
  rows: T[];
  total: number;
  page: number;
  pageSize: number;
  loading?: boolean;
  search: string;
  onSearch: (v: string) => void;
  sortBy?: string;
  sortDir?: "asc" | "desc";
  onSort?: (key: string) => void;
  onPage: (p: number) => void;
  onEdit?: (row: T) => void;
  onDelete?: (row: T) => void;
  emptyAction?: { label: string; onClick: () => void };
  canEdit?: boolean;
  canDelete?: boolean;
  searchPlaceholder?: string;
}

export function DataTable<T extends { id: string }>({
  columns, rows, total, page, pageSize, loading, search, onSearch,
  sortBy, sortDir, onSort, onPage, onEdit, onDelete, emptyAction,
  canEdit = true, canDelete = true, searchPlaceholder,
}: Props<T>) {
  const { t } = useTranslation();
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const [debouncedSearch, setDebouncedSearch] = useState(search);

  useMemo(() => {
    const timer = setTimeout(() => onSearch(debouncedSearch), 250);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={debouncedSearch}
            onChange={(e) => setDebouncedSearch(e.target.value)}
            placeholder={searchPlaceholder ?? t("common.search")}
            className="pl-8"
          />
        </div>
        <div className="text-xs text-muted-foreground whitespace-nowrap">
          {loading ? t("common.loading") : `${total} ${total === 1 ? t("common.record") : t("common.records")}`}
        </div>
      </div>

      {/* Desktop table */}
      <div className="rounded-lg border bg-card overflow-hidden hidden md:block">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              {columns.map((c) => (
                <TableHead key={c.key} className={cn("font-medium", c.className)}>
                  {c.sortable && onSort ? (
                    <button
                      className="inline-flex items-center gap-1 hover:text-foreground"
                      onClick={() => onSort(c.key)}
                    >
                      {tField(c.label)}
                      {sortBy === c.key ? (
                        sortDir === "asc" ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />
                      ) : <ArrowUpDown className="h-3.5 w-3.5 opacity-40" />}
                    </button>
                  ) : tField(c.label)}
                </TableHead>
              ))}
              {(onEdit || onDelete) && <TableHead className="w-12 text-right no-print">{t("table.actions")}</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {columns.map((c) => (
                    <TableCell key={c.key}><Skeleton className="h-4 w-full" /></TableCell>
                  ))}
                  {(onEdit || onDelete) && <TableCell><Skeleton className="h-4 w-4" /></TableCell>}
                </TableRow>
              ))
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length + 1}>
                  <EmptyState
                    title={search ? t("common.noMatches") : t("common.noRecords")}
                    description={search ? t("common.tryDifferent") : t("common.createFirst")}
                    actionLabel={!search ? emptyAction?.label : undefined}
                    onAction={!search ? emptyAction?.onClick : undefined}
                  />
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.id} className="hover:bg-muted/30">
                  {columns.map((c) => (
                    <TableCell key={c.key} className={c.className}>
                      {c.render ? c.render(row) : formatCell((row as Record<string, unknown>)[c.key])}
                    </TableCell>
                  ))}
                  {(onEdit || onDelete) && (
                    <TableCell className="text-right no-print">
                      <RowActions row={row} onEdit={onEdit} onDelete={onDelete} canEdit={canEdit} canDelete={canDelete} />
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-2.5">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-lg border bg-card p-4 space-y-2">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))
        ) : rows.length === 0 ? (
          <div className="rounded-lg border bg-card">
            <EmptyState
              title={search ? t("common.noMatches") : t("common.noRecords")}
              description={search ? t("common.tryDifferent") : t("common.createFirst")}
              actionLabel={!search ? emptyAction?.label : undefined}
              onAction={!search ? emptyAction?.onClick : undefined}
            />
          </div>
        ) : (
          rows.map((row) => {
            const primary = columns[0];
            const rest = columns.slice(1, 5);
            return (
              <div key={row.id} className="rounded-lg border bg-card p-4 shadow-sm">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{tField(primary.label)}</div>
                    <div className="font-semibold text-sm truncate">
                      {primary.render ? primary.render(row) : formatCell((row as Record<string, unknown>)[primary.key])}
                    </div>
                  </div>
                  {(onEdit || onDelete) && (
                    <RowActions row={row} onEdit={onEdit} onDelete={onDelete} canEdit={canEdit} canDelete={canDelete} />
                  )}
                </div>
                <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
                  {rest.map((c) => (
                    <div key={c.key} className="min-w-0">
                      <dt className="text-[10px] uppercase tracking-wider text-muted-foreground truncate">{tField(c.label)}</dt>
                      <dd className="text-foreground truncate">
                        {c.render ? c.render(row) : formatCell((row as Record<string, unknown>)[c.key])}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            );
          })
        )}
      </div>


      {totalPages > 1 && (
        <Pagination className="no-print">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={(e) => { e.preventDefault(); if (page > 1) onPage(page - 1); }}
                className={page <= 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
              />
            </PaginationItem>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              const p = i + 1 + Math.max(0, Math.min(page - 3, totalPages - 5));
              return (
                <PaginationItem key={p}>
                  <PaginationLink
                    isActive={p === page}
                    onClick={(e) => { e.preventDefault(); onPage(p); }}
                    className="cursor-pointer"
                  >
                    {p}
                  </PaginationLink>
                </PaginationItem>
              );
            })}
            <PaginationItem>
              <PaginationNext
                onClick={(e) => { e.preventDefault(); if (page < totalPages) onPage(page + 1); }}
                className={page >= totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
}

function RowActions<T extends { id: string }>({ row, onEdit, onDelete, canEdit, canDelete }: {
  row: T;
  onEdit?: (row: T) => void;
  onDelete?: (row: T) => void;
  canEdit?: boolean;
  canDelete?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
          <span className="sr-only">{t("table.openMenu")}</span>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {onEdit && canEdit && (
          <DropdownMenuItem onClick={() => onEdit(row)}>
            <Pencil className="mr-2 h-4 w-4" /> {t("common.edit")}
          </DropdownMenuItem>
        )}
        {onDelete && canDelete && (
          <DropdownMenuItem onClick={() => onDelete(row)} className="text-destructive">
            <Trash2 className="mr-2 h-4 w-4" /> {t("common.delete")}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
function dateLocale(): string {
  const lang = i18n.language?.split("-")[0];
  return lang === "hi" ? "hi-IN" : lang === "mr" ? "mr-IN" : "en-IN";
}

function formatCell(v: unknown): React.ReactNode {
  if (v == null || v === "") return <span className="text-muted-foreground">—</span>;
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}/.test(v)) {
    try { return new Date(v).toLocaleDateString(dateLocale(), { day: "2-digit", month: "short", year: "numeric" }); } catch { /* fallthrough */ }
  }
  const s = String(v);
  const statusColors: Record<string, string> = {
    Pending: "warning", Approved: "success", Rejected: "destructive", Waitlist: "info",
    Present: "success", Absent: "destructive", Late: "warning", Leave: "info",
    Pass: "success", Fail: "destructive", Promoted: "success", Detained: "destructive",
    Draft: "secondary", Sent: "info", Received: "success", Cancelled: "destructive",
  };
  if (statusColors[s]) {
    const color = statusColors[s];
    return <Badge className={`bg-${color}/15 text-${color} border-${color}/20 hover:bg-${color}/15`}>{tOption(s)}</Badge>;
  }
  return tOption(s);
}
