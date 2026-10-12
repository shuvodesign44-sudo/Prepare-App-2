import { createFileRoute } from "@tanstack/react-router";
import { Activity, Target, Timer, TrendingUp } from "lucide-react";
import { useProgress } from "@/lib/use-progress";
import { studyDays } from "@/lib/progress";
import { Button } from "@/components/ui/button";
import { BottomNav } from "@/components/app/bottom-nav";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/analytics")({
  head: () => ({
    meta: [
      { title: "Practice Analytics — Prepare" },
      {
        name: "description",
        content:
          "Accuracy, study minutes, weak subjects and AI insights from your practice history.",
      },
      { property: "og:title", content: "Practice Analytics — Prepare" },
      { property: "og:description", content: "See how your exam preparation is trending." },
    ],
  }),
  component: AnalyticsScreen,
});

function AnalyticsScreen() {
  const { user } = Route.useRouteContext();
  const { data, isPending: isLoading, error, refetch } = useProgress(user.id);
  const attempts = data?.attempts ?? [];
  const stats = data?.stats;
  const accuracy = stats?.accuracy ?? 0;
  const totalQuestions = stats?.total ?? 0;
  const minutes = (stats?.study_seconds ?? 0) / 60;
  const weakTopics = (stats?.weak_topics ?? [])
    .map((topic) => {
      const row = stats!.topics[topic];
      return [topic, Math.round((row.correct / row.total) * 100)] as const;
    })
    .sort((a, b) => a[1] - b[1]);
  const last14 = studyDays(stats?.daily_study_seconds ?? {});
  const peak = Math.max(0, ...last14.map((day) => day.minutes));

  return (
    <main className="hero-surface min-h-screen pb-28">
      <div className="mx-auto max-w-md px-6 pt-10">
        <h1 className="text-2xl font-extrabold">Practice analytics</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          All-time submitted test totals. Daily study time uses Bangladesh time.
        </p>

        {isLoading ? (
          <Skeleton className="mt-6 h-40 w-full rounded-3xl" />
        ) : error ? (
          <div role="alert" className="surface-card mt-6 p-5 text-sm">
            {error.message}
            <Button className="mt-3" variant="outline" onClick={() => void refetch()}>
              Retry
            </Button>
          </div>
        ) : data ? (
          <>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <Metric icon={Target} label="Accuracy" value={`${accuracy}%`} />
              <Metric icon={Activity} label="Tests taken" value={`${stats!.attempts}`} />
              <Metric icon={Timer} label="Study time" value={`${Math.floor(minutes)} min`} />
              <Metric icon={TrendingUp} label="Questions" value={`${totalQuestions}`} />
            </div>

            <section className="surface-card mt-6 p-5">
              <p className="text-sm font-semibold">Daily study minutes · last 14 days</p>
              <div className="mt-5 flex h-32 items-end gap-1.5">
                {last14.map((day) => (
                  <div key={day.date} className="flex-1">
                    <div
                      className="w-full rounded-t-md bg-primary/85"
                      style={{ height: `${peak ? (day.minutes / peak) * 120 : 0}px` }}
                      title={`${day.date}: ${day.minutes.toFixed(1)} min`}
                    />
                  </div>
                ))}
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                Peak {peak.toFixed(1)} min in a day · elapsed submitted practice time, including
                idle time
              </p>
            </section>

            <section className="surface-card mt-4 p-5">
              <p className="text-sm font-semibold">Weak topics</p>
              {weakTopics.length ? (
                <div className="mt-4 space-y-3">
                  {weakTopics.map(([topic, count]) => (
                    <div key={topic}>
                      <div className="flex justify-between text-xs">
                        <span>{topic}</span>
                        <span className="text-muted-foreground">{count}% correct</span>
                      </div>
                      <Progress value={count} className="mt-1.5 h-1.5" />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-xs text-muted-foreground">
                  {stats?.attempts
                    ? "No topics below 70% accuracy."
                    : "Finish a practice set to see topic-level analysis."}
                </p>
              )}
            </section>

            <section className="surface-card mt-4 p-5">
              <p className="text-sm font-semibold">Recent practice tests · latest 20</p>
              <div className="mt-3 divide-y divide-border">
                {attempts.map((row) => (
                  <div key={row.id} className="flex items-center justify-between py-2.5 text-sm">
                    <span className="text-muted-foreground">{row.category}</span>
                    <span className="font-semibold">
                      {Math.round((row.score / Math.max(1, row.total)) * 100)}%
                    </span>
                  </div>
                ))}
                {!attempts.length && (
                  <p className="py-4 text-xs text-muted-foreground">No tests recorded yet.</p>
                )}
              </div>
            </section>
          </>
        ) : null}
      </div>
      <BottomNav />
    </main>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Target;
  label: string;
  value: string;
}) {
  return (
    <div className="surface-card p-4">
      <Icon className="size-4 text-primary" />
      <p className="mt-3 text-xl font-extrabold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
