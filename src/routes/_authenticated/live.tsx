import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Radio, Timer, Trophy, Users } from "lucide-react";
import { listContests } from "@/lib/live.functions";
import { contestPhase, formatCountdown } from "@/lib/exam-catalog";
import { BottomNav } from "@/components/app/bottom-nav";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/live")({
  head: () => ({
    meta: [
      { title: "Live Contests — Prepare" },
      {
        name: "description",
        content:
          "Daily, weekly and monthly live exam contests with synchronised timers and real-time rankings.",
      },
      { property: "og:title", content: "Live Contests — Prepare" },
      { property: "og:description", content: "Compete live and climb the real-time leaderboard." },
    ],
  }),
  component: LiveScreen,
});

function LiveScreen() {
  const fetchContests = useServerFn(listContests);
  const { data, isLoading } = useQuery({
    queryKey: ["contests"],
    queryFn: () => fetchContests(),
    refetchInterval: 30000,
  });

  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const contests = data ?? [];
  const live = contests.filter((c) => contestPhase(c) === "live");
  const upcoming = contests.filter((c) => contestPhase(c) === "upcoming");
  const ended = contests.filter((c) => contestPhase(c) === "ended");

  return (
    <main className="hero-surface min-h-screen pb-28">
      <div className="mx-auto max-w-md px-6 pt-10">
        <h1 className="text-2xl font-extrabold">Live contests</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Synchronised start, negative marking, time bonus and real-time rankings.
        </p>

        {isLoading && <p className="mt-8 text-sm text-muted-foreground">Loading contests…</p>}

        {!isLoading && contests.length === 0 && (
          <div className="surface-card mt-8 p-6 text-center">
            <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-accent text-primary">
              <Radio className="size-5" />
            </span>
            <p className="mt-4 text-sm font-semibold">No contests scheduled yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              New daily and weekly contests appear here as soon as they are published.
            </p>
          </div>
        )}

        <Section title="Live now" rows={live} now={now} tone="live" />
        <Section title="Upcoming" rows={upcoming} now={now} tone="upcoming" />
        <Section title="Finished" rows={ended} now={now} tone="ended" />
      </div>
      <BottomNav />
    </main>
  );
}

type Row = Awaited<ReturnType<typeof listContests>>[number];

function Section({
  title,
  rows,
  now,
  tone,
}: {
  title: string;
  rows: Row[];
  now: number;
  tone: "live" | "upcoming" | "ended";
}) {
  if (!rows.length) return null;
  return (
    <section className="mt-7">
      <h2 className="text-sm font-semibold text-muted-foreground">{title}</h2>
      <div className="mt-3 space-y-3">
        {rows.map((contest) => {
          const start = new Date(contest.starts_at).getTime();
          const end = start + contest.duration_seconds * 1000;
          return (
            <Link
              key={contest.id}
              to="/contest/$contestId"
              params={{ contestId: contest.id }}
              className="surface-card block p-4 transition-colors hover:bg-accent"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold">{contest.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {contest.contest_type} · {contest.exam_category}
                  </p>
                </div>
                <span
                  className={cn(
                    "shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase",
                    tone === "live"
                      ? "bg-destructive/10 text-destructive"
                      : tone === "upcoming"
                        ? "bg-accent text-primary"
                        : "bg-muted text-muted-foreground",
                  )}
                >
                  {tone === "live" ? "Live" : tone === "upcoming" ? "Soon" : "Ended"}
                </span>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Timer className="size-3.5" />
                  {contest.question_count} Q · {contest.duration_seconds / 60} min
                </span>
                <span className="flex items-center gap-1">
                  <Users className="size-3.5" />
                  {contest.participants} joined
                </span>
                {contest.prize && (
                  <span className="flex items-center gap-1 text-primary">
                    <Trophy className="size-3.5" />
                    {contest.prize}
                  </span>
                )}
              </div>

              {tone !== "ended" && (
                <p className="mt-3 text-xs font-semibold text-primary tabular-nums">
                  {tone === "live"
                    ? `Ends in ${formatCountdown(end - now)}`
                    : `Starts in ${formatCountdown(start - now)}`}
                </p>
              )}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
