import type { createApi } from "./api-client";

export interface PracticeQuestion {
  id: string;
  text: string;
  options: string[];
  topic: string;
  difficulty: "easy" | "medium" | "hard";
  subject: string;
  answer?: number;
  explanation?: string;
}
export interface PracticeAttempt {
  id: string;
  deadline: string;
  server_time: string;
  completed: boolean;
  questions: PracticeQuestion[];
  result: null | { score: number; total: number; accuracy: number; weak_topics: string[] };
}
export interface PracticeInput {
  exam: string;
  subject?: string;
  difficulty?: "easy" | "medium" | "hard";
  language: "en" | "bn";
  count: number;
  duration_seconds: number;
  adaptive: boolean;
}
export function questionAnswers(questions: PracticeQuestion[], indexed: Record<string, number>) {
  const answers: Record<string, number> = {};
  for (const [index, answer] of Object.entries(indexed)) {
    const question = questions[Number(index)];
    if (!question || !Number.isInteger(answer) || answer < 0 || answer >= question.options.length)
      throw new Error("Invalid answer. Please reload your practice set.");
    answers[question.id] = answer;
  }
  return answers;
}
export function remainingSeconds(attempt: PracticeAttempt) {
  return Math.max(
    0,
    Math.floor((Date.parse(attempt.deadline) - Date.parse(attempt.server_time)) / 1000),
  );
}
export function createPracticeApi(api: ReturnType<typeof createApi>) {
  return {
    start: (input: PracticeInput, key: string) =>
      api.request<PracticeAttempt>(
        "/practice",
        {
          method: "POST",
          body: JSON.stringify(input),
        },
        key,
      ),
    submit: (id: string, answers: Record<string, number>) =>
      api.request<PracticeAttempt>(`/practice/${encodeURIComponent(id)}/submit`, {
        method: "POST",
        body: JSON.stringify({ answers }),
      }),
  };
}
