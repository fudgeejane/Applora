import express from "express";
import { protect, requireCompletedProfile } from "../middleware/authMiddleware.js";
import { authRateLimit } from "../middleware/authRateLimit.js";
import {
  analyzeResume,
  deleteResume,
  downloadResume,
  getResume,
  listResumes,
  parseResumeUpload,
  updateResume,
  uploadResume,
} from "../controllers/resumeController.js";

const router = express.Router();
router.use(protect, requireCompletedProfile);
router.get("/", listResumes);
router.get("/:id/download", downloadResume);
router.get("/:id", getResume);
router.post("/upload", parseResumeUpload, uploadResume);
router.post(
  "/:id/analyze",
  authRateLimit({ limit: 30, windowMs: 60 * 60 * 1000, name: "gemini-resume-analysis" }),
  analyzeResume,
);
router.patch("/:id", updateResume);
router.delete("/:id", deleteResume);
export default router;
