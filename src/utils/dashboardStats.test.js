import test from "node:test";
import assert from "node:assert/strict";
import { getDashboardStats, getUpcomingInterviewApplicationIds } from "./dashboardStats.js";

const today = new Date(2026, 10, 11);

test("counts actual application statuses and excludes archived applications", () => {
  const result = getDashboardStats([
    { id: "applied", status: "Applied" },
    { id: "screening", status: "Screening" },
    { id: "interview", status: "Interview" },
    { id: "offer", status: "Offer" },
    { id: "rejected", status: "Rejected" },
    { id: "withdrawn", status: "Withdrawn", archived: true },
  ], today);

  assert.equal(result.total, 5);
  assert.equal(result.inProgress, 3);
  assert.equal(result.awaitingResponse, 1);
  assert.equal(result.counts.underReview, 1);
  assert.equal(result.counts.interview, 1);
  assert.equal(result.offers, 1);
  assert.equal(result.rejected, 1);
});

test("counts only upcoming interviews and prioritizes those within seven days", () => {
  const result = getDashboardStats([
    { id: "next", company: "Next Co", status: "Interview", interview: { date: "2026-11-14", time: "10:30", status: "upcoming" } },
    { id: "later", company: "Later Co", status: "Interview", interview: { date: "2026-11-19", time: "09:00", status: "upcoming" } },
    { id: "past", company: "Past Co", status: "Interview", interview: { date: "2026-11-10", time: "09:00", status: "upcoming" } },
    { id: "cancelled", company: "Cancelled Co", status: "Interview", interview: { date: "2026-11-12", status: "cancelled" } },
    { id: "completed", company: "Completed Co", status: "Interview", interview: { date: "2026-11-12", status: "completed" } },
  ], today);

  assert.equal(result.upNext.applicationId, "next");
  assert.equal(result.interviews, 2);
  assert.equal(result.interviewsThisWeek, 1);
  assert.deepEqual(
    [...getUpcomingInterviewApplicationIds([
      { id: "next", interview: { date: "2026-11-14", status: "upcoming" } },
      { id: "cancelled", interview: { date: "2026-11-14", status: "cancelled" } },
      { id: "archived", archived: true, interview: { date: "2026-11-14" } },
    ], today)],
    ["next"],
  );
});

test("does not count an interview whose time has already passed today", () => {
  const now = new Date(2026, 10, 11, 11, 0);
  const result = getDashboardStats([
    { id: "past-today", interview: { date: "2026-11-11", time: "10:30", status: "upcoming" } },
    { id: "later-today", interview: { date: "2026-11-11", time: "11:30", status: "upcoming" } },
  ], now);

  assert.deepEqual(result.upcomingInterviews.map((interview) => interview.applicationId), ["later-today"]);
});

test("up next always selects the nearest upcoming interview, including dates beyond this week", () => {
  const result = getDashboardStats([
    { id: "later", company: "Later Co", interview: { date: "2026-11-25", time: "09:00", status: "upcoming" } },
    { id: "soonest", company: "Soonest Co", interview: { date: "2026-11-20", time: "14:00", status: "upcoming" } },
  ], today);

  assert.equal(result.interviewsThisWeek, 0);
  assert.equal(result.upNext.applicationId, "soonest");
  assert.equal(result.upNext.type, "interview");
});

test("reminders are derived from completed interviews and stale records", () => {
  const result = getDashboardStats([
    {
      id: "follow-up",
      company: "Follow Up Co",
      role: "Designer",
      status: "Interview",
      interview: { date: "2026-11-10", status: "completed", outcome: "Pending", thankYouSent: false },
    },
    { id: "stale", company: "Stale Co", role: "Engineer", status: "Applied", updatedAt: "2026-11-01T10:00:00.000Z" },
    { id: "fresh", status: "Applied", updatedAt: "2026-11-10T10:00:00.000Z" },
  ], today);

  assert.deepEqual(result.reminders.map((reminder) => reminder.type), ["interview-follow-up", "no-response"]);
  assert.equal(result.upNext.type, "interview-follow-up");
  assert.equal(result.reminders[1].daysSinceUpdate, 10);
});

test("recent activity uses persisted application and resume events", () => {
  const result = getDashboardStats([
    {
      id: "application-1",
      activity: [{ id: "status-1", message: "Status changed from Applied to Screening", createdAt: "2026-11-10T09:00:00.000Z" }],
    },
  ], today, [
    {
      id: "resume-1",
      name: "Product Designer",
      activity: [{ id: "resume-1-upload", message: "Resume uploaded", createdAt: "2026-11-11T08:00:00.000Z" }],
    },
  ]);

  assert.deepEqual(result.recentActivity.map((item) => item.id), ["resume-1-upload", "status-1"]);
  assert.equal(result.recentActivity[0].href, "/resume?resumeId=resume-1");
  assert.equal(result.recentActivity[1].href, "/applications/application-1");
});

test("empty data has zero metrics, activity, and reminders", () => {
  const result = getDashboardStats([], today, []);
  assert.equal(result.total, 0);
  assert.equal(result.resumeCount, 0);
  assert.equal(result.inProgress, 0);
  assert.equal(result.interviews, 0);
  assert.deepEqual(result.recentActivity, []);
  assert.deepEqual(result.reminders, []);
  assert.equal(result.upNext, null);
});
