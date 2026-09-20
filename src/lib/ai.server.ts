// Server-only Lovable AI helpers for Prepare.
import type {
  McqQuestion,
  ResumeContent,
  StudyPlan,
  VivaFeedback,
  VivaTurn,
} from "./prepare-types";

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "openai/gpt-5.6-sol";

class AiError extends Error {}

async function callAi(system: string, user: string): Promise<unknown> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new AiError("AI is not configured yet. Please try again later.");

  const res = await fetch(GATEWAY, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      reasoning_effort: "none",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });

  if (res.status === 429) throw new AiError("Too many requests right now. Try again in a moment.");
  if (res.status === 402) throw new AiError("AI credits are exhausted. Please add credits to continue.");
  if (!res.ok) {
    console.error("AI gateway error", res.status, await res.text());
    throw new AiError("The AI service failed to respond. Please try again.");
  }

  const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const text = json.choices?.[0]?.message?.content;
  if (!text) throw new AiError("The AI returned an empty response. Please try again.");
  try {
    return JSON.parse(text);
  } catch {
    throw new AiError("The AI returned an unreadable response. Please try again.");
  }
}

const LANG = (language: string) =>
  language === "Bangla"
    ? "Write all question text, options and explanations in Bangla (Bengali script)."
    : "Write everything in clear English.";

export async function generateMcqSet(input: {
  category: string;
  difficulty: string;
  language: string;
  count: number;
  weakTopics: string[];
}): Promise<McqQuestion[]> {
  const system =
    "You are a senior question setter for Bangladeshi competitive recruitment exams (BCS, bank, NTRCA, primary teacher, railway, police). You write accurate, exam-standard MCQs with exactly one correct option. Reply with JSON only.";
  const user = `Create ${input.count} multiple-choice questions for the "${input.category}" exam category.
Difficulty: ${input.difficulty}. ${LANG(input.language)}
${input.weakTopics.length ? `Give extra weight to these weak topics of the candidate: ${input.weakTopics.join(", ")}.` : ""}
Mix previous-year-style questions with fresh ones. Facts must be correct and current for Bangladesh.
Return JSON exactly as: {"questions":[{"question":string,"options":[string,string,string,string],"answerIndex":0-3,"explanation":string,"topic":string,"difficulty":"easy"|"medium"|"hard"}]}
Keep each explanation under 40 words. Topics should be short labels like "Bangladesh Liberation War" or "Vocabulary".`;

  const parsed = (await callAi(system, user)) as { questions?: McqQuestion[] };
  const questions = (parsed.questions ?? []).filter(
    (q) => q?.question && Array.isArray(q.options) && q.options.length === 4,
  );
  if (!questions.length) throw new AiError("Could not build the question set. Please try again.");
  return questions.slice(0, input.count).map((q) => ({
    ...q,
    answerIndex: Math.min(3, Math.max(0, Number(q.answerIndex) || 0)),
    topic: q.topic || input.category,
    difficulty: (["easy", "medium", "hard"] as const).includes(q.difficulty) ? q.difficulty : "medium",
  }));
}

export async function explainMcq(input: {
  question: string;
  options: string[];
  answerIndex: number;
  language: string;
}): Promise<string> {
  const system =
    "You are a patient exam tutor for Bangladeshi job aspirants. Explain clearly and briefly. Reply with JSON only.";
  const user = `Question: ${input.question}
Options: ${input.options.map((o, i) => `${i + 1}. ${o}`).join(" | ")}
Correct option number: ${input.answerIndex + 1}. ${LANG(input.language)}
Explain why the correct answer is right, why the closest wrong option is tempting, and give one memory trick.
Return JSON: {"explanation":string} under 110 words.`;

  const parsed = (await callAi(system, user)) as { explanation?: string };
  if (!parsed.explanation) throw new AiError("Could not explain this question. Please try again.");
  return parsed.explanation;
}

