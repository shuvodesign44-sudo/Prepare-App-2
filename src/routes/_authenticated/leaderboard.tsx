import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Crown, Flame } from "lucide-react";
import { getDashboard } from "@/lib/prepare.functions";
import { BottomNav } from "@/components/app/bottom-nav";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/leaderboard")({
  head: () => ({
    meta: [
      { title: "Leaderboard — Prepare" },
      {
        name: "description",
        content: "Weekly, monthly and yearly ranking by XP, MCQs solved and study time.",
      },
      { property: "og:title", content: "Leaderboard — Prepare" },
      { property: "og:description", content: "See where you stand among other candidates." },
    ],
  }),
  component: LeaderboardScreen,
});

const RANGES = ["Weekly", "Monthly", "Yearly"] as const;

const PEERS = [
  { name: "Sadia Rahman", xp: 4820, solved: 1940 },
  { name: "Tanvir Hasan", xp: 4310, solved: 1725 },
  { name: "Nusrat Jahan", xp: 3980, solved: 1610 },
  { name: "Mahmudul Karim", xp: 3455, solved: 1402 },
  { name: "Ritu Barua", xp: 2980, solved: 1188 },
  { name: "Arif Chowdhury", xp: 2510, solved: 1044 },
];

function LeaderboardScreen() {
  const [range, setRange] = useState<(typeof RANGES)[number]>("Weekly");
  const fetchDashboard = useServerFn(getDashboard);
  const { data } = useQuery({ queryKey: ["dashboard"], queryFn: () => fetchDashboard() });

  const factor = range === "Weekly" ? 1 : range === "Monthly" ? 3.4 : 12;
  const me = {
    name: data?.profile?.display_name ?? "You",
    xp: data?.profile?.xp ?? 0,
    solved: (data?.attempts ?? []).reduce((sum, row) => sum + row.total, 0),
    isMe: true,
  };
  const rows = [...PEERS.map((peer) => ({
    ...peer,
    xp: Math.round(peer.xp * factor),
    solved: Math.round(peer.solved * factor),
    isMe: false,
  })), me].sort((a, b) => b.xp - a.xp);

  return (
    <main className="hero-surface min-h-screen pb-28">
      <div className="mx-auto max-w-md px-6 pt-10">
        <h1 className="text-2xl font-extrabold">Leaderboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Ranked by XP earned from practice, viva and daily streaks.
        </p>

        <div className="mt-5 flex gap-2">
          {RANGES.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setRange(item)}
              className={cn(
                "flex-1 rounded-2xl border px-3 py-2.5 text-xs font-semibold transition-colors",
                range === item
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground",
              )}
            >
              {item}
            </button>
          ))}
        </div>

        <div className="surface-card mt-5 divide-y divide-border">
          {rows.map((row, index) => (
            <div
              key={row.name}
              className={cn(
                "flex items-center gap-3 px-4 py-3",
                row.isMe && "bg-accent/60 first:rounded-t-2xl last:rounded-b-2xl",
              )}
            >
              <span
                className={cn(
                  "grid size-8 shrink-0 place-items-center rounded-xl text-xs font-bold",
                  index === 0 ? "gold-surface" : "bg-muted text-muted-foreground",
                )}
              >
                {index === 0 ? <Crown className="size-4" /> : index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">
                  {row.name}
                  {row.isMe && <span className="ml-2 text-[10px] text-primary">YOU</span>}
                </p>
                <p className="text-xs text-muted-foreground">{row.solved} MCQs solved</p>
              </div>
              <span className="flex items-center gap-1 text-sm font-bold text-primary">
                <Flame className="size-3.5" />
                {row.xp}
              </span>
            </div>
          ))}
        </div>
      </div>
      <BottomNav />
    </main>
  );
}
