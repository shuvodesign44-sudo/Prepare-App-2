import { afterEach, test } from "node:test";
import assert from "node:assert/strict";
import { createApi, ApiError } from "../src/lib/api-client.ts";

const originalFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = originalFetch;
});
const session = (token = "old", owner = "alice") => ({
  data: { session: { access_token: token, user: { id: owner } } },
});
const source = () => ({
  auth: { getSession: async () => session(), refreshSession: async () => session("new") },
});
const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status });

test("uses the configured API URL and Supabase bearer", async () => {
  globalThis.fetch = async (url, options) => {
    assert.equal(url, "http://localhost:8000/api/v1/profile");
    assert.equal(new Headers(options?.headers).get("Authorization"), "Bearer old");
    return json({ id: "alice" });
  };
  assert.deepEqual(await createApi("http://localhost:8000/", source()).request("/profile"), {
    id: "alice",
  });
});

test("refreshes a rejected session and preserves a mutation on retry", async () => {
  let calls = 0;
  globalThis.fetch = async (_url, options) => {
    assert.equal(options?.body, '{"language":"bn"}');
    assert.equal(new Headers(options?.headers).get("Idempotency-Key"), "stable-key");
    const token = new Headers(options?.headers).get("Authorization");
    calls++;
    return token === "Bearer old" ? json({}, 401) : json({ saved: true });
  };
  const result = await createApi("http://localhost:8000", source()).request(
    "/profile",
    { method: "PUT", body: '{"language":"bn"}' },
    "stable-key",
  );
  assert.deepEqual(result, { saved: true });
  assert.equal(calls, 2);
});

test("does not replay a request as a different account", async () => {
  let calls = 0;
  globalThis.fetch = async () => {
    calls++;
    return json({}, 401);
  };
  const sessions = source();
  sessions.auth.refreshSession = async () => session("new", "bob");
  await assert.rejects(
    createApi("http://localhost:8000", sessions).request("/profile"),
    (e: ApiError) => e.status === 401,
  );
  assert.equal(calls, 1);
});

test("shares one refresh across concurrent rejected requests", async () => {
  let refreshes = 0;
  const sessions = source();
  sessions.auth.refreshSession = async () => {
    refreshes++;
    await new Promise((resolve) => setTimeout(resolve, 10));
    return session("new");
  };
  globalThis.fetch = async (_url, options) =>
    new Headers(options?.headers).get("Authorization") === "Bearer old" ? json({}, 401) : json({});
  const api = createApi("http://localhost:8000", sessions);
  await Promise.all([api.request("/profile"), api.request("/settings")]);
  assert.equal(refreshes, 1);
});

test("reports dependency errors without replaying mutations", async () => {
  let calls = 0;
  globalThis.fetch = async () => {
    calls++;
    return json({ detail: "Unavailable" }, 503);
  };
  await assert.rejects(
    createApi("http://localhost:8000", source()).request("/settings", {
      method: "PUT",
      body: "{}",
    }),
    (e: ApiError) => e.status === 503 && e.message === "Unavailable",
  );
  assert.equal(calls, 1);
});

test("does not turn HTML or an empty result into successful data", async () => {
  globalThis.fetch = async () => new Response("<html>wrong server</html>");
  await assert.rejects(
    createApi("http://localhost:8000", source()).request("/profile"),
    (e: ApiError) => e.status === 502,
  );
});

test("missing configuration and missing session do not make network calls", async () => {
  globalThis.fetch = async () => {
    assert.fail("must not send a request");
  };
  await assert.rejects(
    createApi("", source()).request("/profile"),
    (e: ApiError) => e.status === 503,
  );
  const sessions = {
    auth: {
      getSession: async () => ({ data: { session: null } }),
      refreshSession: async () => ({ data: { session: null } }),
    },
  };
  await assert.rejects(
    createApi("http://localhost:8000", sessions).request("/profile"),
    (e: ApiError) => e.status === 401,
  );
});

test("network failure produces an actionable error", async () => {
  globalThis.fetch = async () => {
    throw new TypeError("fetch failed");
  };
  await assert.rejects(
    createApi("http://localhost:8000", source()).request("/profile"),
    (e: ApiError) => e.status === 503 && e.message.includes("Cannot reach"),
  );
});
