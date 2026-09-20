import { createFileRoute, Link } from "@tanstack/react-router";
import { ListChecks, Mic, FileText, CalendarRange, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandLock, BrandMark } from "@/components/app/brand";
import { SplashScreen } from "@/components/app/splash";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Prepare — AI Exam & Job Preparation for Bangladesh" },
      {
        name: "description",
        content:
          "Prepare Today. Get Hired Tomorrow. AI MCQ challenges, viva simulation, resume builder and personal study roadmaps for BCS, bank, NGO and corporate jobs.",
      },
      { property: "og:title", content: "Prepare — AI Exam & Job Preparation" },
      {
        property: "og:description",
        content: "One app for BCS, bank, NGO and corporate job preparation, powered by AI.",
      },
    ],
  }),
  component: Landing,
});

const features = [
  {
    icon: ListChecks,
    title: "30-minute Smart MCQ Challenge",
    body: "Fresh, exam-standard questions generated for your target exam and your weak topics.",
  },
  {
    icon: Mic,
    title: "AI Viva & interview simulator",
    body: "A realistic board interview with scoring on confidence, fluency and answer quality.",
  },
  {
    icon: FileText,
    title: "Resume & cover letter builder",
    body: "ATS-friendly CVs and tailored cover letters written around your real experience.",
  },
  {
    icon: CalendarRange,
    title: "AI study roadmap",
    body: "A week-by-week plan built from your exam date, daily time and past results.",
  },
];

function Landing() {
  return (
    <main className="hero-surface min-h-screen">
      <SplashScreen />
      <div className="mx-auto flex min-h-screen max-w-md flex-col px-6 pb-12 pt-10">
        <BrandLock />

        <h1 className="mt-12 text-[2.5rem] font-extrabold leading-[1.05]">
          Prepare Today.
          <span className="block text-primary">Get Hired Tomorrow.</span>
        </h1>
        <p className="mt-4 text-base leading-relaxed text-muted-foreground">
          One intelligent platform for BCS, Non-Cadre, Bank, NGO, Private and University Admission
          preparation — with an AI tutor that knows exactly where you keep losing marks.
        </p>

        <div className="mt-9 space-y-3">
          {features.map(({ icon: Icon, title, body }) => (
            <div key={title} className="surface-card flex gap-4 p-4">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent text-primary">
                <Icon className="size-5" />
              </span>
              <div>
                <p className="text-sm font-semibold">{title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{body}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-auto pt-10">
          <div className="mb-5 flex items-center gap-2 text-sm text-muted-foreground">
            <ShieldCheck className="size-4 text-primary" />
            Questions in Bangla or English. Progress saved to your account.
          </div>
          <Button asChild size="lg" className="h-14 w-full rounded-2xl text-base font-semibold">
            <Link to="/welcome">Start preparing free</Link>
          </Button>
          <div className="mt-6 flex justify-center opacity-60">
            <BrandMark size={26} />
          </div>
        </div>
      </div>
    </main>
  );
}
