// Shared, client-safe types for Prepare.

export interface McqQuestion {
  id?: string;
  question: string;
  options: string[];
  answerIndex: number;
  explanation: string;
  topic: string;
  difficulty: "easy" | "medium" | "hard";
  subject?: string;
}

export interface McqResult {
  score: number;
  total: number;
  accuracy: number;
  weakTopics: string[];
  strongTopics: string[];
  rankPrediction: string;
  advice: string;
}

export interface VivaTurn {
  role: "interviewer" | "candidate";
  content: string;
}

export interface VivaFeedback {
  overall: number;
  scores: {
    confidence: number;
    fluency: number;
    grammar: number;
    communication: number;
    answerQuality: number;
    professionalism: number;
    pronunciation?: number;
  };
  strongAreas: string[];
  weakAreas: string[];
  improvements: string[];
  betterAnswers: { question: string; answer: string }[];
  speaking?: {
    spokenAnswers: number;
    totalSeconds: number;
    avgWpm: number;
  };
  category?: string;
  transcript?: VivaTurn[];
}


export interface ResumeContent {
  fullName: string;
  headline: string;
  email: string;
  phone: string;
  location: string;
  summary: string;
  skills: string[];
  experience: { role: string; org: string; period: string; details: string[] }[];
  education: { degree: string; institution: string; period: string; result: string }[];
  certifications: string[];
  languages: string[];
}

export interface StudyPlanWeek {
  week: number;
  focus: string;
  subjects: string[];
  tasks: string[];
  milestone: string;
}

export interface StudyPlan {
  summary: string;
  weeks: StudyPlanWeek[];
  dailyTasks: { title: string; minutes: number; subject: string }[];
}

export const MCQ_CATEGORIES = [
  "BCS Preliminary",
  "Bank Job",
  "Primary Teacher",
  "NTRCA",
  "Railway",
  "Police / Army",
  "English",
  "Math",
  "General Knowledge",
  "Bangladesh Affairs",
  "International Affairs",
  "ICT",
] as const;

export const VIVA_CATEGORIES = [
  "BCS Viva",
  "Bank Viva",
  "Corporate Interview",
  "HR Interview",
  "Technical Interview",
  "University Admission Viva",
] as const;

export const TARGET_EXAMS = [
  "BCS (Cadre)",
  "BCS Non-Cadre",
  "Bank Job",
  "Primary Teacher",
  "NTRCA",
  "Private Job",
  "NGO Job",
  "University Admission",
] as const;

export const RESUME_TEMPLATES = [
  { id: "ats", label: "ATS Friendly" },
  { id: "government", label: "Government Format" },
  { id: "corporate", label: "Corporate" },
  { id: "academic", label: "Academic CV" },
] as const;

export const COVER_LETTER_TONES = ["Professional", "Formal", "Friendly"] as const;

export const emptyResume: ResumeContent = {
  fullName: "",
  headline: "",
  email: "",
  phone: "",
  location: "",
  summary: "",
  skills: [],
  experience: [],
  education: [],
  certifications: [],
  languages: ["Bangla", "English"],
};

export function resumeCompletion(content: ResumeContent): number {
  const checks = [
    Boolean(content.fullName),
    Boolean(content.headline),
    Boolean(content.email),
    Boolean(content.phone),
    Boolean(content.location),
    content.summary.length > 40,
    content.skills.length >= 3,
    content.experience.length >= 1,
    content.education.length >= 1,
    content.languages.length >= 1,
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}
