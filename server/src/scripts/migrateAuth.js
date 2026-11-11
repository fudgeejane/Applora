import dotenv from "dotenv";
import mongoose from "mongoose";
import process from "node:process";
import connectDB from "../config/db.js";
import AuthRateLimit from "../models/AuthRateLimit.js";
import AuthSession from "../models/AuthSession.js";
import OtpChallenge from "../models/OtpChallenge.js";
import RefreshToken from "../models/RefreshToken.js";
import User from "../models/User.js";

dotenv.config();

const migrateAuth = async () => {
  try {
    await connectDB();

    await User.updateMany(
      { tokenVersion: { $exists: false } },
      { $set: { tokenVersion: 0 } }
    );
    await AuthSession.updateMany(
      { familyId: { $exists: false } },
      [{ $set: { familyId: "$sessionId" } }],
      { updatePipeline: true }
    );
    await RefreshToken.updateMany(
      { familyId: { $exists: false } },
      [{ $set: { familyId: "$sessionId" } }],
      { updatePipeline: true }
    );
    await User.updateMany(
      {},
      {
        $unset: {
          verificationCode: "",
          verificationCodeExpiresAt: "",
          lastVerificationCodeSentAt: "",
          verificationAttempts: "",
        },
      },
      { strict: false }
    );

    await Promise.all([
      AuthSession.init(),
      RefreshToken.init(),
      OtpChallenge.init(),
      AuthRateLimit.init(),
    ]);

    console.log("Authentication collections and indexes are ready.");
  } catch (error) {
    console.error(
      "Authentication migration failed:",
      error?.name || "Error",
      error?.code
    );
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
};

migrateAuth();
