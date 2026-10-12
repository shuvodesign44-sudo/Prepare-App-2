export interface Analytics {
  attempts: number;
  correct: number;
  total: number;
  accuracy: number;
  xp: number;
  study_seconds: number;
  daily_study_seconds: Record<string, number>;
  streak: number;
  daily_activity: Record<string, number>;
  topics: Record<string, { correct: number; total: number }>;
  weak_topics: string[];
  achievements: string[];
}
export const progressKey = (id: string) => ["backend-progress", id] as const;
export function dhakaDate(now = new Date()) {
  return new Date(now.getTime() + 6 * 3600000).toISOString().slice(0, 10);
}
export function studyDays(seconds: Record<string, number>, now = new Date()) {
  const today = Date.parse(dhakaDate(now) + "T00:00:00Z");
  return Array.from({ length: 14 }, (_, i) => {
    const date = new Date(today - (13 - i) * 86400000).toISOString().slice(0, 10);
    return { date, minutes: (seconds[date] ?? 0) / 60 };
  });
}
