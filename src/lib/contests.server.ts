// Server-only logic for live contests, leaderboards and admin tools.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/integrations/supabase/types";
import type { McqQuestion } from "./prepare-types";

type Client = SupabaseClient<Database>;

export type ContestBoardRow = {
  user_id: string;
  display_name: string | null;
  score: number;
  correct_count: number;
  accuracy: number;
  time_bonus: number;
  submitted_at: string | null;
  disqualified: boolean;
};


const CONTEST_FIELDS =
  "id, title, contest_type, exam_category, subject, language, difficulty, starts_at, duration_seconds, question_count, negative_marking, time_bonus, prize, room_code, is_private, status";

async function requireAdmin(supabase: Client, userId: string) {
  const { data, error } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Admin access required.");
}

export async function listContestsWithCounts(supabase: Client) {
  const from = new Date(Date.now() - 7 * 86400000).toISOString();
  const { data: contests, error } = await supabase
    .from("contests")
    .select(CONTEST_FIELDS)
    .neq("status", "draft")
    .gte("starts_at", from)
    .order("starts_at", { ascending: true })
    .limit(40);
  if (error) throw new Error(error.message);

  const ids = (contests ?? []).map((row) => row.id);
  const counts = new Map<string, number>();
  if (ids.length) {
    const { data: parts } = await supabase.rpc("contest_participant_counts", {
      _contest_ids: ids,
    });
    (parts ?? []).forEach((row) => counts.set(row.contest_id, Number(row.participants)));
  }

  return (contests ?? []).map((row) => ({ ...row, participants: counts.get(row.id) ?? 0 }));
}

export async function joinContestRoom(supabase: Client, userId: string, contestId: string) {
  const { data: contest, error } = await supabase
    .from("contests")
    .select(`${CONTEST_FIELDS}, questions`)
    .eq("id", contestId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!contest) throw new Error("Contest not found.");

  const start = new Date(contest.starts_at).getTime();
  const end = start + contest.duration_seconds * 1000;
  if (Date.now() < start) throw new Error("This contest has not started yet.");
  if (Date.now() > end) throw new Error("This contest has already ended.");

  let questions = (contest.questions ?? []) as unknown as McqQuestion[];
  if (questions.length < contest.question_count) {
    const { ensureQuestions } = await import("./bank.server");
    questions = await ensureQuestions(supabase, {
      examCategory: contest.exam_category,
      subject: contest.subject,
      difficulty: contest.difficulty,
      language: contest.language,
      count: contest.question_count,
    });
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("contests")
      .update({ questions: questions as unknown as Json, status: "live" })
      .eq("id", contestId);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", userId)
    .maybeSingle();

  const { data: existing } = await supabase
    .from("contest_participants")
    .select("id, submitted_at, score, accuracy, correct_count, wrong_count, time_bonus")
    .eq("contest_id", contestId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!existing) {
    await supabase.from("contest_participants").insert({
      contest_id: contestId,
      user_id: userId,
      display_name: profile?.display_name ?? "Candidate",
    });
  }

  return {
    contest: { ...contest, questions: undefined },
    questions,
    secondsLeft: Math.max(0, Math.floor((end - Date.now()) / 1000)),
    alreadySubmitted: Boolean(existing?.submitted_at),
    previous: existing ?? null,
  };
}

export async function scoreContestEntry(
  supabase: Client,
  userId: string,
  input: {
    contestId: string;
    answers: Record<string, number>;
    secondsLeft: number;
    tabSwitches: number;
  },
) {
  const { data: contest, error } = await supabase
    .from("contests")
    .select("id, questions, negative_marking, time_bonus, duration_seconds, starts_at, title")
    .eq("id", input.contestId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!contest) throw new Error("Contest not found.");

  const questions = (contest.questions ?? []) as unknown as McqQuestion[];
  let correct = 0;
  let wrong = 0;
  questions.forEach((question, index) => {
    const chosen = input.answers[String(index)] ?? -1;
    if (chosen < 0) return;
    if (chosen === question.answerIndex) correct += 1;
    else wrong += 1;
  });

  const answered = correct + wrong;
  const bonus = contest.time_bonus ? Math.round(input.secondsLeft / 10) : 0;
  const raw = correct - wrong * Number(contest.negative_marking ?? 0);
  const score = Math.max(0, Math.round((raw + bonus / 10) * 100) / 100);
  const accuracy = answered ? Math.round((correct / answered) * 100) : 0;
  const xp = Math.max(0, Math.round(correct * 12 + bonus - input.tabSwitches * 5));

  const { error: updateError } = await supabase
    .from("contest_participants")
    .update({
      score,
      correct_count: correct,
      wrong_count: wrong,
      accuracy,
      time_bonus: bonus,
      xp,
      answers: input.answers as unknown as Json,
      submitted_at: new Date().toISOString(),
      disqualified: input.tabSwitches > 5,
    })
    .eq("contest_id", input.contestId)
    .eq("user_id", userId);
  if (updateError) throw new Error(updateError.message);

  await (await import("./activity.server")).recordActivity(
    supabase,
    userId,
    Math.round((contest.duration_seconds - input.secondsLeft) / 60),
    xp,
  );

  // Board is read through a security-definer helper so no one can read other
  // participants' answers or question order.
  const { data: board } = await supabase.rpc("contest_board", {
    _contest_id: input.contestId,
  });

  const rank = (board ?? []).findIndex((row) => row.user_id === userId) + 1;


  if (rank === 1) {
    await supabase.from("user_achievements").insert({
      user_id: userId,
      code: "contest_champion",
      label: "Contest Champion",
      description: "Finished first in a live contest",
      tier: "gold",
    });
  }

  return {
    score,
    correct,
    wrong,
    accuracy,
    timeBonus: bonus,
    xp,
    rank: rank || null,
    total: questions.length,
    participants: (board ?? []).length,
    questions,
    answers: input.answers,
  };
}

export async function buildLeaderboard(
  scope: "Daily" | "Weekly" | "Monthly" | "All time",
  userId: string,
) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  if (scope === "All time") {
    const { data } = await supabaseAdmin
      .from("profiles")
      .select("id, display_name, xp")
      .order("xp", { ascending: false })
      .limit(50);
    return (data ?? []).map((row, index) => ({
      rank: index + 1,
      name: row.display_name ?? "Candidate",
      xp: row.xp ?? 0,
      minutes: 0,
      isMe: row.id === userId,
    }));
  }

  const days = scope === "Daily" ? 1 : scope === "Weekly" ? 7 : 30;
  const since = new Date(Date.now() - (days - 1) * 86400000).toISOString().slice(0, 10);

  const { data: rows } = await supabaseAdmin
    .from("daily_activity")
    .select("user_id, xp, minutes")
    .gte("activity_date", since);

  const totals = new Map<string, { xp: number; minutes: number }>();
  (rows ?? []).forEach((row) => {
    const current = totals.get(row.user_id) ?? { xp: 0, minutes: 0 };
    totals.set(row.user_id, { xp: current.xp + row.xp, minutes: current.minutes + row.minutes });
  });

  const ids = Array.from(totals.keys());
  if (!ids.length) return [];

  const { data: profiles } = await supabaseAdmin
    .from("profiles")
    .select("id, display_name")
    .in("id", ids);
  const names = new Map((profiles ?? []).map((p) => [p.id, p.display_name ?? "Candidate"]));

  return ids
    .map((id) => ({
      rank: 0,
      name: names.get(id) ?? "Candidate",
      xp: totals.get(id)!.xp,
      minutes: totals.get(id)!.minutes,
      isMe: id === userId,
    }))
    .sort((a, b) => b.xp - a.xp)
    .slice(0, 50)
    .map((row, index) => ({ ...row, rank: index + 1 }));
}

