import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { bookmarksApi, useBookmarks } from "@/lib/use-bookmarks";
import { bookmarksKey } from "@/lib/bookmarks-api";
import { Button } from "@/components/ui/button";
import type { PracticeQuestion } from "@/lib/practice-api";
import { BottomNav } from "@/components/app/bottom-nav";

export const Route = createFileRoute("/_authenticated/bookmarks")({
  head: () => ({
    meta: [
      { title: "Saved Questions — Prepare" },
      {
        name: "description",
        content: "Revise the MCQs you bookmarked during practice and contests.",
      },
      { property: "og:title", content: "Saved Questions — Prepare" },
      { property: "og:description", content: "Your personal revision list of saved MCQs." },
    ],
  }),
  component: BookmarksScreen,
});

function BookmarksScreen() {
  const { user } = Route.useRouteContext();
  const queryClient = useQueryClient();
  const query = useBookmarks(user.id);
  const remove = useMutation({
    mutationFn: (id: string) => bookmarksApi.remove(id),
    onSuccess: async (_, id) => {
      await queryClient.cancelQueries({ queryKey: bookmarksKey(user.id) });
      queryClient.setQueryData<PracticeQuestion[]>(bookmarksKey(user.id), (rows) =>
        rows?.filter((row) => row.id !== id),
      );
      void queryClient.invalidateQueries({ queryKey: bookmarksKey(user.id) });
      toast.success("Bookmark removed");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const rows = query.error ? [] : (query.data ?? []);

  return (
    <main className="hero-surface min-h-screen pb-28">
      <div className="mx-auto max-w-md px-6 pt-10">
        <h1 className="text-2xl font-extrabold">Saved questions</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Questions saved from Practice. Correct answers and explanations appear after submitting a
          practice set.
        </p>

        {query.isPending && <p className="mt-6 text-sm text-muted-foreground">Loading…</p>}
        {!query.isPending && !query.error && rows.length === 0 && (
          <p className="surface-card mt-6 p-5 text-sm text-muted-foreground">
            Nothing saved yet — tap the bookmark icon while practising.
          </p>
        )}

        {query.error && (
          <div role="alert" className="surface-card mt-6 p-5 text-sm">
            <p>{query.error.message}</p>
            <Button className="mt-3" variant="outline" onClick={() => void query.refetch()}>
              Retry
            </Button>
          </div>
        )}
        <div className="mt-5 space-y-3">
          {rows.map((row) => (
            <div key={row.id} className="surface-card p-4">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-semibold">{row.text}</p>
                <button
                  type="button"
                  aria-label={`Remove bookmark: ${row.text}`}
                  disabled={remove.isPending}
                  onClick={() => remove.mutate(row.id)}
                  className="shrink-0 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                {row.options.map((option, index) => (
                  <li key={index}>
                    {String.fromCharCode(65 + index)}. {option}
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-muted-foreground">
                {row.subject} · {row.topic}
              </p>
            </div>
          ))}
        </div>
      </div>
      <BottomNav />
    </main>
  );
}
