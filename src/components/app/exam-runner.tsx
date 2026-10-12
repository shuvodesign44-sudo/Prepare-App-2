import { useEffect, useMemo, useRef, useState } from "react";
import { Bookmark, BookmarkCheck, Clock, Sparkles } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { addBookmark, explainQuestion } from "@/lib/live.functions";
import type { McqQuestion } from "@/lib/prepare-types";
import { formatCountdown } from "@/lib/exam-catalog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export interface ExamRunnerProps {
  title: string;
  questions: McqQuestion[];
  initialSeconds: number;
  submitting: boolean;
  negativeMarking?: number;
  onSubmit: (answers: Record<string, number>, secondsLeft: number) => void;
  onTabSwitch?: () => void;
  onExpire?: () => void;
  locked?: boolean;
  practiceOnly?: boolean;
  onBookmark?: (question: McqQuestion) => Promise<unknown>;
  savedQuestionIds?: string[];
}

export function ExamRunner({
  title,
  questions,
  initialSeconds,
  submitting,
  negativeMarking,
  onSubmit,
  onTabSwitch,
  onExpire,
  locked = false,
  practiceOnly = false,
  onBookmark,
  savedQuestionIds = [],
}: ExamRunnerProps) {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [secondsLeft, setSecondsLeft] = useState(initialSeconds);
  const endTime = useRef(Date.now() + initialSeconds * 1000);
  const [saved, setSaved] = useState<Record<number, boolean>>({});
  const [saving, setSaving] = useState(false);
  const saveBusy = useRef(false);
  const [hint, setHint] = useState<string | null>(null);

  const save = useServerFn(addBookmark);
  const explain = useServerFn(explainQuestion);

  useEffect(() => {
    const timer = setInterval(
      () => setSecondsLeft(Math.max(0, Math.ceil((endTime.current - Date.now()) / 1000))),
      1000,
    );
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (secondsLeft === 0 && !submitting) {
      if (onExpire) onExpire();
      else onSubmit(answers, 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft]);

  useEffect(() => {
    if (!onTabSwitch) return;
    const handler = () => {
      if (document.visibilityState === "hidden") onTabSwitch();
    };
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, [onTabSwitch]);

  useEffect(() => setHint(null), [index]);

  const current = questions[index];
  const isSaved = saved[index] || (current.id ? savedQuestionIds.includes(current.id) : false);
  const answered = useMemo(() => Object.keys(answers).length, [answers]);
  const danger = secondsLeft <= 60;

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{title}</p>
          <p className="text-xs text-muted-foreground">
            {answered}/{questions.length} answered
            {negativeMarking ? ` · −${negativeMarking} per wrong` : ""}
          </p>
        </div>
        <span
          className={cn(
            "flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-bold tabular-nums",
            danger ? "bg-destructive/10 text-destructive" : "bg-accent text-primary",
          )}
        >
          <Clock className="size-4" />
          {formatCountdown(secondsLeft * 1000)}
        </span>
      </div>

      <Progress value={((index + 1) / questions.length) * 100} className="mt-3 h-2" />

      <div className="mt-4 flex gap-1.5 overflow-x-auto pb-1">
        {questions.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setIndex(i)}
            className={cn(
              "size-7 shrink-0 rounded-lg text-[11px] font-bold transition-colors",
              i === index
                ? "bg-primary text-primary-foreground"
                : answers[String(i)] !== undefined
                  ? "bg-accent text-primary"
                  : "bg-muted text-muted-foreground",
            )}
          >
            {i + 1}
          </button>
        ))}
      </div>

      <div className="surface-card mt-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <p className="text-base font-semibold leading-relaxed">{current.question}</p>
          {(!practiceOnly || onBookmark) && (
            <button
              type="button"
              aria-label={isSaved ? "Question saved" : "Save question"}
              disabled={saving || isSaved}
              aria-pressed={Boolean(isSaved)}
              onClick={async () => {
                if (saveBusy.current) return;
                saveBusy.current = true;
                setSaving(true);
                const savedIndex = index;
                try {
                  if (onBookmark) await onBookmark(current);
                  else
                    await save({
                      data: { question: current as unknown as Record<string, unknown> },
                    });
                  setSaved((s) => ({ ...s, [savedIndex]: true }));
                  toast.success("Saved to your bookmarks");
                } catch (error) {
                  toast.error((error as Error).message);
                } finally {
                  saveBusy.current = false;
                  setSaving(false);
                }
              }}
              className="shrink-0 text-muted-foreground transition-colors hover:text-primary"
            >
              {isSaved ? (
                <BookmarkCheck className="size-5 text-primary" />
              ) : (
                <Bookmark className="size-5" />
              )}
            </button>
          )}
        </div>

        <div className="mt-4 space-y-2">
          {current.options.map((option, optionIndex) => {
            const selected = answers[String(index)] === optionIndex;
            return (
              <button
                key={optionIndex}
                type="button"
                disabled={locked || submitting || secondsLeft === 0}
                onClick={() => setAnswers((value) => ({ ...value, [String(index)]: optionIndex }))}
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

        {!practiceOnly && answers[String(index)] !== undefined && (
          <button
            type="button"
            onClick={async () => {
              setHint("…");
              try {
                const res = await explain({
                  data: {
                    question: current.question,
                    options: current.options,
                    answerIndex: current.answerIndex,
                    language: "English",
                  },
                });
                setHint(res.explanation);
              } catch (error) {
                setHint(null);
                toast.error((error as Error).message);
              }
            }}
            className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-primary"
          >
            <Sparkles className="size-3.5" />
            Ask AI to explain later
          </button>
        )}
        {hint && <p className="mt-2 text-xs text-muted-foreground">{hint}</p>}
      </div>

      {practiceOnly && (
        <p className="mt-3 text-xs text-muted-foreground">
          Submit before time runs out. Answers and explanations appear with your result.
        </p>
      )}
      {locked && !submitting && (
        <p role="status" className="mt-3 text-sm text-muted-foreground">
          Your answers are locked for a safe retry. Use Submit or Finish early to retry the same
          answers.
        </p>
      )}
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
            disabled={submitting}
            onClick={() => onSubmit(answers, secondsLeft)}
          >
            {submitting ? "Scoring…" : "Submit"}
          </Button>
        ) : (
          <Button className="flex-1 rounded-xl" onClick={() => setIndex((value) => value + 1)}>
            Next
          </Button>
        )}
      </div>

      {index !== questions.length - 1 && (
        <Button
          variant="ghost"
          className="mt-2 w-full rounded-xl text-xs"
          disabled={submitting}
          onClick={() => onSubmit(answers, secondsLeft)}
        >
          Finish early
        </Button>
      )}
    </div>
  );
}
