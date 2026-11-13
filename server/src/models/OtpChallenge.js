import mongoose from "mongoose";
import { OTP_MAX_ATTEMPTS } from "../utils/authConfig.js";

const otpChallengeSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    purpose: {
      type: String,
      enum: ["email-verification", "email-change", "password-reset"],
      default: "email-verification",
      index: true,
    },
    targetEmail: { type: String, default: "", trim: true, lowercase: true },
    codeHash: { type: String, required: true, select: false },
    expiresAt: { type: Date, required: true },
    attempts: { type: Number, default: 0, min: 0, max: OTP_MAX_ATTEMPTS },
    consumedAt: { type: Date, default: null },
    status: {
      type: String,
      enum: ["pending", "active", "consumed", "invalidated", "expired"],
      default: "pending",
      required: true,
    },
  },
  { timestamps: true }
);

otpChallengeSchema.index({ userId: 1, status: 1, createdAt: -1 });
otpChallengeSchema.index({ userId: 1, status: 1, expiresAt: 1 });
otpChallengeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const OtpChallenge = mongoose.model("OtpChallenge", otpChallengeSchema);

export default OtpChallenge;
