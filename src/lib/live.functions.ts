import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Json } from "@/integrations/supabase/types";
import type { McqQuestion } from "./prepare-types";
import { z } from "zod";

/* ---------------------------------- practice --------------------------------- */

export const startPractice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        examCategory: z.string().min(1).max(80),
        subject: z.string().min(1).max(80),
        difficulty: z.enum(["easy", "medium", "hard", "mixed"]),
        count: z.number().int().min(5).max(100),
        adaptive: z.boolean().default(true),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { ensureQuestions } = await import("./bank.server");
    const { supabase, userId } = context;

    const [{ data: profile }, { data: past }] = await Promise.all([
      supabase.from("profiles").select("content_language").eq("id", userId).maybeSingle(),
      supabase
        .from("mcq_attempts")
        .select("weak_topics")
        .eq("user_id", userId)
        .eq("completed", true)
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

    const language = profile?.content_language ?? "English";
    const weakTopics = data.adaptive
      ? Array.from(new Set((past ?? []).flatMap((row) => row.weak_topics ?? []))).slice(0, 8)
      : [];

    const questions = await ensureQuestions(supabase, {
      examCategory: data.examCategory,
      subject: data.subject,
      difficulty: data.difficulty,
      language,
      count: data.count,
      weakTopics,
    });

    const { data: attempt, error } = await supabase
      .from("mcq_attempts")
      .insert({
        user_id: userId,
        category: data.subject === "Mixed" ? data.examCategory : `${data.examCategory} — ${data.subject}`,
        difficulty: data.difficulty,
        language,
        total: questions.length,
        questions: questions as unknown as Json,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    return { attemptId: attempt.id, questions };
  });

export const explainQuestion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        question: z.string().min(1).max(1000),
        options: z.array(z.string().max(300)).min(2).max(4),
        answerIndex: z.number().int().min(0).max(3),
        language: z.enum(["English", "Bangla"]).default("English"),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { explainMcq } = await import("./ai.server");
    return { explanation: await explainMcq(data) };
  });

/* --------------------------------- bookmarks --------------------------------- */

export const listBookmarks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("question_bookmarks")
      .select("id, payload, created_at")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(200);
    return (data ?? []).map((row) => ({
      id: row.id,
      created_at: row.created_at,
      question: row.payload as unknown as McqQuestion,
    }));
  });

export const addBookmark = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ question: z.record(z.string(), z.unknown()) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("question_bookmarks").insert({
      user_id: context.userId,
      payload: data.question as unknown as Json,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const removeBookmark = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await context.supabase
      .from("question_bookmarks")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    return { ok: true };
  });

/* ---------------------------------- contests --------------------------------- */

export const listContests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { listContestsWithCounts } = await import("./contests.server");
    return listContestsWithCounts(context.supabase);
  });

export const joinContest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ contestId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { joinContestRoom } = await import("./contests.server");
    return joinContestRoom(context.supabase, context.userId, data.contestId);
  });

export const submitContest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        contestId: z.string().uuid(),
        answers: z.record(z.string(), z.number().int().min(-1).max(3)),
        secondsLeft: z.number().int().min(0).max(21600),
        tabSwitches: z.number().int().min(0).max(1000).default(0),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { scoreContestEntry } = await import("./contests.server");
    return scoreContestEntry(context.supabase, context.userId, data);
  });

export const getContestBoard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ contestId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: rows } = await context.supabase.rpc("contest_board", {
      _contest_id: data.contestId,
    });
    return rows ?? [];
  });

/* -------------------------------- leaderboard -------------------------------- */

export const getGlobalLeaderboard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ scope: z.enum(["Daily", "Weekly", "Monthly", "All time"]) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { buildLeaderboard } = await import("./contests.server");
    return buildLeaderboard(data.scope, context.userId);
  });

/* --------------------------------- achievements ------------------------------ */

export const getAchievements = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("user_achievements")
      .select("code, label, description, tier, earned_at")
      .eq("user_id", context.userId)
      .order("earned_at", { ascending: false });
    return data ?? [];
  });

export const getNotifications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("notifications")
      .select("id, kind, title, body, link, read_at, created_at")
      .order("created_at", { ascending: false })
      .limit(30);
    return data ?? [];
  });

/* ------------------------------------ admin ---------------------------------- */

export const getAdminOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { adminOverview } = await import("./contests.server");
    return adminOverview(context.supabase, context.userId);
  });

export const createContest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        title: z.string().min(3).max(120),
        contestType: z.string().min(3).max(60),
        examCategory: z.string().min(1).max(80),
        subject: z.string().min(1).max(80),
        difficulty: z.enum(["easy", "medium", "hard", "mixed"]),
        language: z.enum(["English", "Bangla"]),
        startsAt: z.string().min(10).max(40),
        durationMinutes: z.number().int().min(3).max(240),
        questionCount: z.number().int().min(5).max(100),
        negativeMarking: z.number().min(0).max(1),
        prize: z.string().max(120).default(""),
        isPrivate: z.boolean().default(false),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { createContestRow } = await import("./contests.server");
    return createContestRow(context.supabase, context.userId, data);
  });

export const broadcastNotification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({ title: z.string().min(3).max(120), body: z.string().max(400).default("") })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { broadcast } = await import("./contests.server");
    return broadcast(context.supabase, context.userId, data);
  });
