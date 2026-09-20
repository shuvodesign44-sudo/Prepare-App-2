import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ArrowLeft, Crown, ShieldAlert, Users } from "lucide-react";
import { getContestBoard, joinContest, submitContest } from "@/lib/live.functions";
import type { McqQuestion } from "@/lib/prepare-types";
import { supabase } from "@/integrations/supabase/client";
import { ExamRunner } from "@/components/app/exam-runner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/contest/$contestId")({
  head: () => ({
    meta: [
      { title: "Contest Room — Prepare" },
      {
        name: "description",
        content: "Synchronised live contest room with countdown, anti-cheat and real-time rankings.",
      },
      { property: "og:title", content: "Contest Room — Prepare" },
      { property: "og:description", content: "Compete live against other candidates." },
    ],
  }),
  component: ContestRoom,
});

type SubmitResult = Awaited<ReturnType<typeof submitContest>>;

function ContestRoom() {
  const { contestId } = Route.useParams();
  const join = useServerFn(joinContest);
  const send = useServerFn(submitContest);
  const board = useServerFn(getContestBoard);

  const [entered, setEntered] = useState(false);
  const [questions, setQuestions] = useState<McqQuestion[]>([]);
  const [seconds, setSeconds] = useState(0);
  const [tabSwitches, setTabSwitches] = useState(0);
  const [result, setResult] = useState<SubmitResult | null>(null);

  const boardQuery = useQuery({
    queryKey: ["contest-board", contestId],
    queryFn: () => board({ data: { contestId } }),
    refetchInterval: 15000,
  });

  useEffect(() => {
    const channel = supabase
      .channel(`contest-${contestId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "contest_participants", filter: `contest_id=eq.${contestId}` },
        () => boardQuery.refetch(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contestId]);

  const joinMutation = useMutation({
    mutationFn: () => join({ data: { contestId } }),
    onSuccess: (data) => {
      if (data.alreadySubmitted) {
        toast.info("You already submitted this contest.");
        setEntered(false);
        return;
      }
      setQuestions(data.questions);
      setSeconds(data.secondsLeft);
      setEntered(true);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const submitMutation = useMutation({
    mutationFn: (payload: { answers: Record<string, number>; secondsLeft: number }) =>
      send({
        data: {
          contestId,
          answers: payload.answers,
          secondsLeft: payload.secondsLeft,
          tabSwitches,
        },
      }),
    onSuccess: (data) => {
      setResult(data);
      setEntered(false);
      setQuestions([]);
      boardQuery.refetch();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const rows = useMemo(() => boardQuery.data ?? [], [boardQuery.data]);

  return (
    <main className="hero-surface min-h-screen pb-16">
      <div className="mx-auto max-w-md px-6 pt-8">
        <Link to="/live" className="mb-5 inline-flex items-center gap-1.5 text-sm text-muted-foreground">
          <ArrowLeft className="size-4" />
          Back to contests
        </Link>

        {entered && questions.length > 0 ? (
          <>
            {tabSwitches > 0 && (
              <p className="mb-3 flex items-center gap-1.5 rounded-xl bg-destructive/10 px-3 py-2 text-xs font-semibold text-destructive">
                <ShieldAlert className="size-3.5" />
                {tabSwitches} tab switch{tabSwitches > 1 ? "es" : ""} recorded — 5 XP penalty each
              </p>
            )}
            <ExamRunner
              title="Live contest"
              questions={questions}
              initialSeconds={seconds}
              submitting={submitMutation.isPending}
              onSubmit={(answers, secondsLeft) => submitMutation.mutate({ answers, secondsLeft })}
              onTabSwitch={() => setTabSwitches((value) => value + 1)}
            />
          </>
        ) : result ? (
          <div>
            <h1 className="text-2xl font-extrabold">Contest submitted</h1>
            <div className="surface-card glow-ring mt-5 p-6 text-center">
              <p className="text-5xl font-extrabold text-primary">{result.score}</p>
              <p className="mt-2 text-sm text-muted-foreground">
                {result.correct} correct · {result.wrong} wrong · {result.accuracy}% accuracy
              </p>
              <p className="mt-3 text-sm font-semibold">
                Rank #{result.rank ?? "—"} of {result.participants} · +{result.xp} XP
                {result.timeBonus ? ` · ${result.timeBonus} time bonus` : ""}
              </p>
            </div>
          </div>
        ) : (
          <div>
            <h1 className="text-2xl font-extrabold">Contest room</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              The timer is synchronised for everyone. Leaving the tab is recorded.
            </p>
            <Button
              size="lg"
              className="mt-6 h-14 w-full rounded-2xl text-base font-semibold"
              disabled={joinMutation.isPending}
              onClick={() => joinMutation.mutate()}
            >
              {joinMutation.isPending ? "Entering room…" : "Enter contest"}
            </Button>
          </div>
        )}

        {!entered && (
          <section className="mt-8">
            <h2 className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
              <Users className="size-4" />
              Live ranking ({rows.length})
            </h2>
            <div className="surface-card mt-3 divide-y divide-border">
              {rows.length === 0 && (
                <p className="p-4 text-xs text-muted-foreground">No submissions yet.</p>
              )}
              {rows.map((row, index) => (
                <div key={row.user_id} className="flex items-center gap-3 px-4 py-3">
                  <span
                    className={cn(
                      "grid size-8 shrink-0 place-items-center rounded-xl text-xs font-bold",
                      index === 0 ? "gold-surface" : "bg-muted text-muted-foreground",
                    )}
                  >
                    {index === 0 ? <Crown className="size-4" /> : index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{row.display_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {row.correct_count} correct · {row.accuracy}%
                      {row.submitted_at ? "" : " · in progress"}
                    </p>
                  </div>
                  <span className="text-sm font-bold text-primary tabular-nums">{row.score}</span>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
