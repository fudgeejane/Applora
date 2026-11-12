import mongoose from "mongoose";

const interviewSchema = new mongoose.Schema({
  date: { type: String, default: "" },
  time: { type: String, default: "" },
  type: { type: String, default: "Video call" },
  format: { type: String, default: "" },
  interviewer: { type: String, default: "", maxlength: 120 },
  interviewerEmail: { type: String, default: "", maxlength: 254 },
  interviewerPhone: { type: String, default: "", maxlength: 32 },
  meetingLink: { type: String, default: "" },
  location: { type: String, default: "", maxlength: 200 },
  notes: { type: String, default: "", maxlength: 5000 },
  questions: { type: String, default: "", maxlength: 3000 },
  checklist: { type: [{ text: { type: String, maxlength: 200 }, done: { type: Boolean, default: false } }], default: [] },
  outcome: { type: String, enum: ["Pending", "Passed", "Rejected", "Offer", "No response"], default: "Pending" },
  status: { type: String, enum: ["upcoming", "completed", "cancelled"], default: "upcoming" },
  thankYouSent: { type: Boolean, default: false },
  reminder: { type: Boolean, default: false },
  reminderLeadTime: { type: String, enum: ["15 minutes before", "1 hour before", "1 day before"], default: "1 hour before" },
}, { _id: false });

const applicationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  role: { type: String, required: true, trim: true, maxlength: 160 },
  company: { type: String, required: true, trim: true, maxlength: 160 },
  location: { type: String, default: "", maxlength: 200 },
  workSetup: { type: String, default: "Remote", maxlength: 40 },
  salaryMin: { type: String, default: "" },
  salaryMax: { type: String, default: "" },
  salaryCurrency: { type: String, default: "PHP", maxlength: 8 },
  salaryPeriod: { type: String, default: "month", maxlength: 20 },
  source: { type: String, default: "", maxlength: 80 },
  url: { type: String, default: "", maxlength: 2048 },
  status: { type: String, enum: ["Applied", "Screening", "Interview", "Offer", "Rejected", "Withdrawn"], default: "Applied" },
  dateApplied: { type: String, default: "" },
  resumeUsed: { type: String, default: "", maxlength: 255 },
  resumeId: { type: String, default: "" },
  notes: { type: String, default: "", maxlength: 10000 },
  employmentType: { type: String, default: "", maxlength: 40 },
  contactName: { type: String, default: "", maxlength: 120 },
  contactEmail: { type: String, default: "", maxlength: 254 },
  contactLinkedIn: { type: String, default: "", maxlength: 2048 },
  interview: { type: interviewSchema, default: null },
  activity: { type: [mongoose.Schema.Types.Mixed], default: [] },
  archived: { type: Boolean, default: false },
}, { timestamps: true });

applicationSchema.index({ userId: 1, dateApplied: -1 });

export default mongoose.models.Application || mongoose.model("Application", applicationSchema);
