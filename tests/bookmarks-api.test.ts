import { afterEach, test } from "node:test";
import assert from "node:assert/strict";
import { createApi, ApiError } from "../src/lib/api-client.ts";
import { bookmarksKey, createBookmarksApi } from "../src/lib/bookmarks-api.ts";
const original = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = original;
});
const session = async () => ({
  data: { session: { access_token: "test-token", user: { id: "alice" } } },
});
const api = () =>
  createBookmarksApi(
    createApi("http://localhost:8000", { auth: { getSession: session, refreshSession: session } }),
  );
test("bookmark CRUD uses authenticated API paths and never sends question answers", async () => {
  const calls: string[] = [];
  globalThis.fetch = async (url, init) => {
    assert.equal(new Headers(init?.headers).get("Authorization"), "Bearer test-token");
    assert.equal(init?.body, undefined);
    calls.push(`${init?.method ?? "GET"} ${url}`);
    return new Response(JSON.stringify(init?.method ? { saved: init.method === "PUT" } : []));
  };
  const bookmarks = api();
  assert.deepEqual(await bookmarks.list(), []);
  await bookmarks.save("q/1");
  await bookmarks.remove("q/1");
  assert.deepEqual(calls, [
    "GET http://localhost:8000/api/v1/bookmarks",
    "PUT http://localhost:8000/api/v1/bookmarks/q%2F1",
    "DELETE http://localhost:8000/api/v1/bookmarks/q%2F1",
  ]);
});
test("failed save remains a failure instead of returning a saved status", async () => {
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ detail: "Question not found" }), { status: 404 });
  await assert.rejects(api().save("missing"), (error: ApiError) => error.status === 404);
});
test("missing IDs make no network call and cached lists belong to their account", () => {
  globalThis.fetch = async () => {
    assert.fail("No request expected");
  };
  assert.throws(() => api().save(""));
  assert.notDeepEqual(bookmarksKey("alice"), bookmarksKey("bob"));
});
