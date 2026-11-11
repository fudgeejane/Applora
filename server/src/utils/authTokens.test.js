import test from "node:test";
import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import jwt from "jsonwebtoken";
import process from "node:process";
import { generateOTP, hashOTP } from "./generateOTP.js";
import {
  ACCESS_TOKEN_TTL_SECONDS,
  REFRESH_TOKEN_TTL_SECONDS,
  REMEMBER_ME_TTL_SECONDS,
  authCookieOptions,
  createAccessToken,
  createRefreshToken,
  hashRefreshToken,
  secureEqualHex,
  verifyAccessToken,
} from "./authTokens.js";
import { assertAuthConfiguration } from "./authConfig.js";

process.env.JWT_SECRET = "test-jwt-secret-that-is-at-least-32-bytes-long";
process.env.OTP_SECRET = "test-otp-secret-that-is-at-least-32-bytes-long";

test("OTP generation and keyed hashing", () => {
  const first = generateOTP();
  const second = generateOTP();

  assert.match(first, /^\d{6}$/);
  assert.match(second, /^\d{6}$/);
  assert.notEqual(hashOTP("123456"), "123456");
  assert.equal(hashOTP("123456"), hashOTP("123456"));
  assert.equal(secureEqualHex(hashOTP("123456"), hashOTP("123456")), true);
  assert.equal(secureEqualHex(hashOTP("123456"), hashOTP("654321")), false);
});

test("access and refresh token lifetimes and signatures", () => {
  const user = { _id: "507f1f77bcf86cd799439011", tokenVersion: 4 };
  const sessionId = "550e8400-e29b-41d4-a716-446655440000";
  const accessToken = createAccessToken(user, sessionId);
  const claims = verifyAccessToken(accessToken);

  assert.equal(claims.sub, user._id);
  assert.equal(claims.sid, sessionId);
  assert.equal(claims.tokenVersion, 4);
  assert.equal(claims.exp - claims.iat, ACCESS_TOKEN_TTL_SECONDS);
  assert.ok(claims.jti);
  assert.throws(() => verifyAccessToken(`${accessToken.slice(0, -1)}x`));

  const refreshToken = createRefreshToken();
  assert.equal(Buffer.from(refreshToken, "base64url").length, 32);
  assert.notEqual(hashRefreshToken(refreshToken), refreshToken);
  assert.equal(REFRESH_TOKEN_TTL_SECONDS, 7 * 24 * 60 * 60);
  assert.equal(REMEMBER_ME_TTL_SECONDS, 30 * 24 * 60 * 60);
});

test("access JWT carries the session identifier and secure algorithm", () => {
  const token = createAccessToken(
    { _id: "507f1f77bcf86cd799439011", tokenVersion: 0 },
    "550e8400-e29b-41d4-a716-446655440000"
  );
  const decoded = jwt.decode(token, { complete: true });

  assert.equal(decoded.payload.sid, "550e8400-e29b-41d4-a716-446655440000");
  assert.equal(decoded.header.alg, "HS256");
});

test("access token verification rejects unsupported algorithms and malformed claims", () => {
  const secret = process.env.JWT_SECRET;
  const unsupported = jwt.sign(
    {
      sub: "user-123",
      sid: "550e8400-e29b-41d4-a716-446655440000",
      tokenVersion: 0,
      jti: "token-id",
    },
    secret,
    {
      algorithm: "HS384",
      audience: "applora-client",
      expiresIn: ACCESS_TOKEN_TTL_SECONDS,
      issuer: "applora-api",
    }
  );
  assert.throws(() => verifyAccessToken(unsupported));

  const malformed = jwt.sign(
    { sid: "session-456", tokenVersion: 0 },
    secret,
    {
      algorithm: "HS256",
      audience: "applora-client",
      expiresIn: ACCESS_TOKEN_TTL_SECONDS,
      issuer: "applora-api",
    }
  );
  assert.throws(() => verifyAccessToken(malformed));
});

test("auth cookies are HttpOnly and Secure in production", () => {
  const previousNodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = "production";

  assert.deepEqual(authCookieOptions(900000), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 900000,
  });

  if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = previousNodeEnv;
});

test("authentication configuration requires independent secrets and HTTPS in production", () => {
  const originalEnv = {
    JWT_SECRET: process.env.JWT_SECRET,
    OTP_SECRET: process.env.OTP_SECRET,
    CLIENT_URL: process.env.CLIENT_URL,
    NODE_ENV: process.env.NODE_ENV,
  };

  try {
    process.env.JWT_SECRET = "test-jwt-secret-that-is-at-least-32-bytes-long";
    process.env.OTP_SECRET = "test-otp-secret-that-is-at-least-32-bytes-long";
    process.env.CLIENT_URL = "http://localhost:5173";
    process.env.NODE_ENV = "development";
    assert.doesNotThrow(assertAuthConfiguration);

    process.env.NODE_ENV = "production";
    assert.throws(assertAuthConfiguration, /HTTPS in production/);
    process.env.CLIENT_URL = "https://app.example";
    assert.doesNotThrow(assertAuthConfiguration);

    process.env.OTP_SECRET = process.env.JWT_SECRET;
    assert.throws(assertAuthConfiguration, /must be independent/);
  } finally {
    for (const [name, value] of Object.entries(originalEnv)) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  }
});
