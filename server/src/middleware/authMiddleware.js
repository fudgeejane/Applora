
import User from "../models/User.js";
import AuthSession from "../models/AuthSession.js";
import { verifyAccessToken } from "../utils/authTokens.js";

export const protect = async (req, res, next) => {
  const token = req.cookies?.token;
  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Not authenticated. Please sign in.",
    });
  }

  let claims;
  try {
    claims = verifyAccessToken(token);
  } catch {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired authentication session.",
    });
  }

  try {
    const [user, authSession] = await Promise.all([
      User.findById(claims.sub).select("+tokenVersion"),
      AuthSession.findOne({
        sessionId: claims.sid,
        userId: claims.sub,
        revokedAt: null,
        expiresAt: { $gt: new Date() },
      }),
    ]);

    if (
      !user ||
      user.tokenVersion !== claims.tokenVersion ||
      !authSession
    ) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired authentication session.",
      });
    }

    if (!user.isEmailVerified) {
      return res.status(403).json({
        success: false,
        message: "Please verify your email first.",
      });
    }

    req.user = user;
    return next();
  } catch (error) {
    return next(error);
  }
};


export const requireCompletedProfile = (req, res, next) => {
  if (!req.user.profileCompleted) {
    return res.status(403).json({
      success: false,
      message: "Please complete your profile before accessing this resource.",
      requiresProfileCompletion: true,
    });
  }

  next();
};