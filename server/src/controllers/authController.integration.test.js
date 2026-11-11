import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import process from "node:process";

const mongoUri = process.env.MONGODB_TEST_URI;

test(
  "OTP and session lifecycle, refresh replay, logout, and password-change revocation",
  { skip: !mongoUri && "Set MONGODB_TEST_URI to run MongoDB auth integration tests." },
  async (t) => {
    process.env.JWT_SECRET = "integration-jwt-secret-that-is-at-least-32-bytes";
    process.env.OTP_SECRET = "integration-otp-secret-that-is-at-least-32-bytes";
    process.env.CLIENT_URL = "http://localhost";

    const [
      { default: mongoose },
      { default: User },
      { app },
      { default: OtpChallenge },
      { default: AuthRateLimit },
      { hashOTP },
    ] = await Promise.all([
      import("mongoose"),
      import("../models/User.js"),
      import("../server.js"),
      import("../models/OtpChallenge.js"),
      import("../models/AuthRateLimit.js"),
      import("../utils/authTokens.js"),
    ]);

    await mongoose.connect(mongoUri);
    await Promise.all([
      User.init(),
      (await import("../models/AuthSession.js")).default.init(),
      (await import("../models/RefreshToken.js")).default.init(),
      OtpChallenge.init(),
      AuthRateLimit.init(),
    ]);

    const server = app.listen(0);
    await new Promise((resolve) => server.once("listening", resolve));
    const baseUrl = `http://127.0.0.1:${server.address().port}`;
    const email = `auth-test-${crypto.randomUUID()}@example.test`;
    const password = "InitialPass123";
    const userIds = [];

    const request = (path, body, cookie) =>
      fetch(`${baseUrl}/api/auth${path}`, {
        method: path === "/me" ? "GET" : "POST",
        headers: {
          Origin: "http://localhost",
          ...(body ? { "Content-Type": "application/json" } : {}),
          ...(cookie ? { Cookie: cookie } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });

    const cookiesFrom = (response) => response.headers.getSetCookie();
    const cookieValue = (cookies, name) => {
      const cookie = cookies.find((item) => item.startsWith(`${name}=`));
      assert.ok(cookie, `Expected ${name} cookie`);
      return cookie.split(";")[0];
    };
    const cookiePair = (cookies, names = ["token", "refreshToken"]) =>
      names.map((name) => cookieValue(cookies, name)).join("; ");

    try {
      const user = await User.create({
        email,
        password,
        isEmailVerified: true,
      });
      userIds.push(user._id);

      const rememberedLogin = await request("/login", {
        email,
        password,
        rememberMe: true,
      });
      assert.equal(rememberedLogin.status, 200);
      const rememberedCookies = cookiesFrom(rememberedLogin);
      assert.ok(
        rememberedCookies.some((cookie) => cookie.startsWith("refreshToken=") && cookie.includes("Max-Age=2592000"))
      );
      const protectedResponse = await request(
        "/me",
        null,
        cookieValue(rememberedCookies, "token")
      );
      assert.equal(protectedResponse.status, 200);

      const oldRefreshCookie = cookieValue(rememberedCookies, "refreshToken");
      const rotated = await request("/refresh", null, oldRefreshCookie);
      assert.equal(rotated.status, 200);
      const rotatedCookies = cookiesFrom(rotated);
      const newRefreshCookie = cookieValue(rotatedCookies, "refreshToken");
      assert.notEqual(newRefreshCookie, oldRefreshCookie);

      const replay = await request("/refresh", null, oldRefreshCookie);
      assert.equal(replay.status, 401);
      const revokedSessionRefresh = await request("/refresh", null, newRefreshCookie);
      assert.equal(revokedSessionRefresh.status, 401);

      const concurrentLogin = await request("/login", { email, password });
      const concurrentRefreshCookie = cookieValue(
        cookiesFrom(concurrentLogin),
        "refreshToken"
      );
      const concurrentResponses = await Promise.all([
        request("/refresh", null, concurrentRefreshCookie),
        request("/refresh", null, concurrentRefreshCookie),
      ]);
      assert.deepEqual(
        concurrentResponses.map((response) => response.status).sort(),
        [200, 401]
      );
      const concurrentSuccess = concurrentResponses.find(
        (response) => response.status === 200
      );
      const concurrentReplacement = cookieValue(
        cookiesFrom(concurrentSuccess),
        "refreshToken"
      );
      assert.equal(
        (await request("/refresh", null, concurrentReplacement)).status,
        401
      );

      const standardLogin = await request("/login", { email, password });
      assert.equal(standardLogin.status, 200);
      const standardCookies = cookiesFrom(standardLogin);
      assert.ok(
        standardCookies.some((cookie) => cookie.startsWith("refreshToken=") && cookie.includes("Max-Age=604800"))
      );

      const logout = await request(
        "/logout",
        {},
        cookiePair(standardCookies)
      );
      assert.equal(logout.status, 200);
      const loggedOutAccess = await request(
        "/me",
        null,
        cookieValue(standardCookies, "token")
      );
      assert.equal(loggedOutAccess.status, 401);
      const loggedOutRefresh = await request(
        "/refresh",
        null,
        cookieValue(standardCookies, "refreshToken")
      );
      assert.equal(loggedOutRefresh.status, 401);

      const passwordLogin = await request("/login", { email, password });
      const passwordCookies = cookiesFrom(passwordLogin);
      const otherDeviceLogin = await request("/login", { email, password });
      const otherDeviceCookies = cookiesFrom(otherDeviceLogin);
      const changePassword = await request(
        "/change-password",
        { currentPassword: password, newPassword: "ChangedPass456" },
        cookiePair(passwordCookies)
      );
      assert.equal(changePassword.status, 200);

      const oldAccessRequest = await fetch(`${baseUrl}/api/auth/me`, {
        headers: {
          Origin: "http://localhost",
          Cookie: cookieValue(passwordCookies, "token"),
        },
      });
      assert.equal(oldAccessRequest.status, 401);

      const otherDeviceRequest = await fetch(`${baseUrl}/api/auth/me`, {
        headers: {
          Origin: "http://localhost",
          Cookie: cookieValue(otherDeviceCookies, "token"),
        },
      });
      assert.equal(otherDeviceRequest.status, 401);
      const revokedRefresh = await request(
        "/refresh",
        null,
        cookieValue(otherDeviceCookies, "refreshToken")
      );
      assert.equal(revokedRefresh.status, 401);

      const newPasswordLogin = await request("/login", {
        email,
        password: "ChangedPass456",
      });
      assert.equal(newPasswordLogin.status, 200);

      const otpUser = await User.create({
        email: `otp-test-${crypto.randomUUID()}@example.test`,
        password,
        isEmailVerified: false,
      });
      userIds.push(otpUser._id);
      const createChallenge = () =>
        OtpChallenge.create({
          userId: otpUser._id,
          codeHash: hashOTP("123456"),
          expiresAt: new Date(Date.now() + 120000),
          status: "active",
        });

      await createChallenge();
      for (let attempt = 0; attempt < 5; attempt += 1) {
        const response = await request("/verify-email", {
          email: otpUser.email,
          code: "000000",
        });
        assert.equal(response.status, attempt === 4 ? 429 : 400);
      }
      const exhaustedChallenge = await request("/verify-email", {
        email: otpUser.email,
        code: "123456",
      });
      assert.equal(exhaustedChallenge.status, 400);

      await createChallenge();
      const successfulVerification = await request("/verify-email", {
        email: otpUser.email,
        code: "123456",
      });
      assert.equal(successfulVerification.status, 200);
      const reusedCode = await request("/verify-email", {
        email: otpUser.email,
        code: "123456",
      });
      assert.equal(reusedCode.status, 400);

      const expiredUser = await User.create({
        email: `expired-otp-${crypto.randomUUID()}@example.test`,
        password,
        isEmailVerified: false,
      });
      userIds.push(expiredUser._id);
      await OtpChallenge.create({
        userId: expiredUser._id,
        codeHash: hashOTP("123456"),
        expiresAt: new Date(Date.now() - 1000),
        status: "active",
      });
      const expiredVerification = await request("/verify-email", {
        email: expiredUser.email,
        code: "123456",
      });
      assert.equal(expiredVerification.status, 400);

      const requestTimes = Array.from(
        { length: 5 },
        (_, index) => new Date(Date.now() - (index + 1) * 60000)
      );
      const throttledUser = await User.create({
        email: `throttled-otp-${crypto.randomUUID()}@example.test`,
        password,
        isEmailVerified: false,
        otpLastRequestedAt: new Date(Date.now() - 60000),
        otpRequestTimestamps: requestTimes,
      });
      userIds.push(throttledUser._id);
      const throttledResend = await request("/resend-verification", {
        email: throttledUser.email,
      });
      assert.equal(throttledResend.status, 429);
      assert.ok((await throttledResend.json()).retryAfterSeconds >= 1);

      const cooldownUser = await User.create({
        email: `cooldown-otp-${crypto.randomUUID()}@example.test`,
        password,
        isEmailVerified: false,
        otpLastRequestedAt: new Date(Date.now() - 60000),
        otpRequestTimestamps: [new Date(Date.now() - 60000)],
      });
      userIds.push(cooldownUser._id);
      const cooldownResponse = await request("/resend-verification", {
        email: cooldownUser.email,
      });
      assert.equal(cooldownResponse.status, 429);
      const cooldownBody = await cooldownResponse.json();
      assert.ok(cooldownBody.retryAfterSeconds >= 1);
      assert.ok(cooldownBody.retryAfterSeconds <= 60);
    } finally {
      if (userIds.length) {
        const [{ default: AuthSession }, { default: RefreshToken }] =
          await Promise.all([
            import("../models/AuthSession.js"),
            import("../models/RefreshToken.js"),
          ]);
        await Promise.all([
          AuthSession.deleteMany({ userId: { $in: userIds } }),
          RefreshToken.deleteMany({ userId: { $in: userIds } }),
          OtpChallenge.deleteMany({ userId: { $in: userIds } }),
          User.deleteMany({ _id: { $in: userIds } }),
        ]);
      }
      await new Promise((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve()))
      );
      await mongoose.disconnect();
    }

    t.diagnostic("MongoDB transaction support is required for these checks.");
  }
);
