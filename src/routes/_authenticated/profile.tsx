import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  BarChart3,
  Bookmark,
  ChevronRight,
  FileText,
  LogOut,
  Settings,
  Trophy,
  Zap,
} from "lucide-react";
import { getDashboard } from "@/lib/prepare.functions";
import { BottomNav } from "@/components/app/bottom-nav";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Profile — Prepare" },
      {
        name: "description",
        content: "Your preparation stats, badges, saved documents and account settings.",
      },
      { property: "og:title", content: "Profile — Prepare" },
      { property: "og:description", content: "Manage your Prepare account and progress." },
    ],
  }),
  component: ProfileScreen,
});

function ProfileScreen() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fetchDashboard = useServerFn(getDashboard);
  const { data } = useQuery({ queryKey: ["dashboard"], queryFn: () => fetchDashboard() });
  const profile = data?.profile;

  const solved = (data?.attempts ?? []).reduce((sum, row) => sum + row.total, 0);
  const hours = Math.round((data?.activity ?? []).reduce((sum, row) => sum + row.minutes, 0) / 60);
  const initials = (profile?.display_name ?? "P")
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <main className="hero-surface min-h-screen pb-28">
      <div className="mx-auto max-w-md px-6 pt-10">
        <div className="surface-card glow-ring p-5">
          <div className="flex items-center gap-4">
            <span className="primary-surface grid size-16 place-items-center rounded-2xl text-xl font-extrabold">
              {initials}
            </span>
            <div className="min-w-0">
              <p className="truncate text-lg font-extrabold">
                {profile?.display_name ?? "Candidate"}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {profile?.target_exam ?? "Set your target exam"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Level: {profile?.level ?? "—"} · {profile?.content_language ?? "English"}
              </p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-3 text-center">
            <Stat label="XP" value={`${profile?.xp ?? 0}`} />
            <Stat label="Solved" value={`${solved}`} />
            <Stat label="Hours" value={`${hours}`} />
          </div>
        </div>

        <h2 className="mt-8 text-sm font-semibold text-muted-foreground">Achievements</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {[
            `${profile?.streak ?? 0}-day streak`,
            `${data?.attempts.length ?? 0} tests`,
            data?.resume ? "Resume created" : "Resume pending",
            data?.plan ? "Study plan active" : "No plan yet",
          ].map((badge) => (
            <span
              key={badge}
              className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium"
            >
              {badge}
            </span>
          ))}
        </div>

        <h2 className="mt-8 text-sm font-semibold text-muted-foreground">Your library</h2>
        <div className="surface-card mt-3 divide-y divide-border">
          <Row to="/analytics" icon={BarChart3} label="Practice analytics" />
          <Row to="/leaderboard" icon={Trophy} label="Leaderboard & ranking" />
          <Row to="/career" icon={FileText} label="Resumes & cover letters" />
          <Row to="/jobs" icon={Bookmark} label="Saved job circulars" />
          <Row to="/roadmap" icon={Zap} label="My study plan" />
          <Row to="/settings" icon={Settings} label="Settings" />
        </div>

        <Button
          variant="outline"
          className="mt-6 h-12 w-full rounded-2xl font-semibold"
          onClick={signOut}
        >
          <LogOut className="mr-2 size-4" /> Sign out
        </Button>
      </div>
      <BottomNav />
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-muted py-3">
      <p className="text-lg font-extrabold">{value}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}

function Row({
  to,
  icon: Icon,
  label,
}: {
  to: string;
  icon: typeof Trophy;
  label: string;
}) {
  return (
    <Link to={to} className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-accent">
      <Icon className="size-4 text-primary" />
      <span className="flex-1 text-sm font-medium">{label}</span>
      <ChevronRight className="size-4 text-muted-foreground" />
    </Link>
  );
}
