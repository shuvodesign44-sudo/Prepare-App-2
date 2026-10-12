import { test } from "node:test";
import assert from "node:assert/strict";
import { dhakaDate, studyDays, progressKey } from "../src/lib/progress.ts";

test("today crosses midnight in Bangladesh rather than device or UTC time", () => {
  assert.equal(dhakaDate(new Date("2026-09-23T17:59:59Z")), "2026-09-23");
  assert.equal(dhakaDate(new Date("2026-09-23T18:00:00Z")), "2026-09-24");
});
test("14 day chart uses server seconds, zero-fills missing days and excludes older data", () => {
  const days = studyDays(
    { "2026-09-24": 90, "2026-09-11": 30, "2026-09-10": 600 },
    new Date("2026-09-23T20:00:00Z"),
  );
  assert.equal(days.length, 14);
  assert.deepEqual(days[0], { date: "2026-09-11", minutes: 0.5 });
  assert.deepEqual(days[1], { date: "2026-09-12", minutes: 0 });
  assert.deepEqual(days.at(-1), { date: "2026-09-24", minutes: 1.5 });
  assert.equal(
    days.reduce((total, day) => total + day.minutes, 0),
    2,
  );
});
test("progress cache is scoped to the authenticated account", () => {
  assert.notDeepEqual(progressKey("alice"), progressKey("bob"));
});
