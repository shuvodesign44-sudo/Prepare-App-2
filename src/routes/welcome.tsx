import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ListChecks, Mic, CalendarRange, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandMark } from "@/components/app/brand";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/welcome")({
  head: () => ({
    meta: [
      { title: "Welcome to Prepare — Your AI Exam Coach" },
      {
        name: "description",
        content:
          "See how Prepare helps you crack BCS, bank, NGO and corporate exams with AI MCQ challenges, viva simulation and a personal study roadmap.",
      },
      { property: "og:title", content: "Welcome to Prepare" },
      {
        property: "og:description",
        content: "AI MCQ challenges, viva simulation and a personal study roadmap in one app.",
      },
    ],
  }),
  component: Welcome,
});

const slides = [
  {
    icon: ListChecks,
    title: "Practice with a 30-minute AI challenge",
    body: "Exam-standard MCQs generated for your target exam every day, with instant explanations in Bangla or English.",
  },
  {
    icon: Mic,
    title: "Face the board before the board faces you",
    body: "Simulate a real viva or job interview and get scored on confidence, fluency and answer quality.",
  },
  {
    icon: CalendarRange,
    title: "Follow a roadmap built around your exam date",
    body: "Your AI planner turns your daily study time and weak topics into a week-by-week plan that adapts as you improve.",
  },
];

function Welcome() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const slide = slides[step];
  const Icon = slide.icon;
  const isLast = step === slides.length - 1;

  return (
    <main className="hero-surface min-h-screen">
      <div className="mx-auto flex min-h-screen max-w-md flex-col px-6 pb-10 pt-8">
        <div className="flex items-center justify-between">
          <BrandMark size={30} />
          <button
            type="button"
            className="rounded-full border border-border bg-card px-4 py-1.5 text-sm font-semibold text-primary transition-colors hover:bg-accent hover:text-accent-foreground"
            onClick={() => navigate({ to: "/auth" })}
          >
            Skip
          </button>
        </div>

        <div key={step} className="mt-14 flex flex-1 animate-fade-in flex-col">
          <span className="ai-surface grid size-16 place-items-center rounded-2xl">
            <Icon className="size-8" />
          </span>
          <h1 className="mt-8 text-[2rem] font-extrabold leading-[1.15]">{slide.title}</h1>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">{slide.body}</p>
        </div>

        <div className="mt-10 flex items-center gap-2">
          {slides.map((item, index) => (
            <button
              key={item.title}
              type="button"
              aria-label={`Go to slide ${index + 1}`}
              onClick={() => setStep(index)}
              className={cn(
                "h-1.5 rounded-full transition-all",
                index === step
                  ? "ai-surface w-8"
                  : index < step
                    ? "w-3 bg-primary/40"
                    : "w-3 bg-border",
              )}
            />
          ))}
        </div>

        <Button
          size="lg"
          className="primary-surface glow-ring mt-6 h-14 w-full rounded-2xl text-base font-semibold hover:opacity-95"
          onClick={() => (isLast ? navigate({ to: "/auth" }) : setStep((s) => s + 1))}
        >
          {isLast ? "Start preparing free" : "Next"}
          <ArrowRight className="ml-1 size-5" />
        </Button>


        <p className="mt-4 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link to="/auth" className="font-semibold text-primary">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
