import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Activity, Target, Timer, TrendingUp } from "lucide-react";
import { getDashboard } from "@/lib/prepare.functions";
import { BottomNav } from "@/components/app/bottom-nav";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/analytics")({
  head: () => ({
    meta: [
      { title: "Practice Analytics — Prepare" },
      {
        name: "description",
        content: "Accuracy, study minutes, weak subjects and AI insights from your practice history.",
      },
      { property: "og:title", content: "Practice Analytics — Prepare" },
      { property: "og:description", content: "See how your exam preparation is trending." },
    ],
  }),
  component: AnalyticsScreen,
});

function AnalyticsScreen() {
  const fetchDashboard = useServerFn(getDashboard);
  const { data, isLoading } = useQuery({ queryKey: ["dashboard"], queryFn: () => fetchDashboard() });

  const attempts = data?.attempts ?? [];
  const activity = data?.activity ?? [];

  const totalQuestions = attempts.reduce((sum, row) => sum + row.total, 0);
  const totalCorrect = attempts.reduce((sum, row) => sum + row.score, 0);
  const accuracy = totalQuestions ? Math.round((totalCorrect / totalQuestions) * 100) : 0;
  const minutes = activity.reduce((sum, row) => sum + row.minutes, 0);

  const weakTopics = Array.from(
    attempts
      .flatMap((row) => (row.weak_topics as string[] | null) ?? [])
      .reduce((map, topic) => map.set(topic, (map.get(topic) ?? 0) + 1), new Map<string, number>()),
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const last14 = Array.from({ length: 14 }, (_, index) => {
    const date = new Date(Date.now() - (13 - index) * 86400000).toISOString().slice(0, 10);
    return { date, minutes: activity.find((row) => row.activity_date === date)?.minutes ?? 0 };
  });
  const peak = Math.max(30, ...last14.map((day) => day.minutes));

  return (
    <main className="hero-surface min-h-screen pb-28">
      <div className="mx-auto max-w-md px-6 pt-10">
        <h1 className="text-2xl font-extrabold">Practice analytics</h1>
        <p className="mt-1 text-sm text-muted-foreground">Last 30 days of study and test data.</p>

        {isLoading ? (
          <Skeleton className="mt-6 h-40 w-full rounded-3xl" />
        ) : (
          <>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <Metric icon={Target} label="Accuracy" value={`${accuracy}%`} />
              <Metric icon={Activity} label="Tests taken" value={`${attempts.length}`} />
              <Metric icon={Timer} label="Study time" value={`${Math.round(minutes / 60)}h`} />
              <Metric icon={TrendingUp} label="Questions" value={`${totalQuestions}`} />
            </div>

            <section className="surface-card mt-6 p-5">
              <p className="text-sm font-semibold">Daily study minutes</p>
              <div className="mt-5 flex h-32 items-end gap-1.5">
                {last14.map((day) => (
                  <div key={day.date} className="flex-1">
                    <div
                      className="w-full rounded-t-md bg-primary/85"
                      style={{ height: `${Math.max(4, (day.minutes / peak) * 120)}px` }}
                      title={`${day.date}: ${day.minutes} min`}
                    />
                  </div>
                ))}
              </div>
              <p className="mt-3 text-xs text-muted-foreground">Peak {peak} min in a day</p>
            </section>

            <section className="surface-card mt-4 p-5">
              <p className="text-sm font-semibold">Weak subjects</p>
              {weakTopics.length ? (
                <div className="mt-4 space-y-3">
                  {weakTopics.map(([topic, count]) => (
                    <div key={topic}>
                      <div className="flex justify-between text-xs">
                        <span>{topic}</span>
                        <span className="text-muted-foreground">{count}×</span>
                      </div>
                      <Progress
                        value={(count / weakTopics[0]![1]) * 100}
                        className="mt-1.5 h-1.5"
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-xs text-muted-foreground">
                  Finish an MCQ set to see topic-level analysis.
                </p>
              )}
            </section>

            <section className="surface-card mt-4 p-5">
              <p className="text-sm font-semibold">Recent tests</p>
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
        )}
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
