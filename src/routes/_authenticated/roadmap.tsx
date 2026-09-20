import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { buildPlan, getPlan } from "@/lib/prepare.functions";
import type { StudyPlanWeek } from "@/lib/prepare-types";
import { Button } from "@/components/ui/button";
import { BottomNav } from "@/components/app/bottom-nav";

export const Route = createFileRoute("/_authenticated/roadmap")({
  head: () => ({
    meta: [
      { title: "AI Study Roadmap — Prepare" },
      { name: "description", content: "A week-by-week AI study plan built around your exam date." },
      { property: "og:title", content: "AI Study Roadmap — Prepare" },
      { property: "og:description", content: "Personalised week-by-week exam study plan." },
    ],
  }),
  component: RoadmapScreen,
});

function RoadmapScreen() {
  const fetchPlan = useServerFn(getPlan);
  const create = useServerFn(buildPlan);
  const { data, refetch, isLoading } = useQuery({ queryKey: ["plan"], queryFn: () => fetchPlan() });

  const mutation = useMutation({
    mutationFn: () => create(),
    onSuccess: () => {
      toast.success("Your roadmap is ready");
      refetch();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const weeks = (data?.weeks ?? []) as unknown as StudyPlanWeek[];
  const dailyTasks = (data?.daily_tasks ?? []) as unknown as {
    title: string;
    minutes: number;
    subject: string;
  }[];

  return (
    <main className="hero-surface min-h-screen pb-28">
      <div className="mx-auto max-w-md px-6 pt-10">
        <h1 className="text-2xl font-extrabold">AI Study Roadmap</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Built from your exam date, daily time and your weakest topics.
        </p>

        <Button
          className="mt-6 h-12 w-full rounded-2xl font-semibold"
          disabled={mutation.isPending}
          onClick={() => mutation.mutate()}
        >
          {mutation.isPending ? "Planning…" : data ? "Rebuild roadmap" : "Generate my roadmap"}
        </Button>

        {!isLoading && !data && (
          <p className="mt-8 text-center text-sm text-muted-foreground">No roadmap yet.</p>
        )}

        {data?.summary && (
          <div className="surface-card mt-6 p-4 text-sm text-muted-foreground">{data.summary}</div>
        )}

        {dailyTasks.length > 0 && (
          <section className="mt-6">
            <h2 className="text-sm font-semibold text-muted-foreground">Daily routine</h2>
            <div className="surface-card mt-3 divide-y divide-border">
              {dailyTasks.map((task) => (
                <div key={task.title} className="flex justify-between px-4 py-3 text-sm">
                  <span>{task.title}</span>
                  <span className="font-semibold text-primary">{task.minutes}m</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {weeks.length > 0 && (
          <section className="mt-6 space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground">Week by week</h2>
            {weeks.map((week) => (
              <div key={week.week} className="surface-card p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">Week {week.week}</p>
                  <span className="rounded-full bg-accent px-2.5 py-1 text-[11px] font-medium text-primary">
                    {week.focus}
                  </span>
                </div>
                <ul className="mt-3 space-y-1.5">
                  {(week.tasks ?? []).map((task) => (
                    <li key={task} className="text-sm text-muted-foreground">
                      • {task}
                    </li>
                  ))}
                </ul>
                {week.milestone && (
                  <p className="mt-3 text-xs font-medium text-primary">🎯 {week.milestone}</p>
                )}
              </div>
            ))}
          </section>
        )}
      </div>
      <BottomNav />
    </main>
  );
}
