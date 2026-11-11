import crypto from "node:crypto";
import { Buffer } from "node:buffer";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";

import User from "../models/User.js";
import AuthSession from "../models/AuthSession.js";
import OtpChallenge from "../models/OtpChallenge.js";
import RefreshToken from "../models/RefreshToken.js";
import { sendVerificationEmail } from "../services/emailServices.js";
import {
  ACCESS_TOKEN_TTL_SECONDS,
  OTP_MAX_ATTEMPTS,
  OTP_MAX_REQUESTS_PER_HOUR,
  OTP_RESEND_COOLDOWN_MS,
  OTP_RESEND_WINDOW_MS,
  OTP_TTL_MS,
  PASSWORD_HASH_COST,
  REFRESH_TOKEN_TTL_SECONDS,
  REMEMBER_ME_TTL_SECONDS,
} from "../utils/authConfig.js";
import {
  authCookieOptions,
  clearAuthCookies,
  createAccessToken,
  createRefreshToken,
  hashOTP,
  hashRefreshToken,
  secureEqualHex,
  verifyAccessToken,
} from "../utils/authTokens.js";
import { generateOTP } from "../utils/generateOTP.js";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
const normalizeEmail = (email) =>
  typeof email === "string" ? email.trim().toLowerCase() : "";

const isValidEmail = (email) =>
  email.length <= 254 && EMAIL_PATTERN.test(email);

const isValidPassword = (password) =>
  typeof password === "string" &&
  Buffer.byteLength(password, "utf8") <= 72 &&
  PASSWORD_PATTERN.test(password);

const publicUser = (user) => ({
  id: user._id,
  email: user.email,
  firstName: user.firstName,
  lastName: user.lastName,
  isEmailVerified: user.isEmailVerified,
  profileCompleted: user.profileCompleted,
});

const withTransaction = async (operation) => {
  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      result = await operation(session);
    });
    return result;
  } finally {
    await session.endSession();
  }
};

const activateChallenge = (userId, challengeId) =>
  withTransaction(async (session) => {
    const user = await User.findOne({
      _id: userId,
      isEmailVerified: false,
    }).session(session);
    if (!user) return false;

    await OtpChallenge.updateMany(
      { userId, status: "active" },
      { $set: { status: "invalidated" } },
      { session }
    );

    const activation = await OtpChallenge.updateOne(
      {
        _id: challengeId,
        userId,
        status: "pending",
        expiresAt: { $gt: new Date() },
      },
      { $set: { status: "active" } },
      { session }
    );

    return activation.modifiedCount === 1;
  });

const resendThrottle = (user, now) => {
  const recentRequests = (user.otpRequestTimestamps || [])
    .map((timestamp) => new Date(timestamp))
    .filter(
      (timestamp) => timestamp.getTime() > now - OTP_RESEND_WINDOW_MS
    );

  const cooldownUntil = user.otpLastRequestedAt
    ? new Date(user.otpLastRequestedAt).getTime() + OTP_RESEND_COOLDOWN_MS
    : now;
  const hourLimitUntil =
    recentRequests.length >= OTP_MAX_REQUESTS_PER_HOUR
      ? Math.min(...recentRequests.map((timestamp) => timestamp.getTime())) +
        OTP_RESEND_WINDOW_MS
      : now;

  return Math.max(0, Math.ceil((Math.max(cooldownUntil, hourLimitUntil) - now) / 1000));
};

const reserveOtpRequest = (userId, now) => {
  const cooldownCutoff = new Date(now.getTime() - OTP_RESEND_COOLDOWN_MS);
  const hourCutoff = new Date(now.getTime() - OTP_RESEND_WINDOW_MS);
  const recentRequests = {
    $filter: {
      input: { $ifNull: ["$otpRequestTimestamps", []] },
      as: "requestedAt",
      cond: { $gt: ["$$requestedAt", hourCutoff] },
    },
  };

  return User.findOneAndUpdate(
    {
      _id: userId,
      isEmailVerified: false,
      $expr: {
        $and: [
          {
            $lte: [
              { $ifNull: ["$otpLastRequestedAt", new Date(0)] },
              cooldownCutoff,
            ],
          },
          { $lt: [{ $size: recentRequests }, OTP_MAX_REQUESTS_PER_HOUR] },
        ],
      },
    },
    [
      {
        $set: {
          otpRequestTimestamps: {
            $concatArrays: [recentRequests, [now]],
          },
          otpLastRequestedAt: now,
        },
      },
    ],
    {
      returnDocument: "after",
      timestamps: false,
      updatePipeline: true,
    }
  )
    .select("_id")
    .lean();
};

