import mongoose from "mongoose";

const authRateLimitSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, select: false },
    count: { type: Number, required: true, default: 0 },
    windowStart: { type: Date, required: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

authRateLimitSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const AuthRateLimit = mongoose.model("AuthRateLimit", authRateLimitSchema);

export default AuthRateLimit;
