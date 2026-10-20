import test from "node:test";
import assert from "node:assert/strict";
import {
  formatToken,
  parseTokenNumber,
  formatWaitTime,
  calculateQueueState,
  isAppointmentToday,
  formatAppointmentDateTime,
  formatRelativeTime,
  getTodayDateString,
} from "../queueCalculations.js";

test("formatToken normalizes various inputs to CB-XX format", () => {
  assert.equal(formatToken(1), "CB-01");
  assert.equal(formatToken(9), "CB-09");
  assert.equal(formatToken(10), "CB-10");
  assert.equal(formatToken(42), "CB-42");
  assert.equal(formatToken(105), "CB-105");
  assert.equal(formatToken("1"), "CB-01");
  assert.equal(formatToken("CB-5"), "CB-05");
  assert.equal(formatToken("T-007"), "CB-07");
  assert.equal(formatToken("Token #3"), "CB-03");
  assert.equal(formatToken(null), "CB-01");
  assert.equal(formatToken(undefined), "CB-01");
  assert.equal(formatToken(""), "CB-01");
});

test("parseTokenNumber extracts raw integer from various tokens", () => {
  assert.equal(parseTokenNumber(5), 5);
  assert.equal(parseTokenNumber("CB-07"), 7);
  assert.equal(parseTokenNumber("T-012"), 12);
  assert.equal(parseTokenNumber("Token #24"), 24);
  assert.equal(parseTokenNumber(""), 1);
  assert.equal(parseTokenNumber(null), 1);
});

test("formatWaitTime never shows '~ 0 Minutes' and adheres to clinical copy", () => {
  assert.equal(formatWaitTime(0, false), "Your turn now");
  assert.equal(formatWaitTime(0, true), "Your turn now");
  assert.equal(formatWaitTime(-5, false), "Your turn now");
  assert.equal(formatWaitTime(3, false), "Less than 5 min");
  assert.equal(formatWaitTime(4.9, false), "Less than 5 min");
  assert.equal(formatWaitTime(5, false), "~ 5 min");
  assert.equal(formatWaitTime(15, false), "~ 15 min");
  assert.equal(formatWaitTime(27.4, false), "~ 27 min");
});

test("calculateQueueState: patient is in consultation (my turn)", () => {
  const state = calculateQueueState({
    nowServing: 5,
    myToken: 5,
    avgConsultMinutes: 10,
    status: "IN_CONSULTATION",
  });

  assert.equal(state.nowServing, "CB-05");
  assert.equal(state.myToken, "CB-05");
  assert.equal(state.isMyTurn, true);
  assert.equal(state.isPassed, false);
  assert.equal(state.patientsAhead, 0);
  assert.equal(state.queuePosition, 1);
  assert.equal(state.completedCount, 4);
  assert.equal(state.completedRangeLabel, "Tokens CB-01–CB-04 Completed");
  assert.equal(state.status, "IN_CONSULTATION");
  assert.equal(state.estimatedWaitText, "Your turn now");
});

test("calculateQueueState: patient is next (patientsAhead === 0, status waiting)", () => {
  const state = calculateQueueState({
    nowServing: 4,
    myToken: 5,
    avgConsultMinutes: 10,
    status: "WAITING",
  });

  // myToken 5, nowServing 4: 5 - 4 - 1 = 0 ahead
  assert.equal(state.isMyTurn, false);
  assert.equal(state.patientsAhead, 0);
  assert.equal(state.queuePosition, 1);
  assert.equal(state.status, "YOU_ARE_NEXT");
  assert.equal(state.statusBadgeLabel, "You're Next!");
  assert.equal(state.estimatedWaitText, "Your turn now");
  assert.equal(state.completedCount, 3);
  assert.equal(state.completedRangeLabel, "Tokens CB-01–CB-03 Completed");
});

test("calculateQueueState: patient has 2 patients ahead", () => {
  const state = calculateQueueState({
    nowServing: 2,
    myToken: 5,
    avgConsultMinutes: 10,
    status: "WAITING",
  });

  // myToken 5, nowServing 2: 5 - 2 - 1 = 2 ahead (tokens 3 and 4)
  assert.equal(state.patientsAhead, 2);
  assert.equal(state.queuePosition, 3);
  assert.equal(state.status, "WAITING");
  assert.equal(state.estimatedWaitMinutes, 20);
  assert.equal(state.estimatedWaitText, "~ 20 min");
  assert.equal(state.completedCount, 1);
  assert.equal(state.completedRangeLabel, "Token CB-01 Completed");

  // Progress percentage: completed / (completed + patientsAhead + 1) * 100
  // = 1 / (1 + 2 + 1) * 100 = 1 / 4 * 100 = 25%
  assert.equal(state.progressPercent, 25);
});

test("calculateQueueState: zero completed tokens shows 'None yet'", () => {
  const state = calculateQueueState({
    nowServing: 1,
    myToken: 3,
    avgConsultMinutes: 10,
    status: "WAITING",
  });

  assert.equal(state.completedCount, 0);
  assert.equal(state.completedRangeLabel, "None yet");
  assert.equal(state.patientsAhead, 1); // token 2 ahead
});

test("calculateQueueState: 'I am running late' adds buffer to estimated wait", () => {
  const state = calculateQueueState({
    nowServing: 2,
    myToken: 5,
    avgConsultMinutes: 10,
    status: "WAITING",
    lateBufferMinutes: 15,
  });

  // 2 patients ahead * 10 min = 20 min + 15 min buffer = 35 min
  assert.equal(state.estimatedWaitMinutes, 35);
  assert.equal(state.estimatedWaitText, "~ 35 min");
});

test("calculateQueueState: token already passed or completed", () => {
  const state = calculateQueueState({
    nowServing: 10,
    myToken: 4,
    status: "COMPLETED",
  });

  assert.equal(state.isPassed, true);
  assert.equal(state.patientsAhead, 0);
  assert.equal(state.status, "COMPLETED");
  assert.equal(state.progressPercent, 100);
});

test("isAppointmentToday verifies against Asia/Kolkata date", () => {
  const todayKolkata = getTodayDateString("Asia/Kolkata");
  assert.equal(isAppointmentToday(todayKolkata), true);
  assert.equal(isAppointmentToday("1999-01-01"), false);
  assert.equal(isAppointmentToday("2099-12-31"), false);
  assert.equal(isAppointmentToday(null), false);
});

test("formatAppointmentDateTime produces human-readable localized string", () => {
  const formatted = formatAppointmentDateTime("2026-10-22", "11:00 AM");
  // Expected: "Thu, 22 Oct 2026 · 11:00 AM" or localized equivalent
  assert.match(formatted, /Thu, 22 Oct 2026/);
  assert.match(formatted, /11:00\s*(am|AM)/);
});

test("formatRelativeTime provides accurate relative descriptions", () => {
  const now = Date.now();
  assert.equal(formatRelativeTime(now - 1000), "Just now");
  assert.equal(formatRelativeTime(now - 15000), "15s ago");
  assert.equal(formatRelativeTime(now - 120000), "2m ago");
  assert.equal(formatRelativeTime(null), "Just now");
});
