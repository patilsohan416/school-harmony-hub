import { useQuery } from "@tanstack/react-query";
import { Trophy, FileBarChart } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { apiFetch } from "@/lib/api/client";

interface SubjectResult {
  subjectName: string;
  totalMarks: number | null;
  maxMarks: number | null;
  percentage: number | null;
  grade: string | null;
}

interface ExamResult {
  examId: string;
  examName: string;
  examType: string;
  subjects: SubjectResult[];
}

interface MyResultsData {
  hasStudentRecord: boolean;
  results: ExamResult[];
}

export function StudentResultsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["student-my-results"],
    queryFn: async () => {
      const res = await apiFetch<{ data: MyResultsData }>("/students/me/results");
      return res.data;
    },
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading your results…</p>
        </div>
      </div>
    );
  }

  const results = data?.results ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Results"
        description="Your exam results, view only."
      />

      {results.length === 0 ? (
        <Card className="p-10 text-center card-elevated">
          <FileBarChart className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            No results have been published yet.
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {results.map((exam) => {
            const avg =
              exam.subjects.length > 0
                ? Math.round(
                    (exam.subjects.reduce((sum, s) => sum + (s.percentage || 0), 0) /
                      exam.subjects.length) *
                      10
                  ) / 10
                : null;

            return (
              <Card key={exam.examId} className="p-6 card-elevated">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-semibold tracking-tight flex items-center gap-2">
                      <Trophy className="h-4 w-4 text-primary" />
                      {exam.examName}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{exam.examType}</p>
                  </div>
                  {avg !== null && (
                    <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                      Avg: {avg}%
                    </Badge>
                  )}
                </div>

                <div className="space-y-2">
                  {exam.subjects.map((s, i) => (
                    <div
                      key={`${exam.examId}-${i}`}
                      className="flex items-center justify-between text-sm rounded-lg border px-3 py-2.5"
                    >
                      <span className="font-medium">{s.subjectName}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-muted-foreground">
                          {s.totalMarks ?? "-"}{s.maxMarks ? ` / ${s.maxMarks}` : ""}
                        </span>
                        {s.percentage !== null && (
                          <span className="text-muted-foreground">{s.percentage}%</span>
                        )}
                        {s.grade && (
                          <Badge variant="outline" className="text-[10px]">{s.grade}</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default StudentResultsPage;