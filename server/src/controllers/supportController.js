import process from "node:process";

import { sendSupportEmail } from "../services/emailServices.js";

const MAX_SUPPORT_MESSAGE_LENGTH = 4000;
const MAX_SUPPORT_NAME_LENGTH = 120;
const MAX_SUPPORT_SUBJECT_LENGTH = 160;

export function validateSupportMessage(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { error: "Enter a message to continue." };
  }
  if (typeof body.message !== "string" || !body.message.trim()) {
    return { error: "Enter a message to continue." };
  }

  const message = body.message.trim();
  if (message.length > MAX_SUPPORT_MESSAGE_LENGTH) {
    return {
      error: `Messages must be ${MAX_SUPPORT_MESSAGE_LENGTH} characters or fewer.`,
    };
  }
  return { value: { message } };
}

export function validatePublicSupportMessage(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { error: "Complete all fields to continue." };
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const subject = typeof body.subject === "string" ? body.subject.trim() : "";
  const message = typeof body.message === "string" ? body.message.trim() : "";

  if (!name || !email || !subject || !message) {
    return { error: "Complete all fields to continue." };
  }
  if (name.length > MAX_SUPPORT_NAME_LENGTH) {
    return { error: `Name must be ${MAX_SUPPORT_NAME_LENGTH} characters or fewer.` };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    return { error: "Enter a valid email address." };
  }
  if (subject.length > MAX_SUPPORT_SUBJECT_LENGTH) {
    return {
      error: `Subject must be ${MAX_SUPPORT_SUBJECT_LENGTH} characters or fewer.`,
    };
  }
  if (message.length > MAX_SUPPORT_MESSAGE_LENGTH) {
    return {
      error: `Messages must be ${MAX_SUPPORT_MESSAGE_LENGTH} characters or fewer.`,
    };
  }

  return { value: { name, email, subject, message } };
}

export async function submitSupportMessage(req, res) {
  const result = validateSupportMessage(req.body);
  if (result.error) {
    return res.status(400).json({ success: false, message: result.error });
  }

  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    return res.status(503).json({
      success: false,
      message: "Support messaging is temporarily unavailable.",
    });
  }

  const name =
    req.user.displayName?.trim() ||
    [req.user.firstName, req.user.lastName].filter(Boolean).join(" ") ||
    "Applora user";
  await sendSupportEmail({
    name,
    email: req.user.email,
    message: result.value.message,
  });

  return res.status(200).json({
    success: true,
    message: "Your message has been sent to our support team.",
  });
}

export async function submitPublicSupportMessage(req, res) {
  const result = validatePublicSupportMessage(req.body);
  if (result.error) {
    return res.status(400).json({ success: false, message: result.error });
  }

  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    return res.status(503).json({
      success: false,
      message: "Support messaging is temporarily unavailable.",
    });
  }

  const { name, email, subject, message } = result.value;
  await sendSupportEmail({
    name,
    email,
    message: `Subject: ${subject}\n\n${message}`,
  });

  return res.status(200).json({
    success: true,
    message: "Your message has been sent to our support team.",
  });
}
