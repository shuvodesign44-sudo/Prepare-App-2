import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { listBookmarks, removeBookmark } from "@/lib/live.functions";
import { BottomNav } from "@/components/app/bottom-nav";

export const Route = createFileRoute("/_authenticated/bookmarks")({
  head: () => ({
    meta: [
      { title: "Saved Questions — Prepare" },
      { name: "description", content: "Revise the MCQs you bookmarked during practice and contests." },
      { property: "og:title", content: "Saved Questions — Prepare" },
      { property: "og:description", content: "Your personal revision list of saved MCQs." },
    ],
  }),
  component: BookmarksScreen,
});

function BookmarksScreen() {
  const fetchBookmarks = useServerFn(listBookmarks);
  const drop = useServerFn(removeBookmark);
  const query = useQuery({ queryKey: ["bookmarks"], queryFn: () => fetchBookmarks() });
  const remove = useMutation({
    mutationFn: (id: string) => drop({ data: { id } }),
    onSuccess: () => query.refetch(),
    onError: (error: Error) => toast.error(error.message),
  });

  const rows = query.data ?? [];

  return (
    <main className="hero-surface min-h-screen pb-28">
      <div className="mx-auto max-w-md px-6 pt-10">
        <h1 className="text-2xl font-extrabold">Saved questions</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Bookmarked MCQs with the correct answer and explanation.
        </p>

        {query.isLoading && <p className="mt-6 text-sm text-muted-foreground">Loading…</p>}
        {!query.isLoading && rows.length === 0 && (
          <p className="surface-card mt-6 p-5 text-sm text-muted-foreground">
            Nothing saved yet — tap the bookmark icon while practising.
          </p>
        )}

        <div className="mt-5 space-y-3">
          {rows.map((row) => (
            <div key={row.id} className="surface-card p-4">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-semibold">{row.question.question}</p>
                <button
                  type="button"
                  aria-label="Remove bookmark"
                  onClick={() => remove.mutate(row.id)}
                  className="shrink-0 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
              <p className="mt-2 text-xs font-medium text-success">
                Correct: {row.question.options?.[row.question.answerIndex]}
              </p>
              {row.question.explanation && (
                <p className="mt-2 text-xs text-muted-foreground">{row.question.explanation}</p>
              )}
            </div>
          ))}
        </div>
      </div>
      <BottomNav />
    </main>
  );
}
