import assert from "node:assert/strict";
import nodemailer from "nodemailer";
import process from "node:process";
import test from "node:test";
import { sendInterviewReminderEmail } from "./emailServices.js";

test("interview reminder email includes personalized application and platform details", async () => {
  const originalCreateTransport = nodemailer.createTransport;
  const originalUser = process.env.EMAIL_USER;
  const originalPassword = process.env.EMAIL_PASS;
  let message;
  process.env.EMAIL_USER = "sender@example.com";
  process.env.EMAIL_PASS = "test-password";
  nodemailer.createTransport = () => ({
    sendMail: async (value) => {
      message = value;
      return { messageId: "test-message" };
    },
  });
  try {
    await sendInterviewReminderEmail({
      to: "candidate@example.com",
      candidateName: "Alex",
      reminderType: "24-hour",
      role: "Designer",
      company: "Example Co",
      date: "2026-11-21",
      time: "09:00",
      interviewType: "Technical",
      platform: "Google Meet",
      meetingLink: "https://meet.example.com/room",
    });

    assert.equal(message.to, "candidate@example.com");
    assert.equal(message.subject, "Interview for Example Co in 24 hours");
    assert.equal(message.attachments, undefined);
    assert.match(message.html, /Hi Alex, thank you for applying to Example Co/);
    assert.match(message.html, /Designer/);
    assert.match(message.html, /Saturday, November 21, 2026/);
    assert.match(message.html, /Technical · Google Meet/);
    assert.match(message.html, /https:\/\/meet\.example\.com\/room/);
    assert.match(message.html, /join a few minutes early/);
  } finally {
    nodemailer.createTransport = originalCreateTransport;
    if (originalUser === undefined) delete process.env.EMAIL_USER;
    else process.env.EMAIL_USER = originalUser;
    if (originalPassword === undefined) delete process.env.EMAIL_PASS;
    else process.env.EMAIL_PASS = originalPassword;
  }
});

test("on-site interview reminder omits a meeting link and includes the location", async () => {
  const originalCreateTransport = nodemailer.createTransport;
  const originalUser = process.env.EMAIL_USER;
  const originalPassword = process.env.EMAIL_PASS;
  let message;
  process.env.EMAIL_USER = "sender@example.com";
  process.env.EMAIL_PASS = "test-password";
  nodemailer.createTransport = () => ({
    sendMail: async (value) => {
      message = value;
      return { messageId: "test-message" };
    },
  });
  try {
    await sendInterviewReminderEmail({
      to: "candidate@example.com",
      reminderType: "7-day",
      role: "Designer",
      company: "Example Co",
      date: "2026-11-21",
      time: "09:00",
      interviewType: "HR",
      platform: "On-site",
      location: "Manila office",
    });

    assert.equal(message.subject, "Interview for Example Co in 7 days");
    assert.match(message.html, /HR · On-site/);
    assert.match(message.html, /Location: Manila office/);
    assert.doesNotMatch(message.html, /Open meeting link/);
    assert.match(message.html, /arrive a few minutes early/);
  } finally {
    nodemailer.createTransport = originalCreateTransport;
    if (originalUser === undefined) delete process.env.EMAIL_USER;
    else process.env.EMAIL_USER = originalUser;
    if (originalPassword === undefined) delete process.env.EMAIL_PASS;
    else process.env.EMAIL_PASS = originalPassword;
  }
});