const createPendingChallenge = async (userId, now) => {
  const code = generateOTP();
  const challenge = await withTransaction(async (session) => {
    const user = await User.findOne({
      _id: userId,
      isEmailVerified: false,
    }).session(session);
    if (!user) return null;

    const [createdChallenge] = await OtpChallenge.create(
      [
        {
          userId,
          codeHash: hashOTP(code),
          expiresAt: new Date(now.getTime() + OTP_TTL_MS),
          attempts: 0,
          status: "pending",
        },
      ],
      { session }
    );
    await OtpChallenge.updateMany(
      { userId, status: "active" },
      { $set: { status: "invalidated" } },
      { session }
    );
    return createdChallenge;
  });
  return { challenge, code };
};

const sessionCookiePair = (
  res,
  accessToken,
  refreshToken,
  expiresAt,
  refreshMaxAge
) => {
  res.cookie(
    "token",
    accessToken,
    authCookieOptions(ACCESS_TOKEN_TTL_SECONDS * 1000)
  );
  res.cookie(
    "refreshToken",
    refreshToken,
    authCookieOptions(
      refreshMaxAge ?? Math.max(0, expiresAt.getTime() - Date.now())
    )
  );
};

const revokeFamily = async ({ familyId, sessionId, now }, session) => {
  const familyFilter = familyId ? { familyId } : { sessionId };
  await AuthSession.updateMany(
    { ...familyFilter, revokedAt: null },
    { $set: { revokedAt: now } },
    { session }
  );
  await RefreshToken.updateMany(
    { ...familyFilter, revokedAt: null },
    { $set: { revokedAt: now } },
    { session }
  );
};

const genericResendResponse = (res) =>
  res.status(200).json({
    success: true,
    message: "If the account needs verification, a code will be sent.",
  });

export const register = async (req, res, next) => {
  const { email, password } = req.body ?? {};
  const normalizedEmail = normalizeEmail(email);

  if (!isValidEmail(normalizedEmail) || !isValidPassword(password)) {
    return res.status(400).json({
      success: false,
      message:
        "Enter a valid email and a password of 8-72 bytes with uppercase, lowercase, and a number.",
    });
  }

  const now = new Date();
  const code = generateOTP();

  try {
    const { user, challenge } = await withTransaction(async (session) => {
      const [createdUser] = await User.create(
        [
          {
            email: normalizedEmail,
            password,
            isEmailVerified: false,
            otpLastRequestedAt: now,
            otpRequestTimestamps: [],
          },
        ],
        { session }
      );
      const [createdChallenge] = await OtpChallenge.create(
        [
          {
            userId: createdUser._id,
            codeHash: hashOTP(code),
            expiresAt: new Date(now.getTime() + OTP_TTL_MS),
            attempts: 0,
            status: "pending",
          },
        ],
        { session }
      );
      return { user: createdUser, challenge: createdChallenge };
    });

    try {
      await sendVerificationEmail(normalizedEmail, code);
    } catch {
      console.error("Verification email delivery failed.");
      await withTransaction(async (session) => {
        await OtpChallenge.deleteOne({ _id: challenge._id }, { session });
        await User.deleteOne({ _id: user._id }, { session });
      });
      return res.status(503).json({
        success: false,
        message: "Unable to send verification email. Please try again.",
      });
    }

    const activated = await activateChallenge(user._id, challenge._id);
    if (!activated) {
      const currentUser = await User.findById(user._id).select(
        "isEmailVerified"
      );
      if (currentUser?.isEmailVerified) {
        return res.status(409).json({
          success: false,
          message: "This account has already been verified.",
        });
      }
      if (currentUser) {
        await withTransaction(async (session) => {
          await OtpChallenge.deleteOne({ _id: challenge._id }, { session });
          await User.deleteOne({ _id: user._id }, { session });
        });
      }
      return res.status(503).json({
        success: false,
        message: "Unable to activate the verification code. Please try again.",
        retryAfterSeconds: OTP_RESEND_COOLDOWN_MS / 1000,
      });
    }

    return res.status(201).json({
      success: true,
      message:
        "Registration successful. Please check your email for the verification code.",
      email: normalizedEmail,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists.",
      });
    }
    return next(error);
  }
};

