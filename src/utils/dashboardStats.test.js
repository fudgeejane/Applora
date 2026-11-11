import test from "node:test";
import assert from "node:assert/strict";
import { getDashboardStats, getUpcomingInterviewApplicationIds } from "./dashboardStats.js";

const today = new Date(2026, 10, 11);

test("computes active, interview, offer, and response metrics with documented definitions", () => {
  const result = getDashboardStats([
    { id: "a", status: "Applied" },
    { id: "b", status: "Applied" },
    { id: "c", status: "Screening" },
    { id: "d", status: "Interview" },
    { id: "e", status: "Offer" },
    { id: "f", status: "Rejected" },
    { id: "g", status: "Withdrawn", archived: true },
  ], today);

  assert.equal(result.total, 6);
  assert.equal(result.active, 3);
  assert.equal(result.counts.interview, 1);
  assert.equal(result.offers, 1);
  assert.equal(result.responseRate, 67);
  assert.equal(result.offerRate, 17);
});

test("merges Accepted into offers and maps Under Review into the pipeline", () => {
  const result = getDashboardStats([
    { status: "Under Review" },
    { status: "Accepted" },
  ], today);

  assert.equal(result.counts.underReview, 1);
  assert.equal(result.counts.offer, 1);
  assert.equal(result.offers, 1);
});

test("prioritizes an interview within seven days and ignores later and past dates", () => {
  const result = getDashboardStats([
    { id: "next", company: "Next Co", status: "Interview", interview: { date: "2026-11-14", time: "10:30 AM" } },
    { id: "later", company: "Later Co", status: "Interview", interview: { date: "2026-11-19", time: "9:00 AM" } },
    { id: "past", company: "Past Co", status: "Interview", interview: { date: "2026-11-10", time: "9:00 AM" } },
  ], today);

  assert.equal(result.upNext.applicationId, "next");
  assert.equal(result.interviews, 2);
  assert.equal(result.interviewsThisWeek, 1);
});

test("prioritizes due follow-ups, then stale active applications, and ignores future applied dates", () => {
  const due = getDashboardStats([
    { id: "due", company: "Due Co", status: "Applied", followUpDate: "2026-11-10" },
    { id: "stale", company: "Stale Co", status: "Applied", dateApplied: "2026-11-01" },
  ], today);
  assert.equal(due.upNext.type, "follow-up");
  assert.equal(due.upNext.applicationId, "due");

  const stale = getDashboardStats([
    { id: "stale", company: "Stale Co", status: "Interview", dateApplied: "2026-11-01" },
    { id: "future", company: "Future Co", status: "Applied", dateApplied: "2026-11-14" },
  ], today);
  assert.equal(stale.upNext.type, "no-response");
  assert.equal(stale.upNext.daysSinceUpdate, 10);
});

test("uses existing dashboard interview previews as fallback and returns an empty focus state", () => {
  const preview = getDashboardStats([
    { id: "northstar", company: "Northstar Digital", status: "Interview" },
    { id: "brightline", company: "Brightline Studio", status: "Interview" },
  ], today);
  assert.equal(preview.upcomingInterviews.length, 2);
  assert.equal(preview.upNext.interview.company, "Northstar Digital");
  assert.equal(getDashboardStats([], today).upNext, null);
  assert.deepEqual(
    [...getUpcomingInterviewApplicationIds([
      { id: "northstar" },
      { id: "brightline" },
      { id: "archived", archived: true },
    ], today)],
    ["northstar", "brightline"],
  );
});
