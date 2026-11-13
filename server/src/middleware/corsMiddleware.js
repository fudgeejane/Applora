import cors from "cors";
import process from "node:process";

const PRODUCTION_CLIENT_ORIGIN = "https://applora-seven.vercel.app";

export const isAllowedClientOrigin = (origin) =>
  typeof origin === "string" &&
  (
    origin === process.env.CLIENT_URL ||
    (process.env.NODE_ENV === "production" && origin === PRODUCTION_CLIENT_ORIGIN)
  );

const corsMiddleware = cors({
  origin(origin, callback) {
    callback(null, isAllowedClientOrigin(origin) ? origin : false);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  optionsSuccessStatus: 204,
  maxAge: 600,
});

export default corsMiddleware;
