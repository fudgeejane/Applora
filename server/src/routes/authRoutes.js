import {
  register,
  verifyEmail,
  resendVerification,
  login,
  logout,
  getMe,
  completeProfile,
} from "../controllers/authController.js";

import express from "express";

import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// Registration and email verification
router.post("/register", register);
router.post("/verify-email", verifyEmail);
router.post("/resend-verification", resendVerification);

// JWT authentication
router.post("/login", login);
router.post("/logout", logout);

// Authenticated session
router.get("/me", protect, getMe);
router.patch("/complete-profile", protect, completeProfile);

export default router;
