import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Bell,
  Building2,
  Check,
  Crown,
  Download,
  FileText,
  Globe,
  GraduationCap,
  Landmark,
  Layers,
  Mail,
  Palette,
  Plus,
  Printer,
  QrCode,
  ScanLine,
  Search,
  Sparkles,
  Sprout,
  User,
  Wand2,
  X,
} from "lucide-react";
import {
  enhanceResume,
  generateCoverLetter,
  getResume,
  listCoverLetters,
  saveResume,
} from "@/lib/prepare.functions";
import {
  COVER_LETTER_TONES,
  emptyResume,
  resumeCompletion,
  type ResumeContent,
} from "@/lib/prepare-types";
import {
  AI_PROMPTS,
  BADGE_META,
  CHECKLIST_KEYS,
  CHECKLIST_LABELS,
  LANGUAGE_OPTIONS,
  RESUME_TEMPLATES_CATALOG,
  RESUME_TYPES,
  SKILL_SUGGESTIONS,
} from "@/lib/resume-catalog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { BottomNav } from "@/components/app/bottom-nav";
import { Chips, MiniResume, Ring, SectionCard } from "@/components/career/resume-bits";
import {
  buildResumeHtml,
  downloadResumeDocx,
  downloadResumeText,
  emailResume,
  printResume,
  shareResume,
} from "@/lib/resume-export";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/career")({
  head: () => ({
    meta: [
      { title: "Career Tools — AI Resume Builder | Prepare" },
      {
        name: "description",
        content:
          "Build ATS-friendly resumes and cover letters with AI: pick a template, track your ATS score and export in one tap.",
      },
      { property: "og:title", content: "Career Tools — AI Resume Builder | Prepare" },
      {
        property: "og:description",
        content: "Premium AI resume builder with ATS scoring, templates and instant cover letters.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CareerScreen,
});

const TABS = ["Resume", "Cover Letter", "Interview Prep", "Portfolio"] as const;
type Tab = (typeof TABS)[number];

const TYPE_ICONS: Record<string, typeof Building2> = {
  building: Building2,
  scan: ScanLine,
  landmark: Landmark,
  graduation: GraduationCap,
  palette: Palette,
  sprout: Sprout,
  globe: Globe,
  crown: Crown,
};

function CareerScreen() {
  const [tab, setTab] = useState<Tab>("Resume");
  const [assistantOpen, setAssistantOpen] = useState(false);

  return (
    <main className="hero-surface min-h-dvh pb-32">
      <div className="mx-auto max-w-md px-5 pt-10">
        <header className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-[32px] font-extrabold leading-tight">Career Tools</h1>
            <p className="mt-1 text-[14px] text-muted-foreground">
              Build ATS-friendly resumes and cover letters with AI.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <IconButton label="Search resumes">
              <Search className="size-5" />
            </IconButton>
            <IconButton label="Notifications">
              <Bell className="size-5" />
            </IconButton>
            <Avatar className="size-11 border border-border">
              <AvatarFallback className="brand-surface text-xs font-bold">ME</AvatarFallback>
            </Avatar>
          </div>
        </header>

        <nav aria-label="Career sections" className="mt-6 flex gap-2 overflow-x-auto pb-1">
          {TABS.map((item) => (
            <button
              key={item}
              type="button"
              aria-current={tab === item}
              onClick={() => setTab(item)}
              className={cn(
                "min-h-11 shrink-0 rounded-full px-4 text-[13px] font-semibold transition-all active:scale-95",
                tab === item
                  ? "brand-surface glow-ring"
                  : "border border-border bg-card text-muted-foreground hover:text-foreground",
              )}
            >
              {item}
            </button>
          ))}
        </nav>

        <div className="mt-6 animate-fade-in">
          {tab === "Resume" ? <ResumeTab onAskAi={() => setAssistantOpen(true)} /> : null}
          {tab === "Cover Letter" ? <LetterTab /> : null}
          {tab === "Interview Prep" ? <InterviewTab /> : null}
          {tab === "Portfolio" ? <PortfolioTab /> : null}
        </div>
      </div>

      <button
        type="button"
        onClick={() => setAssistantOpen(true)}
        className="brand-surface glow-ring fixed bottom-24 right-5 z-40 flex min-h-14 items-center gap-2 rounded-full px-5 text-sm font-semibold transition-transform active:scale-95"
      >
        <Sparkles className="size-5" />
        AI Assist
      </button>

      <AssistantSheet open={assistantOpen} onOpenChange={setAssistantOpen} />
      <BottomNav />
    </main>
  );
}

function IconButton({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      className="grid size-11 place-items-center rounded-2xl border border-border bg-card text-muted-foreground transition-colors hover:text-foreground"
    >
      {children}
    </button>
  );
}

type ExtendedResume = ResumeContent & {
  linkedin?: string;
  portfolio?: string;
  github?: string;
  resumeType?: string;
};

function ResumeTab({ onAskAi }: { onAskAi: () => void }) {
  const fetchResume = useServerFn(getResume);
  const save = useServerFn(saveResume);
  const enhance = useServerFn(enhanceResume);

  const { data, isLoading } = useQuery({ queryKey: ["resume"], queryFn: () => fetchResume() });
  const [id, setId] = useState<string | null>(null);
  const [template, setTemplate] = useState<string>(RESUME_TEMPLATES_CATALOG[0].id);
  const [resumeType, setResumeType] = useState<string>(RESUME_TYPES[0].id);
  const [targetRole, setTargetRole] = useState("");
  const [content, setContent] = useState<ExtendedResume>(emptyResume);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  useEffect(() => {
    if (!data) return;
    const loaded = data.content as unknown as ExtendedResume;
    setId(data.id);
    if (RESUME_TEMPLATES_CATALOG.some((item) => item.id === data.template)) setTemplate(data.template);
    setContent({ ...emptyResume, ...loaded });
    if (loaded?.resumeType) setResumeType(loaded.resumeType);
  }, [data]);

  const completion = resumeCompletion(content);
  const selectedTemplate =
    RESUME_TEMPLATES_CATALOG.find((item) => item.id === template) ?? RESUME_TEMPLATES_CATALOG[0];

  const checklist = useMemo(
    () => ({
      summary: content.summary.length > 40,
      experience: content.experience.length > 0,
      education: content.education.length > 0,
      skills: content.skills.length >= 3,
      certifications: content.certifications.length > 0,
      portfolio: Boolean(content.portfolio || content.github),
    }),
    [content],
  );

  const atsScore = Math.min(
    99,
    Math.round(
      completion * 0.55 +
        selectedTemplate.atsScore * 0.35 +
        (content.skills.length >= 6 ? 10 : content.skills.length),
    ),
  );

  function field<K extends keyof ExtendedResume>(key: K, value: ExtendedResume[K]) {
    setContent((current) => ({ ...current, [key]: value }));
  }

  async function runExport(kind: "pdf" | "docx" | "print" | "email" | "share" | "text") {
    if (!content.fullName && !content.summary) {
      toast.error("Add your name and summary before exporting");
      return;
    }
    try {
      const html = buildResumeHtml(content, selectedTemplate.name);
      switch (kind) {
        case "pdf":
        case "print":
          printResume(html);
          toast.success(kind === "pdf" ? "Print dialog open — choose “Save as PDF”" : "Print dialog open");
          break;
        case "docx":
          downloadResumeDocx(content, html);
          toast.success("DOCX downloaded");
          break;
        case "text":
          downloadResumeText(content);
          toast.success("Plain text resume downloaded");
          break;
        case "email":
          emailResume(content);
          break;
        case "share": {
          const result = await shareResume(content, html);
          toast.success(result === "shared" ? "Shared" : "Resume copied to clipboard");
          break;
        }
      }
      setExportOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Export failed");
    }
  }


  const saveMutation = useMutation({
    mutationFn: () =>
      save({
        data: {
          id,
          title: content.fullName ? `${content.fullName} CV` : "My CV",
          template,
          content: { ...content, resumeType } as unknown as Record<string, unknown>,
          completion,
        },
      }),
    onSuccess: (result) => {
      setId(result.id);
      toast.success("Resume saved to your cloud profile");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const enhanceMutation = useMutation({
    mutationFn: () =>
      enhance({
        data: { content: content as unknown as Record<string, unknown>, template, targetRole },
      }),
    onSuccess: (improved) => {
      setContent((current) => ({ ...current, ...improved }));
      toast.success("AI polished your resume");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-44 animate-pulse rounded-[1.75rem] bg-muted" />
        <div className="h-28 animate-pulse rounded-[1.75rem] bg-muted" />
        <div className="h-28 animate-pulse rounded-[1.75rem] bg-muted" />
      </div>
    );
  }

  const isEmpty = !data && completion === 0;

  if (isEmpty) {
    return (
      <div className="float-card px-6 py-12 text-center">
        <div className="mx-auto grid size-20 place-items-center rounded-3xl soft-glass">
          <FileText className="size-9 text-primary" />
        </div>
        <h2 className="mt-5 text-[22px] font-bold">No resume yet.</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Start with your name — AI fills in the rest and keeps your ATS score high.
        </p>
        <Button
          className="brand-surface mt-6 h-14 w-full rounded-2xl text-[15px] font-semibold"
          onClick={() => setContent({ ...emptyResume, fullName: " " })}
        >
          Create My First Resume
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Progress */}
      <section className="float-card p-6">
        <div className="flex items-center gap-5">
          <Ring value={completion} label="complete" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <p className="text-[13px] font-medium text-muted-foreground">Resume completion</p>
            {CHECKLIST_KEYS.map((key) => (
              <p key={key} className="flex items-center gap-2 text-[13px]">
                <span
                  className={cn(
                    "grid size-4 shrink-0 place-items-center rounded-full",
                    checklist[key] ? "bg-success text-success-foreground" : "border border-border",
                  )}
                >
                  {checklist[key] ? <Check className="size-2.5" /> : null}
                </span>
                <span className={checklist[key] ? "font-medium" : "text-muted-foreground"}>
                  {CHECKLIST_LABELS[key]}
                </span>
              </p>
            ))}
          </div>
        </div>
        <Button
          className="brand-surface glow-ring mt-5 h-14 w-full rounded-2xl text-[15px] font-semibold"
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
        >
          {saveMutation.isPending ? "Saving…" : "Continue Building"}
        </Button>
      </section>

      {/* Resume type */}
      <section className="space-y-3">
        <h2 className="text-[22px] font-bold">Choose Resume Type</h2>
        <div className="grid grid-cols-2 gap-3">
          {RESUME_TYPES.map((option) => {
            const Icon = TYPE_ICONS[option.icon] ?? FileText;
            const active = resumeType === option.id;
            return (
              <button
                key={option.id}
                type="button"
                aria-pressed={active}
                onClick={() => setResumeType(option.id)}
                className={cn(
                  "relative rounded-[1.75rem] border p-4 text-left transition-all active:scale-[0.97]",
                  active
                    ? "brand-surface glow-ring border-transparent"
                    : "border-border bg-card hover:border-primary/40",
                )}
              >
                <Icon className={cn("size-6", active ? "" : "text-primary")} />
                <p className="mt-3 text-[15px] font-semibold">{option.label}</p>
                <p className={cn("text-[13px]", active ? "opacity-85" : "text-muted-foreground")}>
                  {option.description}
                </p>
                {active ? (
                  <span className="absolute right-3 top-3 grid size-6 place-items-center rounded-full bg-card text-primary">
                    <Check className="size-3.5" />
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </section>

      {/* Templates */}
      <section className="space-y-3">
        <div>
          <h2 className="text-[22px] font-bold">Choose Your Template</h2>
          <p className="text-[14px] text-muted-foreground">Select a professional design.</p>
        </div>
        <div className="-mx-5 flex snap-x gap-4 overflow-x-auto px-5 pb-2">
          {RESUME_TEMPLATES_CATALOG.map((item) => {
            const active = template === item.id;
            return (
              <button
                key={item.id}
                type="button"
                aria-pressed={active}
                onClick={() => setTemplate(item.id)}
                className={cn(
                  "w-40 shrink-0 snap-start rounded-[1.75rem] border bg-card p-3 text-left transition-all active:scale-[0.97]",
                  active ? "border-primary glow-ring" : "border-border hover:border-primary/40",
                )}
              >
                <div className="relative">
                  <MiniResume template={item} name={item.name} />
                  {active ? (
                    <span className="absolute -right-1 -top-1 grid size-7 place-items-center rounded-full brand-surface">
                      <Check className="size-4" />
                    </span>
                  ) : null}
                </div>
                <p className="mt-3 text-[14px] font-semibold">{item.name}</p>
                <p className="text-[12px] text-muted-foreground">
                  ATS {item.atsScore}% · {item.downloads}
                </p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {item.badges.map((badge) => (
                    <span
                      key={badge}
                      className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold text-secondary-foreground"
                    >
                      {BADGE_META[badge].emoji} {BADGE_META[badge].label}
                    </span>
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* AI recommendation */}
      <section className="soft-glass p-5">
        <p className="text-[15px] font-semibold">🤖 AI Recommendation</p>
        <p className="mt-2 text-[14px] text-muted-foreground">
          We recommend the <span className="font-semibold text-foreground">Modern ATS</span> template
          because it matches Product Design and Software jobs.
        </p>
        <Button
          variant="outline"
          className="mt-4 h-12 w-full rounded-2xl border-primary/40 bg-card font-semibold text-primary"
          onClick={() => {
            setTemplate("modern-ats");
            toast.success("Modern ATS applied");
          }}
        >
          Use Recommendation
        </Button>
      </section>

      {/* Form */}
      <section className="space-y-3">
        <h2 className="text-[22px] font-bold">Resume Information</h2>

        <SectionCard
          title="Personal Information"
          description="Name, contact and links"
          icon={<User className="size-5" />}
          complete={Boolean(content.fullName.trim() && content.email && content.phone)}
          defaultOpen
        >
          <Field label="Full name" value={content.fullName} onChange={(v) => field("fullName", v)} />
          <Field label="Headline" value={content.headline} onChange={(v) => field("headline", v)} />
          <Field label="Email" value={content.email} onChange={(v) => field("email", v)} type="email" />
          <Field label="Phone" value={content.phone} onChange={(v) => field("phone", v)} type="tel" />
          <Field label="Location" value={content.location} onChange={(v) => field("location", v)} />
          <Field label="LinkedIn" value={content.linkedin ?? ""} onChange={(v) => field("linkedin", v)} />
          <Field label="Portfolio / website" value={content.portfolio ?? ""} onChange={(v) => field("portfolio", v)} />
          <Field label="GitHub" value={content.github ?? ""} onChange={(v) => field("github", v)} />
        </SectionCard>

        <SectionCard
          title="Professional Summary"
          description="2–4 lines recruiters read first"
          icon={<Wand2 className="size-5" />}
          complete={content.summary.length > 40}
        >
          <Textarea
            value={content.summary}
            onChange={(event) => field("summary", event.target.value)}
            placeholder="Describe yourself..."
            className="min-h-32 rounded-2xl text-[15px]"
          />
          <Field
            label="Target role for AI"
            value={targetRole}
            onChange={setTargetRole}
            placeholder="e.g. Product Designer"
          />
          <Button
            className="brand-surface h-14 w-full rounded-2xl font-semibold"
            disabled={enhanceMutation.isPending}
            onClick={() => enhanceMutation.mutate()}
          >
            <Sparkles className="size-5" />
            {enhanceMutation.isPending ? "Generating…" : "Generate with AI"}
          </Button>
        </SectionCard>

        <SectionCard
          title="Work Experience"
          description={`${content.experience.length} entries`}
          icon={<Building2 className="size-5" />}
          complete={content.experience.length > 0}
        >
          {content.experience.map((job, index) => (
            <div key={index} className="rounded-2xl border border-border p-4">
              <div className="flex items-start gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-secondary text-xs font-bold text-primary">
                  {(job.org || "?").slice(0, 2).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1 space-y-3">
                  <Field
                    label="Company"
                    value={job.org}
                    onChange={(v) => updateList("experience", index, { org: v })}
                  />
                  <Field
                    label="Position"
                    value={job.role}
                    onChange={(v) => updateList("experience", index, { role: v })}
                  />
                  <Field
                    label="Duration"
                    value={job.period}
                    onChange={(v) => updateList("experience", index, { period: v })}
                  />
                  <div className="space-y-2">
                    <Label className="text-[13px]">Responsibilities & achievements</Label>
                    <Textarea
                      value={job.details.join("\n")}
                      onChange={(event) =>
                        updateList("experience", index, {
                          details: event.target.value.split("\n"),
                        })
                      }
                      className="min-h-24 rounded-2xl"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  aria-label="Remove experience"
                  onClick={() =>
                    field(
                      "experience",
                      content.experience.filter((_, i) => i !== index),
                    )
                  }
                  className="grid size-11 place-items-center rounded-xl text-muted-foreground hover:text-destructive"
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>
          ))}
          <Button
            variant="outline"
            className="h-14 w-full rounded-2xl font-semibold"
            onClick={() =>
              field("experience", [
                ...content.experience,
                { role: "", org: "", period: "", details: [] },
              ])
            }
          >
            <Plus className="size-5" /> Add Experience
          </Button>
        </SectionCard>

        <SectionCard
          title="Education"
          description={`${content.education.length} entries`}
          icon={<GraduationCap className="size-5" />}
          complete={content.education.length > 0}
        >
          {content.education.map((item, index) => (
            <div key={index} className="space-y-3 rounded-2xl border border-border p-4">
              <Field
                label="Institution"
                value={item.institution}
                onChange={(v) => updateList("education", index, { institution: v })}
              />
              <Field
                label="Degree & major"
                value={item.degree}
                onChange={(v) => updateList("education", index, { degree: v })}
              />
              <Field
                label="Graduation"
                value={item.period}
                onChange={(v) => updateList("education", index, { period: v })}
              />
              <Field
                label="CGPA / result"
                value={item.result}
                onChange={(v) => updateList("education", index, { result: v })}
              />
            </div>
          ))}
          <Button
            variant="outline"
            className="h-14 w-full rounded-2xl font-semibold"
            onClick={() =>
              field("education", [
                ...content.education,
                { degree: "", institution: "", period: "", result: "" },
              ])
            }
          >
            <Plus className="size-5" /> Add Education
          </Button>
        </SectionCard>

        <SectionCard
          title="Skills"
          description={`${content.skills.length} selected`}
          icon={<Layers className="size-5" />}
          complete={content.skills.length >= 3}
        >
          <Chips
            values={Array.from(new Set([...content.skills, ...SKILL_SUGGESTIONS]))}
            selected={content.skills}
            onToggle={(value) =>
              field(
                "skills",
                content.skills.includes(value)
                  ? content.skills.filter((item) => item !== value)
                  : [...content.skills, value],
              )
            }
          />
          <Button
            variant="outline"
            className="h-12 w-full rounded-2xl font-semibold text-primary"
            onClick={() => {
              field("skills", Array.from(new Set([...content.skills, ...SKILL_SUGGESTIONS.slice(0, 6)])));
              toast.success("AI suggested 6 in-demand skills");
            }}
          >
            <Sparkles className="size-4" /> Suggest Skills
          </Button>
        </SectionCard>

        <SectionCard
          title="Certifications"
          description={`${content.certifications.length} added`}
          icon={<Crown className="size-5" />}
          complete={content.certifications.length > 0}
        >
          <div className="space-y-2">
            <Label className="text-[13px]">Certificate · issuer · date (one per line)</Label>
            <Textarea
              value={content.certifications.join("\n")}
              onChange={(event) =>
                field("certifications", event.target.value.split("\n").filter(Boolean))
              }
              placeholder="Google UX Design · Coursera · 2025"
              className="min-h-24 rounded-2xl"
            />
          </div>
        </SectionCard>

        <SectionCard
          title="Languages"
          description={content.languages.join(", ") || "None selected"}
          icon={<Globe className="size-5" />}
          complete={content.languages.length > 0}
        >
          <Chips
            values={LANGUAGE_OPTIONS}
            selected={content.languages}
            onToggle={(value) =>
              field(
                "languages",
                content.languages.includes(value)
                  ? content.languages.filter((item) => item !== value)
                  : [...content.languages, value],
              )
            }
          />
        </SectionCard>
      </section>

      {/* ATS score */}
      <section className="float-card p-6">
        <div className="flex items-center gap-5">
          <Ring value={atsScore} label="ATS score" tone="success" />
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-semibold">ATS optimisation</p>
            <ul className="mt-2 space-y-1.5 text-[13px] text-muted-foreground">
              <li>✔ Add more measurable achievements</li>
              <li>✔ Improve keyword matching</li>
              <li>✔ Shorten your summary</li>
            </ul>
          </div>
        </div>
        <Button
          variant="outline"
          className="mt-5 h-14 w-full rounded-2xl font-semibold text-primary"
          disabled={enhanceMutation.isPending}
          onClick={() => enhanceMutation.mutate()}
        >
          {enhanceMutation.isPending ? "Improving…" : "Improve Resume"}
        </Button>
      </section>

      {/* Actions */}
      <div className="grid grid-cols-2 gap-3">
        <Button
          variant="outline"
          className="h-14 rounded-2xl font-semibold"
          onClick={() => setPreviewOpen(true)}
        >
          <FileText className="size-5" /> Preview
        </Button>
        <Button className="brand-surface h-14 rounded-2xl font-semibold" onClick={() => setExportOpen(true)}>
          <Download className="size-5" /> Export
        </Button>
      </div>
      <button
        type="button"
        onClick={onAskAi}
        className="w-full rounded-2xl border border-dashed border-primary/40 py-4 text-[14px] font-semibold text-primary"
      >
        🤖 Ask AI about your resume
      </button>

      <Sheet open={previewOpen} onOpenChange={setPreviewOpen}>
        <SheetContent side="bottom" className="max-h-[92dvh] overflow-y-auto rounded-t-[1.75rem]">
          <SheetHeader>
            <SheetTitle>{selectedTemplate.name} preview</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 px-4 pb-8">
            <div className="mx-auto w-full max-w-xs">
              <MiniResume template={selectedTemplate} />
            </div>
            <div className="float-card space-y-2 p-5 text-[14px]">
              <p className="text-lg font-bold">{content.fullName || "Your name"}</p>
              <p className="text-muted-foreground">{content.headline || "Your headline"}</p>
              <p className="text-[13px] text-muted-foreground">
                {[content.email, content.phone, content.location].filter(Boolean).join(" · ")}
              </p>
              {content.summary ? <p className="pt-2">{content.summary}</p> : null}
              {content.skills.length ? (
                <p className="pt-2 text-[13px] text-muted-foreground">
                  Skills: {content.skills.join(", ")}
                </p>
              ) : null}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={exportOpen} onOpenChange={setExportOpen}>
        <SheetContent side="bottom" className="rounded-t-[1.75rem]">
          <SheetHeader>
            <SheetTitle>Export resume</SheetTitle>
          </SheetHeader>
          <div className="grid grid-cols-2 gap-3 px-4 pb-8">
            {(
              [
                { key: "pdf", label: "PDF", icon: FileText },
                { key: "docx", label: "DOCX", icon: FileText },
                { key: "email", label: "Email", icon: Mail },
                { key: "print", label: "Print", icon: Printer },
                { key: "share", label: "Share", icon: QrCode },
                { key: "text", label: "Plain text", icon: Download },
              ] as const
            ).map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => void runExport(key)}
                className="flex min-h-14 items-center gap-3 rounded-2xl border border-border bg-card px-4 text-[14px] font-semibold transition-transform active:scale-95"
              >
                <Icon className="size-5 text-primary" />
                {label}
              </button>
            ))}
          </div>
          <p className="px-4 pb-6 text-[12px] text-muted-foreground">
            PDF opens your print dialog — choose “Save as PDF”. DOCX opens in Word, Google Docs or Pages.
          </p>
        </SheetContent>
      </Sheet>

    </div>
  );

  function updateList<K extends "experience" | "education">(
    key: K,
    index: number,
    patch: Partial<ExtendedResume[K][number]>,
  ) {
    setContent((current) => {
      const list = [...current[key]] as ExtendedResume[K];
      list[index] = { ...list[index], ...patch };
      return { ...current, [key]: list };
    });
  }
}

function LetterTab() {
  const fetchLetters = useServerFn(listCoverLetters);
  const generate = useServerFn(generateCoverLetter);

  const { data, refetch } = useQuery({ queryKey: ["letters"], queryFn: () => fetchLetters() });
  const [company, setCompany] = useState("");
  const [position, setPosition] = useState("");
  const [tone, setTone] = useState<(typeof COVER_LETTER_TONES)[number]>("Professional");
  const [jobDescription, setJobDescription] = useState("");

  const mutation = useMutation({
    mutationFn: () => generate({ data: { company, position, tone, jobDescription } }),
    onSuccess: () => {
      toast.success("Cover letter ready");
      refetch();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div className="space-y-5">
      <section className="float-card space-y-4 p-6">
        <Field label="Company / organisation" value={company} onChange={setCompany} />
        <Field label="Position" value={position} onChange={setPosition} />
        <Chips
          values={[...COVER_LETTER_TONES]}
          selected={[tone]}
          onToggle={(value) => setTone(value as (typeof COVER_LETTER_TONES)[number])}
        />
        <div className="space-y-2">
          <Label className="text-[13px]">Job description (optional)</Label>
          <Textarea
            value={jobDescription}
            onChange={(event) => setJobDescription(event.target.value)}
            className="min-h-28 rounded-2xl"
          />
        </div>
        <Button
          className="brand-surface glow-ring h-14 w-full rounded-2xl font-semibold"
          disabled={!company.trim() || !position.trim() || mutation.isPending}
          onClick={() => mutation.mutate()}
        >
          <Sparkles className="size-5" />
          {mutation.isPending ? "Writing…" : "Generate cover letter"}
        </Button>
      </section>

      {(data ?? []).map((letter) => (
        <article key={letter.id} className="float-card p-6">
          <p className="text-[15px] font-semibold">
            {letter.position} · {letter.company}
          </p>
          <p className="mt-3 whitespace-pre-wrap text-[14px] text-muted-foreground">{letter.content}</p>
        </article>
      ))}
    </div>
  );
}

function InterviewTab() {
  return (
    <div className="space-y-4">
      {[
        { title: "AI Viva simulator", body: "Board-style questions with voice scoring." },
        { title: "HR mock interview", body: "Behavioural questions and model answers." },
        { title: "Technical drill", body: "Role-specific rapid questions." },
      ].map((item) => (
        <section key={item.title} className="float-card flex items-center gap-4 p-5">
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl soft-glass">
            <Sparkles className="size-5 text-primary" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-semibold">{item.title}</p>
            <p className="text-[13px] text-muted-foreground">{item.body}</p>
          </div>
        </section>
      ))}
    </div>
  );
}

function PortfolioTab() {
  return (
    <div className="float-card px-6 py-12 text-center">
      <div className="mx-auto grid size-20 place-items-center rounded-3xl soft-glass">
        <Palette className="size-9 text-primary" />
      </div>
      <h2 className="mt-5 text-[22px] font-bold">No projects yet.</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Add case studies with images, your role and a live URL to strengthen your profile.
      </p>
      <Button className="brand-surface mt-6 h-14 w-full rounded-2xl font-semibold">
        <Plus className="size-5" /> Add Project
      </Button>
    </div>
  );
}

function AssistantSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (value: boolean) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-[1.75rem]">
        <SheetHeader>
          <SheetTitle>🤖 Ask AI</SheetTitle>
        </SheetHeader>
        <div className="space-y-2 px-4 pb-8">
          {AI_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => {
                toast.success(`AI is working on: ${prompt.toLowerCase()}`);
                onOpenChange(false);
              }}
              className="flex min-h-14 w-full items-center gap-3 rounded-2xl border border-border bg-card px-4 text-left text-[14px] font-medium transition-transform active:scale-[0.98]"
            >
              <Sparkles className="size-5 shrink-0 text-primary" />
              {prompt}
            </button>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
}) {
  const id = label.toLowerCase().replace(/[^a-z]+/g, "-");
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-[13px]">
        {label}
      </Label>
      <Input
        id={id}
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="h-14 rounded-2xl text-[15px]"
      />
    </div>
  );
}
