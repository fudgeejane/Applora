import mongoose from "mongoose";

const refreshTokenSchema = new mongoose.Schema(
  {
    tokenHash: { type: String, required: true, unique: true, select: false },
    sessionId: { type: String, required: true, index: true },
    familyId: { type: String, required: true, index: true },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date, default: null },
    replacedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "RefreshToken",
      default: null,
    },
  },
  { timestamps: true }
);

refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
refreshTokenSchema.index({ sessionId: 1, revokedAt: 1 });
refreshTokenSchema.index({ familyId: 1, revokedAt: 1 });

const RefreshToken = mongoose.model("RefreshToken", refreshTokenSchema);

export default RefreshToken;
