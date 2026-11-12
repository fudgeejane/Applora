import mongoose from "mongoose";
import { Buffer } from "node:buffer";

const resumeSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  name: { type: String, required: true, trim: true, maxlength: 255 },
  occupation: { type: String, default: "", trim: true, maxlength: 120 },
  fileName: { type: String, required: true, maxlength: 255 },
  cloudinaryPublicId: { type: String, default: "" },
  resumeUrl: { type: String, default: "" },
  fileType: { type: String, maxlength: 120 },
  fileSize: { type: Number, min: 1 },
  activity: { type: [mongoose.Schema.Types.Mixed], default: [] },
  uploadedAt: { type: Date, default: Date.now },
  contentType: { type: String, maxlength: 120 },
  fileData: { type: Buffer, select: false },
}, { timestamps: true });

resumeSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.models.Resume || mongoose.model("Resume", resumeSchema);
