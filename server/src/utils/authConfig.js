import { Buffer } from "node:buffer";
import process from "node:process";

export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
export const REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60;
export const REMEMBER_ME_TTL_SECONDS = 30 * 24 * 60 * 60;

export const OTP_TTL_MS = 2 * 60 * 1000;
export const PASSWORD_RESET_TTL_MS = 15 * 60 * 1000;
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
  passwordReset: { limit: 5, windowMs: 15 * 60 * 1000 },
  locationSearch: { limit: 30, windowMs: 60 * 1000 },
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

export const getAuthConfigurationErrors = (env = process.env) => {
  const errors = [];
  const jwtSecret = env.JWT_SECRET;
  const otpSecret = env.OTP_SECRET;

  for (const [name, value] of [
    ["JWT_SECRET", jwtSecret],
    ["OTP_SECRET", otpSecret],
  ]) {
    if (!value) {
      errors.push(`${name} is missing (must be at least 32 bytes).`);
    } else if (Buffer.byteLength(value, "utf8") < 32) {
      errors.push(`${name} must be at least 32 bytes.`);
    }
  }

  if (
    jwtSecret &&
    otpSecret &&
    Buffer.byteLength(jwtSecret, "utf8") >= 32 &&
    Buffer.byteLength(otpSecret, "utf8") >= 32 &&
    jwtSecret === otpSecret
  ) {
    errors.push("JWT_SECRET and OTP_SECRET must be independent.");
  }

  const clientUrl = env.CLIENT_URL;
  let parsedClientUrl;
  try {
    parsedClientUrl = new URL(clientUrl);
  } catch {
    errors.push("CLIENT_URL must be a valid frontend origin.");
  }

  if (parsedClientUrl && (
    parsedClientUrl.origin !== clientUrl ||
    !["http:", "https:"].includes(parsedClientUrl.protocol)
  )) {
    errors.push("CLIENT_URL must be an exact HTTP or HTTPS origin.");
  }

  if (
    parsedClientUrl &&
    env.NODE_ENV === "production" &&
    parsedClientUrl.protocol !== "https:"
  ) {
    errors.push("CLIENT_URL must use HTTPS in production.");
  }

  return errors;
};

export const getServerConfigurationErrors = (env = process.env) => {
  const errors = getAuthConfigurationErrors(env);
  if (!env.MONGODB_URI) errors.push("MONGODB_URI is missing.");
  return errors;
};

export const assertAuthConfiguration = () => {
  const errors = getAuthConfigurationErrors();
  if (errors.length) {
    throw new Error(`Invalid server configuration:\n- ${errors.join("\n- ")}`);
  }
};
