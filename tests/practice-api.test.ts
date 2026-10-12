import { afterEach, test } from "node:test";
import assert from "node:assert/strict";
import { createApi } from "../src/lib/api-client.ts";
import {
  createPracticeApi,
  questionAnswers,
  remainingSeconds,
  type PracticeAttempt,
} from "../src/lib/practice-api.ts";
const original = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = original;
});
const questions = [
  {
    id: "question-b",
    text: "2+2",
    options: ["3", "4"],
    subject: "Math",
    topic: "Addition",
    difficulty: "easy" as const,
  },
  {
    id: "question-a",
    text: "3+3",
    options: ["6", "7"],
    subject: "Math",
    topic: "Addition",
    difficulty: "easy" as const,
  },
];
test("answers follow server question IDs even when questions are shuffled", () => {
  assert.deepEqual(questionAnswers(questions, { "1": 0, "0": 1 }), {
    "question-a": 0,
    "question-b": 1,
  });
  assert.deepEqual(questionAnswers(questions, { "1": 0 }), { "question-a": 0 });
});
test("invalid questions and answer indexes are rejected before submission", () => {
  for (const values of [{ "2": 0 }, { "0": -1 }, { "0": 2 }, { "0": 1.5 }])
    assert.throws(() => questionAnswers(questions, values));
});
test("timer uses server time, independent of the device clock", () => {
  const attempt = {
    deadline: "2026-01-01T10:05:00Z",
    server_time: "2026-01-01T10:00:01Z",
  } as PracticeAttempt;
  assert.equal(remainingSeconds(attempt), 299);
  assert.equal(remainingSeconds({ ...attempt, server_time: "2026-01-01T11:00:00Z" }), 0);
});
test("practice retries preserve the start key and submission sends no client score", async () => {
  const requests: { path: string; key: string | null; body: unknown }[] = [];
  globalThis.fetch = async (url, init) => {
    requests.push({
      path: String(url),
      key: new Headers(init?.headers).get("Idempotency-Key"),
      body: JSON.parse(String(init?.body)),
    });
    return new Response(JSON.stringify({ id: "attempt-1" }));
  };
  const session = async () => ({
    data: { session: { access_token: "test", user: { id: "alice" } } },
  });
  const api = createPracticeApi(
    createApi("http://localhost:8000", { auth: { getSession: session, refreshSession: session } }),
  );
  const input = {
    exam: "BCS",
    language: "en" as const,
    count: 5,
    duration_seconds: 300,
    adaptive: false,
  };
  await api.start(input, "same-request-key");
  await api.start(input, "same-request-key");
  assert.deepEqual(requests[0], requests[1]);
  await api.submit("attempt-1", questionAnswers(questions, { "0": 1 }));
  assert.equal(requests[2].path, "http://localhost:8000/api/v1/practice/attempt-1/submit");
  assert.deepEqual(requests[2].body, { answers: { "question-b": 1 } });
});
