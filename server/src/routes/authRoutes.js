import {
  register,
  verifyEmail,
  resendVerification,
  login,
  logout,
  refresh,
  getMe,
  changePassword,
  requestPasswordReset,
  resetPassword,
  searchProfileLocations,
  completeProfile,
  parseProfileUpload,
  updateProfile,
  listSessions,
  revokeSession,
  revokeOtherSessions,
  requestEmailChange,
  verifyEmailChange,
} from "../controllers/authController.js";

import express from "express";

import { protect } from "../middleware/authMiddleware.js";
import { authRateLimit } from "../middleware/authRateLimit.js";
import { AUTH_RATE_LIMITS } from "../utils/authConfig.js";

const router = express.Router();

// Registration and email verification
router.post(
  "/register",
  authRateLimit({ ...AUTH_RATE_LIMITS.register, name: "register" }),
  register
);
router.post(
  "/verify-email",
  authRateLimit({ ...AUTH_RATE_LIMITS.verify, name: "verify" }),
  verifyEmail
);
router.post(
  "/resend-verification",
  authRateLimit({ ...AUTH_RATE_LIMITS.resend, name: "resend" }),
  resendVerification
);

// JWT authentication
router.post(
  "/login",
  authRateLimit({ ...AUTH_RATE_LIMITS.login, name: "login" }),
  login
);
router.post("/logout", logout);
router.post(
  "/password-reset/request",
  authRateLimit({
    ...AUTH_RATE_LIMITS.passwordReset,
    name: "password-reset-request",
  }),
  requestPasswordReset
);
router.post(
  "/password-reset/request-current",
  authRateLimit({
    ...AUTH_RATE_LIMITS.passwordReset,
    name: "password-reset-current-request",
  }),
  protect,
  requestPasswordReset
);
router.post(
  "/password-reset/confirm",
  authRateLimit({
    ...AUTH_RATE_LIMITS.passwordReset,
    name: "password-reset-confirm",
  }),
  resetPassword
);
router.post(
  "/refresh",
  authRateLimit({ ...AUTH_RATE_LIMITS.refresh, name: "refresh" }),
  refresh
);

// Authenticated session
router.get("/me", protect, getMe);
router.get(
  "/locations/search",
  authRateLimit({
    ...AUTH_RATE_LIMITS.locationSearch,
    name: "profile-location-search",
  }),
  protect,
  searchProfileLocations
);
router.post(
  "/change-password",
  authRateLimit({
    ...AUTH_RATE_LIMITS.passwordChange,
    name: "password-change",
  }),
  protect,
  changePassword
);
router.patch("/complete-profile", protect, completeProfile);
router.patch("/profile", protect, parseProfileUpload, updateProfile);
router.post("/email-change/request", authRateLimit({ ...AUTH_RATE_LIMITS.passwordChange, name: "email-change-request" }), protect, requestEmailChange);
router.post("/email-change/verify", authRateLimit({ ...AUTH_RATE_LIMITS.verify, name: "email-change-verify" }), protect, verifyEmailChange);
router.get("/sessions", protect, listSessions);
router.delete("/sessions/others", protect, revokeOtherSessions);
router.delete("/sessions/:sessionId", protect, revokeSession);

export default router;
