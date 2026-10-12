import { createFileRoute } from "@tanstack/react-router";
import { AITaskPanel } from "@/components/app/ai-task-panel";
import { BottomNav } from "@/components/app/bottom-nav";
export const Route = createFileRoute("/_authenticated/tutor")({
  head: () => ({ meta: [{ title: "AI Tutor — Prepare" }] }),
  component: Screen,
});
function Screen() {
  const { user } = Route.useRouteContext();
  return (
    <main className="hero-surface min-h-screen pb-28">
      <div className="mx-auto max-w-md px-6 pt-10">
        <h1 className="text-2xl font-extrabold">AI Tutor</h1>
        <AITaskPanel key={user.id} kind="tutor" userId={user.id} />
      </div>
      <BottomNav />
    </main>
  );
}
