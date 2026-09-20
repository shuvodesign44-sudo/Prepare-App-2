// Client-safe catalog for the live competitive exam platform.

export const EXAM_GROUPS = [
  {
    group: "BCS & Government",
    exams: [
      "BCS Preliminary",
      "BCS Written",
      "BCS Viva",
      "Non-Cadre (PSC)",
      "Ministry / Directorate",
      "Sub-Registrar",
      "Audit & Accounts",
    ],
  },
  {
    group: "Bank",
    exams: [
      "Bangladesh Bank AD",
      "Combined 8 Bank / FI",
      "Sonali Bank",
      "Janata Bank",
      "Rupali Bank",
      "Agrani Bank",
      "Private Bank MTO",
    ],
  },
  {
    group: "Teaching",
    exams: [
      "Primary Teacher",
      "NTRCA School",
      "NTRCA College",
      "Govt. College Lecturer",
    ],
  },
  {
    group: "Defence & Force",
    exams: ["Police Constable", "Sub-Inspector (SI)", "Army / Navy / Air Force", "BGB / Ansar", "Fire Service"],
  },
  {
    group: "Others",
    exams: [
      "Railway",
      "Palli Bidyut",
      "Titas / WASA",
      "University Admission",
      "Medical Admission",
      "Engineering Admission",
      "NGO Recruitment",
      "Corporate Recruitment",
    ],
  },
] as const;

export const ALL_EXAMS = EXAM_GROUPS.flatMap((g) => g.exams as readonly string[]);

export const SUBJECTS = [
  "Mixed",
  "Bangla Language",
  "Bangla Literature",
  "English Grammar",
  "English Literature",
  "Mathematics",
  "Mental Ability",
  "General Science",
  "ICT & Computer",
  "Bangladesh Affairs",
  "International Affairs",
  "Geography & Environment",
  "Constitution & Civics",
  "Ethics & Good Governance",
  "Economics",
  "Banking & Finance",
  "Current Affairs",
  "Liberation War",
  "Sports & Culture",
  "Agriculture",
  "Health & Nutrition",
  "Law",
] as const;

export const PRACTICE_MODES = [
  { id: "quick", label: "Quick 10", count: 10, seconds: 600, hint: "Warm-up set" },
  { id: "daily", label: "Daily 20", count: 20, seconds: 1200, hint: "Daily habit" },
  { id: "standard", label: "Standard 30", count: 30, seconds: 1800, hint: "Exam standard" },
  { id: "pace", label: "Exam pace 50", count: 50, seconds: 2700, hint: "Speed under pressure" },
  { id: "model", label: "Model test 100", count: 100, seconds: 5400, hint: "Full model test" },
] as const;

export type PracticeModeId = (typeof PRACTICE_MODES)[number]["id"];

export const CONTEST_TYPES = [
  "Daily Live Quiz",
  "Weekly Mega Contest",
  "Monthly Championship",
  "Subject Sprint",
  "Private Room Battle",
] as const;

export const LEADERBOARD_SCOPES = ["Daily", "Weekly", "Monthly", "All time"] as const;

export const DIFFICULTIES = ["easy", "medium", "hard", "mixed"] as const;

export interface ContestRow {
  id: string;
  title: string;
  contest_type: string;
  exam_category: string;
  subject: string;
  language: string;
  difficulty: string;
  starts_at: string;
  duration_seconds: number;
  question_count: number;
  negative_marking: number;
  time_bonus: boolean;
  prize: string;
  room_code: string | null;
  is_private: boolean;
  status: string;
}

export interface BoardRow {
  user_id: string;
  display_name: string;
  score: number;
  correct_count: number;
  accuracy: number;
  time_bonus: number;
  submitted_at: string | null;
}

export function contestPhase(contest: { starts_at: string; duration_seconds: number }) {
  const start = new Date(contest.starts_at).getTime();
  const end = start + contest.duration_seconds * 1000;
  const now = Date.now();
  if (now < start) return "upcoming" as const;
  if (now <= end) return "live" as const;
  return "ended" as const;
}

export function formatCountdown(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}
