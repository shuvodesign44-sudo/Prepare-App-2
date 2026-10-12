import { createFileRoute, Link } from "@tanstack/react-router";
import { FileText, Mic, PenLine, Sparkles, UserCheck } from "lucide-react";
import { BottomNav } from "@/components/app/bottom-nav";

export const Route = createFileRoute("/_authenticated/ai")({
  head: () => ({
    meta: [
      { title: "AI Coach — Prepare" },
      {
        name: "description",
        content:
          "AI viva test, mock interview, career assistant and document writing in one place.",
      },
      { property: "og:title", content: "AI Coach — Prepare" },
      { property: "og:description", content: "Practise speaking and get AI career guidance." },
    ],
  }),
  component: AiHub,
});

const TOOLS = [
  {
    to: "/tutor",
    icon: Sparkles,
    title: "AI Tutor",
    body: "Ask study questions in English or Bangla.",
  },
  {
    to: "/viva",
    icon: Mic,
    title: "AI Viva Test",
    body: "Typed-answer feedback on relevance and content.",
  },
  {
    to: "/viva",
    icon: UserCheck,
    title: "AI Mock Interview",
    body: "Practise interview answers and follow-up questions.",
  },
  {
    to: "/career",
    icon: FileText,
    title: "Resume Builder",
    body: "ATS, government and corporate templates written with AI.",
  },
  {
    to: "/career",
    icon: PenLine,
    title: "Cover Letter",
    body: "Tailored letters for any circular in seconds.",
  },
] as const;

function AiHub() {
  return (
    <main className="hero-surface min-h-screen pb-28">
      <div className="mx-auto max-w-md px-6 pt-10">
        <span className="ai-surface inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold">
          <Sparkles className="size-3.5" /> AI powered
        </span>
        <h1 className="mt-4 text-2xl font-extrabold">Your AI coach</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Speaking practice, interview simulation and career documents.
        </p>

        <div className="mt-6 space-y-3">
          {TOOLS.map(({ to, icon: Icon, title, body }) => (
            <Link
              key={title}
              to={to}
              className="surface-card flex items-start gap-4 p-4 transition-colors hover:bg-accent"
            >
              <span className="ai-surface grid size-11 shrink-0 place-items-center rounded-xl">
                <Icon className="size-5" />
              </span>
              <div>
                <p className="text-sm font-semibold">{title}</p>
                <p className="mt-1 text-xs text-muted-foreground">{body}</p>
              </div>
            </Link>
          ))}
        </div>

        <div className="surface-card glow-ring mt-6 p-5">
          <p className="text-sm font-semibold">Career assistant</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Ask anything about exams, eligibility, skills or study strategy — your plan updates with
            the answers.
          </p>
          <Link
            to="/roadmap"
            className="mt-4 inline-flex h-11 w-full items-center justify-center rounded-2xl bg-primary text-sm font-semibold text-primary-foreground"
          >
            Get my study advice
          </Link>
        </div>
      </div>
      <BottomNav />
    </main>
  );
}
