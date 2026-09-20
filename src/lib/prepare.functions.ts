import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Json } from "@/integrations/supabase/types";
import type { McqQuestion, ResumeContent, VivaTurn } from "./prepare-types";
import { z } from "zod";

export const getDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const since = new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10);

    const [profile, activity, attempts, vivas, resume, letters, plan] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
      supabase
        .from("daily_activity")
        .select("activity_date, minutes, xp, lessons_completed")
        .eq("user_id", userId)
        .gte("activity_date", since)
        .order("activity_date"),
      supabase
        .from("mcq_attempts")
        .select("id, category, score, total, weak_topics, created_at")
        .eq("user_id", userId)
        .eq("completed", true)
        .order("created_at", { ascending: false })
        .limit(10),
      supabase
        .from("viva_sessions")
        .select("id, category, overall_score, created_at")
        .eq("user_id", userId)
        .eq("completed", true)
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("resumes")
        .select("id, title, completion, updated_at")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("cover_letters")
        .select("id, company, position, updated_at")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false })
        .limit(3),
      supabase
        .from("study_plans")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    return {
      profile: profile.data,
      activity: activity.data ?? [],
      attempts: attempts.data ?? [],
      vivas: vivas.data ?? [],
      resume: resume.data,
      letters: letters.data ?? [],
      plan: plan.data,
    };
  });

const OnboardingInput = z.object({
  displayName: z.string().trim().min(1).max(60),
  targetExam: z.string().min(1).max(60),
  level: z.string().min(1).max(30),
  dailyMinutes: z.number().int().min(15).max(600),
  contentLanguage: z.enum(["English", "Bangla"]),
  examDate: z.string().max(10).nullable(),
});

