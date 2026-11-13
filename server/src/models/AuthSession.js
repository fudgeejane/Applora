import mongoose from "mongoose";

const authSessionSchema = new mongoose.Schema(
  {
    sessionId: { type: String, required: true, unique: true },
    familyId: { type: String, required: true, unique: true },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    rememberMe: { type: Boolean, default: false, required: true },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date, default: null },
    userAgent: { type: String, default: "" },
    lastActiveAt: { type: Date, default: Date.now },
    location: { type: String, default: "", maxlength: 120 },
  },
  { timestamps: true }
);

authSessionSchema.index({ userId: 1, revokedAt: 1, expiresAt: 1 });
authSessionSchema.index({ familyId: 1, revokedAt: 1 });
authSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const AuthSession = mongoose.model("AuthSession", authSessionSchema);

export default AuthSession;
