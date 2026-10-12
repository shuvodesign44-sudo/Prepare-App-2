import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  loadProfile,
  saveProfile,
  loadPreferences,
  savePreferences,
  profileKey,
  settingsKey,
  backendRetry,
} from "@/lib/backend";
import type { Preferences } from "@/lib/backend";
import { ChevronRight, Moon, Languages, Bell, ShieldCheck } from "lucide-react";
import { BottomNav } from "@/components/app/bottom-nav";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Prepare" },
      {
        name: "description",
        content: "Theme, language, notifications, privacy and account controls for Prepare.",
      },
      { property: "og:title", content: "Settings — Prepare" },
      { property: "og:description", content: "Control your Prepare app preferences." },
    ],
  }),
  component: SettingsScreen,
});

function SettingsScreen() {
  const [dark, setDark] = useState(false);
  const { user } = Route.useRouteContext();
  const queryClient = useQueryClient();
  const profile = useQuery({
    queryKey: profileKey(user.id),
    queryFn: ({ signal }) => loadProfile(signal),
    retry: backendRetry,
  });
  const preferences = useQuery({
    queryKey: settingsKey(user.id),
    queryFn: ({ signal }) => loadPreferences(signal),
    retry: backendRetry,
  });
  const language = profile.data?.language === "bn" ? "Bangla" : "English";
  const reminders = preferences.data?.study_reminders ?? false;
  const jobAlerts = preferences.data?.job_alerts ?? false;
  const languageMutation = useMutation({
    mutationFn: async (next: "English" | "Bangla") => {
      if (!profile.data) throw new Error("Load your profile before editing.");
      return saveProfile({ ...profile.data, language: next === "Bangla" ? "bn" : "en" });
    },
    onSuccess: (next) => queryClient.setQueryData(profileKey(user.id), next),
    onError: (error: Error) => toast.error(error.message),
  });
  const preferenceMutation = useMutation({
    mutationFn: async (change: Partial<Preferences>) => {
      if (!preferences.data) throw new Error("Load settings before editing.");
      return savePreferences({ ...preferences.data, ...change });
    },
    onSuccess: (next) => queryClient.setQueryData(settingsKey(user.id), next),
    onError: (error: Error) => toast.error(error.message),
  });

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggleTheme(next: boolean) {
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
  }

  return (
    <main className="hero-surface min-h-screen pb-28">
      <div className="mx-auto max-w-md px-6 pt-10">
        <h1 className="text-2xl font-extrabold">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Personalise how Prepare works for you.</p>

        {(profile.isPending || preferences.isPending) && (
          <p role="status" className="mt-4 text-sm text-muted-foreground">
            Loading settings…
          </p>
        )}
        {(profile.error || preferences.error) && (
          <div role="alert" className="mt-4 text-sm">
            <p>{profile.error?.message || preferences.error?.message}</p>
            <button
              className="mt-2 text-primary underline"
              onClick={() => {
                void profile.refetch();
                void preferences.refetch();
              }}
            >
              Retry
            </button>
          </div>
        )}
        {(languageMutation.isPending || preferenceMutation.isPending) && (
          <p role="status" className="mt-4 text-sm text-muted-foreground">
            Saving…
          </p>
        )}
        <section className="surface-card mt-6 divide-y divide-border">
          <div className="flex items-center gap-3 px-4 py-4">
            <Moon className="size-4 text-primary" />
            <span className="flex-1 text-sm font-medium">Dark mode</span>
            <Switch checked={dark} onCheckedChange={toggleTheme} aria-label="Toggle dark mode" />
          </div>
          <div className="px-4 py-4">
            <div className="flex items-center gap-3">
              <Languages className="size-4 text-primary" />
              <span className="flex-1 text-sm font-medium">Content language</span>
            </div>
            <div className="mt-3 flex gap-2">
              {(["English", "Bangla"] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  disabled={!profile.data || Boolean(profile.error) || languageMutation.isPending}
                  onClick={() => languageMutation.mutate(item)}
                  className={cn(
                    "flex-1 rounded-2xl border px-3 py-2.5 text-xs font-semibold transition-colors",
                    item === "Bangla" && "bangla",
                    language === item
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card text-muted-foreground",
                  )}
                >
                  {item === "Bangla" ? "বাংলা" : "English"}
                </button>
              ))}
            </div>
          </div>
        </section>

        <h2 className="mt-8 text-sm font-semibold text-muted-foreground">Notifications</h2>
        <section className="surface-card mt-3 divide-y divide-border">
          <div className="flex items-center gap-3 px-4 py-4">
            <Bell className="size-4 text-primary" />
            <span className="flex-1 text-sm font-medium">Daily study reminder</span>
            <Switch
              checked={reminders}
              disabled={
                !preferences.data || Boolean(preferences.error) || preferenceMutation.isPending
              }
              onCheckedChange={(next) => preferenceMutation.mutate({ study_reminders: next })}
              aria-label="Toggle study reminders"
            />
          </div>
          <div className="flex items-center gap-3 px-4 py-4">
            <Bell className="size-4 text-primary" />
            <span className="flex-1 text-sm font-medium">New job circular alerts</span>
            <Switch
              checked={jobAlerts}
              disabled={
                !preferences.data || Boolean(preferences.error) || preferenceMutation.isPending
              }
              onCheckedChange={(next) => preferenceMutation.mutate({ job_alerts: next })}
              aria-label="Toggle job alerts"
            />
          </div>
        </section>

        <h2 className="mt-8 text-sm font-semibold text-muted-foreground">Account</h2>
        <section className="surface-card mt-3 divide-y divide-border">
          <Link
            to="/onboarding"
            search={{ backendProfile: true }}
            className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-accent"
          >
            <ShieldCheck className="size-4 text-primary" />
            <span className="flex-1 text-sm font-medium">Exam target & study time</span>
            <ChevronRight className="size-4 text-muted-foreground" />
          </Link>
          <Link
            to="/profile"
            className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-accent"
          >
            <ShieldCheck className="size-4 text-primary" />
            <span className="flex-1 text-sm font-medium">Profile & sign out</span>
            <ChevronRight className="size-4 text-muted-foreground" />
          </Link>
        </section>

        <p className="mt-8 text-center text-xs text-muted-foreground">
          Prepare · Prepare today, succeed tomorrow
        </p>
      </div>
      <BottomNav />
    </main>
  );
}