export const verifyEmail = async (req, res, next) => {
  const { email, code } = req.body ?? {};
  const normalizedEmail = normalizeEmail(email);

  if (!isValidEmail(normalizedEmail) || !/^\d{6}$/.test(code || "")) {
    return res.status(400).json({
      success: false,
      message: "A valid email and 6-digit verification code are required.",
    });
  }

  try {
    const user = await User.findOne({ email: normalizedEmail }).select("_id");
    if (!user) {
      return res.status(400).json({
        success: false,
        message: "The verification code is invalid or unavailable.",
      });
    }

    const outcome = await withTransaction(async (session) => {
      const currentUser = await User.findOne({
        _id: user._id,
        isEmailVerified: false,
      }).session(session);
      if (!currentUser) return "verified";

      const now = new Date();
      const challenge = await OtpChallenge.findOne({
        userId: user._id,
        status: "active",
      })
        .select("+codeHash")
        .sort({ createdAt: -1 })
        .session(session);

      if (!challenge) return "unavailable";
      if (challenge.expiresAt <= now) {
        await OtpChallenge.updateOne(
          { _id: challenge._id, status: "active" },
          { $set: { status: "expired" } },
          { session }
        );
        return "expired";
      }
      if (challenge.attempts >= OTP_MAX_ATTEMPTS) {
        await OtpChallenge.updateOne(
          { _id: challenge._id, status: "active" },
          { $set: { status: "invalidated" } },
          { session }
        );
        return "exhausted";
      }

      if (!secureEqualHex(hashOTP(code), challenge.codeHash)) {
        const nextAttemptCount = challenge.attempts + 1;
        const update = await OtpChallenge.updateOne(
          {
            _id: challenge._id,
            status: "active",
            attempts: challenge.attempts,
            expiresAt: { $gt: now },
          },
          {
            $inc: { attempts: 1 },
            ...(nextAttemptCount >= OTP_MAX_ATTEMPTS
              ? { $set: { status: "invalidated" } }
              : {}),
          },
          { session }
        );
        if (update.modifiedCount !== 1) return "unavailable";
        return nextAttemptCount >= OTP_MAX_ATTEMPTS
          ? "exhausted"
          : `incorrect:${OTP_MAX_ATTEMPTS - nextAttemptCount}`;
      }

      const consumed = await OtpChallenge.updateOne(
        {
          _id: challenge._id,
          status: "active",
          attempts: challenge.attempts,
          expiresAt: { $gt: now },
        },
        { $set: { status: "consumed", consumedAt: now } },
        { session }
      );
      if (consumed.modifiedCount !== 1) return "unavailable";

      const verification = await User.updateOne(
        { _id: user._id, isEmailVerified: false },
        { $set: { isEmailVerified: true } },
        { session }
      );
      return verification.modifiedCount === 1 ? "verified-now" : "verified";
    });

    if (outcome === "verified-now") {
      return res.status(200).json({
        success: true,
        message: "Email verified successfully. You can now sign in.",
        email: normalizedEmail,
      });
    }
    if (outcome.startsWith("incorrect:")) {
      return res.status(400).json({
        success: false,
        message: "Incorrect verification code.",
        attemptsRemaining: Number(outcome.split(":")[1]),
      });
    }
    if (outcome === "exhausted") {
      return res.status(429).json({
        success: false,
        message: "Too many incorrect attempts. Please request a new code.",
      });
    }

    return res.status(400).json({
      success: false,
      message:
        outcome === "expired"
          ? "Verification code expired. Please request a new one."
          : "The verification code is invalid or unavailable.",
    });
  } catch (error) {
    return next(error);
  }
};

