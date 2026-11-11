import { Buffer } from "node:buffer";
import process from "node:process";

export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
export const REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60;
export const REMEMBER_ME_TTL_SECONDS = 30 * 24 * 60 * 60;

export const OTP_TTL_MS = 2 * 60 * 1000;
export const OTP_RESEND_COOLDOWN_MS = 2 * 60 * 1000;
export const OTP_RESEND_WINDOW_MS = 60 * 60 * 1000;
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_MAX_REQUESTS_PER_HOUR = 5;
export const PASSWORD_HASH_COST = 12;
export const AUTH_RATE_LIMITS = {
  register: { limit: 5, windowMs: 60 * 60 * 1000 },
  verify: { limit: 20, windowMs: 15 * 60 * 1000 },
  resend: { limit: 10, windowMs: 60 * 60 * 1000 },
  login: { limit: 10, windowMs: 15 * 60 * 1000 },
  refresh: { limit: 30, windowMs: 15 * 60 * 1000 },
  passwordChange: { limit: 5, windowMs: 15 * 60 * 1000 },
};

export const JWT_ISSUER = "applora-api";
export const JWT_AUDIENCE = "applora-client";

export const getRequiredSecret = (name) => {
  const secret = process.env[name];
  if (!secret || Buffer.byteLength(secret, "utf8") < 32) {
    throw new Error(`${name} must be configured with at least 32 bytes.`);
  }

  return secret;
};

export const assertAuthConfiguration = () => {
  const jwtSecret = getRequiredSecret("JWT_SECRET");
  const otpSecret = getRequiredSecret("OTP_SECRET");

  if (jwtSecret === otpSecret) {
    throw new Error("JWT_SECRET and OTP_SECRET must be independent.");
  }

  const clientUrl = process.env.CLIENT_URL;
  let parsedClientUrl;
  try {
    parsedClientUrl = new URL(clientUrl);
  } catch {
    throw new Error("CLIENT_URL must be a valid frontend origin.");
  }

  if (
    parsedClientUrl.origin !== clientUrl ||
    !["http:", "https:"].includes(parsedClientUrl.protocol)
  ) {
    throw new Error("CLIENT_URL must be an exact HTTP or HTTPS origin.");
  }

  if (
    process.env.NODE_ENV === "production" &&
    parsedClientUrl.protocol !== "https:"
  ) {
    throw new Error("CLIENT_URL must use HTTPS in production.");
  }
};
