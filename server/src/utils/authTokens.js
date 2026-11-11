import crypto from "node:crypto";
import { Buffer } from "node:buffer";
import jwt from "jsonwebtoken";
import process from "node:process";
import { hashOTP } from "./generateOTP.js";
import {
  ACCESS_TOKEN_TTL_SECONDS,
  AUTH_RATE_LIMITS,
  JWT_AUDIENCE,
  JWT_ISSUER,
  OTP_MAX_ATTEMPTS,
  OTP_MAX_REQUESTS_PER_HOUR,
  OTP_RESEND_COOLDOWN_MS,
  OTP_RESEND_WINDOW_MS,
  OTP_TTL_MS,
  REFRESH_TOKEN_TTL_SECONDS,
  REMEMBER_ME_TTL_SECONDS,
  getRequiredSecret,
} from "./authConfig.js";

export { hashOTP };
export {
  ACCESS_TOKEN_TTL_SECONDS,
  AUTH_RATE_LIMITS,
  OTP_MAX_ATTEMPTS,
  OTP_MAX_REQUESTS_PER_HOUR,
  OTP_RESEND_COOLDOWN_MS,
  OTP_RESEND_WINDOW_MS,
  OTP_TTL_MS,
  REFRESH_TOKEN_TTL_SECONDS,
  REMEMBER_ME_TTL_SECONDS,
};

export const createRefreshToken = () =>
  crypto.randomBytes(32).toString("base64url");

export const hashRefreshToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

export const secureEqualHex = (first, second) => {
  if (typeof first !== "string" || typeof second !== "string") return false;

  const firstBuffer = Buffer.from(first, "hex");
  const secondBuffer = Buffer.from(second, "hex");

  return (
    firstBuffer.length > 0 &&
    firstBuffer.length === secondBuffer.length &&
    crypto.timingSafeEqual(firstBuffer, secondBuffer)
  );
};

const OBJECT_ID_PATTERN = /^[a-f\d]{24}$/i;
const UUID_PATTERN =
  /^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i;

export const createAccessToken = (user, sessionId) => {
  return jwt.sign(
    { sid: sessionId, tokenVersion: user.tokenVersion ?? 0 },
    getRequiredSecret("JWT_SECRET"),
    {
      algorithm: "HS256",
      audience: JWT_AUDIENCE,
      expiresIn: ACCESS_TOKEN_TTL_SECONDS,
      issuer: JWT_ISSUER,
      jwtid: crypto.randomUUID(),
      subject: String(user._id),
    }
  );
};

export const verifyAccessToken = (token, { ignoreExpiration = false } = {}) => {
  const claims = jwt.verify(token, getRequiredSecret("JWT_SECRET"), {
    algorithms: ["HS256"],
    audience: JWT_AUDIENCE,
    ignoreExpiration,
    issuer: JWT_ISSUER,
  });

  const now = Math.floor(Date.now() / 1000);
  if (
    !claims ||
    typeof claims !== "object" ||
    typeof claims.sub !== "string" ||
    !OBJECT_ID_PATTERN.test(claims.sub) ||
    typeof claims.sid !== "string" ||
    !UUID_PATTERN.test(claims.sid) ||
    typeof claims.jti !== "string" ||
    !UUID_PATTERN.test(claims.jti) ||
    !Number.isInteger(claims.iat) ||
    !Number.isInteger(claims.exp) ||
    !Number.isInteger(claims.tokenVersion) ||
    claims.tokenVersion < 0 ||
    claims.iat > now + 60 ||
    claims.exp - claims.iat !== ACCESS_TOKEN_TTL_SECONDS
  ) {
    throw new jwt.JsonWebTokenError("Invalid access token claims.");
  }

  return claims;
};

export const authCookieOptions = (maxAge) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
  ...(maxAge === undefined ? {} : { maxAge }),
});

export const clearAuthCookies = (res) => {
  res.clearCookie("token", authCookieOptions());
  res.clearCookie("refreshToken", authCookieOptions());
};
