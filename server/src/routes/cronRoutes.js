import { timingSafeEqual } from "node:crypto";
import { Buffer } from "node:buffer";
import express from "express";
import process from "node:process";
import { runInterviewReminderSweep } from "../services/interviewReminderService.js";

const router = express.Router();

function hasValidCronAuthorization(authorization, secret) {
  if (!authorization || !secret) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const provided = Buffer.from(authorization);
  return expected.length === provided.length && timingSafeEqual(expected, provided);
}

router.get("/interview-reminders", async (req, res) => {
  const secret = process.env.CRON_SECRET;
  if (!secret || Buffer.byteLength(secret) < 32) {
    console.error("Interview reminder cron is disabled: CRON_SECRET must be at least 32 bytes.");
    return res.status(503).json({ success: false, message: "Scheduled reminders are not configured." });
  }
  if (!hasValidCronAuthorization(req.get("authorization"), secret)) {
    return res.status(401).json({ success: false, message: "Unauthorized." });
  }

  try {
    const result = await runInterviewReminderSweep();
    if (result.failed) {
      return res.status(503).json({ success: false, ...result });
    }
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    console.error("Interview reminder cron failed:", error?.name || "Error", error?.code || "");
    return res.status(500).json({ success: false, message: "Interview reminders could not be processed." });
  }
});

export default router;
