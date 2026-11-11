import crypto from "node:crypto";
import AuthRateLimit from "../models/AuthRateLimit.js";
import { getRequiredSecret } from "../utils/authConfig.js";

export const authRateLimit = ({ limit, windowMs, name }) =>
  async (req, res, next) => {
    try {
      const now = new Date();
      const windowStart = new Date(now.getTime() - windowMs);
      const key = crypto
        .createHmac("sha256", getRequiredSecret("JWT_SECRET"))
        .update(`${name}:${req.ip || "unknown"}`)
        .digest("hex");
      const inCurrentWindow = {
        $gt: ["$windowStart", windowStart],
      };

      const incrementLimit = () =>
        AuthRateLimit.findOneAndUpdate(
          { key },
          [
            {
              $set: {
                count: {
                  $cond: [
                    inCurrentWindow,
                    { $add: [{ $ifNull: ["$count", 0] }, 1] },
                    1,
                  ],
                },
                windowStart: {
                  $cond: [inCurrentWindow, "$windowStart", now],
                },
                expiresAt: new Date(now.getTime() + windowMs),
              },
            },
          ],
          {
            returnDocument: "after",
            upsert: true,
            updatePipeline: true,
          }
        );
      let record;
      try {
        record = await incrementLimit();
      } catch (error) {
        if (error.code !== 11000) throw error;
        record = await incrementLimit();
      }

      if (record.count > limit) {
        const retryAfterSeconds = Math.max(
          1,
          Math.ceil(
            (record.windowStart.getTime() + windowMs - now.getTime()) / 1000
          )
        );
        res.set("Retry-After", String(retryAfterSeconds));
        return res.status(429).json({
          success: false,
          message: "Too many requests. Please wait and try again.",
          retryAfterSeconds,
        });
      }

      return next();
    } catch (error) {
      return next(error);
    }
  };
