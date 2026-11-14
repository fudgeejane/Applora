import mongoose from "mongoose";

const interviewReminderDeliverySchema = new mongoose.Schema({
  applicationId: { type: mongoose.Schema.Types.ObjectId, ref: "Application", required: true },
  reminderType: { type: String, enum: ["7-day", "24-hour"], required: true },
  scheduledAt: { type: Date, required: true },
  status: { type: String, enum: ["processing", "sent", "failed", "superseded"], required: true },
  lockedAt: { type: Date, default: null },
  lockToken: { type: String, default: "" },
  sentAt: { type: Date, default: null },
  attempts: { type: Number, default: 0 },
  lastError: { type: String, default: "", maxlength: 500 },
}, { timestamps: true });

interviewReminderDeliverySchema.index(
  { applicationId: 1, reminderType: 1, scheduledAt: 1 },
  { unique: true },
);

export default mongoose.models.InterviewReminderDelivery
  || mongoose.model("InterviewReminderDelivery", interviewReminderDeliverySchema);
