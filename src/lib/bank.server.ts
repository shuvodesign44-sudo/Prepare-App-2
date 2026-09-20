// Server-only question bank: reads the shared bank, tops it up with AI, caches results.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type { McqQuestion } from "./prepare-types";
import { generateMcqSet } from "./ai.server";

type Client = SupabaseClient<Database>;

export interface BankQuery {
  examCategory: string;
  subject: string;
  difficulty: string;
  language: string;
  count: number;
  weakTopics?: string[];
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

type Row = Database["public"]["Tables"]["questions"]["Row"];

function toQuestion(row: Row): McqQuestion {
  return {
    id: row.id,
    question: row.question_text,
    options: row.options,
    answerIndex: row.answer_index,
    explanation: row.explanation || row.ai_explanation,
    topic: row.topic || row.subject,
    difficulty: (["easy", "medium", "hard"] as const).includes(
      row.difficulty as "easy" | "medium" | "hard",
    )
      ? (row.difficulty as "easy" | "medium" | "hard")
      : "medium",
    subject: row.subject,
  };
}

export async function readBank(supabase: Client, query: BankQuery): Promise<McqQuestion[]> {
  let builder = supabase
    .from("questions")
    .select("*")
    .eq("status", "approved")
    .eq("exam_category", query.examCategory)
    .eq("language", query.language);

  if (query.subject && query.subject !== "Mixed") builder = builder.eq("subject", query.subject);
  if (query.difficulty && query.difficulty !== "mixed")
    builder = builder.eq("difficulty", query.difficulty);

  const pool = query.count * 6;
  const { count } = await supabase
    .from("questions")
    .select("id", { count: "exact", head: true })
    .eq("status", "approved")
    .eq("exam_category", query.examCategory)
    .eq("language", query.language);

  const total = count ?? 0;
  const offset = total > pool ? Math.floor(Math.random() * (total - pool)) : 0;

  const { data } = await builder.range(offset, offset + pool - 1);
  return shuffle((data ?? []).map(toQuestion));
}

async function persist(questions: McqQuestion[], query: BankQuery) {
  if (!questions.length) return;
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("questions").insert(
      questions.map((q) => ({
        exam_category: query.examCategory,
        subject: q.subject ?? (query.subject === "Mixed" ? q.topic : query.subject),
        topic: q.topic,
        difficulty: q.difficulty,
        question_text: q.question,
        options: q.options,
        answer_index: q.answerIndex,
        explanation: q.explanation,
        language: query.language,
        status: "approved",
        source: "ai",
      })),
    );
  } catch (error) {
    console.error("bank persist failed", error);
  }
}

/** Returns `count` questions, generating and caching new ones when the bank is short. */
export async function ensureQuestions(supabase: Client, query: BankQuery): Promise<McqQuestion[]> {
  const cached = await readBank(supabase, query);
  if (cached.length >= query.count) return cached.slice(0, query.count);

  const missing = query.count - cached.length;
  const batches: number[] = [];
  let left = missing;
  while (left > 0) {
    batches.push(Math.min(20, left));
    left -= 20;
  }

  const results = await Promise.allSettled(
    batches.map((size) =>
      generateMcqSet({
        category: query.subject === "Mixed" ? query.examCategory : `${query.examCategory} — ${query.subject}`,
        difficulty: query.difficulty,
        language: query.language,
        count: size,
        weakTopics: query.weakTopics ?? [],
      }),
    ),
  );

  const fresh = results.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
  if (!cached.length && !fresh.length)
    throw new Error("Could not build the question set. Please try again.");

  await persist(fresh, query);
  return shuffle([...cached, ...fresh]).slice(0, query.count);
}
