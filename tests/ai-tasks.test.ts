import { afterEach, test } from "node:test";
import assert from "node:assert/strict";
import { createApi, ApiError } from "../src/lib/api-client.ts";
import {
  createTasksApi,
  taskPending,
  taskKey,
  type AITask,
  type AIInput,
} from "../src/lib/ai-tasks.ts";
const original = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = original;
});
const session = async () => ({
  data: { session: { access_token: "test", user: { id: "alice" } } },
});
const tasks = () =>
  createTasksApi(
    createApi("http://localhost:8000", { auth: { getSession: session, refreshSession: session } }),
  );
test("only queued and running tasks require polling", () => {
  for (const status of ["queued", "running", "succeeded", "failed", "deleted"] as const)
    assert.equal(taskPending({ status } as AITask), status === "queued" || status === "running");
  assert.equal(taskPending(), false);
  assert.notDeepEqual(taskKey("alice", "job"), taskKey("bob", "job"));
});
test("manual start retries preserve idempotency and polling performs only GET", async () => {
  const calls: string[] = [];
  globalThis.fetch = async (url, init) => {
    const method = init?.method ?? "GET";
    if (method === "POST")
      assert.equal(new Headers(init?.headers).get("Idempotency-Key"), "stable-ai-key");
    else assert.equal(init?.body, undefined);
    calls.push(`${method} ${url}`);
    return new Response(JSON.stringify({ id: "job", status: "queued" }));
  };
  const api = tasks();
  const input: AIInput = { kind: "tutor", text: "Explain fractions", language: "en", mode: "bcs" };
  await api.start(input, "stable-ai-key");
  await api.start(input, "stable-ai-key");
  await api.get("job");
  assert.equal(calls[0], calls[1]);
  assert.equal(calls[2], "GET http://localhost:8000/api/v1/tasks/job");
});
test("missing provider surfaces an error without inventing an AI result", async () => {
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ detail: "AI provider not configured" }), { status: 503 });
  await assert.rejects(
    tasks().start(
      { kind: "viva", text: "My answer", language: "bn", mode: "bank" },
      "stable-ai-key",
    ),
    (error: ApiError) => error.status === 503,
  );
});
