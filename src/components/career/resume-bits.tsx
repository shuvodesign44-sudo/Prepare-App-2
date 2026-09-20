import { type ReactNode, useEffect, useState } from "react";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ResumeTemplate } from "@/lib/resume-catalog";

export function Ring({
  value,
  size = 112,
  stroke = 10,
  label,
  tone = "primary",
}: {
  value: number;
  size?: number;
  stroke?: number;
  label?: string;
  tone?: "primary" | "success";
}) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const timer = window.setTimeout(() => setShown(value), 120);
    return () => window.clearTimeout(timer);
  }, [value]);

  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(100, Math.max(0, shown)) / 100) * circumference;

  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" role="img" aria-label={`${value}% ${label ?? "complete"}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          className="stroke-muted"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={cn(tone === "success" ? "stroke-success" : "stroke-primary", "transition-[stroke-dashoffset] duration-1000 ease-out")}
        />
      </svg>
      <div className="absolute text-center">
        <p className="text-xl font-extrabold tracking-tight">{value}%</p>
        {label ? <p className="text-[11px] font-medium text-muted-foreground">{label}</p> : null}
      </div>
    </div>
  );
}

const ACCENT_CLASS: Record<ResumeTemplate["accent"], string> = {
  primary: "bg-primary",
  secondary: "bg-brand-2",
  accent: "bg-brand-3",
  ink: "bg-foreground",
  success: "bg-success",
};

/** Miniature paper-like resume preview. */
export function MiniResume({ template, name }: { template: ResumeTemplate; name?: string }) {
  const accent = ACCENT_CLASS[template.accent];
  const lines = (count: number, widths: string[]) =>
    Array.from({ length: count }).map((_, index) => (
      <span
        key={index}
        className="block h-1 rounded-full bg-muted"
        style={{ width: widths[index % widths.length] }}
      />
    ));

  return (
    <div className="aspect-[3/4] w-full overflow-hidden rounded-2xl border border-border bg-card p-2.5 shadow-sm">
      {template.layout === "sidebar" ? (
        <div className="flex h-full gap-2">
          <div className={cn("flex w-1/3 flex-col gap-1.5 rounded-xl p-2", accent)}>
            <span className="size-5 rounded-full bg-card/70" />
            <span className="block h-1 w-full rounded-full bg-card/60" />
            <span className="block h-1 w-2/3 rounded-full bg-card/50" />
            <span className="mt-2 block h-1 w-full rounded-full bg-card/40" />
            <span className="block h-1 w-3/4 rounded-full bg-card/40" />
          </div>
          <div className="flex flex-1 flex-col gap-1.5">
            <span className="block h-2 w-3/4 rounded-full bg-foreground/80" />
            <span className="block h-1 w-1/2 rounded-full bg-muted-foreground/50" />
            <div className="mt-1 space-y-1">{lines(7, ["100%", "88%", "70%", "94%"])}</div>
          </div>
        </div>
      ) : template.layout === "twoColumn" ? (
        <div className="flex h-full flex-col gap-2">
          <div className="space-y-1">
            <span className="block h-2 w-2/3 rounded-full bg-foreground/80" />
            <span className={cn("block h-1 w-1/3 rounded-full", accent)} />
          </div>
          <div className="grid flex-1 grid-cols-2 gap-2">
            <div className="space-y-1">{lines(6, ["100%", "80%", "60%"])}</div>
            <div className="space-y-1">{lines(6, ["70%", "100%", "85%"])}</div>
          </div>
        </div>
      ) : (
        <div className="flex h-full flex-col gap-2">
          <div className="space-y-1">
            <span className="block h-2 w-3/5 rounded-full bg-foreground/80" />
            <span className="block h-1 w-2/5 rounded-full bg-muted-foreground/50" />
          </div>
          <span className={cn("block h-0.5 w-full rounded-full", accent)} />
          <div className="flex-1 space-y-1">{lines(10, ["100%", "92%", "76%", "88%"])}</div>
        </div>
      )}
      {name ? <span className="sr-only">{name}</span> : null}
    </div>
  );
}

export function SectionCard({
  title,
  description,
  icon,
  complete,
  defaultOpen = false,
  children,
}: {
  title: string;
  description?: string;
  icon: ReactNode;
  complete?: boolean;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="float-card overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 p-5 text-left transition-colors hover:bg-accent/40"
      >
        <span
          className={cn(
            "grid size-11 shrink-0 place-items-center rounded-2xl",
            complete ? "success-surface" : "bg-secondary text-primary",
          )}
        >
          {complete ? <Check className="size-5" /> : icon}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-semibold">{title}</span>
          {description ? (
            <span className="block truncate text-[13px] text-muted-foreground">{description}</span>
          ) : null}
        </span>
        <ChevronDown
          className={cn("size-5 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")}
        />
      </button>
      {open ? <div className="space-y-4 border-t border-border px-5 pb-6 pt-5">{children}</div> : null}
    </section>
  );
}

export function Chips({
  values,
  selected,
  onToggle,
  multiline = true,
}: {
  values: string[];
  selected: string[];
  onToggle: (value: string) => void;
  multiline?: boolean;
}) {
  return (
    <div className={cn("flex gap-2", multiline ? "flex-wrap" : "overflow-x-auto")}>
      {values.map((value) => {
        const active = selected.includes(value);
        return (
          <button
            key={value}
            type="button"
            aria-pressed={active}
            onClick={() => onToggle(value)}
            className={cn(
              "min-h-11 rounded-full border px-4 text-[13px] font-medium transition-all active:scale-95",
              active
                ? "border-transparent brand-surface glow-ring"
                : "border-border bg-card text-muted-foreground hover:text-foreground",
            )}
          >
            {value}
          </button>
        );
      })}
    </div>
  );
}
