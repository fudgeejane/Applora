import { isAllowedClientOrigin } from "./corsMiddleware.js";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export const csrfProtection = (req, res, next) => {
  if (SAFE_METHODS.has(req.method)) return next();

  const origin = req.get("origin");
  const fetchSite = req.get("sec-fetch-site");
  const allowedOrigin = origin && isAllowedClientOrigin(origin);

  if (
    (origin && !allowedOrigin) ||
    (fetchSite === "cross-site" && !allowedOrigin)
  ) {
    return res.status(403).json({
      success: false,
      message: "Request origin is not allowed.",
    });
  }

  return next();
};