export const resendVerification = async (req, res, next) => {
  const normalizedEmail = normalizeEmail(req.body?.email);
  if (!isValidEmail(normalizedEmail)) {
    return res.status(400).json({
      success: false,
      message: "A valid email address is required.",
    });
  }

  try {
    const user = await User.findOne({ email: normalizedEmail }).select(
      "+otpLastRequestedAt +otpRequestTimestamps"
    );
    if (!user || user.isEmailVerified) return genericResendResponse(res);

    const now = new Date();
    const reservation = await reserveOtpRequest(user._id, now);
    if (!reservation) {
      const currentUser = await User.findById(user._id).select(
        "+otpLastRequestedAt +otpRequestTimestamps"
      );
      if (!currentUser || currentUser.isEmailVerified) {
        return genericResendResponse(res);
      }

      const retryAfterSeconds = resendThrottle(currentUser, now.getTime());
      res.set("Retry-After", String(retryAfterSeconds));
      return res.status(429).json({
        success: false,
        message: "Please wait before requesting another code.",
        retryAfterSeconds,
      });
    }

    const { challenge, code } = await createPendingChallenge(user._id, now);
    if (!challenge) return genericResendResponse(res);
    try {
      await sendVerificationEmail(normalizedEmail, code);
    } catch {
      console.error("Verification email delivery failed.");
      await OtpChallenge.deleteOne({ _id: challenge._id, status: "pending" });
      return res.status(503).json({
        success: false,
        message: "Unable to send verification email. Please try again.",
        retryAfterSeconds: OTP_RESEND_COOLDOWN_MS / 1000,
      });
    }

    const activated = await activateChallenge(user._id, challenge._id);
    if (!activated) {
      const currentUser = await User.findById(user._id).select(
        "isEmailVerified"
      );
      if (!currentUser || currentUser.isEmailVerified) {
        return genericResendResponse(res);
      }
      return res.status(503).json({
        success: false,
        message: "Unable to activate the verification code. Please try again.",
        retryAfterSeconds: OTP_RESEND_COOLDOWN_MS / 1000,
      });
    }
    return genericResendResponse(res);
  } catch (error) {
    return next(error);
  }
};

export const login = async (req, res, next) => {
  const { email, password, rememberMe = false } = req.body ?? {};
  const normalizedEmail = normalizeEmail(email);

  if (
    !isValidEmail(normalizedEmail) ||
    typeof password !== "string" ||
    Buffer.byteLength(password, "utf8") > 72 ||
    typeof rememberMe !== "boolean"
  ) {
    return res.status(400).json({
      success: false,
      message: "Email, password, and Remember Me selection are invalid.",
    });
  }

  try {
    const user = await User.findOne({ email: normalizedEmail }).select(
      "+password +tokenVersion"
    );
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    if (!user.isEmailVerified) {
      return res.status(403).json({
        success: false,
        message: "Please verify your email before signing in.",
        requiresVerification: true,
      });
    }

    const now = new Date();
    const sessionId = crypto.randomUUID();
    const familyId = crypto.randomUUID();
    const refreshToken = createRefreshToken();
    const sessionTtlSeconds = rememberMe
      ? REMEMBER_ME_TTL_SECONDS
      : REFRESH_TOKEN_TTL_SECONDS;
    const expiresAt = new Date(now.getTime() + sessionTtlSeconds * 1000);

    const sessionCreated = await withTransaction(async (session) => {
      const credentialCheck = await User.updateOne(
        {
          _id: user._id,
          password: user.password,
          isEmailVerified: true,
          $or: [
            { tokenVersion: user.tokenVersion },
            { tokenVersion: { $exists: false } },
          ],
        },
        {
          $set: { lastAuthenticatedAt: now },
          $inc: { authLoginRevision: 1 },
        },
        { session }
      );
      if (credentialCheck.modifiedCount !== 1) return false;

      await AuthSession.create(
        [
          {
            sessionId,
            familyId,
            userId: user._id,
            rememberMe,
            expiresAt,
            userAgent: String(req.get("user-agent") || "").slice(0, 500),
          },
        ],
        { session }
      );
      await RefreshToken.create(
        [
          {
            tokenHash: hashRefreshToken(refreshToken),
            sessionId,
            familyId,
            userId: user._id,
            expiresAt,
          },
        ],
        { session }
      );
      return true;
    });

    if (!sessionCreated) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    sessionCookiePair(
      res,
      createAccessToken(user, sessionId),
      refreshToken,
      expiresAt,
      sessionTtlSeconds * 1000
    );

    return res.status(200).json({
      success: true,
      message: "Login successful.",
      user: publicUser(user),
    });
  } catch (error) {
    return next(error);
  }
};

