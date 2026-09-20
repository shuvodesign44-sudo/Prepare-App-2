import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Bookmark, CalendarClock, ExternalLink, MapPin, Search, Wallet } from "lucide-react";
import { BottomNav } from "@/components/app/bottom-nav";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { JOB_CATEGORIES, JOB_CIRCULARS, daysUntil, type JobCategory } from "@/lib/jobs-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/jobs")({
  head: () => ({
    meta: [
      { title: "Live Jobs — Prepare" },
      {
        name: "description",
        content: "Government, bank, NGO and corporate job circulars with deadlines and official apply links.",
      },
      { property: "og:title", content: "Live Jobs — Prepare" },
      { property: "og:description", content: "Browse live job circulars across Bangladesh." },
    ],
  }),
  component: JobsScreen,
});

function JobsScreen() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<JobCategory | "All">("All");
  const [saved, setSaved] = useState<string[]>([]);

  const jobs = useMemo(() => {
    const q = query.trim().toLowerCase();
    return JOB_CIRCULARS.filter(
      (job) =>
        (category === "All" || job.category === category) &&
        (!q ||
          job.position.toLowerCase().includes(q) ||
          job.organization.toLowerCase().includes(q) ||
          job.location.toLowerCase().includes(q)),
    ).sort((a, b) => daysUntil(a.deadline) - daysUntil(b.deadline));
  }, [query, category]);

  return (
    <main className="hero-surface min-h-screen pb-28">
      <div className="mx-auto max-w-md px-6 pt-10">
        <h1 className="text-2xl font-extrabold">Live jobs</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {jobs.length} circulars open — sorted by nearest deadline.
        </p>

        <div className="relative mt-5">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search position, organisation or district"
            className="h-12 rounded-2xl pl-10"
            aria-label="Search jobs"
          />
        </div>

        <div className="-mx-6 mt-4 flex gap-2 overflow-x-auto px-6 pb-1">
          {(["All", ...JOB_CATEGORIES] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setCategory(item)}
              className={cn(
                "shrink-0 rounded-full border px-3.5 py-2 text-xs font-medium transition-colors",
                category === item
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground hover:text-foreground",
              )}
            >
              {item}
            </button>
          ))}
        </div>

        <section className="mt-5 space-y-3">
          {jobs.map((job) => {
            const left = daysUntil(job.deadline);
            const isSaved = saved.includes(job.id);
            return (
              <article key={job.id} className="surface-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold leading-snug">{job.position}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{job.organization}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={isSaved ? "Remove bookmark" : "Bookmark job"}
                    onClick={() =>
                      setSaved((prev) =>
                        prev.includes(job.id) ? prev.filter((id) => id !== job.id) : [...prev, job.id],
                      )
                    }
                  >
                    <Bookmark className={cn("size-4", isSaved && "fill-primary text-primary")} />
                  </Button>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Wallet className="size-3.5 text-primary" />
                    {job.salary}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <MapPin className="size-3.5 text-primary" />
                    {job.location}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <CalendarClock className="size-3.5 text-primary" />
                    {job.deadline}
                  </span>
                  <span>{job.vacancies.toLocaleString()} vacancies</span>
                </div>

                <p className="mt-3 text-xs text-muted-foreground">{job.eligibility}</p>

                <div className="mt-4 flex items-center gap-3">
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-1 text-[11px] font-semibold",
                      left <= 7 ? "bg-destructive text-destructive-foreground" : "success-surface",
                    )}
                  >
                    {left > 0 ? `${left} days left` : "Closed"}
                  </span>
                  <Button asChild size="sm" className="ml-auto h-9 rounded-xl">
                    <a href={job.link} target="_blank" rel="noreferrer noopener">
                      Apply <ExternalLink className="ml-1 size-3.5" />
                    </a>
                  </Button>
                </div>
              </article>
            );
          })}
          {!jobs.length && (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No circulars match your filters.
            </p>
          )}
        </section>
      </div>
      <BottomNav />
    </main>
  );
}
