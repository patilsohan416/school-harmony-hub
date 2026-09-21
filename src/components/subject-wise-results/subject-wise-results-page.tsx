import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

import { apiFetch } from "@/lib/api/client";

interface ResultRow {
  subject: string;
  class: string;
  studentCount: number;
  average: number;
  highest: number;
  lowest: number;
}

interface SubjectWiseData {
  examName: string;
  academicYear: string;
  examExists: boolean;
  rows: ResultRow[];
}

/**
 * Exam names available in Subject-wise Results — kept in sync with Marks
 * Entry's own EXAM_OPTIONS. Results are pulled from /marks/subject-wise-results,
 * which reports on whatever exam name was actually saved, so a name missing
 * from this list would make results entered under it invisible here even
 * though the data exists.
 */
const EXAM_OPTIONS = [
  "Unit Test 1",
  "Half Yearly Examination",
  "Unit Test 2",
  "Final Examination",
  "Annual Examination",
  "Board Examination",
  "SSC State Board Examination",
  "HSC State Board Examination",
];

function defaultAcademicYear() {
  const now = new Date();

  // School year starts approximately in June.
  const y =
    now.getMonth() >= 5
      ? now.getFullYear()
      : now.getFullYear() - 1;

  return `${y}-${String((y + 1) % 100).padStart(2, "0")}`;
}

export function SubjectWiseResultsPage() {
  const [examName, setExamName] = useState("");
  const [academicYear, setAcademicYear] = useState(
    defaultAcademicYear()
  );

  const [data, setData] = useState<SubjectWiseData | null>(null);
  const [loading, setLoading] = useState(false);

  async function loadResults() {
    if (!examName.trim()) {
      toast.error("Please select an Exam");
      return;
    }

    if (!academicYear.trim()) {
      toast.error("Please enter Academic Year");
      return;
    }

    setLoading(true);
    setData(null);

    try {
      const query = new URLSearchParams({
        examName: examName.trim(),
        academicYear: academicYear.trim(),
      });

      const res = await apiFetch<{ data: SubjectWiseData }>(
        `/marks/subject-wise-results?${query.toString()}`
      );

      setData(res.data);

      if (!res.data.examExists) {
        toast.info(
          "No marks found yet for this exam in any class — enter them in Marks Entry first"
        );
      } else {
        toast.success("Subject-wise results loaded successfully");
      }
    } catch (err: any) {
      toast.error(
        err?.message || "Failed to load subject-wise results"
      );
    } finally {
      setLoading(false);
    }
  }

  function handleExamChange(value: string) {
    setExamName(value);
    setData(null);
  }

  function handleAcademicYearChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    setAcademicYear(event.target.value);
    setData(null);
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold">
          Subject-wise Results
        </h1>

        <p className="text-sm text-muted-foreground mt-1">
          Average, highest, and lowest marks per subject, across
          every class and section — pulled straight from Marks
          Entry.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-4 rounded-lg border p-4">
        {/* Exam Name */}
        <div className="w-56">
          <Label>Exam Name</Label>

          <Select
            value={examName}
            onValueChange={handleExamChange}
          >
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Select exam" />
            </SelectTrigger>

            <SelectContent>
              {EXAM_OPTIONS.map((exam) => (
                <SelectItem
                  key={exam}
                  value={exam}
                >
                  {exam}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Academic Year */}
        <div className="w-36">
          <Label>Academic Year</Label>

          <Input
            value={academicYear}
            onChange={handleAcademicYearChange}
            placeholder="2026-27"
            className="mt-1"
          />
        </div>

        {/* Load Results */}
        <Button
          onClick={loadResults}
          disabled={loading || !examName}
        >
          {loading ? "Loading…" : "Load Results"}
        </Button>
      </div>

      {/* Loading Skeleton */}
      {loading && (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton
              key={i}
              className="h-10 w-full"
            />
          ))}
        </div>
      )}

      {/* No Results */}
      {!loading &&
        data &&
        !data.examExists && (
          <div className="rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">
              No marks found yet for{" "}
              <span className="font-medium text-foreground">
                "{data.examName}"
              </span>{" "}
              ({data.academicYear}) in any class.
            </p>

            <p className="text-sm text-muted-foreground mt-1">
              Enter the marks in Marks Entry first.
            </p>
          </div>
        )}

      {/* Results Table */}
      {!loading &&
        data &&
        data.examExists &&
        data.rows.length > 0 && (
          <div className="rounded-lg border overflow-hidden overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr>
                  <th className="text-left font-medium px-3 py-2">
                    Subject
                  </th>

                  <th className="text-left font-medium px-3 py-2">
                    Class
                  </th>

                  <th className="text-center font-medium px-3 py-2">
                    Students
                  </th>

                  <th className="text-center font-medium px-3 py-2">
                    Average
                  </th>

                  <th className="text-center font-medium px-3 py-2">
                    Highest
                  </th>

                  <th className="text-center font-medium px-3 py-2">
                    Lowest
                  </th>
                </tr>
              </thead>

              <tbody>
                {data.rows.map((row) => (
                  <tr
                    key={`${row.subject}__${row.class}`}
                    className="border-t"
                  >
                    <td className="px-3 py-2">
                      {row.subject}
                    </td>

                    <td className="px-3 py-2">
                      {row.class}
                    </td>

                    <td className="px-3 py-2 text-center">
                      {row.studentCount}
                    </td>

                    <td className="px-3 py-2 text-center">
                      {row.average}
                    </td>

                    <td className="px-3 py-2 text-center text-green-600">
                      {row.highest}
                    </td>

                    <td className="px-3 py-2 text-center text-red-600">
                      {row.lowest}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      {/* No Rows */}
      {!loading &&
        data &&
        data.examExists &&
        data.rows.length === 0 && (
          <div className="rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">
              No subject-wise results are available for this
              examination.
            </p>
          </div>
        )}
    </div>
  );
}