export async function analyseMcqAttempt(input: {
  category: string;
  score: number;
  total: number;
  wrong: { question: string; topic: string; chosen: string; correct: string }[];
}) {
  const system =
    "You are an exam performance analyst for Bangladeshi job aspirants. Reply with JSON only.";
  const user = `Category: ${input.category}. Score: ${input.score}/${input.total}.
Wrong answers: ${JSON.stringify(input.wrong).slice(0, 4000)}
Return JSON: {"weakTopics":[string],"strongTopics":[string],"rankPrediction":string,"advice":string}
rankPrediction is a short realistic statement about competitiveness in this exam. advice is 2 sentences of concrete next steps.`;

  const parsed = (await callAi(system, user)) as Partial<{
    weakTopics: string[];
    strongTopics: string[];
    rankPrediction: string;
    advice: string;
  }>;
  return {
    weakTopics: parsed.weakTopics ?? [],
    strongTopics: parsed.strongTopics ?? [],
    rankPrediction: parsed.rankPrediction ?? "Keep practising to build a competitive score.",
    advice: parsed.advice ?? "Review the explanations for every wrong answer, then retry this set.",
  };
}

export async function nextVivaQuestion(input: {
  category: string;
  transcript: VivaTurn[];
  candidate: { name: string; exam: string };
}): Promise<{ question: string; done: boolean }> {
  const system = `You are a professional interviewer conducting a ${input.category} for a Bangladeshi candidate. Ask one natural question at a time, following up on the candidate's previous answer. Reply with JSON only.`;
  const asked = input.transcript.filter((t) => t.role === "interviewer").length;
  const user = `Candidate: ${input.candidate.name}, preparing for ${input.candidate.exam}.
Conversation so far: ${JSON.stringify(input.transcript).slice(0, 6000)}
Questions asked so far: ${asked}. Ask a total of 6 questions, then finish.
Return JSON: {"question":string,"done":boolean}
Set done=true only when 6 questions have already been answered; then question can be a short closing line.`;

  const parsed = (await callAi(system, user)) as { question?: string; done?: boolean };
  return {
    question: parsed.question ?? "Tell me about yourself.",
    done: Boolean(parsed.done) || asked >= 6,
  };
}

export async function transcribeWav(base64: string): Promise<string> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new AiError("AI is not configured yet. Please try again later.");

  const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
  if (bytes.byteLength < 2048) throw new AiError("That recording was empty — please try again.");

  const form = new FormData();
  form.append("model", "openai/gpt-4o-transcribe");
  form.append("file", new Blob([bytes], { type: "audio/wav" }), "answer.wav");

  const res = await fetch("https://ai.gateway.lovable.dev/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}` },
    body: form,
  });

  if (res.status === 429) throw new AiError("Too many requests right now. Try again in a moment.");
  if (res.status === 402) throw new AiError("AI credits are exhausted. Please add credits to continue.");
  if (!res.ok) {
    console.error("Transcription error", res.status, await res.text());
    throw new AiError("Could not transcribe your answer. Please try again.");
  }

  const json = (await res.json()) as { text?: string };
  const text = (json.text ?? "").trim();
  if (!text) throw new AiError("We could not hear anything. Please record again.");
  return text;
}

export async function evaluateViva(input: {
  category: string;
  transcript: VivaTurn[];
  speaking?: { spokenAnswers: number; totalSeconds: number; avgWpm: number };
}): Promise<VivaFeedback> {
  const system =
    "You are a strict but fair viva board examiner. Score honestly from 0-100. Reply with JSON only.";
  const user = `Interview type: ${input.category}.
Transcript: ${JSON.stringify(input.transcript).slice(0, 8000)}
${
  input.speaking
    ? `Spoken delivery data: ${input.speaking.spokenAnswers} answers spoken aloud, ${input.speaking.totalSeconds} total speaking seconds, average speaking rate ${input.speaking.avgWpm} words per minute. Use this to judge fluency, pronunciation and pacing (ideal 110-150 wpm).`
    : "The candidate typed the answers, so judge pronunciation conservatively from wording only."
}
Return JSON: {"overall":number,"scores":{"confidence":number,"fluency":number,"grammar":number,"communication":number,"answerQuality":number,"professionalism":number,"pronunciation":number},"strongAreas":[string],"weakAreas":[string],"improvements":[string],"betterAnswers":[{"question":string,"answer":string}]}
Give at most 3 items per list and at most 3 betterAnswers (each under 80 words).`;

  const parsed = (await callAi(system, user)) as Partial<VivaFeedback>;
  const scores = {
    confidence: 0,
    fluency: 0,
    grammar: 0,
    communication: 0,
    answerQuality: 0,
    professionalism: 0,
    ...(parsed.scores ?? {}),
  };
  return {
    overall: Number(parsed.overall) || Math.round(
      Object.values(scores).reduce((a, b) => a + Number(b || 0), 0) / 6,
    ),
    scores,
    strongAreas: parsed.strongAreas ?? [],
    weakAreas: parsed.weakAreas ?? [],
    improvements: parsed.improvements ?? [],
    betterAnswers: parsed.betterAnswers ?? [],
    speaking: input.speaking,
  };
}


