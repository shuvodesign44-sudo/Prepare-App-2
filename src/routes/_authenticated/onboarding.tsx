import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { saveOnboarding } from "@/lib/prepare.functions";
import { TARGET_EXAMS } from "@/lib/prepare-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({
    meta: [
      { title: "Set up your plan — Prepare" },
      { name: "description", content: "Choose your target exam, level and daily study time." },
      { property: "og:title", content: "Set up your plan — Prepare" },
      { property: "og:description", content: "Choose your target exam, level and study time." },
    ],
  }),
  component: Onboarding,
});

const levels = ["Beginner", "Intermediate", "Advanced"];
const minutes = [30, 60, 90, 120, 180, 240];

function Onboarding() {
  const navigate = useNavigate();
  const save = useServerFn(saveOnboarding);
  const [name, setName] = useState("");
  const [exam, setExam] = useState<string>(TARGET_EXAMS[0]);
  const [level, setLevel] = useState("Beginner");
  const [daily, setDaily] = useState(60);
  const [language, setLanguage] = useState<"English" | "Bangla">("English");
  const [examDate, setExamDate] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const meta = data.user?.user_metadata as { full_name?: string } | undefined;
      setName((current) => current || meta?.full_name || data.user?.email?.split("@")[0] || "");
    });
  }, []);

  const mutation = useMutation({
    mutationFn: () =>
      save({
        data: {
          displayName: name.trim() || "Candidate",
          targetExam: exam,
          level,
          dailyMinutes: daily,
          contentLanguage: language,
          examDate: examDate || null,
        },
      }),
    onSuccess: () => navigate({ to: "/dashboard" }),
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <main className="hero-surface min-h-screen">
      <div className="mx-auto max-w-md px-6 py-12">
        <h1 className="text-3xl font-extrabold">Let's build your plan</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          A few answers and your first challenge is ready.
        </p>

        <div className="mt-8 space-y-8">
          <div className="space-y-2">
            <Label htmlFor="name">Your name</Label>
            <Input
              id="name"
              value={name}
              maxLength={60}
              onChange={(event) => setName(event.target.value)}
              className="h-12 rounded-xl"
            />
          </div>

          <Section title="Target exam">
            <div className="grid grid-cols-2 gap-2">
              {TARGET_EXAMS.map((item) => (
                <Chip key={item} active={exam === item} onClick={() => setExam(item)}>
                  {item}
                </Chip>
              ))}
            </div>
          </Section>

          <Section title="Current level">
            <div className="grid grid-cols-3 gap-2">
              {levels.map((item) => (
                <Chip key={item} active={level === item} onClick={() => setLevel(item)}>
                  {item}
                </Chip>
              ))}
            </div>
          </Section>

          <Section title="Study minutes per day">
            <div className="grid grid-cols-3 gap-2">
              {minutes.map((item) => (
                <Chip key={item} active={daily === item} onClick={() => setDaily(item)}>
                  {item} min
                </Chip>
              ))}
            </div>
          </Section>

          <Section title="Question language">
            <div className="grid grid-cols-2 gap-2">
              {(["English", "Bangla"] as const).map((item) => (
                <Chip key={item} active={language === item} onClick={() => setLanguage(item)}>
                  {item}
                </Chip>
              ))}
            </div>
          </Section>

          <div className="space-y-2">
            <Label htmlFor="exam-date">Exam date (optional)</Label>
            <Input
              id="exam-date"
              type="date"
              value={examDate}
              onChange={(event) => setExamDate(event.target.value)}
              className="h-12 rounded-xl"
            />
          </div>
        </div>

        <Button
          size="lg"
          className="mt-10 h-14 w-full rounded-2xl text-base font-semibold"
          disabled={mutation.isPending}
          onClick={() => mutation.mutate()}
        >
          {mutation.isPending ? "Saving…" : "Start preparing"}
        </Button>
      </div>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold text-muted-foreground">{title}</p>
      {children}
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-xl border px-3 py-3 text-sm font-medium transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-card text-foreground hover:bg-accent",
      )}
    >
      {children}
    </button>
  );
}
