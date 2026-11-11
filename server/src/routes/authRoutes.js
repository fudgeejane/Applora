import {
  register,
  verifyEmail,
  resendVerification,
  login,
  logout,
  refresh,
  getMe,
  changePassword,
  completeProfile,
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
  "/refresh",
  authRateLimit({ ...AUTH_RATE_LIMITS.refresh, name: "refresh" }),
  refresh
);

// Authenticated session
router.get("/me", protect, getMe);
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

export default router;
