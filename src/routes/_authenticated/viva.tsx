import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Download, Loader2, Mic, Square } from "lucide-react";
import {
  answerViva,
  finishViva,
  startViva,
  transcribeVivaAnswer,
} from "@/lib/prepare.functions";
import { VIVA_CATEGORIES, type VivaFeedback, type VivaTurn } from "@/lib/prepare-types";
import { blobToBase64, startRecording } from "@/lib/wav-recorder";
import { analyseSpeech, isLiveTranscriptSupported, startLiveTranscript } from "@/lib/live-speech";

interface LiveCoachState {
  level: number;
  seconds: number;
  wpm: number;
  fillers: number;
  fillerWords: string[];
  silentFor: number;
}

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { BottomNav } from "@/components/app/bottom-nav";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/viva")({
  head: () => ({
    meta: [
      { title: "AI Viva Simulator — Prepare" },
      { name: "description", content: "Practise BCS, bank and corporate viva with an AI board." },
      { property: "og:title", content: "AI Viva Simulator — Prepare" },
      { property: "og:description", content: "Realistic AI interview practice with scoring." },
    ],
  }),
  component: VivaScreen,
});

function downloadReport(feedback: VivaFeedback) {
  const rows = Object.entries(feedback.scores)
    .map(
      ([key, value]) =>
        `<tr><td>${key.replace(/([A-Z])/g, " $1")}</td><td><b>${value ?? "—"}</b></td></tr>`,
    )
    .join("");
  const list = (title: string, items: string[]) =>
    items.length
      ? `<h3>${title}</h3><ul>${items.map((item) => `<li>${item}</li>`).join("")}</ul>`
      : "";
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8" />
<title>Prepare — Speaking Report</title>
<style>body{font-family:Inter,system-ui,sans-serif;color:#0F172A;max-width:720px;margin:40px auto;padding:0 24px;line-height:1.6}
h1{color:#2563FF;margin-bottom:4px}table{border-collapse:collapse;width:100%;margin:12px 0}
td{border-bottom:1px solid #E2E8F0;padding:8px 4px;text-transform:capitalize}
.score{font-size:44px;font-weight:800;color:#2563FF}
.turn{background:#F8FAFC;border-radius:12px;padding:10px 14px;margin:8px 0}
.turn.me{background:#EEF4FF}</style></head><body>
<h1>Prepare — AI Speaking &amp; Viva Report</h1>
<p>${feedback.category ?? "Viva"} · ${new Date().toLocaleString()}</p>
<p class="score">${feedback.overall}<span style="font-size:16px;color:#64748B">/100</span></p>
<table>${rows}</table>
${
  feedback.speaking
    ? `<p><b>Delivery:</b> ${feedback.speaking.spokenAnswers} spoken answers · ${feedback.speaking.totalSeconds}s speaking · ${feedback.speaking.avgWpm} words/min</p>`
    : ""
}
${list("Strong areas", feedback.strongAreas)}
${list("Needs work", feedback.weakAreas)}
${list("How to improve", feedback.improvements)}
${
  feedback.betterAnswers.length
    ? `<h3>Model answers</h3>${feedback.betterAnswers
        .map((item) => `<p><b>${item.question}</b><br/>${item.answer}</p>`)
        .join("")}`
    : ""
}
${
  feedback.transcript?.length
    ? `<h3>Transcript</h3>${feedback.transcript
        .map(
          (turn) =>
            `<div class="turn ${turn.role === "candidate" ? "me" : ""}"><b>${
              turn.role === "candidate" ? "You" : "Interviewer"
            }:</b> ${turn.content}</div>`,
        )
        .join("")}`
    : ""
}
<p style="color:#64748B;margin-top:32px">Prepare Today. Get Hired Tomorrow.</p>
</body></html>`;

  const url = URL.createObjectURL(new Blob([html], { type: "text/html" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `prepare-speaking-report-${new Date().toISOString().slice(0, 10)}.html`;
  link.click();
  URL.revokeObjectURL(url);
}

function VivaScreen() {
  const start = useServerFn(startViva);
  const answer = useServerFn(answerViva);
  const finish = useServerFn(finishViva);
  const transcribe = useServerFn(transcribeVivaAnswer);

  const [category, setCategory] = useState<string>(VIVA_CATEGORIES[0]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<VivaTurn[]>([]);
  const [draft, setDraft] = useState("");
  const [feedback, setFeedback] = useState<VivaFeedback | null>(null);
  const [done, setDone] = useState(false);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [live, setLive] = useState<LiveCoachState | null>(null);
  const recorder = useRef<{ stop: () => Promise<{ blob: Blob; seconds: number }> } | null>(null);
  const liveTranscript = useRef<{ stop: () => void } | null>(null);
  const liveText = useRef("");
  const silenceSince = useRef<number | null>(null);
  const lastPaint = useRef(0);
  const speech = useRef({ spokenAnswers: 0, totalSeconds: 0, words: 0 });


  const startMutation = useMutation({
    mutationFn: () => start({ data: { category } }),
    onSuccess: (data) => {
      setSessionId(data.sessionId);
      setTranscript(data.transcript);
      setFeedback(null);
      setDone(false);
      setDraft("");
      speech.current = { spokenAnswers: 0, totalSeconds: 0, words: 0 };
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const answerMutation = useMutation({
    mutationFn: () => answer({ data: { sessionId: sessionId!, answer: draft.trim() } }),
    onSuccess: (data) => {
      setTranscript(data.transcript);
      setDraft("");
      setDone(data.done);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const finishMutation = useMutation({
    mutationFn: () => {
      const { spokenAnswers, totalSeconds, words } = speech.current;
      return finish({
        data: {
          sessionId: sessionId!,
          speaking:
            spokenAnswers > 0 && totalSeconds > 0
              ? {
                  spokenAnswers,
                  totalSeconds,
                  avgWpm: Math.round((words / totalSeconds) * 60),
                }
              : null,
        },
      });
    },
    onSuccess: (data) => {
      setFeedback(data);
      setSessionId(null);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const toggleRecording = async () => {
    if (recording) {
      setRecording(false);
      const active = recorder.current;
      recorder.current = null;
      liveTranscript.current?.stop();
      liveTranscript.current = null;
      setLive(null);
      if (!active) return;
      setTranscribing(true);
      try {
        const { blob, seconds } = await active.stop();
        if (blob.size < 4096) {
          toast.error("That recording was too short — please try again.");
          return;
        }
        const { text } = await transcribe({ data: { audioBase64: await blobToBase64(blob) } });
        speech.current = {
          spokenAnswers: speech.current.spokenAnswers + 1,
          totalSeconds: speech.current.totalSeconds + seconds,
          words: speech.current.words + text.trim().split(/\s+/).length,
        };
        setDraft((prev) => (prev ? `${prev} ${text}` : text));
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Recording failed.");
      } finally {
        setTranscribing(false);
      }
      return;
    }

    try {
      liveText.current = "";
      silenceSince.current = null;
      lastPaint.current = 0;
      setLive({ level: 0, seconds: 0, wpm: 0, fillers: 0, fillerWords: [], silentFor: 0 });

      recorder.current = await startRecording({
        onFrame: ({ level, seconds }) => {
          const now = Date.now();
          if (level < 0.05) {
            if (silenceSince.current === null) silenceSince.current = now;
          } else {
            silenceSince.current = null;
          }
          if (now - lastPaint.current < 220) return;
          lastPaint.current = now;

          const { words, fillers, fillerWords } = analyseSpeech(liveText.current);
          setLive({
            level,
            seconds,
            wpm: seconds > 2 && words ? Math.round((words / seconds) * 60) : 0,
            fillers,
            fillerWords,
            silentFor: silenceSince.current ? (now - silenceSince.current) / 1000 : 0,
          });
        },
      });
      liveTranscript.current = startLiveTranscript((text) => {
        liveText.current = text;
      });
      setRecording(true);
    } catch {
      setLive(null);
      toast.error("Microphone access is needed to answer by voice.");
    }
  };


  return (
    <main className="hero-surface min-h-screen pb-28">
      <div className="mx-auto max-w-md px-6 pt-10">
        <h1 className="text-2xl font-extrabold">AI Viva Simulator</h1>

        {feedback ? (
          <div className="mt-5 space-y-4">
            <div className="surface-card glow-ring p-6 text-center">
              <p className="text-5xl font-extrabold text-primary">{feedback.overall}</p>
              <p className="mt-1 text-sm text-muted-foreground">Overall viva score</p>
            </div>
            {feedback.speaking ? (
              <div className="surface-card grid grid-cols-3 divide-x divide-border text-center">
                <Stat label="Spoken" value={String(feedback.speaking.spokenAnswers)} />
                <Stat label="Seconds" value={String(feedback.speaking.totalSeconds)} />
                <Stat label="Words/min" value={String(feedback.speaking.avgWpm)} />
              </div>
            ) : null}
            <div className="surface-card divide-y divide-border">
              {Object.entries(feedback.scores).map(([key, value]) => (
                <div key={key} className="flex justify-between px-4 py-3 text-sm">
                  <span className="capitalize text-muted-foreground">
                    {key.replace(/([A-Z])/g, " $1")}
                  </span>
                  <span className="font-semibold">{value}</span>
                </div>
              ))}
            </div>
            <FeedbackList title="Strong areas" items={feedback.strongAreas} />
            <FeedbackList title="Needs work" items={feedback.weakAreas} />
            <FeedbackList title="How to improve" items={feedback.improvements} />
            {feedback.betterAnswers.map((item) => (
              <div key={item.question} className="surface-card p-4">
                <p className="text-sm font-semibold">{item.question}</p>
                <p className="mt-2 text-sm text-muted-foreground">{item.answer}</p>
              </div>
            ))}
            <Button
              variant="outline"
              className="h-12 w-full rounded-2xl font-semibold"
              onClick={() => downloadReport(feedback)}
            >
              <Download className="mr-2 size-4" /> Download speaking report
            </Button>
            <Button
              className="h-12 w-full rounded-2xl font-semibold"
              onClick={() => setFeedback(null)}
            >
              New interview
            </Button>
          </div>
        ) : sessionId ? (
          <div className="mt-5">
            <div className="space-y-3">
              {transcript.map((turn, turnIndex) => (
                <div
                  key={turnIndex}
                  className={cn(
                    "rounded-2xl px-4 py-3 text-sm",
                    turn.role === "interviewer"
                      ? "surface-card"
                      : "ml-8 bg-primary text-primary-foreground",
                  )}
                >
                  {turn.content}
                </div>
              ))}
            </div>

            {done ? (
              <Button
                className="mt-6 h-12 w-full rounded-2xl font-semibold"
                disabled={finishMutation.isPending}
                onClick={() => finishMutation.mutate()}
              >
                {finishMutation.isPending ? "Evaluating…" : "Get my evaluation"}
              </Button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={toggleRecording}
                  disabled={transcribing}
                  className={cn(
                    "mt-6 flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-4 text-sm font-semibold transition-colors",
                    recording
                      ? "bg-destructive text-destructive-foreground"
                      : "ai-surface glow-ring",
                  )}
                >
                  {transcribing ? (
                    <>
                      <Loader2 className="size-4 animate-spin" /> Transcribing your answer…
                    </>
                  ) : recording ? (
                    <>
                      <Square className="size-4" /> Stop &amp; transcribe
                    </>
                  ) : (
                    <>
                      <Mic className="size-4" /> Answer by voice
                    </>
                  )}
                </button>
                {recording && live ? <LiveCoach live={live} /> : null}


                <Textarea
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder="Your answer appears here after recording — or type it."
                  className="mt-4 min-h-28 rounded-2xl"
                />
                <Button
                  className="mt-3 h-12 w-full rounded-2xl font-semibold"
                  disabled={!draft.trim() || answerMutation.isPending || recording}
                  onClick={() => answerMutation.mutate()}
                >
                  {answerMutation.isPending ? "Thinking…" : "Send answer"}
                </Button>
              </>
            )}
          </div>
        ) : (
          <div>
            <p className="mt-1 text-sm text-muted-foreground">
              Speak your answers into the mic. Six natural questions, then a full scorecard on
              confidence, fluency, pronunciation and answer quality.
            </p>
            <p className="mt-7 text-sm font-semibold text-muted-foreground">Interview type</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {VIVA_CATEGORIES.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setCategory(item)}
                  className={cn(
                    "rounded-xl border px-3 py-3 text-xs font-medium transition-colors",
                    category === item
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card hover:bg-accent",
                  )}
                >
                  {item}
                </button>
              ))}
            </div>
            <Button
              size="lg"
              className="mt-9 h-14 w-full rounded-2xl text-base font-semibold"
              disabled={startMutation.isPending}
              onClick={() => startMutation.mutate()}
            >
              {startMutation.isPending ? "Preparing the board…" : "Start interview"}
            </Button>
          </div>
        )}
      </div>
      <BottomNav />
    </main>
  );
}

function LiveCoach({ live }: { live: LiveCoachState }) {
  const pace =
    live.wpm === 0
      ? { label: "Listening…", tone: "text-muted-foreground" }
      : live.wpm < 100
        ? { label: "A bit slow", tone: "text-[color:var(--warning,#F6B400)]" }
        : live.wpm > 170
          ? { label: "Slow down", tone: "text-destructive" }
          : { label: "Good pace", tone: "text-primary" };

  const bars = Array.from({ length: 16 });
  const silenceWarning = live.silentFor > 2.5;

  return (
    <div className="surface-card mt-3 p-4">
      <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="size-2 animate-pulse rounded-full bg-destructive" /> Live coach
        </span>
        <span>{live.seconds.toFixed(0)}s</span>
      </div>

      <div className="mt-3 flex h-8 items-end gap-1">
        {bars.map((_, index) => (
          <span
            key={index}
            className={cn(
              "flex-1 rounded-full transition-[height] duration-150",
              live.level * bars.length > index ? "bg-primary" : "bg-border",
            )}
            style={{
              height: `${Math.max(12, Math.min(100, live.level * 140 * (0.6 + ((index % 4) * 0.18))))}%`,
            }}
          />
        ))}
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="text-base font-bold">{live.wpm || "—"}</p>
          <p className="text-[10px] text-muted-foreground">words/min</p>
        </div>
        <div>
          <p className={cn("text-xs font-semibold leading-6", pace.tone)}>{pace.label}</p>
          <p className="text-[10px] text-muted-foreground">pace</p>
        </div>
        <div>
          <p
            className={cn(
              "text-base font-bold",
              live.fillers > 3 ? "text-destructive" : undefined,
            )}
          >
            {live.fillers}
          </p>
          <p className="text-[10px] text-muted-foreground">fillers</p>
        </div>
      </div>

      {silenceWarning ? (
        <p className="mt-3 rounded-xl bg-destructive/10 px-3 py-2 text-[11px] font-medium text-destructive">
          Silent for {live.silentFor.toFixed(0)}s — keep talking or stop and submit.
        </p>
      ) : live.fillerWords.length ? (
        <p className="mt-3 rounded-xl bg-accent px-3 py-2 text-[11px] text-muted-foreground">
          Watch these filler words: {live.fillerWords.join(", ")}
        </p>
      ) : (
        <p className="mt-3 text-center text-[11px] text-muted-foreground">
          {isLiveTranscriptSupported()
            ? "Speak naturally — aim for 110–150 words per minute."
            : "Live word tracking isn't supported in this browser; volume and silence still apply."}
        </p>
      )}
    </div>
  );
}


function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-2 py-4">
      <p className="text-lg font-bold">{value}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}

function FeedbackList({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <div className="surface-card p-4">
      <p className="text-sm font-semibold">{title}</p>
      <ul className="mt-2 space-y-1.5">
        {items.map((item) => (
          <li key={item} className="text-sm text-muted-foreground">
            • {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
