import assert from "node:assert/strict";
import test from "node:test";
import {
  claimInterviewReminderDelivery,
  processInterviewReminderCandidates,
} from "./interviewReminderService.js";
import { parseManilaInterviewDateTime } from "../utils/interviewDateTime.js";
import InterviewReminderDelivery from "../models/InterviewReminderDelivery.js";

const scheduledInterview = (overrides = {}) => ({
  _id: "application-1",
  role: "Designer",
  company: "Example Co",
  archived: false,
  userId: { email: "owner@example.com" },
  interview: {
    date: "2026-11-21",
    time: "09:00",
    status: "upcoming",
    reminder: true,
    interviewerEmail: "interviewer@example.com",
    meetingLink: "https://meet.example.com/room",
    ...overrides.interview,
  },
  ...overrides,
});

function deliveryStore() {
  const deliveries = new Map();
  return {
    async claim(applicationId, type, scheduledAt) {
      const key = `${applicationId}:${type}:${scheduledAt.toISOString()}`;
      const current = deliveries.get(key);
      if (current?.status === "sent" || current?.status === "processing" || current?.status === "superseded") return null;
      const delivery = { key, status: "processing" };
      deliveries.set(key, delivery);
      return delivery;
    },
    async markSent(delivery) {
      deliveries.set(delivery.key, { ...delivery, status: "sent" });
    },
    async markFailed(delivery) {
      deliveries.set(delivery.key, { ...delivery, status: "failed" });
    },
    async markSuperseded(delivery) {
      deliveries.set(delivery.key, { ...delivery, status: "superseded" });
    },
  };
}

test("Manila interview times convert to the correct UTC instant and reject invalid dates", () => {
  assert.equal(
    parseManilaInterviewDateTime("2026-11-21", "09:00").toISOString(),
    "2026-11-21T01:00:00.000Z",
  );
  assert.equal(parseManilaInterviewDateTime("2026-02-30", "09:00"), null);
  assert.equal(parseManilaInterviewDateTime("2026-11-21", "24:00"), null);
  assert.equal(
    parseManilaInterviewDateTime("2026-11-21", "00:30").toISOString(),
    "2026-11-20T16:30:00.000Z",
  );
});

test("7-day and 24-hour reminders are each sent at their exact Manila-based boundary to the owner", async () => {
  const base = scheduledInterview();
  const store = deliveryStore();
  const sent = [];
  for (const [reminderType, now] of [
    ["7-day", new Date("2026-11-14T01:00:00.000Z")],
    ["24-hour", new Date("2026-11-20T01:00:00.000Z")],
  ]) {
    const result = await processInterviewReminderCandidates({
      applications: [base],
      now,
      loadCurrent: async () => base,
      claim: store.claim,
      markSent: store.markSent,
      markFailed: store.markFailed,
      markSuperseded: store.markSuperseded,
      send: async (email) => sent.push(email),
    });
    assert.equal(result.sent, 1);
    assert.equal(sent.at(-1).reminderType, reminderType);
    assert.equal(sent.at(-1).to, "owner@example.com");
    assert.notEqual(sent.at(-1).to, base.interview.interviewerEmail);
  }
});

test("reminders are not sent before their boundary", async () => {
  const sent = [];
  const result = await processInterviewReminderCandidates({
    applications: [scheduledInterview()],
    now: new Date("2026-11-14T00:59:59.999Z"),
    loadCurrent: async () => scheduledInterview(),
    claim: async () => { throw new Error("A reminder was claimed too early."); },
    send: async (email) => sent.push(email),
  });
  assert.equal(result.sent, 0);
  assert.deepEqual(sent, []);
});

test("cancelled, completed, archived, disabled, invalid, and ownerless interviews are excluded", async () => {
  const valid = scheduledInterview();
  const candidates = [
    valid,
    scheduledInterview({ interview: { status: "cancelled" } }),
    scheduledInterview({ interview: { status: "completed" } }),
    scheduledInterview({ archived: true }),
    scheduledInterview({ interview: { reminder: false } }),
    scheduledInterview({ interview: { date: "2026-02-30" } }),
    scheduledInterview({ userId: {} }),
  ].map((application, index) => ({ ...application, _id: `application-${index}` }));
  const sent = [];
  await processInterviewReminderCandidates({
    applications: candidates,
    now: new Date("2026-11-14T01:00:00.000Z"),
    loadCurrent: async (applicationId) => candidates.find((candidate) => candidate._id === applicationId),
    claim: async () => ({ _id: "delivery", lockToken: "test" }),
    markSent: async () => {},
    send: async (email) => sent.push(email),
  });
  assert.deepEqual(sent.map((email) => email.to), ["owner@example.com"]);
});

