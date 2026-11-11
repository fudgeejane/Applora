import process from "node:process";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export const csrfProtection = (req, res, next) => {
  if (SAFE_METHODS.has(req.method)) return next();

  const origin = req.get("origin");
  const fetchSite = req.get("sec-fetch-site");
  const allowedOrigin = process.env.CLIENT_URL;

  if (
    (origin && origin !== allowedOrigin) ||
    fetchSite === "cross-site"
  ) {
    return res.status(403).json({
      success: false,
      message: "Request origin is not allowed.",
    });
  }

  return next();
};
