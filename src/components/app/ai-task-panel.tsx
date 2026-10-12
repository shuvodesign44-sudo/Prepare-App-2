import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { backend } from "@/lib/backend";
import {
  createTasksApi,
  taskKey,
  taskPending,
  taskError,
  type AIKind,
  type AIInput,
} from "@/lib/ai-tasks";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
const tasks = createTasksApi(backend);
function readTask(key: string) {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}
function storeTask(key: string, id: string | null) {
  try {
    if (id) sessionStorage.setItem(key, id);
    else sessionStorage.removeItem(key);
  } catch {
    /* Storage may be disabled. */
  }
}
export function AITaskPanel({ kind, userId }: { kind: AIKind; userId: string }) {
  const storageKey = `prepare-ai-task:${userId}:${kind}`;
  const [id, setId] = useState<string | null>(() => readTask(storageKey));
  const [text, setText] = useState("");
  const [question, setQuestion] = useState("Tell us about yourself and why you want this role.");
  const [language, setLanguage] = useState<AIInput["language"]>("en");
  const [mode, setMode] = useState<AIInput["mode"]>("bcs");
  const request = useRef<{ body: string; key: string } | null>(null);
  const busy = useRef(false);
  const cache = useQueryClient();
  const query = useQuery({
    queryKey: taskKey(userId, id),
    enabled: Boolean(id),
    queryFn: ({ signal }) => tasks.get(id!, signal),
    retry: false,
    refetchInterval: (query) =>
      !query.state.error && taskPending(query.state.data) ? 2000 : false,
  });
  const mutation = useMutation({
    mutationFn: (input: AIInput) => {
      const body = JSON.stringify(input);
      if (request.current?.body !== body) request.current = { body, key: crypto.randomUUID() };
      return tasks.start(input, request.current.key);
    },
    onSuccess: (task) => {
      cache.setQueryData(taskKey(userId, task.id), task);
      setId(task.id);
      storeTask(storageKey, task.id);
      request.current = null;
    },
    onSettled: () => {
      busy.current = false;
    },
  });
  const submit = () => {
    if (busy.current || !text.trim() || (kind === "viva" && !question.trim())) return;
    busy.current = true;
    mutation.mutate({
      kind,
      language,
      mode,
      text:
        kind === "viva"
          ? JSON.stringify({ question: question.trim(), answer: text.trim() })
          : text.trim(),
    });
  };
  const reset = (next?: string) => {
    setId(null);
    storeTask(storageKey, null);
    mutation.reset();
    request.current = null;
    if (next) {
      setQuestion(next);
      setText("");
    }
  };
  const task = query.data;
  return (
    <div className="mt-5 space-y-4">
      <p className="text-sm text-muted-foreground">
        {kind === "viva"
          ? "Type an answer for feedback on relevance and content, then practise a follow-up question. Voice recording and pronunciation scoring are not available in this mode."
          : "Ask a study question in English or Bangla. Guidance may need checking against your study materials."}
      </p>
      {id ? (
        <>
          {(query.isPending || taskPending(task)) && (
            <div role="status" className="surface-card p-5 text-sm">
              {task?.status === "running"
                ? "Preparing your response…"
                : "Waiting for your response…"}{" "}
              You can return to this page while it processes.
            </div>
          )}
          {query.error && (
            <div role="alert" className="surface-card p-5 text-sm">
              <p>{query.error.message}</p>
              <Button variant="outline" className="mt-3" onClick={() => void query.refetch()}>
                Check again
              </Button>
            </div>
          )}
          {task?.status === "failed" && (
            <div role="alert" className="surface-card p-5 text-sm">
              {taskError(task.error)}
            </div>
          )}
          {task?.status === "deleted" && (
            <p role="status" className="surface-card p-5">
              This response was deleted.
            </p>
          )}
          {task?.status === "succeeded" &&
            (task.result?.answer ? (
              <div className="surface-card p-5">
                <h2 className="font-semibold">
                  {kind === "viva" ? "Your feedback" : "Tutor response"}
                </h2>
                <p className="mt-3 whitespace-pre-wrap text-sm">{task.result.answer}</p>
                {task.result.follow_up && (
                  <p className="mt-4 whitespace-pre-wrap text-sm">
                    <strong>Follow-up: </strong>
                    {task.result.follow_up}
                  </p>
                )}
                {task.result.limitations?.length > 0 && (
                  <ul className="mt-4 space-y-2 text-xs text-muted-foreground">
                    {task.result.limitations.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                )}
              </div>
            ) : (
              <p role="alert">No valid response was returned.</p>
            ))}
          {!query.isPending && !query.error && !taskPending(task) && (
            <>
              {kind === "viva" && task?.result?.follow_up && (
                <Button
                  className="w-full rounded-2xl"
                  onClick={() => reset(task.result!.follow_up!)}
                >
                  Answer follow-up
                </Button>
              )}
              <Button variant="outline" className="w-full rounded-2xl" onClick={() => reset()}>
                New {kind === "viva" ? "answer" : "question"}
              </Button>
            </>
          )}
        </>
      ) : (
        <>
          <fieldset disabled={mutation.isPending} className="space-y-4">
            <div className="flex gap-2">
              {(["en", "bn"] as const).map((value) => (
                <Button
                  key={value}
                  variant={language === value ? "default" : "outline"}
                  onClick={() => setLanguage(value)}
                >
                  {value === "en" ? "English" : "বাংলা"}
                </Button>
              ))}
            </div>
            {kind === "viva" && (
              <>
                <p className="text-sm font-semibold text-muted-foreground">Interview type</p>
                <div className="grid grid-cols-2 gap-2">
                  {(["bcs", "bank", "corporate", "admission"] as const).map((value) => (
                    <button
                      key={value}
                      onClick={() => setMode(value)}
                      className={cn(
                        "rounded-xl border px-3 py-3 text-xs font-medium capitalize",
                        mode === value
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-card",
                      )}
                    >
                      {value}
                    </button>
                  ))}
                </div>
                <label className="block text-sm font-semibold" htmlFor="viva-question">
                  Interview question
                </label>
                <Textarea
                  id="viva-question"
                  className="rounded-2xl"
                  value={question}
                  maxLength={2000}
                  onChange={(event) => setQuestion(event.target.value)}
                />
              </>
            )}
            <label className="block text-sm font-semibold" htmlFor="ai-input">
              {kind === "viva" ? "Your answer" : "Your study question"}
            </label>
            <Textarea
              id="ai-input"
              className="min-h-32 rounded-2xl"
              value={text}
              maxLength={8000}
              onChange={(event) => setText(event.target.value)}
              placeholder={
                kind === "viva" ? "Type your answer…" : "What would you like to understand?"
              }
            />
            <Button
              className="h-12 w-full rounded-2xl font-semibold"
              disabled={!text.trim() || (kind === "viva" && !question.trim())}
              onClick={submit}
            >
              {mutation.isPending ? "Sending…" : kind === "viva" ? "Get feedback" : "Ask tutor"}
            </Button>
          </fieldset>
          {mutation.error && (
            <p role="alert" className="surface-card p-4 text-sm">
              {mutation.error.message === "AI provider not configured"
                ? "AI is not configured yet. Complete the provider setup, then try again."
                : mutation.error.message}
            </p>
          )}
        </>
      )}
    </div>
  );
}