test("repeated and concurrent sweeps deliver each reminder type at most once", async () => {
  const application = scheduledInterview();
  const store = deliveryStore();
  const sent = [];
  const sweep = () => processInterviewReminderCandidates({
    applications: [application],
    now: new Date("2026-11-14T01:00:00.000Z"),
    loadCurrent: async () => application,
    claim: store.claim,
    markSent: store.markSent,
    markFailed: store.markFailed,
    markSuperseded: store.markSuperseded,
    send: async (email) => sent.push(email.reminderType),
  });
  await Promise.all([sweep(), sweep()]);
  await sweep();
  assert.deepEqual(sent, ["7-day"]);
});

test("email failures are retryable, while edits and cancellations supersede stale reminders", async () => {
  const application = scheduledInterview();
  const store = deliveryStore();
  let attempts = 0;
  const options = {
    applications: [application],
    now: new Date("2026-11-14T01:00:00.000Z"),
    loadCurrent: async () => application,
    claim: store.claim,
    markSent: store.markSent,
    markFailed: store.markFailed,
    markSuperseded: store.markSuperseded,
    send: async () => {
      attempts += 1;
      if (attempts === 1) throw new Error("Temporary provider failure");
    },
  };
  assert.equal((await processInterviewReminderCandidates(options)).failed, 1);
  assert.equal((await processInterviewReminderCandidates(options)).sent, 1);
  assert.equal(attempts, 2);

  const cancelled = { ...application, interview: { ...application.interview, status: "cancelled" } };
  const staleStore = deliveryStore();
  let staleSent = false;
  const staleResult = await processInterviewReminderCandidates({
    ...options,
    applications: [application],
    loadCurrent: async () => cancelled,
    claim: staleStore.claim,
    markSent: staleStore.markSent,
    markFailed: staleStore.markFailed,
    markSuperseded: staleStore.markSuperseded,
    send: async () => { staleSent = true; },
  });
  assert.equal(staleResult.skipped, 1);
  assert.equal(staleSent, false);

  const rescheduled = {
    ...application,
    interview: { ...application.interview, time: "10:00" },
  };
  const editStore = deliveryStore();
  const editedResult = await processInterviewReminderCandidates({
    ...options,
    loadCurrent: async () => rescheduled,
    claim: editStore.claim,
    markSent: editStore.markSent,
    markFailed: editStore.markFailed,
    markSuperseded: editStore.markSuperseded,
    send: async () => { staleSent = true; },
  });
  assert.equal(editedResult.skipped, 1);
  assert.equal(staleSent, false);
});

test("late first-time reminders are accepted for 30 minutes while previously failed deliveries remain retryable", async () => {
  const originalFindOneAndUpdate = InterviewReminderDelivery.findOneAndUpdate;
  const originalCreate = InterviewReminderDelivery.create;
  const scheduledAt = parseManilaInterviewDateTime("2026-11-21", "09:00");
  let created = false;
  try {
    InterviewReminderDelivery.findOneAndUpdate = async () => null;
    InterviewReminderDelivery.create = async () => {
      created = true;
      return { status: "processing" };
    };
    assert.deepEqual(
      await claimInterviewReminderDelivery(
        "application-1",
        "7-day",
        scheduledAt,
        new Date("2026-11-14T01:30:00.000Z"),
      ),
      { status: "processing" },
    );
    assert.equal(created, true);

    created = false;
    assert.equal(
      await claimInterviewReminderDelivery(
        "application-1",
        "7-day",
        scheduledAt,
        new Date("2026-11-14T01:30:00.001Z"),
      ),
      null,
    );
    assert.equal(created, false);

    InterviewReminderDelivery.findOneAndUpdate = async () => ({ status: "processing" });
    assert.deepEqual(
      await claimInterviewReminderDelivery(
        "application-1",
        "7-day",
        scheduledAt,
        new Date("2026-11-14T02:00:00.000Z"),
      ),
      { status: "processing" },
    );
  } finally {
    InterviewReminderDelivery.findOneAndUpdate = originalFindOneAndUpdate;
    InterviewReminderDelivery.create = originalCreate;
  }
});
