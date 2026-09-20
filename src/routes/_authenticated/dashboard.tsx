import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowRight,
  CalendarRange,
  FileText,
  Flame,
  ListChecks,
  LogOut,
  Mic,
  Zap,
} from "lucide-react";
import { getDashboard } from "@/lib/prepare.functions";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { BottomNav } from "@/components/app/bottom-nav";
import { BrandLock } from "@/components/app/brand";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Prepare" },
      { name: "description", content: "Your streak, XP, exam countdown and today's AI tasks." },
      { property: "og:title", content: "Dashboard — Prepare" },
      { property: "og:description", content: "Track your exam preparation progress." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fetchDashboard = useServerFn(getDashboard);

  const { data, isLoading } = useQuery({ queryKey: ["dashboard"], queryFn: () => fetchDashboard() });
  const profile = data?.profile;

  useEffect(() => {
    if (data && !profile?.onboarded) navigate({ to: "/onboarding" });
  }, [data, profile, navigate]);

  const today = new Date().toISOString().slice(0, 10);
  const todayActivity = data?.activity.find((row) => row.activity_date === today);
  const target = profile?.daily_minutes ?? 60;
  const done = todayActivity?.minutes ?? 0;
  const pct = Math.min(100, Math.round((done / target) * 100));
  const daysLeft = profile?.exam_date
    ? Math.max(0, Math.ceil((new Date(profile.exam_date).getTime() - Date.now()) / 86400000))
    : null;

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <main className="hero-surface min-h-screen pb-32">
      <div className="mx-auto max-w-md px-5 pt-10">
        <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
          <div className="min-w-0">
            <BrandLock />
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={signOut}
            aria-label="Sign out"
            className="shrink-0 rounded-full"
          >
            <LogOut className="size-5" />
          </Button>
        </header>

        <div className="mt-8">
          <h1 className="truncate text-[1.7rem] font-bold leading-tight">
            {isLoading ? "Loading…" : `Hi, ${profile?.display_name ?? "candidate"}`}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Target:{" "}
            <span className="font-medium text-primary">
              {profile?.target_exam ?? "set your exam"}
            </span>
            {daysLeft !== null ? ` · ${daysLeft} days left` : ""}
          </p>
        </div>

        {isLoading ? (
          <Skeleton className="mt-6 h-52 w-full rounded-[2rem]" />
        ) : (
          <section className="hero-tile relative mt-6 overflow-hidden p-6">
            <div
              aria-hidden
              className="pointer-events-none absolute -right-10 -top-12 size-40 rounded-full bg-primary-foreground/15 blur-2xl"
            />
            <div className="relative">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium opacity-80">Today&apos;s study goal</p>
                  <p className="mt-1 text-3xl font-bold">
                    {done}
                    <span className="text-lg font-normal opacity-80">/{target} mins</span>
                  </p>
                </div>
                <span className="grid size-14 shrink-0 place-items-center rounded-full border-4 border-primary-foreground/25 text-xs font-bold">
                  {pct}%
                </span>
              </div>
              <div className="mt-5 h-2 w-full overflow-hidden rounded-full bg-primary-foreground/25">
                <div
                  className="h-full rounded-full bg-primary-foreground transition-all duration-700"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <Button
                asChild
                size="lg"
                variant="secondary"
                className="mt-6 h-12 w-full rounded-2xl bg-card font-bold text-primary hover:bg-card/90"
              >
                <Link to="/mcq">Start MCQ challenge</Link>
              </Button>
            </div>
          </section>
        )}

        <div className="mt-4 grid grid-cols-3 gap-3">
          <Stat icon={Flame} label="Streak" value={`${profile?.streak ?? 0}d`} tone="gold" />
          <Stat icon={Zap} label="XP points" value={`${profile?.xp ?? 0}`} tone="primary" />
          <Stat icon={ListChecks} label="Tests" value={`${data?.attempts.length ?? 0}`} tone="success" />
        </div>

        <section className="mt-6 grid grid-cols-2 gap-3">
          <Tile to="/mcq" icon={ListChecks} title="MCQ Challenge" body="Timed exam-standard sets" />
          <Tile to="/viva" icon={Mic} title="AI Viva" body="Simulated board interview" ai />
          <Tile to="/career" icon={FileText} title="Resume & Letters" body="ATS-ready documents" ai />
          <Tile to="/roadmap" icon={CalendarRange} title="Study Plan" body="Week-by-week roadmap" />
        </section>

        <section className="mt-8">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-bold">Recent activity</h2>
            <Link to="/analytics" className="text-xs font-semibold text-primary">
              See all
            </Link>
          </div>
          <div className="space-y-2.5">
            {(data?.attempts ?? []).slice(0, 5).map((row) => {
              const scorePct = row.total ? Math.round((row.score / row.total) * 100) : 0;
              return (
                <div key={row.id} className="bento-tile flex items-center gap-3.5 px-4 py-3">
                  <span
                    className={cn(
                      "grid size-10 shrink-0 place-items-center rounded-full text-xs font-bold",
                      scorePct >= 70
                        ? "bg-success/15 text-success"
                        : scorePct >= 50
                          ? "bg-gold/20 text-gold-foreground"
                          : "bg-destructive/10 text-destructive",
                    )}
                  >
                    {scorePct}%
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{row.category}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {row.score}/{row.total} correct
                    </p>
                  </div>
                  <ArrowRight className="size-4 shrink-0 text-muted-foreground/60" />
                </div>
              );
            })}
            {!isLoading && !data?.attempts.length && (
              <div className="bento-tile px-4 py-8 text-center text-sm text-muted-foreground">
                No tests yet — start your first challenge.
              </div>
            )}
          </div>
        </section>
      </div>
      <BottomNav />
    </main>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Flame;
  label: string;
  value: string;
  tone: "gold" | "primary" | "success";
}) {
  return (
    <div className="bento-tile flex flex-col items-center px-2 py-3.5">
      <Icon
        className={cn(
          "size-[18px]",
          tone === "gold" ? "text-gold" : tone === "success" ? "text-success" : "text-primary",
        )}
      />
      <p className="mt-2 text-lg font-bold leading-none">{value}</p>
      <p className="mt-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
    </div>
  );
}

function Tile({
  to,
  icon: Icon,
  title,
  body,
  ai,
}: {
  to: string;
  icon: typeof Flame;
  title: string;
  body: string;
  ai?: boolean;
}) {
  return (
    <Link to={to} className="bento-tile bento-tile-press p-4 hover:border-primary/30">
      <span
        className={cn(
          "grid size-10 place-items-center rounded-2xl",
          ai ? "ai-surface" : "bg-accent text-primary",
        )}
      >
        <Icon className="size-[18px]" />
      </span>
      <p className="mt-3 text-sm font-bold leading-tight">{title}</p>
      <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{body}</p>
    </Link>
  );
}
