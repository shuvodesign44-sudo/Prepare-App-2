import { useQuery } from "@tanstack/react-query";
import { backend, backendRetry } from "./backend";
import { progressKey, type Analytics } from "./progress";
import type { PracticeAttempt } from "./practice-api";

export function useProgress(id: string) {
  return useQuery({
    queryKey: progressKey(id),
    retry: backendRetry,
    queryFn: async ({ signal }) => {
      const [stats, history] = await Promise.all([
        backend.request<Analytics>("/analytics", { signal }),
        backend.request<PracticeAttempt[]>("/practice/history?completed=true&limit=20", { signal }),
      ]);
      const attempts = history
        .filter((a) => a.completed && a.result)
        .map((a) => ({
          id: a.id,
          category: a.questions[0]?.subject ?? "Practice",
          score: a.result!.score,
          total: a.result!.total,
          accuracy: a.result!.accuracy,
        }));
      return { stats, attempts };
    },
  });
}
