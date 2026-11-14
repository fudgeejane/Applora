import cors from "cors";
import process from "node:process";

const PRODUCTION_CLIENT_ORIGIN = "https://applora-seven.vercel.app";
const LOCALHOST_HOSTNAMES = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

export const isAllowedClientOrigin = (origin) => {
  if (!origin) return true;

  try {
    const parsedOrigin = new URL(origin);
    const hostname = parsedOrigin.hostname.toLowerCase();
    const configuredClientOrigin = process.env.CLIENT_URL ? new URL(process.env.CLIENT_URL).origin : null;
    const isAllowedConfiguredOrigin = Boolean(configuredClientOrigin && parsedOrigin.origin === configuredClientOrigin);
    const isAllowedProductionOrigin = process.env.NODE_ENV === "production" && parsedOrigin.origin === PRODUCTION_CLIENT_ORIGIN;
    const isAllowedLocalOrigin = process.env.NODE_ENV !== "production" && LOCALHOST_HOSTNAMES.has(hostname);

    return isAllowedConfiguredOrigin || isAllowedProductionOrigin || isAllowedLocalOrigin;
  } catch {
    return false;
  }
};

const corsMiddleware = cors({
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    callback(null, isAllowedClientOrigin(origin) ? origin : false);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  optionsSuccessStatus: 204,
  maxAge: 600,
});

export default corsMiddleware;
