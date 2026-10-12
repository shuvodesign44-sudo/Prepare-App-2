import { useQuery } from "@tanstack/react-query";
import { backend, backendRetry } from "./backend";
import { bookmarksKey, createBookmarksApi } from "./bookmarks-api";
export const bookmarksApi = createBookmarksApi(backend);
export function useBookmarks(id: string) {
  return useQuery({
    queryKey: bookmarksKey(id),
    queryFn: ({ signal }) => bookmarksApi.list(signal),
    retry: backendRetry,
  });
}
