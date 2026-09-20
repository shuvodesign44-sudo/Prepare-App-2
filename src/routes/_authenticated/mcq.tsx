import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Clock } from "lucide-react";
import { startChallenge, submitChallenge } from "@/lib/prepare.functions";
import { MCQ_CATEGORIES, type McqQuestion } from "@/lib/prepare-types";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { BottomNav } from "@/components/app/bottom-nav";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/mcq")({
  head: () => ({
    meta: [
      { title: "Smart MCQ Challenge — Prepare" },
      { name: "description", content: "Timed AI-generated MCQ sets for Bangladeshi job exams." },
      { property: "og:title", content: "Smart MCQ Challenge — Prepare" },
      { property: "og:description", content: "Timed AI-generated MCQ practice sets." },
    ],
  }),
  component: McqScreen,
});

type Result = Awaited<ReturnType<typeof submitChallenge>>;

function McqScreen() {
  const start = useServerFn(startChallenge);
  const submit = useServerFn(submitChallenge);

  const [category, setCategory] = useState<string>(MCQ_CATEGORIES[0]);
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard" | "mixed">("mixed");
  const [count, setCount] = useState(10);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<McqQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [index, setIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(30 * 60);
  const [result, setResult] = useState<Result | null>(null);

  const startMutation = useMutation({
    mutationFn: () => start({ data: { category, difficulty, count } }),
    onSuccess: (data) => {
      setAttemptId(data.attemptId);
      setQuestions(data.questions);
      setAnswers({});
      setIndex(0);
      setSecondsLeft(30 * 60);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const submitMutation = useMutation({
    mutationFn: () =>
      submit({
        data: {
          attemptId: attemptId!,
          answers,
          durationSeconds: 30 * 60 - secondsLeft,
        },
      }),
    onSuccess: (data) => {
      setResult(data);
      setQuestions([]);
      setAttemptId(null);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const running = questions.length > 0 && !result;

  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => setSecondsLeft((value) => Math.max(0, value - 1)), 1000);
    return () => clearInterval(timer);
  }, [running]);

  useEffect(() => {
    if (running && secondsLeft === 0 && !submitMutation.isPending) submitMutation.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft, running]);

  const clock = useMemo(() => {
    const m = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
    const s = String(secondsLeft % 60).padStart(2, "0");
    return `${m}:${s}`;
  }, [secondsLeft]);

  return (
    <main className="hero-surface min-h-screen pb-28">
      <div className="mx-auto max-w-md px-6 pt-10">
        {result ? (
          <ResultView result={result} onRetry={() => setResult(null)} />
        ) : running ? (
          <div>
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Question {index + 1} of {questions.length}
              </p>
              <span className="flex items-center gap-1.5 rounded-full bg-accent px-3 py-1 text-sm font-semibold text-primary">
                <Clock className="size-4" />
                {clock}
              </span>
            </div>
            <Progress value={((index + 1) / questions.length) * 100} className="mt-3 h-2" />

            <div className="surface-card mt-5 p-5">
              <p className="text-base font-semibold leading-relaxed">{questions[index].question}</p>
              <div className="mt-4 space-y-2">
                {questions[index].options.map((option, optionIndex) => {
                  const selected = answers[String(index)] === optionIndex;
                  return (
                    <button
                      key={optionIndex}
                      type="button"
                      onClick={() =>
                        setAnswers((current) => ({ ...current, [String(index)]: optionIndex }))
                      }
                      className={cn(
                        "w-full rounded-xl border px-4 py-3 text-left text-sm transition-colors",
                        selected
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-card hover:bg-accent",
                      )}
                    >
                      {option}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-5 flex gap-3">
              <Button
                variant="outline"
                className="flex-1 rounded-xl"
                disabled={index === 0}
                onClick={() => setIndex((value) => value - 1)}
              >
                Previous
              </Button>
              {index === questions.length - 1 ? (
                <Button
                  className="flex-1 rounded-xl"
                  disabled={submitMutation.isPending}
                  onClick={() => submitMutation.mutate()}
                >
                  {submitMutation.isPending ? "Scoring…" : "Submit"}
                </Button>
              ) : (
                <Button className="flex-1 rounded-xl" onClick={() => setIndex((value) => value + 1)}>
                  Next
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div>
            <h1 className="text-2xl font-extrabold">Smart MCQ Challenge</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              30 minutes. AI-generated, exam-standard questions weighted to your weak topics.
            </p>

            <p className="mt-7 text-sm font-semibold text-muted-foreground">Category</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {MCQ_CATEGORIES.map((item) => (
                <Chip key={item} active={category === item} onClick={() => setCategory(item)}>
                  {item}
                </Chip>
              ))}
            </div>

            <p className="mt-6 text-sm font-semibold text-muted-foreground">Difficulty</p>
            <div className="mt-3 grid grid-cols-4 gap-2">
              {(["easy", "medium", "hard", "mixed"] as const).map((item) => (
                <Chip key={item} active={difficulty === item} onClick={() => setDifficulty(item)}>
                  {item}
                </Chip>
              ))}
            </div>

            <p className="mt-6 text-sm font-semibold text-muted-foreground">Questions</p>
            <div className="mt-3 grid grid-cols-4 gap-2">
              {[5, 10, 15, 20].map((item) => (
                <Chip key={item} active={count === item} onClick={() => setCount(item)}>
                  {item}
                </Chip>
              ))}
            </div>

            <Button
              size="lg"
              className="mt-9 h-14 w-full rounded-2xl text-base font-semibold"
              disabled={startMutation.isPending}
              onClick={() => startMutation.mutate()}
            >
              {startMutation.isPending ? "Building your set…" : "Start challenge"}
            </Button>
          </div>
        )}
      </div>
      <BottomNav />
    </main>
  );
}

function ResultView({ result, onRetry }: { result: Result; onRetry: () => void }) {
  return (
    <div>
      <h1 className="text-2xl font-extrabold">Your result</h1>
      <div className="surface-card glow-ring mt-5 p-6 text-center">
        <p className="text-5xl font-extrabold text-primary">
          {result.score}
          <span className="text-2xl text-muted-foreground">/{result.total}</span>
        </p>
        <p className="mt-2 text-sm text-muted-foreground">{result.accuracy}% accuracy</p>
        {result.rankPrediction && (
          <p className="mt-4 text-sm font-medium">{result.rankPrediction}</p>
        )}
      </div>

      {result.advice && (
        <div className="surface-card mt-4 p-4 text-sm text-muted-foreground">{result.advice}</div>
      )}

      {result.weakTopics.length > 0 && (
        <div className="mt-4">
          <p className="text-sm font-semibold text-muted-foreground">Weak topics</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {result.weakTopics.map((topic) => (
              <span
                key={topic}
                className="rounded-full bg-destructive/10 px-3 py-1 text-xs font-medium text-destructive"
              >
                {topic}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6 space-y-3">
        {result.questions.map((question, questionIndex) => {
          const chosen = result.answers[String(questionIndex)] ?? -1;
          const correct = chosen === question.answerIndex;
          return (
            <div key={questionIndex} className="surface-card p-4">
              <p className="text-sm font-semibold">{question.question}</p>
              <p
                className={cn(
                  "mt-2 text-xs font-medium",
                  correct ? "text-success" : "text-destructive",
                )}
              >
                {correct
                  ? `Correct: ${question.options[question.answerIndex]}`
                  : `Your answer: ${chosen >= 0 ? question.options[chosen] : "skipped"} · Correct: ${question.options[question.answerIndex]}`}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">{question.explanation}</p>
            </div>
          );
        })}
      </div>

      <Button className="mt-6 h-12 w-full rounded-2xl font-semibold" onClick={onRetry}>
        New challenge
      </Button>
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-xl border px-2 py-2.5 text-xs font-medium capitalize transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-card hover:bg-accent",
      )}
    >
      {children}
    </button>
  );
}
