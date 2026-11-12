import express from "express";
import { protect, requireCompletedProfile } from "../middleware/authMiddleware.js";
import {
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
router.patch("/:id", updateResume);
router.delete("/:id", deleteResume);
export default router;
