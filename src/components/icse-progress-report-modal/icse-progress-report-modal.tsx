import { useQuery } from "@tanstack/react-query";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ScatterChart, Scatter,
} from "recharts";
import { X } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api/client";

// Same dashboard layout as the regular board's ProgressReportModal, but
// pointed at /icse-marks/dashboard — pulls exam performance from the ICSE
// marks tables across the standard ICSE exam set (Unit Tests, Half Yearly,
// Preliminary 1/2, Annual, Board Exam) instead of the regular board's.

interface IcseDashboardData {
  student: {
    name: string;
    admissionNo: string;
    grNo?: string;
    rollNumber: number | null;
    className?: string;
    sectionName?: string;
    heightCm?: number | null;
    weightKg?: number | null;
  };
  academicYear: string;
  monthlyAttendance: { month: string; present: number; total: number }[];
  examPerformance: { examName: string; totalObtained: number; totalMax: number; percentage: number; entered: boolean }[];
}

// Short labels for the X axis so all 7 ICSE exams fit without overlapping.
const EXAM_SHORT_LABEL: Record<string, string> = {
  "Unit Test 1": "UT 1",
  "Half Yearly Examination": "Half Yearly",
  "Unit Test 2": "UT 2",
  "Preliminary Examination 1": "Prelim 1",
  "Preliminary Examination 2": "Prelim 2",
  "Final Examination": "Final",
  "Annual Examination": "Annual",
  "ICSE Board Examination": "Board Exam",
};

export function IcseProgressReportModal({
  studentId,
  academicYear,
  onClose,
}: {
  studentId: string | null;
  academicYear: string;
  onClose: () => void;
}) {
  const reportQuery = useQuery({
    queryKey: ["icse-dashboard", studentId, academicYear],
    queryFn: async () => {
      const res = await apiFetch<{ data: IcseDashboardData }>(
        `/icse-marks/dashboard/${studentId}?academicYear=${encodeURIComponent(academicYear)}`
      );
      return res.data;
    },
    enabled: !!studentId,
  });

  if (!studentId) return null;
  const data = reportQuery.data;

  const heightWeightData =
    data?.student.heightCm && data?.student.weightKg
      ? [{ height: data.student.heightCm, weight: data.student.weightKg }]
      : [];

  const chartData = (data?.examPerformance || []).map((e) => ({
    ...e,
    examLabel: EXAM_SHORT_LABEL[e.examName] || e.examName,
  }));

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="relative w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-3xl border-2 border-slate-900 p-8"
        style={{ background: "linear-gradient(135deg, #eaf2ff 0%, #dceeff 100%)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-5 right-6 text-red-500 hover:text-red-600 text-2xl leading-none"
          aria-label="Close"
        >
          <X className="h-6 w-6" />
        </button>

        {reportQuery.isLoading && (
          <div className="space-y-3 py-10">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-64 w-full" />
          </div>
        )}

        {data && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Top-left: identity block */}
            <div>
              <h2 className="text-3xl font-bold mb-4">{data.student.name}</h2>
              <p className="font-semibold text-lg">Register No: {data.student.grNo || data.student.admissionNo}</p>
              <p className="font-semibold text-lg">Roll No: {data.student.rollNumber ?? "-"}</p>
              <p className="font-semibold text-lg">Class: {data.student.className} - {data.student.sectionName}</p>
              <p className="font-semibold text-lg">Academic Year: {data.academicYear}</p>
            </div>

            {/* Top-right: Monthly Attendance */}
            <div>
              <h3 className="text-center font-semibold mb-2">Monthly Attendance</h3>
              <ResponsiveContainer width="100%" height={230}>
                <BarChart data={data.monthlyAttendance}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" fontSize={11} />
                  <YAxis fontSize={11} allowDecimals={false} label={{ value: "Attendance", angle: -90, position: "insideLeft", fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="present" name="Days Present" fill="#2563eb" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Bottom-left: Height and Weight */}
            <div>
              <h3 className="text-center font-semibold mb-2">Student Height and Weight</h3>
              {heightWeightData.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-16">
                  Height/Weight not recorded for this student yet.
                </p>
              ) : (
                <ResponsiveContainer width="100%" height={230}>
                  <ScatterChart>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" dataKey="height" name="Height" unit=" cm" fontSize={11} label={{ value: "Height (cm)", position: "insideBottom", offset: -5, fontSize: 11 }} />
                    <YAxis type="number" dataKey="weight" name="Weight" unit=" kg" fontSize={11} label={{ value: "Weight (kg)", angle: -90, position: "insideLeft", fontSize: 11 }} />
                    <Tooltip cursor={{ strokeDasharray: "3 3" }} />
                    <Scatter name="Student Height and Weight" data={heightWeightData} fill="#7dd3fc" />
                  </ScatterChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Bottom-right: Exam Performance across all ICSE exams */}
            <div>
              <h3 className="text-center font-semibold mb-2">ICSE Exam Performance</h3>
              <ResponsiveContainer width="100%" height={230}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="examLabel" fontSize={9} interval={0} angle={-20} textAnchor="end" height={50} />
                  <YAxis yAxisId="marks" fontSize={11} />
                  <YAxis yAxisId="pct" orientation="right" domain={[0, 100]} fontSize={11} unit="%" />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar yAxisId="marks" dataKey="totalMax" name="Total Marks" fill="#c4b5fd" radius={[3, 3, 0, 0]} />
                  <Bar yAxisId="marks" dataKey="totalObtained" name="Total Obtained Marks" fill="#7dd3fc" radius={[3, 3, 0, 0]} />
                  <Bar yAxisId="pct" dataKey="percentage" name="Percentage" fill="#fda4af" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              {data.examPerformance.every((e) => !e.entered) && (
                <p className="text-xs text-muted-foreground mt-1 text-center">
                  No ICSE marks entered yet — enter them in ICSE Marks Entry first.
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}