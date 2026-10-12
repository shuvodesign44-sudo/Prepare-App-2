import type { createApi } from "./api-client";
import type { PracticeQuestion } from "./practice-api";
export const bookmarksKey = (id: string) => ["backend-bookmarks", id] as const;
export function createBookmarksApi(api: ReturnType<typeof createApi>) {
  const path = (id: string) => {
    if (!id) throw new Error("This question cannot be bookmarked.");
    return `/bookmarks/${encodeURIComponent(id)}`;
  };
  return {
    list: (signal?: AbortSignal) => api.request<PracticeQuestion[]>("/bookmarks", { signal }),
    save: (id: string) => api.request<{ saved: boolean }>(path(id), { method: "PUT" }),
    remove: (id: string) => api.request<{ saved: boolean }>(path(id), { method: "DELETE" }),
  };
}
