import express from "express";
import { protect, requireCompletedProfile } from "../middleware/authMiddleware.js";
import { createApplication, deleteApplication, listApplications, scheduleInterview, updateApplication } from "../controllers/applicationController.js";

const router = express.Router();
router.use(protect, requireCompletedProfile);
router.get("/", listApplications);
router.post("/", createApplication);
router.patch("/:id", updateApplication);
router.delete("/:id", deleteApplication);
router.put("/:id/interview", scheduleInterview);
export default router;
