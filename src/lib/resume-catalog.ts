// Client-safe catalog data for the Career Tools / Resume Builder screen.

export interface ResumeTypeOption {
  id: string;
  label: string;
  description: string;
  icon: string; // lucide icon name key handled in UI
}

export const RESUME_TYPES: ResumeTypeOption[] = [
  { id: "corporate", label: "Corporate", description: "Private & MNC roles", icon: "building" },
  { id: "ats", label: "ATS Resume", description: "Beats screening bots", icon: "scan" },
  { id: "government", label: "Government", description: "BCS & Non-cadre", icon: "landmark" },
  { id: "academic", label: "Academic CV", description: "Research & teaching", icon: "graduation" },
  { id: "creative", label: "Creative", description: "Design & media", icon: "palette" },
  { id: "internship", label: "Internship", description: "Students & freshers", icon: "sprout" },
  { id: "freelance", label: "Freelance", description: "Client-facing profile", icon: "globe" },
  { id: "executive", label: "Executive", description: "Senior leadership", icon: "crown" },
];

export type TemplateBadge = "popular" | "trending" | "ats" | "recruiter" | "premium";

export interface ResumeTemplate {
  id: string;
  name: string;
  atsScore: number;
  downloads: string;
  badges: TemplateBadge[];
  accent: "primary" | "secondary" | "accent" | "ink" | "success";
  layout: "single" | "sidebar" | "twoColumn";
}

export const RESUME_TEMPLATES_CATALOG: ResumeTemplate[] = [
  { id: "modern-ats", name: "Modern ATS", atsScore: 98, downloads: "42.1k", badges: ["popular", "ats"], accent: "primary", layout: "single" },
  { id: "corporate-blue", name: "Corporate Blue", atsScore: 94, downloads: "31.5k", badges: ["recruiter"], accent: "primary", layout: "sidebar" },
  { id: "minimal-white", name: "Minimal White", atsScore: 96, downloads: "28.7k", badges: ["ats"], accent: "ink", layout: "single" },
  { id: "executive-black", name: "Executive Black", atsScore: 91, downloads: "18.2k", badges: ["premium", "recruiter"], accent: "ink", layout: "twoColumn" },
  { id: "creative-portfolio", name: "Creative Portfolio", atsScore: 82, downloads: "16.9k", badges: ["trending", "premium"], accent: "secondary", layout: "sidebar" },
  { id: "graduate", name: "Graduate Resume", atsScore: 93, downloads: "22.4k", badges: ["trending"], accent: "accent", layout: "single" },
  { id: "government-cv", name: "Government CV", atsScore: 90, downloads: "25.8k", badges: ["popular"], accent: "success", layout: "twoColumn" },
  { id: "academic-cv", name: "Academic CV", atsScore: 88, downloads: "12.3k", badges: ["ats"], accent: "ink", layout: "single" },
  { id: "tech-developer", name: "Tech Developer", atsScore: 95, downloads: "19.6k", badges: ["trending", "ats"], accent: "secondary", layout: "sidebar" },
  { id: "designer-portfolio", name: "Designer Portfolio", atsScore: 80, downloads: "9.8k", badges: ["premium"], accent: "accent", layout: "twoColumn" },
];

export const BADGE_META: Record<TemplateBadge, { label: string; emoji: string }> = {
  popular: { label: "Most Popular", emoji: "⭐" },
  trending: { label: "Trending", emoji: "🔥" },
  ats: { label: "ATS Approved", emoji: "✅" },
  recruiter: { label: "Recruiter Favorite", emoji: "💼" },
  premium: { label: "Premium", emoji: "👑" },
};

export const SKILL_SUGGESTIONS = [
  "UX Design",
  "Figma",
  "User Research",
  "AI Tools",
  "Product Strategy",
  "Wireframing",
  "Interaction Design",
  "Accessibility",
  "Data Analysis",
  "Communication",
];

export const LANGUAGE_OPTIONS = ["English", "Bangla", "Hindi", "Arabic", "French"];

export const AI_PROMPTS = [
  "Improve my summary",
  "Rewrite my experience",
  "Generate achievements",
  "Optimize for ATS",
  "Create a cover letter",
  "Start a mock interview",
];

export const CHECKLIST_KEYS = [
  "summary",
  "experience",
  "education",
  "skills",
  "certifications",
  "portfolio",
] as const;

export const CHECKLIST_LABELS: Record<(typeof CHECKLIST_KEYS)[number], string> = {
  summary: "Professional Summary",
  experience: "Experience",
  education: "Education",
  skills: "Skills",
  certifications: "Certifications",
  portfolio: "Portfolio",
};
