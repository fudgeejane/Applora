import express from "express";
import {
  chatAssistant,
  createConversation,
  deleteConversation,
  listConversations,
  updateConversation,
} from "../controllers/assistantController.js";
import { protect, requireCompletedProfile } from "../middleware/authMiddleware.js";
import { authRateLimit } from "../middleware/authRateLimit.js";

const router = express.Router();
router.use(protect, requireCompletedProfile);
router.get("/conversations", listConversations);
router.post("/conversations", createConversation);
router.patch("/conversations/:id", updateConversation);
router.delete("/conversations/:id", deleteConversation);
router.post(
  "/chat",
  authRateLimit({ limit: 20, windowMs: 60 * 1000, name: "gemini-chat" }),
  chatAssistant,
);

export default router;
