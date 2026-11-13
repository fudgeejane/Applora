
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { PASSWORD_HASH_COST } from "../utils/authConfig.js";

const userSchema = new mongoose.Schema(
  {
    // Account credentials
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: true,
      minlength: 8,
      select: false,
    },

    // Email verification
    isEmailVerified: {
      type: Boolean,
      default: false,
    },

    otpLastRequestedAt: { type: Date, default: null, select: false },
    otpRequestTimestamps: {
      type: [Date],
      default: [],
      select: false,
    },
    tokenVersion: { type: Number, default: 0, min: 0, select: false },
    lastAuthenticatedAt: { type: Date, default: null, select: false },
    authLoginRevision: { type: Number, default: 0, min: 0, select: false },

    // Basic profile
    firstName: {
      type: String,
      trim: true,
      default: "",
    },

    lastName: {
      type: String,
      trim: true,
      default: "",
    },

    displayName: { type: String, trim: true, default: "", maxlength: 80 },
    bio: { type: String, trim: true, default: "", maxlength: 500 },
    phone: { type: String, trim: true, default: "", maxlength: 40 },
    location: { type: String, trim: true, default: "", maxlength: 120 },
    avatarUrl: { type: String, trim: true, default: "", maxlength: 2048 },
    avatarCloudinaryPublicId: { type: String, trim: true, default: "" },

    profileCompleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Hash password before saving
userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;

  const salt = await bcrypt.genSalt(PASSWORD_HASH_COST);
  this.password = await bcrypt.hash(this.password, salt);
});

// Compare entered password with hashed password
userSchema.methods.comparePassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model("User", userSchema);

export default User;
