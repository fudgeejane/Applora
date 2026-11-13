import express from "express";

import {
  submitPublicSupportMessage,
  submitSupportMessage,
} from "../controllers/supportController.js";
import { protect } from "../middleware/authMiddleware.js";
import { authRateLimit } from "../middleware/authRateLimit.js";

const router = express.Router();

router.post(
  "/contact",
  authRateLimit({
    limit: 5,
    windowMs: 15 * 60 * 1000,
    name: "support-contact",
  }),
  protect,
  submitSupportMessage,
);

router.post(
  "/public-contact",
  authRateLimit({
    limit: 5,
    windowMs: 15 * 60 * 1000,
    name: "public-support-contact",
  }),
  submitPublicSupportMessage,
);

export default router;