export async function generateStudyPlan(input: {
  exam: string;
  level: string;
  minutesPerDay: number;
  weeksLeft: number;
  weakSubjects: string[];
}): Promise<StudyPlan> {
  const system =
    "You are an experienced Bangladeshi job-exam coach who builds realistic study roadmaps. Reply with JSON only.";
  const user = `Target exam: ${input.exam}. Current level: ${input.level}. Study time: ${input.minutesPerDay} minutes/day. Weeks until exam: ${input.weeksLeft}.
Weak subjects: ${input.weakSubjects.join(", ") || "not measured yet"}.
Return JSON: {"summary":string,"weeks":[{"week":number,"focus":string,"subjects":[string],"tasks":[string],"milestone":string}],"dailyTasks":[{"title":string,"minutes":number,"subject":string}]}
Produce ${Math.min(8, Math.max(4, input.weeksLeft))} weeks and 4 dailyTasks whose minutes sum to about ${input.minutesPerDay}. Cover Bangla, English, Math, GK, Bangladesh Affairs, International Affairs, ICT plus mock tests, viva and revision.`;

  const parsed = (await callAi(system, user)) as Partial<StudyPlan>;
  if (!parsed.weeks?.length) throw new AiError("Could not build a roadmap. Please try again.");
  return {
    summary: parsed.summary ?? "",
    weeks: parsed.weeks,
    dailyTasks: parsed.dailyTasks ?? [],
  };
}

export async function improveResume(input: {
  content: ResumeContent;
  template: string;
  targetRole: string;
}): Promise<ResumeContent> {
  const system =
    "You are an expert CV writer for the Bangladeshi job market. You improve wording without inventing false facts. Reply with JSON only.";
  const user = `Template style: ${input.template}. Target role: ${input.targetRole || "general"}.
Current resume data: ${JSON.stringify(input.content).slice(0, 6000)}
Rewrite the summary, tighten each experience bullet into achievement-focused ATS-friendly lines, and suggest relevant skills. Keep all names, dates, employers and institutions exactly as given. Do not invent jobs or degrees.
Return JSON with the same shape as the input resume object.`;

  const parsed = (await callAi(system, user)) as Partial<ResumeContent>;
  return { ...input.content, ...parsed };
}

export async function writeCoverLetter(input: {
  company: string;
  position: string;
  tone: string;
  jobDescription: string;
  resume: ResumeContent;
}): Promise<string> {
  const system =
    "You are an expert cover-letter writer for Bangladeshi government, bank, NGO and corporate applications. Reply with JSON only.";
  const user = `Company/organisation: ${input.company}. Position: ${input.position}. Tone: ${input.tone}.
Job description: ${input.jobDescription.slice(0, 3000) || "not provided"}
Candidate profile: ${JSON.stringify(input.resume).slice(0, 4000)}
Write a one-page cover letter (250-350 words) tailored to the role. Use only facts from the candidate profile.
Return JSON: {"content":string} with the letter as plain text including line breaks.`;

  const parsed = (await callAi(system, user)) as { content?: string };
  if (!parsed.content) throw new AiError("Could not write the letter. Please try again.");
  return parsed.content;
}
