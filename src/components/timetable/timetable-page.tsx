import { useState, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Printer, Save, CalendarDays, Loader2, School, Check, ChevronsUpDown,
  Plus, Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth/store";

const DAYS: { value: string; label: string; short: string }[] = [
  { value: "MONDAY", label: "Monday", short: "Mon" },
  { value: "TUESDAY", label: "Tuesday", short: "Tue" },
  { value: "WEDNESDAY", label: "Wednesday", short: "Wed" },
  { value: "THURSDAY", label: "Thursday", short: "Thu" },
  { value: "FRIDAY", label: "Friday", short: "Fri" },
  { value: "SATURDAY", label: "Saturday", short: "Sat" },
];

const DEFAULT_PERIODS = [
  { key: "p1", label: "Period 1", startTime: "09:00", endTime: "09:40" },
  { key: "p2", label: "Period 2", startTime: "09:40", endTime: "10:20" },
  { key: "p3", label: "Period 3", startTime: "10:20", endTime: "11:00" },
  { key: "p4", label: "Period 4", startTime: "11:15", endTime: "11:55" },
  { key: "p5", label: "Period 5", startTime: "11:55", endTime: "12:35" },
  { key: "p6", label: "Period 6", startTime: "13:15", endTime: "13:55" },
  { key: "p7", label: "Period 7", startTime: "13:55", endTime: "14:35" },
  { key: "p8", label: "Period 8", startTime: "14:35", endTime: "15:15" },
];

interface PeriodDef {
  key: string;
  label: string;
  startTime: string;
  endTime: string;
}

interface ClassOption {
  id: string;
  name: string;
  sections: { id: string; name: string }[];
}

interface SubjectOption {
  id: string;
  name: string;
  code?: string;
}

interface TeacherOption {
  id: string;
  firstName: string;
  lastName?: string | null;
}

interface GridEntryFromApi {
  id: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  subjectId: string;
  staffId: string;
  roomNo?: string | null;
  subject: { id: string; name: string; code?: string };
  staff: { id: string; firstName: string; lastName?: string | null };
}

interface StudentScheduleEntry {
  id: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  roomNo?: string | null;
  subject: { id: string; name: string };
  staff?: { id: string; firstName: string; lastName?: string | null } | null;
}

interface StudentScheduleMeta {
  classId: string;
  className: string;
  sectionId: string;
  sectionName: string;
  totalPeriods: number;
}

interface CellValue {
  subjectId: string;
  teacherId: string;
  roomNo: string;
}

function cellKey(day: string, periodKey: string) {
  return `${day}__${periodKey}`;
}

function SearchableSelect({
  value,
  onChange,
  options,
  placeholder,
  searchPlaceholder = "Search…",
  disabled,
  triggerClassName,
  onCreate,
  creating,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  triggerClassName?: string;
  onCreate?: (name: string) => void;
  creating?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const selected = options.find((o) => o.value === value);
  const trimmedQuery = query.trim();
  const exactMatch = options.some(
    (o) => o.label.toLowerCase() === trimmedQuery.toLowerCase()
  );
  const showCreate = !!onCreate && trimmedQuery.length > 0 && !exactMatch;

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setQuery("");
      }}
    >
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "w-full justify-between font-normal",
            !selected && "text-muted-foreground",
            triggerClassName
          )}
        >
          <span className="truncate">{selected ? selected.label : placeholder}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[240px] p-0" align="start">
        <Command shouldFilter={!onCreate}>
          {onCreate ? (
            <CommandInput
              placeholder={searchPlaceholder}
              value={query}
              onValueChange={setQuery}
            />
          ) : (
            <CommandInput placeholder={searchPlaceholder} />
          )}
          <CommandList>
            {!showCreate && <CommandEmpty>No results found.</CommandEmpty>}
            <CommandGroup>
              {(onCreate
                ? options.filter((o) =>
                    o.label.toLowerCase().includes(trimmedQuery.toLowerCase())
                  )
                : options
              ).map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.label}
                  onSelect={() => {
                    onChange(option.value);
                    setOpen(false);
                    setQuery("");
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === option.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
            {showCreate && (
              <CommandGroup>
                <CommandItem
                  value={`__create__${trimmedQuery}`}
                  disabled={creating}
                  onSelect={() => {
                    onCreate!(trimmedQuery);
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  {creating ? "Creating…" : `Create "${trimmedQuery}"`}
                </CommandItem>
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export function TimetablePage() {
  const queryClient = useQueryClient();

  // ─────────────────────────────────────────────────────────────────
  // ✅ FIXED: case-insensitive role check, plus a debug log so we can
  // see exactly what the auth store is returning.
  //
  // Previously the check was `role === "STUDENT"` — a strict string
  // comparison. If the backend ever returned `"student"` or `"Student"`
  // (Prisma enums in some setups are stored lowercase, and different
  // parts of the app sometimes title-case them), the comparison failed
  // silently and the student saw the staff Timetable Builder instead
  // of the read-only view. `.toUpperCase()` normalises both sides.
  // ─────────────────────────────────────────────────────────────────
  const user = useAuth((s) => s.user);
  const role = user?.role;
  const isStudent = role?.toUpperCase() === "STUDENT";

  // Temporary debug — remove once you've confirmed it works
  console.log("🔍 TimetablePage role check:", { role, isStudent });

  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [selectedSectionId, setSelectedSectionId] = useState<string>("");
  const [periods, setPeriods] = useState<PeriodDef[]>(DEFAULT_PERIODS);
  const [grid, setGrid] = useState<Record<string, CellValue>>({});
  const [saving, setSaving] = useState(false);
  const [printMode, setPrintMode] = useState(false);
  const [creatingSubject, setCreatingSubject] = useState(false);

  // ── Staff-only data (Timetable Builder) ──────────────────────────
  const { data: classes, isLoading: classesLoading } = useQuery({
    queryKey: ["timetable-classes"],
    queryFn: async () => {
      const res = await apiFetch<{ data: ClassOption[] }>("/timetable/classes");
      return res.data || [];
    },
    enabled: !isStudent,
  });

  const { data: subjects } = useQuery({
    queryKey: ["timetable-subjects"],
    queryFn: async () => {
      const res = await apiFetch<{ data: SubjectOption[] }>("/timetable/subjects");
      return (res.data || []).filter((s) => !/\s[-—]\s/.test(s.name));
    },
    enabled: !isStudent,
  });

  const { data: teachers } = useQuery({
    queryKey: ["timetable-teachers"],
    queryFn: async () => {
      const res = await apiFetch<{ data: TeacherOption[] }>("/timetable/teachers");
      return res.data || [];
    },
    enabled: !isStudent,
  });

  const sections = useMemo(() => {
    return classes?.find((c) => c.id === selectedClassId)?.sections || [];
  }, [classes, selectedClassId]);

  const classOptions = useMemo(
    () => (classes || []).map((c) => ({ value: c.id, label: c.name })),
    [classes]
  );
  const sectionOptions = useMemo(
    () => sections.map((s) => ({ value: s.id, label: s.name })),
    [sections]
  );
  const subjectOptions = useMemo(
    () => (subjects || []).map((s) => ({ value: s.id, label: s.name })),
    [subjects]
  );
  const teacherOptions = useMemo(
    () =>
      (teachers || []).map((t) => ({
        value: t.id,
        label: `${t.firstName} ${t.lastName || ""}`.trim(),
      })),
    [teachers]
  );

  const {
    data: existingEntries,
    isLoading: gridLoading,
    refetch: refetchGrid,
  } = useQuery({
    queryKey: ["timetable-grid", selectedClassId, selectedSectionId],
    queryFn: async () => {
      const res = await apiFetch<{ data: GridEntryFromApi[] }>(
        `/timetable/grid/${selectedClassId}/${selectedSectionId}`
      );
      return res.data || [];
    },
    enabled: !isStudent && !!selectedClassId && !!selectedSectionId,
  });

  // ── Student-only data (read-only view) ───────────────────────────
  const { data: myScheduleResponse, isLoading: myScheduleLoading } = useQuery({
    queryKey: ["timetable-my-student-schedule"],
    queryFn: async () => {
      const res = await apiFetch<{
        data: StudentScheduleEntry[];
        meta?: StudentScheduleMeta;
      }>("/timetable/my-student-schedule");
      return res;
    },
    enabled: isStudent,
    retry: false,
  });

  const myScheduleEntries = myScheduleResponse?.data ?? [];
  const myScheduleMeta = myScheduleResponse?.meta;

  const myPeriods = useMemo(() => {
    const uniqueTimes = Array.from(
      new Set(myScheduleEntries.map((e) => `${e.startTime}__${e.endTime}`))
    ).map((pair) => {
      const [startTime, endTime] = pair.split("__");
      return { startTime, endTime };
    });
    return uniqueTimes.sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [myScheduleEntries]);

  const myCellLookup = useMemo(() => {
    const map = new Map<string, StudentScheduleEntry>();
    for (const e of myScheduleEntries) map.set(`${e.dayOfWeek}__${e.startTime}`, e);
    return map;
  }, [myScheduleEntries]);

  useEffect(() => {
    if (isStudent) return;

    if (!existingEntries || existingEntries.length === 0) {
      setGrid({});
      setPeriods(DEFAULT_PERIODS);
      return;
    }

    const basePeriods = [...DEFAULT_PERIODS];

    const uniqueTimes = Array.from(
      new Set(existingEntries.map((e) => `${e.startTime}__${e.endTime}`))
    ).map((pair) => {
      const [startTime, endTime] = pair.split("__");
      return { startTime, endTime };
    });

    for (const t of uniqueTimes) {
      const alreadyExists = basePeriods.some(
        (p) => p.startTime === t.startTime && p.endTime === t.endTime
      );
      if (!alreadyExists) {
        basePeriods.push({
          key: `p${basePeriods.length + 1}`,
          label: `Period ${basePeriods.length + 1}`,
          startTime: t.startTime,
          endTime: t.endTime,
        });
      }
    }

    basePeriods.sort((a, b) => a.startTime.localeCompare(b.startTime));
    const rebuiltPeriods: PeriodDef[] = basePeriods.map((p, i) => ({
      ...p,
      key: `p${i + 1}`,
      label: `Period ${i + 1}`,
    }));

    setPeriods(rebuiltPeriods);

    const next: Record<string, CellValue> = {};
    for (const entry of existingEntries) {
      const period = rebuiltPeriods.find(
        (p) => p.startTime === entry.startTime && p.endTime === entry.endTime
      );
      if (!period) continue;
      next[cellKey(entry.dayOfWeek, period.key)] = {
        subjectId: entry.subjectId,
        teacherId: entry.staffId,
        roomNo: entry.roomNo || "",
      };
    }
    setGrid(next);
  }, [existingEntries, isStudent]);

  const handleClassChange = (classId: string) => {
    setSelectedClassId(classId);
    setSelectedSectionId("");
    setGrid({});
    setPeriods(DEFAULT_PERIODS);
  };

  const updateCell = (day: string, periodKey: string, patch: Partial<CellValue>) => {
    const key = cellKey(day, periodKey);
    setGrid((prev) => {
      const existing = prev[key] || { subjectId: "", teacherId: "", roomNo: "" };
      const updated = { ...existing, ...patch };
      if (!updated.subjectId && !updated.teacherId) {
        const { [key]: _removed, ...rest } = prev;
        return rest;
      }
      return { ...prev, [key]: updated };
    });
  };

  const updatePeriodTime = (
    periodKey: string,
    field: "startTime" | "endTime",
    value: string
  ) => {
    setPeriods((prev) =>
      prev.map((p) => (p.key === periodKey ? { ...p, [field]: value } : p))
    );
  };

  const handleCreateSubject = async (
    name: string,
    day: string,
    periodKey: string
  ) => {
    setCreatingSubject(true);
    try {
      const res = await apiFetch<{ data: SubjectOption }>("/timetable/subjects", {
        method: "POST",
        body: JSON.stringify({ name }),
      });
      await queryClient.invalidateQueries({ queryKey: ["timetable-subjects"] });
      if (res.data?.id) {
        updateCell(day, periodKey, { subjectId: res.data.id });
      }
      toast.success(`Subject "${name}" created`);
    } catch (err: any) {
      toast.error(err?.message || "Failed to create subject");
    } finally {
      setCreatingSubject(false);
    }
  };

  const filledCount = Object.keys(grid).length;
  const totalSlots = DAYS.length * periods.length;

  const handleSave = async () => {
    if (!selectedClassId || !selectedSectionId) {
      toast.error("Please select a class and section first");
      return;
    }

    const entries = Object.entries(grid)
      .filter(([, value]) => value.subjectId && value.teacherId)
      .map(([key, value]) => {
        const [dayOfWeek, periodKey] = key.split("__");
        const period = periods.find((p) => p.key === periodKey);
        return {
          dayOfWeek,
          startTime: period?.startTime || "00:00",
          endTime: period?.endTime || "00:00",
          subjectId: value.subjectId,
          teacherId: value.teacherId,
          roomNo: value.roomNo || undefined,
        };
      });

    if (entries.length === 0) {
      toast.error("Fill in at least one Subject + Teacher before saving");
      return;
    }

    setSaving(true);
    try {
      await apiFetch("/timetable/grid", {
        method: "POST",
        body: JSON.stringify({
          classId: selectedClassId,
          sectionId: selectedSectionId,
          entries,
        }),
      });
      toast.success("Timetable saved successfully");
      await refetchGrid();
    } catch (err: any) {
      toast.error(err?.message || "Failed to save timetable");
    } finally {
      setSaving(false);
    }
  };

  const handlePrint = () => {
    if (isStudent) {
      window.print();
      return;
    }
    if (!selectedClassId || !selectedSectionId) {
      toast.error("Please select a class and section first");
      return;
    }
    setPrintMode(true);
    setTimeout(() => {
      window.print();
      setPrintMode(false);
    }, 50);
  };

  const selectedClassName =
    classes?.find((c) => c.id === selectedClassId)?.name || "";
  const selectedSectionName =
    sections.find((s) => s.id === selectedSectionId)?.name || "";
  const isReady = !!selectedClassId && !!selectedSectionId;

  // ══════════════════════════════════════════════════════════════════
  // STUDENT VIEW — read-only, auto-scoped to own class + section
  // No class/section pickers. No Save. No editable dropdowns. Just
  // the weekly grid the backend returned for THIS student.
  // ══════════════════════════════════════════════════════════════════
  if (isStudent) {
    return (
      <div className="p-4 md:p-6 space-y-6 max-w-6xl mx-auto">
        <style>{`
          @media print {
            body * { visibility: hidden; }
            #student-timetable-print, #student-timetable-print * { visibility: visible; }
            #student-timetable-print { position: absolute; top: 0; left: 0; width: 100%; }
            #student-timetable-print table { width: 100% !important; table-layout: fixed !important; border-collapse: collapse !important; }
            #student-timetable-print th, #student-timetable-print td { border: 1px solid #999 !important; padding: 6px 8px !important; font-size: 11px !important; }
          }
        `}</style>

        <div className="print:hidden flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10">
              <CalendarDays className="h-6 w-6 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">My Timetable</h1>
              <p className="text-sm text-muted-foreground">
                {myScheduleMeta
                  ? `${myScheduleMeta.className} · Section ${myScheduleMeta.sectionName} · Your full weekly schedule`
                  : "Your full weekly schedule"}
              </p>
            </div>
          </div>
          <Button
            onClick={handlePrint}
            disabled={myScheduleEntries.length === 0}
            className="gap-2"
          >
            <Download className="h-4 w-4" /> Download PDF
          </Button>
        </div>

        {myScheduleLoading ? (
          <p className="text-sm text-muted-foreground py-12 text-center">
            Loading your timetable…
          </p>
        ) : myScheduleEntries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center rounded-2xl border-2 border-dashed">
            <CalendarDays className="h-14 w-14 text-muted-foreground/30 mb-4" />
            <p className="text-base font-medium text-muted-foreground">
              No timetable assigned yet
            </p>
            <p className="text-sm text-muted-foreground/70 mt-1">
              Once an admin sets one up for your class, it'll show up here.
            </p>
          </div>
        ) : (
          <div
            id="student-timetable-print"
            className="rounded-2xl border shadow-sm overflow-x-auto bg-card"
          >
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-indigo-600 text-white">
                  <th className="text-left font-semibold px-4 py-3 sticky left-0 bg-indigo-600 z-10 rounded-tl-2xl">
                    Period
                  </th>
                  {DAYS.map((day, i) => (
                    <th
                      key={day.value}
                      className={`text-left font-semibold px-3 py-3 min-w-[150px] ${
                        i === DAYS.length - 1 ? "rounded-tr-2xl" : ""
                      }`}
                    >
                      <span className="hidden sm:inline">{day.label}</span>
                      <span className="sm:hidden">{day.short}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {myPeriods.map((period, rowIdx) => (
                  <tr
                    key={`${period.startTime}-${period.endTime}`}
                    className={rowIdx % 2 === 0 ? "bg-white" : "bg-muted/20"}
                  >
                    <td className="px-4 py-3 border-t font-mono font-medium whitespace-nowrap sticky left-0 bg-inherit">
                      {period.startTime}
                      <div className="text-xs text-muted-foreground font-normal">
                        –{period.endTime}
                      </div>
                    </td>
                    {DAYS.map((day) => {
                      const entry = myCellLookup.get(
                        `${day.value}__${period.startTime}`
                      );
                      return (
                        <td key={day.value} className="px-3 py-3 border-t align-top">
                          {entry ? (
                            <div>
                              <p className="font-semibold">{entry.subject.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {entry.staff
                                  ? `${entry.staff.firstName} ${
                                      entry.staff.lastName || ""
                                    }`.trim()
                                  : ""}
                                {entry.roomNo ? ` · Room ${entry.roomNo}` : ""}
                              </p>
                            </div>
                          ) : (
                            <span className="text-muted-foreground/40">—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════
  // STAFF VIEW — Timetable Builder (unchanged)
  // ══════════════════════════════════════════════════════════════════
  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <style>{`
        @media print {
          @page { size: landscape; margin: 10mm; }
          html, body { margin: 0 !important; padding: 0 !important; }
          body * { visibility: hidden; }
          #timetable-print-area, #timetable-print-area * { visibility: visible; }
          #timetable-print-area { position: absolute; top: 0; left: 0; width: 100%; }
          #timetable-print-area .timetable-scroll { overflow: visible !important; }
          #timetable-print-area table { width: 100% !important; table-layout: fixed !important; border-collapse: collapse !important; }
          #timetable-print-area th, #timetable-print-area td { border: 1px solid #999 !important; padding: 6px 8px !important; font-size: 11px !important; word-break: break-word; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          #timetable-print-area thead tr { background: #4f46e5 !important; color: #fff !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>

      <div className="print:hidden flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-500/10">
            <CalendarDays className="h-6 w-6 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Timetable Builder</h1>
            <p className="text-sm text-muted-foreground">
              Pick a class and section, set period times, then fill in the weekly schedule.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handlePrint}
            disabled={!isReady}
            className="gap-2"
          >
            <Printer className="h-4 w-4" /> Print
          </Button>
          <Button onClick={handleSave} disabled={saving || !isReady} className="gap-2">
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {saving ? "Saving…" : "Save Timetable"}
          </Button>
        </div>
      </div>

      <div className="print:hidden rounded-2xl border bg-card shadow-sm p-5">
        <div className="flex flex-col sm:flex-row sm:items-end gap-4">
          <div className="flex-1 min-w-[180px]">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">
              Class
            </Label>
            {classesLoading ? (
              <Skeleton className="h-11 w-full mt-2 rounded-lg" />
            ) : (
              <div className="mt-2">
                <SearchableSelect
                  value={selectedClassId}
                  onChange={handleClassChange}
                  options={classOptions}
                  placeholder="Choose a class"
                  searchPlaceholder="Search classes…"
                  triggerClassName="h-11 rounded-lg"
                />
              </div>
            )}
          </div>

          <div className="flex-1 min-w-[180px]">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">
              Section
            </Label>
            <div className="mt-2">
              <SearchableSelect
                value={selectedSectionId}
                onChange={setSelectedSectionId}
                options={sectionOptions}
                placeholder="Choose a section"
                searchPlaceholder="Search sections…"
                disabled={!selectedClassId}
                triggerClassName="h-11 rounded-lg"
              />
            </div>
          </div>

          {isReady && (
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-indigo-50 text-indigo-700 text-sm font-medium whitespace-nowrap">
              <School className="h-4 w-4" />
              {filledCount} / {totalSlots} periods filled
            </div>
          )}
        </div>
      </div>

      {!isReady ? (
        <div className="print:hidden flex flex-col items-center justify-center py-20 text-center rounded-2xl border-2 border-dashed">
          <CalendarDays className="h-14 w-14 text-muted-foreground/30 mb-4" />
          <p className="text-base font-medium text-muted-foreground">
            Select a class and section above
          </p>
          <p className="text-sm text-muted-foreground/70 mt-1">
            The weekly grid will appear here once both are chosen.
          </p>
        </div>
      ) : gridLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg" />
          ))}
        </div>
      ) : (
        <div id="timetable-print-area">
          {printMode && (
            <div className="hidden print:block text-center mb-3">
              <h2 className="text-2xl font-bold">
                {selectedClassName} - {selectedSectionName}
              </h2>
              <p className="text-sm text-muted-foreground">Weekly Timetable</p>
            </div>
          )}

          <div className="timetable-scroll rounded-2xl border shadow-sm overflow-x-auto bg-card">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-indigo-600 text-white">
                  <th className="text-left font-semibold px-4 py-3 sticky left-0 bg-indigo-600 z-10 rounded-tl-2xl">
                    Period
                  </th>
                  {DAYS.map((day, i) => (
                    <th
                      key={day.value}
                      className={`text-left font-semibold px-3 py-3 min-w-[190px] ${
                        i === DAYS.length - 1 ? "rounded-tr-2xl" : ""
                      }`}
                    >
                      <span className="hidden sm:inline">{day.label}</span>
                      <span className="sm:hidden">{day.short}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {periods.map((period, rowIdx) => (
                  <tr
                    key={period.key}
                    className={rowIdx % 2 === 0 ? "bg-white" : "bg-muted/20"}
                  >
                    <td className="px-4 py-3 border-t font-semibold whitespace-nowrap sticky left-0 bg-inherit align-top">
                      {period.label}
                      {printMode ? (
                        <div className="text-xs font-normal text-muted-foreground">
                          {period.startTime} – {period.endTime}
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 mt-1.5 print:hidden">
                          <Input
                            type="time"
                            value={period.startTime}
                            onChange={(e) =>
                              updatePeriodTime(period.key, "startTime", e.target.value)
                            }
                            className="h-7 text-xs px-1.5 w-[92px]"
                          />
                          <span className="text-xs text-muted-foreground">–</span>
                          <Input
                            type="time"
                            value={period.endTime}
                            onChange={(e) =>
                              updatePeriodTime(period.key, "endTime", e.target.value)
                            }
                            className="h-7 text-xs px-1.5 w-[92px]"
                          />
                        </div>
                      )}
                    </td>
                    {DAYS.map((day) => {
                      const key = cellKey(day.value, period.key);
                      const cell = grid[key] || {
                        subjectId: "",
                        teacherId: "",
                        roomNo: "",
                      };
                      const subject = subjects?.find((s) => s.id === cell.subjectId);
                      const teacher = teachers?.find((t) => t.id === cell.teacherId);
                      const filled = !!cell.subjectId;

                      return (
                        <td
                          key={key}
                          className={`px-2 py-2 border-t align-top ${
                            filled ? "bg-indigo-50/50" : ""
                          }`}
                        >
                          {printMode ? (
                            cell.subjectId ? (
                              <div>
                                <div className="font-semibold text-indigo-900">
                                  {subject?.name || "-"}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {teacher
                                    ? `${teacher.firstName} ${
                                        teacher.lastName || ""
                                      }`.trim()
                                    : "-"}
                                </div>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )
                          ) : (
                            <div className="space-y-1.5 print:hidden">
                              <SearchableSelect
                                value={cell.subjectId}
                                onChange={(v) =>
                                  updateCell(day.value, period.key, { subjectId: v })
                                }
                                options={subjectOptions}
                                placeholder="Subject"
                                searchPlaceholder="Search or type new subject…"
                                triggerClassName="h-8 text-xs rounded-md"
                                onCreate={(name) =>
                                  handleCreateSubject(name, day.value, period.key)
                                }
                                creating={creatingSubject}
                              />
                              <SearchableSelect
                                value={cell.teacherId}
                                onChange={(v) =>
                                  updateCell(day.value, period.key, { teacherId: v })
                                }
                                options={teacherOptions}
                                placeholder="Teacher"
                                searchPlaceholder="Search teachers…"
                                triggerClassName="h-8 text-xs rounded-md"
                              />
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default TimetablePage;