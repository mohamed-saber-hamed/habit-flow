import test from "node:test";
import assert from "node:assert/strict";
import { currentStreak, longestStreak, weekKeys, completionRate, shiftDateKey } from "../src/lib/metrics.mjs";

test("current streak counts consecutive planned days through today", () => {
  assert.equal(currentStreak(["2026-10-13", "2026-10-14", "2026-10-15"], [0, 1, 2, 3, 4, 5, 6], "2026-10-15"), 3);
});

test("an unchecked scheduled day today does not prematurely erase the prior streak", () => {
  assert.equal(currentStreak(["2026-10-13", "2026-10-14"], [0, 1, 2, 3, 4, 5, 6], "2026-10-15"), 2);
});

test("unscheduled rest days do not break a scheduled streak", () => {
  // Monday, Tuesday, Thursday and Friday are planned; Wednesday is a rest day.
  assert.equal(currentStreak(["2026-10-12", "2026-10-13", "2026-10-15"], [1, 2, 4, 5], "2026-10-15"), 3);
});

test("a missed planned day breaks the current streak", () => {
  assert.equal(currentStreak(["2026-10-12", "2026-10-15"], [1, 2, 3, 4, 5, 6, 0], "2026-10-15"), 1);
});

test("longest streak respects planned weekdays", () => {
  assert.equal(longestStreak(["2026-10-12", "2026-10-13", "2026-10-15", "2026-10-16"], [1, 2, 4, 5]), 4);
});

test("weekKeys returns a Monday-to-Sunday week around the anchor", () => {
  assert.deepEqual(weekKeys("2026-10-15"), ["2026-10-12", "2026-10-13", "2026-10-14", "2026-10-15", "2026-10-16", "2026-10-17", "2026-10-18"]);
});

test("date arithmetic stays stable across month boundaries", () => {
  assert.equal(shiftDateKey("2026-03-01", -1), "2026-02-28");
});

test("completion rate is bounded and safe for empty plans", () => {
  assert.equal(completionRate(3, 4), 75);
  assert.equal(completionRate(5, 2), 100);
  assert.equal(completionRate(0, 0), 0);
});