export async function adminOverview(supabase: Client, userId: string) {
  const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (!isAdmin) return { isAdmin: false as const };

  const [questions, contests, participants, attempts] = await Promise.all([
    supabase.from("questions").select("id", { count: "exact", head: true }),
    supabase.from("contests").select(CONTEST_FIELDS).order("starts_at", { ascending: false }).limit(20),
    supabase.from("contest_participants").select("id", { count: "exact", head: true }),
    supabase.from("mcq_attempts").select("id", { count: "exact", head: true }).eq("completed", true),
  ]);

  const { data: bySubject } = await supabase
    .from("questions")
    .select("subject")
    .limit(2000);
  const subjectCounts = new Map<string, number>();
  (bySubject ?? []).forEach((row) =>
    subjectCounts.set(row.subject, (subjectCounts.get(row.subject) ?? 0) + 1),
  );

  return {
    isAdmin: true as const,
    questionCount: questions.count ?? 0,
    contestEntries: participants.count ?? 0,
    completedAttempts: attempts.count ?? 0,
    contests: contests.data ?? [],
    subjects: Array.from(subjectCounts.entries())
      .map(([subject, count]) => ({ subject, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10),
  };
}

export async function createContestRow(
  supabase: Client,
  userId: string,
  input: {
    title: string;
    contestType: string;
    examCategory: string;
    subject: string;
    difficulty: string;
    language: string;
    startsAt: string;
    durationMinutes: number;
    questionCount: number;
    negativeMarking: number;
    prize: string;
    isPrivate: boolean;
  },
) {
  await requireAdmin(supabase, userId);

  const { data, error } = await supabase
    .from("contests")
    .insert({
      title: input.title,
      contest_type: input.contestType,
      exam_category: input.examCategory,
      subject: input.subject,
      difficulty: input.difficulty,
      language: input.language,
      starts_at: new Date(input.startsAt).toISOString(),
      duration_seconds: input.durationMinutes * 60,
      question_count: input.questionCount,
      negative_marking: input.negativeMarking,
      prize: input.prize,
      is_private: input.isPrivate,
      room_code: input.isPrivate
        ? Math.random().toString(36).slice(2, 8).toUpperCase()
        : null,
      status: "scheduled",
      created_by: userId,
    })
    .select(CONTEST_FIELDS)
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function broadcast(
  supabase: Client,
  userId: string,
  input: { title: string; body: string },
) {
  await requireAdmin(supabase, userId);
  const { error } = await supabase
    .from("notifications")
    .insert({ user_id: null, kind: "broadcast", title: input.title, body: input.body });
  if (error) throw new Error(error.message);
  return { ok: true };
}
