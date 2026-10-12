import type { createApi } from "./api-client";
export type AIKind = "tutor" | "viva";
export interface AIInput {
  kind: AIKind;
  text: string;
  language: "en" | "bn";
  mode: "bcs" | "bank" | "corporate" | "admission";
}
export interface AITask {
  id: string;
  kind: string;
  status: "queued" | "running" | "succeeded" | "failed" | "deleted";
  result: { answer: string; follow_up?: string | null; limitations: string[] } | null;
  error: string | null;
}
export const taskKey = (user: string, id: string | null) => ["backend-ai-task", user, id] as const;
export const taskPending = (task?: AITask) =>
  task?.status === "queued" || task?.status === "running";
export function taskError(code: string | null) {
  if (code === "provider_quota_exhausted")
    return "AI service credits are exhausted. The app owner needs to add API credits before you can try again.";
  if (code === "worker_interrupted_no_automatic_replay")
    return "Processing was interrupted. You can start a new request.";
  if (code === "invalid_provider_response")
    return "The AI returned an invalid response. No result was saved.";
  if (code === "provider_not_configured")
    return "AI is not configured yet. Please finish the provider setup.";
  return "The AI request failed. You can start a new request.";
}
export function createTasksApi(api: ReturnType<typeof createApi>) {
  return {
    start: (input: AIInput, key: string) =>
      api.request<AITask>("/tasks", { method: "POST", body: JSON.stringify(input) }, key),
    get: (id: string, signal?: AbortSignal) =>
      api.request<AITask>(`/tasks/${encodeURIComponent(id)}`, { signal }),
  };
}
