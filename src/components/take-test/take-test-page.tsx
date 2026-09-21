import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Clock, CheckCircle2, PenSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/common/page-header";
import { apiFetch } from "@/lib/api/client";

interface AvailableTest {
  id: string;
  title: string;
  description?: string | null;
  subjectName: string | null;
  durationMin: number;
  totalMarks: number;
  questionCount: number;
  submission: { score: number; maxScore: number; submittedAt: string } | null;
}

interface TestQuestion {
  id: string;
  questionText: string;
  options: string[];
  marks: number;
}

interface TestForTaking {
  id: string;
  title: string;
  description?: string | null;
  durationMin: number;
  questions: TestQuestion[];
}

export function TakeTestPage() {
  const queryClient = useQueryClient();
  const [activeTestId, setActiveTestId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [lastResult, setLastResult] = useState<{ score: number; maxScore: number } | null>(null);

  const { data: availableTests, isLoading } = useQuery({
    queryKey: ["available-tests"],
    queryFn: async () => {
      const res = await apiFetch<{ data: AvailableTest[] }>("/tests/available");
      return res.data || [];
    },
  });

  const { data: activeTest, isLoading: loadingTest } = useQuery({
    queryKey: ["take-test", activeTestId],
    queryFn: async () => {
      const res = await apiFetch<{ data: TestForTaking }>(`/tests/${activeTestId}/take`);
      return res.data;
    },
    enabled: !!activeTestId,
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!activeTestId) throw new Error("No active test");
      return apiFetch<{ data: { score: number; maxScore: number } }>(`/tests/${activeTestId}/submit`, {
        method: "POST",
        body: JSON.stringify({ answers }),
      });
    },
    onSuccess: (res) => {
      toast.success("Test submitted!");
      setLastResult(res.data);
      setActiveTestId(null);
      setAnswers({});
      queryClient.invalidateQueries({ queryKey: ["available-tests"] });
    },
    onError: (err: any) => toast.error(err.message || "Failed to submit test"),
  });

  if (activeTestId) {
    if (loadingTest || !activeTest) {
      return <p className="text-sm text-muted-foreground py-10 text-center">Loading test…</p>;
    }

    const allAnswered = activeTest.questions.every((q) => answers[q.id] !== undefined);

    return (
      <div className="space-y-6 max-w-3xl">
        <PageHeader
          title={activeTest.title}
          description={`${activeTest.questions.length} questions · ${activeTest.durationMin} min`}
        />

        <div className="space-y-4">
          {activeTest.questions.map((q, i) => (
            <Card key={q.id} className="p-6">
              <p className="font-medium mb-3">
                {i + 1}. {q.questionText}
                <span className="text-xs text-muted-foreground ml-2">({q.marks} mark{q.marks !== 1 ? "s" : ""})</span>
              </p>
              <RadioGroup
                value={answers[q.id] !== undefined ? String(answers[q.id]) : undefined}
                onValueChange={(v) => setAnswers((prev) => ({ ...prev, [q.id]: Number(v) }))}
                className="space-y-2"
              >
                {q.options.map((opt, oi) => (
                  <div key={oi} className="flex items-center gap-2">
                    <RadioGroupItem value={String(oi)} id={`${q.id}-${oi}`} />
                    <Label htmlFor={`${q.id}-${oi}`} className="font-normal cursor-pointer">{opt}</Label>
                  </div>
                ))}
              </RadioGroup>
            </Card>
          ))}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => { setActiveTestId(null); setAnswers({}); }}>
            Cancel
          </Button>
          <Button onClick={() => submitMutation.mutate()} disabled={!allAnswered || submitMutation.isPending}>
            {submitMutation.isPending ? "Submitting…" : "Submit Test"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Take Test" description="Tests assigned to your class." />

      {lastResult && (
        <Card className="p-5 border-success/40 bg-success/5 flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-success" />
          <p className="text-sm">
            You scored <span className="font-semibold">{lastResult.score} / {lastResult.maxScore}</span> on your last submission.
          </p>
        </Card>
      )}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading tests…</p>
      ) : !availableTests || availableTests.length === 0 ? (
        <Card className="p-10 text-center card-elevated">
          <PenSquare className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No tests have been assigned to your class yet.</p>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {availableTests.map((t) => (
            <Card key={t.id} className="p-5">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold">{t.title}</h3>
                {t.submission && (
                  <Badge variant="secondary" className="bg-success/10 text-success border-success/20">
                    Completed
                  </Badge>
                )}
              </div>
              {t.description && <p className="text-sm text-muted-foreground mb-2">{t.description}</p>}
              <div className="flex items-center gap-3 text-xs text-muted-foreground mb-4">
                {t.subjectName && <span>{t.subjectName}</span>}
                <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {t.durationMin} min</span>
                <span>{t.questionCount} questions</span>
              </div>
              {t.submission ? (
                <p className="text-sm font-medium">
                  Score: {t.submission.score} / {t.submission.maxScore}
                </p>
              ) : (
                <Button size="sm" onClick={() => setActiveTestId(t.id)}>Start Test</Button>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default TakeTestPage;