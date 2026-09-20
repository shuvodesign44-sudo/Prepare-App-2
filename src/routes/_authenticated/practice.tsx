import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { BarChart3, BookmarkCheck, Radio, Trophy, Zap } from "lucide-react";
import { startPractice } from "@/lib/live.functions";
import { submitChallenge } from "@/lib/prepare.functions";
import { DIFFICULTIES, EXAM_GROUPS, PRACTICE_MODES, SUBJECTS } from "@/lib/exam-catalog";
import type { McqQuestion } from "@/lib/prepare-types";
import { ExamRunner } from "@/components/app/exam-runner";
import { BottomNav } from "@/components/app/bottom-nav";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/practice")({
  head: () => ({
    meta: [
      { title: "Smart Practice — Prepare" },
      {
        name: "description",
        content:
          "Adaptive timed MCQ practice from 10 to 100 questions across 28 Bangladeshi exam categories and 22 subjects.",
      },
      { property: "og:title", content: "Smart Practice — Prepare" },
      { property: "og:description", content: "Adaptive timed MCQ sets that target your weak topics." },
    ],
  }),
  component: PracticeScreen,
});

type Result = Awaited<ReturnType<typeof submitChallenge>>;

function PracticeScreen() {
  const begin = useServerFn(startPractice);
  const finish = useServerFn(submitChallenge);

  const [exam, setExam] = useState<string>(EXAM_GROUPS[0].exams[0]);
  const [subject, setSubject] = useState<string>("Mixed");
  const [difficulty, setDifficulty] = useState<(typeof DIFFICULTIES)[number]>("mixed");
  const [mode, setMode] = useState<(typeof PRACTICE_MODES)[number]>(PRACTICE_MODES[1]);
  const [adaptive, setAdaptive] = useState(true);

  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<McqQuestion[]>([]);
  const [result, setResult] = useState<Result | null>(null);

  const startMutation = useMutation({
    mutationFn: () =>
      begin({
        data: {
          examCategory: exam,
          subject,
          difficulty,
          count: mode.count,
          adaptive,
        },
      }),
    onSuccess: (data) => {
      setAttemptId(data.attemptId);
      setQuestions(data.questions);
      setResult(null);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const submitMutation = useMutation({
    mutationFn: (payload: { answers: Record<string, number>; secondsLeft: number }) =>
      finish({
        data: {
          attemptId: attemptId!,
          answers: payload.answers,
          durationSeconds: Math.max(0, mode.seconds - payload.secondsLeft),
        },
      }),
    onSuccess: (data) => {
      setResult(data);
      setQuestions([]);
      setAttemptId(null);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <main className="hero-surface min-h-screen pb-28">
      <div className="mx-auto max-w-md px-6 pt-10">
        {questions.length > 0 ? (
          <ExamRunner
            title={`${exam} · ${subject}`}
            questions={questions}
            initialSeconds={mode.seconds}
            submitting={submitMutation.isPending}
            onSubmit={(answers, secondsLeft) => submitMutation.mutate({ answers, secondsLeft })}
          />
        ) : result ? (
          <PracticeResult result={result} onRetry={() => setResult(null)} />
        ) : (
          <div>
            <h1 className="text-2xl font-extrabold">Smart Practice</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Questions come from the shared bank and adapt to your weak topics.
            </p>

            <p className="mt-7 text-sm font-semibold text-muted-foreground">Practice mode</p>
            <div className="mt-3 space-y-2">
              {PRACTICE_MODES.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setMode(item)}
                  className={cn(
                    "flex w-full items-center gap-4 rounded-2xl border px-4 py-3 text-left transition-colors",
                    mode.id === item.id ? "border-primary bg-accent" : "border-border bg-card",
                  )}
                >
                  <span className="grid size-10 place-items-center rounded-xl bg-accent text-primary">
                    <Zap className="size-4" />
                  </span>
                  <span className="flex-1">
                    <span className="block text-sm font-semibold">{item.label}</span>
                    <span className="block text-xs text-muted-foreground">{item.hint}</span>
                  </span>
                  <span className="text-xs font-semibold text-primary">{item.seconds / 60} min</span>
                </button>
              ))}
            </div>

            <p className="mt-6 text-sm font-semibold text-muted-foreground">Exam</p>
            <div className="mt-3 space-y-4">
              {EXAM_GROUPS.map((group) => (
                <div key={group.group}>
                  <p className="text-xs font-semibold text-muted-foreground">{group.group}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {group.exams.map((item) => (
                      <Chip key={item} active={exam === item} onClick={() => setExam(item)}>
                        {item}
                      </Chip>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <p className="mt-6 text-sm font-semibold text-muted-foreground">Subject</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {SUBJECTS.map((item) => (
                <Chip key={item} active={subject === item} onClick={() => setSubject(item)}>
                  {item}
                </Chip>
              ))}
            </div>

            <p className="mt-6 text-sm font-semibold text-muted-foreground">Difficulty</p>
            <div className="mt-3 grid grid-cols-4 gap-2">
              {DIFFICULTIES.map((item) => (
                <Chip key={item} active={difficulty === item} onClick={() => setDifficulty(item)}>
                  {item}
                </Chip>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setAdaptive((value) => !value)}
              className="surface-card mt-6 flex w-full items-center gap-3 p-4 text-left"
            >
              <span className="flex-1">
                <span className="block text-sm font-semibold">Adaptive weak-topic weighting</span>
                <span className="block text-xs text-muted-foreground">
                  Pull more questions from topics you keep missing
                </span>
              </span>
              <span
                className={cn(
                  "h-6 w-11 shrink-0 rounded-full p-0.5 transition-colors",
                  adaptive ? "bg-primary" : "bg-muted",
                )}
              >
                <span
                  className={cn(
                    "block size-5 rounded-full bg-card transition-transform",
                    adaptive && "translate-x-5",
                  )}
                />
              </span>
            </button>

            <Button
              size="lg"
              className="mt-7 h-14 w-full rounded-2xl text-base font-semibold"
              disabled={startMutation.isPending}
              onClick={() => startMutation.mutate()}
            >
              {startMutation.isPending ? "Building your set…" : `Start ${mode.count} questions`}
            </Button>

            <div className="mt-8 grid grid-cols-2 gap-3">
              <Link to="/live" className="surface-card p-4 transition-colors hover:bg-accent">
                <span className="grid size-9 place-items-center rounded-xl bg-accent text-primary">
                  <Radio className="size-4" />
                </span>
                <p className="mt-3 text-sm font-semibold">Live contests</p>
                <p className="mt-1 text-xs text-muted-foreground">Compete in real time</p>
              </Link>
              <Link to="/bookmarks" className="surface-card p-4 transition-colors hover:bg-accent">
                <span className="grid size-9 place-items-center rounded-xl bg-accent text-primary">
                  <BookmarkCheck className="size-4" />
                </span>
                <p className="mt-3 text-sm font-semibold">Saved questions</p>
                <p className="mt-1 text-xs text-muted-foreground">Revise your bookmarks</p>
              </Link>
              <Link to="/analytics" className="surface-card p-4 transition-colors hover:bg-accent">
                <span className="grid size-9 place-items-center rounded-xl bg-accent text-primary">
                  <BarChart3 className="size-4" />
                </span>
                <p className="mt-3 text-sm font-semibold">Analytics</p>
                <p className="mt-1 text-xs text-muted-foreground">Accuracy & weak topics</p>
              </Link>
              <Link to="/leaderboard" className="surface-card p-4 transition-colors hover:bg-accent">
                <span className="gold-surface grid size-9 place-items-center rounded-xl">
                  <Trophy className="size-4" />
                </span>
                <p className="mt-3 text-sm font-semibold">Leaderboard</p>
                <p className="mt-1 text-xs text-muted-foreground">Daily to all-time XP</p>
              </Link>
            </div>
          </div>
        )}
      </div>
      <BottomNav />
    </main>
  );
}

function PracticeResult({ result, onRetry }: { result: Result; onRetry: () => void }) {
  return (
    <div>
      <h1 className="text-2xl font-extrabold">Your result</h1>
      <div className="surface-card glow-ring mt-5 p-6 text-center">
        <p className="text-5xl font-extrabold text-primary">
          {result.score}
          <span className="text-2xl text-muted-foreground">/{result.total}</span>
        </p>
        <p className="mt-2 text-sm text-muted-foreground">{result.accuracy}% accuracy</p>
        {result.rankPrediction && <p className="mt-4 text-sm font-medium">{result.rankPrediction}</p>}
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
        New practice set
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
        "rounded-full border px-3 py-2 text-xs font-medium capitalize transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-card hover:bg-accent",
      )}
    >
      {children}
    </button>
  );
}