export const saveOnboarding = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => OnboardingInput.parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("profiles")
      .update({
        display_name: data.displayName,
        target_exam: data.targetExam,
        goal: data.targetExam,
        level: data.level,
        daily_minutes: data.dailyMinutes,
        weekly_goal_minutes: data.dailyMinutes * 6,
        content_language: data.contentLanguage,
        exam_date: data.examDate || null,
        onboarded: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const StartChallengeInput = z.object({
  category: z.string().min(1).max(60),
  difficulty: z.enum(["easy", "medium", "hard", "mixed"]),
  count: z.number().int().min(5).max(30),
});

export const startChallenge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => StartChallengeInput.parse(input))
  .handler(async ({ data, context }) => {
    const { generateMcqSet } = await import("./ai.server");
    const { supabase, userId } = context;

    const { data: profile } = await supabase
      .from("profiles")
      .select("content_language")
      .eq("id", userId)
      .maybeSingle();
    const { data: past } = await supabase
      .from("mcq_attempts")
      .select("weak_topics")
      .eq("user_id", userId)
      .eq("category", data.category)
      .order("created_at", { ascending: false })
      .limit(3);

    const weakTopics = Array.from(new Set((past ?? []).flatMap((row) => row.weak_topics ?? []))).slice(0, 6);
    const language = profile?.content_language ?? "English";

    const questions = await generateMcqSet({
      category: data.category,
      difficulty: data.difficulty,
      language,
      count: data.count,
      weakTopics,
    });

    const { data: attempt, error } = await supabase
      .from("mcq_attempts")
      .insert({
        user_id: userId,
        category: data.category,
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

const SubmitChallengeInput = z.object({
  attemptId: z.string().uuid(),
  answers: z.record(z.string(), z.number().int().min(-1).max(3)),
  durationSeconds: z.number().int().min(0).max(7200),
});

export const submitChallenge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => SubmitChallengeInput.parse(input))
  .handler(async ({ data, context }) => {
    const { analyseMcqAttempt } = await import("./ai.server");
    const { supabase, userId } = context;

    const { data: attempt, error } = await supabase
      .from("mcq_attempts")
      .select("id, category, questions, completed")
      .eq("id", data.attemptId)
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!attempt) throw new Error("Challenge not found.");

    const questions = (attempt.questions ?? []) as unknown as McqQuestion[];
    const wrong: { question: string; topic: string; chosen: string; correct: string }[] = [];
    let score = 0;

    questions.forEach((question, index) => {
      const chosen = data.answers[String(index)] ?? -1;
      if (chosen === question.answerIndex) {
        score += 1;
      } else {
        wrong.push({
          question: question.question,
          topic: question.topic,
          chosen: chosen >= 0 ? question.options[chosen] : "skipped",
          correct: question.options[question.answerIndex],
        });
      }
    });

    let analysis = {
      weakTopics: Array.from(new Set(wrong.map((item) => item.topic))).slice(0, 5),
      strongTopics: [] as string[],
      rankPrediction: "",
      advice: "",
    };
    try {
      analysis = await analyseMcqAttempt({
        category: attempt.category,
        score,
        total: questions.length,
        wrong,
      });
    } catch (aiError) {
      console.error("MCQ analysis failed", aiError);
    }

    await supabase
      .from("mcq_attempts")
      .update({
        answers: data.answers as unknown as Json,
        score,
        duration_seconds: data.durationSeconds,
        weak_topics: analysis.weakTopics,
        completed: true,
      })
      .eq("id", attempt.id);

    const xp = score * 10;
    await (await import("./activity.server")).recordActivity(supabase, userId, Math.round(data.durationSeconds / 60), xp);

    return {
      score,
      total: questions.length,
      accuracy: questions.length ? Math.round((score / questions.length) * 100) : 0,
      weakTopics: analysis.weakTopics,
      strongTopics: analysis.strongTopics,
      rankPrediction: analysis.rankPrediction,
      advice: analysis.advice,
      questions,
      answers: data.answers,
    };
  });

export const getLeaderboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("mcq_attempts")
      .select("category, score, total, created_at")
      .eq("user_id", context.userId)
      .eq("completed", true)
      .order("created_at", { ascending: false })
      .limit(20);
    return data ?? [];
  });

const VivaStartInput = z.object({ category: z.string().min(1).max(60) });

export const startViva = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => VivaStartInput.parse(input))
  .handler(async ({ data, context }) => {
    const { nextVivaQuestion } = await import("./ai.server");
    const { supabase, userId } = context;

    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name, target_exam")
      .eq("id", userId)
      .maybeSingle();

    const { question } = await nextVivaQuestion({
      category: data.category,
      transcript: [],
      candidate: {
        name: profile?.display_name ?? "the candidate",
        exam: profile?.target_exam ?? data.category,
      },
    });

    const transcript: VivaTurn[] = [{ role: "interviewer", content: question }];
    const { data: session, error } = await supabase
      .from("viva_sessions")
      .insert({
        user_id: userId,
        category: data.category,
        transcript: transcript as unknown as Json,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    return { sessionId: session.id, transcript };
  });

const VivaAnswerInput = z.object({
  sessionId: z.string().uuid(),
  answer: z.string().trim().min(1).max(4000),
});

export const answerViva = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => VivaAnswerInput.parse(input))
  .handler(async ({ data, context }) => {
    const { nextVivaQuestion } = await import("./ai.server");
    const { supabase, userId } = context;

    const { data: session } = await supabase
      .from("viva_sessions")
      .select("id, category, transcript")
      .eq("id", data.sessionId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!session) throw new Error("Interview session not found.");

    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name, target_exam")
      .eq("id", userId)
      .maybeSingle();

    const transcript = [
      ...((session.transcript ?? []) as unknown as VivaTurn[]),
      { role: "candidate" as const, content: data.answer },
    ];

    const next = await nextVivaQuestion({
      category: session.category,
      transcript,
      candidate: {
        name: profile?.display_name ?? "the candidate",
        exam: profile?.target_exam ?? session.category,
      },
    });

    if (!next.done) transcript.push({ role: "interviewer", content: next.question });

    await supabase
      .from("viva_sessions")
      .update({ transcript: transcript as unknown as Json })
      .eq("id", session.id);

    return { transcript, done: next.done };
  });

const TranscribeInput = z.object({
  audioBase64: z.string().min(100).max(12_000_000),
});

export const transcribeVivaAnswer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => TranscribeInput.parse(input))
  .handler(async ({ data }) => {
    const { transcribeWav } = await import("./ai.server");
    const text = await transcribeWav(data.audioBase64);
    return { text };
  });

const VivaFinishInput = z.object({
  sessionId: z.string().uuid(),
  speaking: z
    .object({
      spokenAnswers: z.number().int().min(0).max(50),
      totalSeconds: z.number().min(0).max(7200),
      avgWpm: z.number().min(0).max(400),
    })
    .nullable(),
});

export const finishViva = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => VivaFinishInput.parse(input))
  .handler(async ({ data, context }) => {
    const { evaluateViva } = await import("./ai.server");
    const { supabase, userId } = context;

    const { data: session } = await supabase
      .from("viva_sessions")
      .select("id, category, transcript")
      .eq("id", data.sessionId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!session) throw new Error("Interview session not found.");

    const transcript = (session.transcript ?? []) as unknown as VivaTurn[];
    const feedback = await evaluateViva({
      category: session.category,
      transcript,
      speaking: data.speaking
        ? {
            spokenAnswers: data.speaking.spokenAnswers,
            totalSeconds: Math.round(data.speaking.totalSeconds),
            avgWpm: Math.round(data.speaking.avgWpm),
          }
        : undefined,
    });
    const report = { ...feedback, category: session.category, transcript };

    await supabase
      .from("viva_sessions")
      .update({
        scores: feedback.scores as unknown as Json,
        feedback: report as unknown as Json,
        overall_score: feedback.overall,
        completed: true,
      })
      .eq("id", session.id);

    await (await import("./activity.server")).recordActivity(supabase, userId, 15, Math.round(feedback.overall / 2));
    return report;
  });