export const refresh = async (req, res, next) => {
  const presentedToken = req.cookies?.refreshToken;
  if (
    typeof presentedToken !== "string" ||
    !/^[A-Za-z0-9_-]{43}$/.test(presentedToken)
  ) {
    clearAuthCookies(res);
    return res.status(401).json({
      success: false,
      message: "Refresh session is invalid or expired.",
    });
  }

  const tokenHash = hashRefreshToken(presentedToken);
  const now = new Date();

  try {
    const outcome = await withTransaction(async (session) => {
      const currentToken = await RefreshToken.findOne({ tokenHash }).session(
        session
      );
      if (!currentToken) return { kind: "invalid" };

      if (currentToken.revokedAt) {
        await revokeFamily(
          {
            familyId: currentToken.familyId,
            sessionId: currentToken.sessionId,
            now,
          },
          session
        );
        return { kind: "reused" };
      }

      const authSession = await AuthSession.findOne({
        sessionId: currentToken.sessionId,
        familyId: currentToken.familyId,
        userId: currentToken.userId,
      }).session(session);

      if (
        !authSession ||
        authSession.revokedAt ||
        authSession.expiresAt <= now ||
        currentToken.expiresAt <= now
      ) {
        await revokeFamily(
          {
            familyId: currentToken.familyId,
            sessionId: currentToken.sessionId,
            now,
          },
          session
        );
        return { kind: "invalid" };
      }

      const user = await User.findById(currentToken.userId)
        .select("+tokenVersion")
        .session(session);
      if (!user || !user.isEmailVerified) {
        await revokeFamily(
          {
            familyId: currentToken.familyId,
            sessionId: currentToken.sessionId,
            now,
          },
          session
        );
        return { kind: "invalid" };
      }

      const revoked = await RefreshToken.findOneAndUpdate(
        {
          _id: currentToken._id,
          revokedAt: null,
          expiresAt: { $gt: now },
        },
        { $set: { revokedAt: now } },
        { new: true, session }
      );
      if (!revoked) {
        await revokeFamily(
          {
            familyId: currentToken.familyId,
            sessionId: currentToken.sessionId,
            now,
          },
          session
        );
        return { kind: "reused" };
      }

      const newRefreshToken = createRefreshToken();
      const [replacement] = await RefreshToken.create(
        [
          {
            tokenHash: hashRefreshToken(newRefreshToken),
            sessionId: currentToken.sessionId,
            familyId: currentToken.familyId,
            userId: currentToken.userId,
            expiresAt: authSession.expiresAt,
          },
        ],
        { session }
      );
      await RefreshToken.updateOne(
        { _id: currentToken._id },
        { $set: { replacedBy: replacement._id } },
        { session }
      );

      return {
        kind: "rotated",
        accessToken: createAccessToken(user, authSession.sessionId),
        refreshToken: newRefreshToken,
        expiresAt: authSession.expiresAt,
      };
    });

    if (outcome.kind !== "rotated") {
      clearAuthCookies(res);
      return res.status(401).json({
        success: false,
        message: "Refresh session is invalid or expired.",
      });
    }

    sessionCookiePair(
      res,
      outcome.accessToken,
      outcome.refreshToken,
      outcome.expiresAt
    );
    return res.status(200).json({ success: true });
  } catch (error) {
    return next(error);
  }
};

