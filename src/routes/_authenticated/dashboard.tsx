import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
import { loadProfile, profileKey, backendRetry, signOutBackend } from "@/lib/backend";
import { useProgress } from "@/lib/use-progress";
import { dhakaDate } from "@/lib/progress";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { BottomNav } from "@/components/app/bottom-nav";
import { BrandLock } from "@/components/app/brand";
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
  const { user } = Route.useRouteContext();
  const account = useQuery({
    queryKey: profileKey(user.id),
    queryFn: ({ signal }) => loadProfile(signal),
    retry: backendRetry,
  });
  const progress = useProgress(user.id);
  const data = progress.data;
  const profile = account.data;
  const isLoading = account.isPending || progress.isPending;
  const error = account.error || progress.error;
  const [signingOut, setSigningOut] = useState(false);
  const target = profile?.daily_minutes ?? 60;
  const done = Math.floor((data?.stats.daily_study_seconds[dhakaDate()] ?? 0) / 60);
  const pct = Math.min(100, Math.round((done / target) * 100));
  const daysLeft = profile?.exam_date
    ? Math.max(0, Math.ceil((new Date(profile.exam_date).getTime() - Date.now()) / 86400000))
    : null;

  async function signOut() {
    setSigningOut(true);
    try {
      await signOutBackend();
      await queryClient.cancelQueries();
      queryClient.clear();
      await navigate({ to: "/auth", replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Sign-out failed. Please retry.");
    } finally {
      setSigningOut(false);
    }
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
            disabled={signingOut}
            aria-label="Sign out"
            className="shrink-0 rounded-full"
          >
            <LogOut className="size-5" />
          </Button>
        </header>

        <div className="mt-8">
          <h1 className="truncate text-[1.7rem] font-bold leading-tight">
            {isLoading ? "Loading…" : `Hi, ${profile?.display_name || "candidate"}`}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Target:{" "}
            <span className="font-medium text-primary">
              {profile?.target_exam || "set your exam"}
            </span>
            {daysLeft !== null ? ` · ${daysLeft} days left` : ""}
          </p>
        </div>

        {error && (
          <div role="alert" className="surface-card mt-4 p-4 text-sm">
            {error.message}
            <Button
              variant="outline"
              className="ml-3"
              onClick={() => {
                void account.refetch();
                void progress.refetch();
              }}
            >
              Retry
            </Button>
          </div>
        )}
        {!account.isPending && !profile?.target_exam && (
          <Link
            to="/onboarding"
            search={{ backendProfile: true }}
            className="mt-3 block text-sm text-primary"
          >
            Set your exam and daily goal
          </Link>
        )}
        {isLoading ? (
          <Skeleton className="mt-6 h-52 w-full rounded-[2rem]" />
        ) : !error && data ? (
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
                <Link to="/practice">Start MCQ challenge</Link>
              </Button>
            </div>
          </section>
        ) : null}

        <div className="mt-4 grid grid-cols-3 gap-3">
          <Stat
            icon={Flame}
            label="Streak"
            value={isLoading || error ? "—" : `${data?.stats.streak ?? 0}d`}
            tone="gold"
          />
          <Stat
            icon={Zap}
            label="XP points"
            value={isLoading || error ? "—" : `${data?.stats.xp ?? 0}`}
            tone="primary"
          />
          <Stat
            icon={ListChecks}
            label="Tests"
            value={isLoading || error ? "—" : `${data?.stats.attempts ?? 0}`}
            tone="success"
          />
        </div>

        <section className="mt-6 grid grid-cols-2 gap-3">
          <Tile
            to="/practice"
            icon={ListChecks}
            title="MCQ Challenge"
            body="Timed exam-standard sets"
          />
          <Tile to="/viva" icon={Mic} title="AI Viva" body="Simulated board interview" ai />
          <Tile
            to="/career"
            icon={FileText}
            title="Resume & Letters"
            body="ATS-ready documents"
            ai
          />
          <Tile to="/roadmap" icon={CalendarRange} title="Study Plan" body="Week-by-week roadmap" />
        </section>

        <p className="mt-3 text-xs text-muted-foreground">
          Progress from submitted backend tests. Study time includes elapsed time between starting
          and submitting.
        </p>
        <section className="mt-8">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-bold">Recent activity</h2>
            <Link to="/analytics" className="text-xs font-semibold text-primary">
              See all
            </Link>
          </div>
          <div className="space-y-2.5">
            {(error ? [] : (data?.attempts ?? [])).slice(0, 5).map((row) => {
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
            {!isLoading && !error && !data?.attempts.length && (
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
