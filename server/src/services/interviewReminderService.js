import { randomUUID } from "node:crypto";
import Application from "../models/Application.js";
import InterviewReminderDelivery from "../models/InterviewReminderDelivery.js";
import { sendInterviewReminderEmail } from "./emailServices.js";
import { parseManilaInterviewDateTime } from "../utils/interviewDateTime.js";

const DAY_MS = 24 * 60 * 60 * 1000;
const NEW_DELIVERY_GRACE_MS = 5 * 60 * 1000;
const DELIVERY_LEASE_MS = 10 * 60 * 1000;
const REMINDER_TYPES = [
  { type: "7-day", leadTimeMs: 7 * DAY_MS },
  { type: "24-hour", leadTimeMs: DAY_MS },
];

export { parseManilaInterviewDateTime };

function getOwnerEmail(application) {
  const email = application?.userId?.email;
  return typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ? email.trim()
    : "";
}

function getOwnerName(application) {
  const owner = application?.userId;
  return owner?.displayName || owner?.firstName || "there";
}

function getInterviewPlatform(interview) {
  return interview.platform
    || (interview.format === "Onsite" ? "On-site" : interview.format === "Phone" ? "Phone" : "Zoom");
}

function isReminderEligible(application) {
  return Boolean(
    application
    && application.archived !== true
    && application.interview?.status === "upcoming"
    && application.interview.reminder === true
    && getOwnerEmail(application),
  );
}

function sameInterviewSchedule(application, original) {
  return isReminderEligible(application)
    && application.interview.date === original.interview.date
    && application.interview.time === original.interview.time;
}

function getReminderCandidates(application, now) {
  if (!isReminderEligible(application)) return [];
  const interviewAt = parseManilaInterviewDateTime(application.interview.date, application.interview.time);
  if (!interviewAt || interviewAt <= now) return [];

  return REMINDER_TYPES
    .map(({ type, leadTimeMs }) => ({
      type,
      interviewAt,
      sendAt: new Date(interviewAt.getTime() - leadTimeMs),
    }))
    .filter(({ sendAt }) => sendAt <= now);
}

export async function claimInterviewReminderDelivery(applicationId, reminderType, scheduledAt, now) {
  const key = { applicationId, reminderType, scheduledAt };
  const lockToken = randomUUID();
  const leaseExpiredBefore = new Date(now.getTime() - DELIVERY_LEASE_MS);
  const existing = await InterviewReminderDelivery.findOneAndUpdate(
    {
      ...key,
      $or: [
        { status: "failed" },
        { status: "processing", lockedAt: { $lte: leaseExpiredBefore } },
      ],
    },
    {
      $set: { status: "processing", lockedAt: now, lockToken, lastError: "" },
      $inc: { attempts: 1 },
    },
    { returnDocument: "after" },
  );
  if (existing) return existing;

  const leadTimeMs = REMINDER_TYPES.find(({ type }) => type === reminderType)?.leadTimeMs;
  const sendAt = leadTimeMs ? scheduledAt.getTime() - leadTimeMs : Number.NaN;
  if (!Number.isFinite(sendAt) || now.getTime() - sendAt > NEW_DELIVERY_GRACE_MS) {
    return null;
  }

  try {
    return await InterviewReminderDelivery.create({
      ...key,
      status: "processing",
      lockedAt: now,
      lockToken,
      attempts: 1,
    });
  } catch (error) {
    if (error?.code === 11000) return null;
    throw error;
  }
}

async function updateDelivery(delivery, update) {
  await InterviewReminderDelivery.updateOne(
    { _id: delivery._id, lockToken: delivery.lockToken, status: "processing" },
    update,
  );
}

async function loadCurrentApplication(applicationId) {
  return Application.findById(applicationId).populate("userId", "email firstName displayName");
}

export async function processInterviewReminderCandidates({
  applications,
  now = new Date(),
  loadCurrent = loadCurrentApplication,
  claim = claimInterviewReminderDelivery,
  markSent = (delivery, sentAt) => updateDelivery(delivery, {
    $set: { status: "sent", sentAt },
    $unset: { lockedAt: 1, lockToken: 1 },
  }),
  markFailed = (delivery, error) => updateDelivery(delivery, {
    $set: { status: "failed", lastError: String(error?.message || "Email delivery failed.").slice(0, 500) },
    $unset: { lockedAt: 1, lockToken: 1 },
  }),
  markSuperseded = (delivery) => updateDelivery(delivery, {
    $set: { status: "superseded" },
    $unset: { lockedAt: 1, lockToken: 1 },
  }),
  send = sendInterviewReminderEmail,
} = {}) {
  const result = { sent: 0, failed: 0, skipped: 0 };
  for (const application of applications || []) {
    const candidates = getReminderCandidates(application, now);
    for (const reminder of candidates) {
      const delivery = await claim(
        application._id,
        reminder.type,
        reminder.interviewAt,
        now,
      );
      if (!delivery) {
        result.skipped += 1;
        continue;
      }

      const current = await loadCurrent(application._id);
      if (!sameInterviewSchedule(current, application)) {
        await markSuperseded(delivery);
        result.skipped += 1;
        continue;
      }

      const recipient = getOwnerEmail(current);
      try {
        await send({
          to: recipient,
          candidateName: getOwnerName(current),
          reminderType: reminder.type,
          role: current.role,
          company: current.company,
          date: current.interview.date,
          time: current.interview.time,
          interviewType: current.interview.type || "Interview",
          platform: getInterviewPlatform(current.interview),
          location: current.interview.location || current.location || "",
          meetingLink: current.interview.meetingLink || "",
        });
      } catch (error) {
        console.error(
          "Interview reminder email delivery failed:",
          reminder.type,
          String(application._id),
          error?.name || "Error",
          error?.code || "",
          String(error?.message || "Email delivery failed.").slice(0, 300),
        );
        await markFailed(delivery, error);
        result.failed += 1;
        continue;
      }

      await markSent(delivery, now);
      result.sent += 1;
    }
  }
  return result;
}

export async function runInterviewReminderSweep({ now = new Date() } = {}) {
  await InterviewReminderDelivery.init();
  const applications = await Application.find({
    archived: { $ne: true },
    "interview.status": "upcoming",
    "interview.reminder": true,
  }).populate("userId", "email firstName displayName");
  return processInterviewReminderCandidates({ applications, now });
}