export const getResume = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("resumes")
      .select("*")
      .eq("user_id", context.userId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return data;
  });

const SaveResumeInput = z.object({
  id: z.string().uuid().nullable(),
  title: z.string().trim().min(1).max(80),
  template: z.string().min(1).max(30),
  content: z.record(z.string(), z.unknown()),
  completion: z.number().int().min(0).max(100),
});

export const saveResume = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => SaveResumeInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const row = {
      user_id: userId,
      title: data.title,
      template: data.template,
      content: data.content as unknown as Json,
      completion: data.completion,
    };
    if (data.id) {
      const { error } = await supabase.from("resumes").update(row).eq("id", data.id).eq("user_id", userId);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    const { data: created, error } = await supabase.from("resumes").insert(row).select("id").single();
    if (error) throw new Error(error.message);
    return { id: created.id };
  });

const EnhanceResumeInput = z.object({
  content: z.record(z.string(), z.unknown()),
  template: z.string().min(1).max(30),
  targetRole: z.string().max(120),
});

export const enhanceResume = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => EnhanceResumeInput.parse(input))
  .handler(async ({ data }) => {
    const { improveResume } = await import("./ai.server");
    return improveResume({
      content: data.content as unknown as ResumeContent,
      template: data.template,
      targetRole: data.targetRole,
    });
  });

export const listCoverLetters = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("cover_letters")
      .select("*")
      .eq("user_id", context.userId)
      .order("updated_at", { ascending: false })
      .limit(10);
    return data ?? [];
  });

const CoverLetterInput = z.object({
  company: z.string().trim().min(1).max(120),
  position: z.string().trim().min(1).max(120),
  tone: z.enum(["Professional", "Formal", "Friendly"]),
  jobDescription: z.string().max(6000),
});

export const generateCoverLetter = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => CoverLetterInput.parse(input))
  .handler(async ({ data, context }) => {
    const { writeCoverLetter } = await import("./ai.server");
    const { supabase, userId } = context;

    const { data: resume } = await supabase
      .from("resumes")
      .select("content")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name, target_exam, level")
      .eq("id", userId)
      .maybeSingle();

    const content = await writeCoverLetter({
      company: data.company,
      position: data.position,
      tone: data.tone,
      jobDescription: data.jobDescription,
      resume: (resume?.content ?? {
        fullName: profile?.display_name ?? "",
        headline: profile?.target_exam ?? "",
      }) as unknown as ResumeContent,
    });

    const { data: created, error } = await supabase
      .from("cover_letters")
      .insert({
        user_id: userId,
        company: data.company,
        position: data.position,
        tone: data.tone,
        job_description: data.jobDescription,
        content,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return created;
  });

export const getPlan = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("study_plans")
      .select("*")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return data;
  });

export const buildPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { generateStudyPlan } = await import("./ai.server");
    const { supabase, userId } = context;

    const { data: profile } = await supabase
      .from("profiles")
      .select("target_exam, level, daily_minutes, exam_date")
      .eq("id", userId)
      .maybeSingle();
    const { data: attempts } = await supabase
      .from("mcq_attempts")
      .select("weak_topics")
      .eq("user_id", userId)
      .eq("completed", true)
      .order("created_at", { ascending: false })
      .limit(5);

    const weakSubjects = Array.from(
      new Set((attempts ?? []).flatMap((row) => row.weak_topics ?? [])),
    ).slice(0, 8);

    const weeksLeft = profile?.exam_date
      ? Math.max(
          1,
          Math.ceil((new Date(profile.exam_date).getTime() - Date.now()) / (7 * 86400000)),
        )
      : 6;

    const plan = await generateStudyPlan({
      exam: profile?.target_exam ?? "BCS (Cadre)",
      level: profile?.level ?? "Beginner",
      minutesPerDay: profile?.daily_minutes ?? 60,
      weeksLeft,
      weakSubjects,
    });

    const { data: created, error } = await supabase
      .from("study_plans")
      .insert({
        user_id: userId,
        exam: profile?.target_exam ?? "BCS (Cadre)",
        summary: plan.summary,
        weeks: plan.weeks as unknown as Json,
        daily_tasks: plan.dailyTasks as unknown as Json,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return created;
  });

const LogStudyInput = z.object({ minutes: z.number().int().min(1).max(600) });

export const logStudyTime = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => LogStudyInput.parse(input))
  .handler(async ({ data, context }) => {
    await (await import("./activity.server")).recordActivity(context.supabase, context.userId, data.minutes, data.minutes);
    return { ok: true };
  });