export const logout = async (req, res, next) => {
  const now = new Date();
  let verifiedAccessClaims = null;
  if (req.cookies?.token) {
    try {
      verifiedAccessClaims = verifyAccessToken(req.cookies.token, {
        ignoreExpiration: true,
      });
    } catch {
      verifiedAccessClaims = null;
    }
  }

  try {
    await withTransaction(async (session) => {
      const tokenValue = req.cookies?.refreshToken;
      const tokenRecord =
        typeof tokenValue === "string" &&
        /^[A-Za-z0-9_-]{43}$/.test(tokenValue)
          ? await RefreshToken.findOne({
              tokenHash: hashRefreshToken(tokenValue),
            }).session(session)
          : null;

      const sessionIds = new Set(
        [tokenRecord?.sessionId, verifiedAccessClaims?.sid].filter(Boolean)
      );
      for (const sessionId of sessionIds) {
        const authSession = await AuthSession.findOne({ sessionId }).session(
          session
        );
        await revokeFamily(
          {
            familyId:
              tokenRecord?.sessionId === sessionId
                ? tokenRecord.familyId
                : authSession?.familyId,
            sessionId,
            now,
          },
          session
        );
      }
    });
    clearAuthCookies(res);
    return res.status(200).json({
      success: true,
      message: "Logged out successfully.",
    });
  } catch (error) {
    clearAuthCookies(res);
    return next(error);
  }
};

export const getMe = (req, res) =>
  res.status(200).json({
    success: true,
    user: publicUser(req.user),
  });

export const changePassword = async (req, res, next) => {
  const { currentPassword, newPassword } = req.body ?? {};
  if (
    typeof currentPassword !== "string" ||
    Buffer.byteLength(currentPassword, "utf8") > 72 ||
    !isValidPassword(newPassword)
  ) {
    return res.status(400).json({
      success: false,
      message:
        "Enter the current password and a new password of 8-72 bytes with uppercase, lowercase, and a number.",
    });
  }

  try {
    const newPasswordHash = await bcrypt.hash(newPassword, PASSWORD_HASH_COST);
    const outcome = await withTransaction(async (session) => {
      const user = await User.findById(req.user._id)
        .select("+password +tokenVersion")
        .session(session);
      if (!user) return "missing";
      if (!(await user.comparePassword(currentPassword))) {
        return "invalid-current";
      }

      const now = new Date();
      const updated = await User.updateOne(
        {
          _id: user._id,
          $or: [
            { tokenVersion: user.tokenVersion },
            { tokenVersion: { $exists: false } },
          ],
        },
        {
          $set: { password: newPasswordHash },
          $inc: { tokenVersion: 1 },
        },
        { session, runValidators: true }
      );
      if (updated.modifiedCount !== 1) return "conflict";

      await AuthSession.updateMany(
        { userId: user._id, revokedAt: null },
        { $set: { revokedAt: now } },
        { session }
      );
      await RefreshToken.updateMany(
        { userId: user._id, revokedAt: null },
        { $set: { revokedAt: now } },
        { session }
      );
      return "changed";
    });

    if (outcome === "invalid-current") {
      return res.status(400).json({
        success: false,
        message: "Current password is incorrect.",
      });
    }
    if (outcome !== "changed") {
      return res.status(outcome === "missing" ? 401 : 409).json({
        success: false,
        message: "Unable to change the password. Please sign in again.",
      });
    }

    clearAuthCookies(res);
    return res.status(200).json({
      success: true,
      message: "Password changed. Please sign in again.",
    });
  } catch (error) {
    return next(error);
  }
};

export const completeProfile = async (req, res, next) => {
  const { firstName, lastName } = req.body ?? {};
  if (
    typeof firstName !== "string" ||
    typeof lastName !== "string" ||
    !firstName.trim() ||
    !lastName.trim()
  ) {
    return res.status(400).json({
      success: false,
      message: "First name and last name are required.",
    });
  }

  const trimmedFirstName = firstName.trim();
  const trimmedLastName = lastName.trim();
  if (trimmedFirstName.length > 50 || trimmedLastName.length > 50) {
    return res.status(400).json({
      success: false,
      message: "Names cannot exceed 50 characters.",
    });
  }
  if (req.user.profileCompleted) {
    return res.status(400).json({
      success: false,
      message: "Your profile is already completed.",
    });
  }

  try {
    req.user.firstName = trimmedFirstName;
    req.user.lastName = trimmedLastName;
    req.user.profileCompleted = true;
    await req.user.save();
    return res.status(200).json({
      success: true,
      message: "Profile completed successfully.",
      user: publicUser(req.user),
    });
  } catch (error) {
    return next(error);
  }
};
