import assert from "node:assert/strict";
import { createServer } from "node:http";
import process from "node:process";
import test from "node:test";
import mongoose from "mongoose";

process.env.CLIENT_URL = "http://localhost:5173";
process.env.JWT_SECRET = "test-jwt-secret-that-is-at-least-32-bytes-long";
process.env.OTP_SECRET = "test-otp-secret-that-is-also-32-bytes-long";
process.env.MONGODB_URI = "mongodb://127.0.0.1:27017/applora-test";
process.env.CRON_SECRET = "test-cron-secret-that-is-at-least-32-bytes";
process.env.NODE_ENV = "test";

const { default: handler } = await import("../api/index.js");

test("Vercel API function dispatches auth paths to Express", async (t) => {
  const previousReadyState = mongoose.connection.readyState;
  mongoose.connection.readyState = 1;

  const server = createServer(handler);
  server.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));

  t.after(async () => {
    mongoose.connection.readyState = previousReadyState;
    await new Promise((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve()))
    );
  });

  const response = await fetch(
    `http://127.0.0.1:${server.address().port}/api?__api_path=auth/me`,
    { headers: { Origin: "http://localhost:5173" } }
  );
  assert.equal(response.status, 401);
  assert.equal(
    response.headers.get("access-control-allow-origin"),
    "http://localhost:5173"
  );
  assert.equal(response.headers.get("access-control-allow-credentials"), "true");

  const crossOriginLogin = await fetch(
    `http://127.0.0.1:${server.address().port}/api?__api_path=auth/login`,
    {
      method: "POST",
      headers: {
        Origin: "https://attacker.example",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email: "user@example.com", password: "Invalid123" }),
    }
  );
  assert.equal(crossOriginLogin.status, 403);

  const unauthenticatedCron = await fetch(
    `http://127.0.0.1:${server.address().port}/api?__api_path=cron/interview-reminders`,
  );
  assert.equal(unauthenticatedCron.status, 401);
  assert.deepEqual(await unauthenticatedCron.json(), { success: false, message: "Unauthorized." });
});

test("Vercel preflight responds before checking configuration or connecting to MongoDB", async (t) => {
  const previousReadyState = mongoose.connection.readyState;
  mongoose.connection.readyState = 0;

  const server = createServer(handler);
  server.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));

  t.after(async () => {
    mongoose.connection.readyState = previousReadyState;
    await new Promise((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve()))
    );
  });

  const response = await fetch(
    `http://127.0.0.1:${server.address().port}/api?__api_path=auth/login`,
    {
      method: "OPTIONS",
      headers: {
        Origin: "http://localhost:5173",
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "content-type,authorization",
      },
    }
  );

  assert.equal(response.status, 204);
  assert.equal(
    response.headers.get("access-control-allow-origin"),
    "http://localhost:5173"
  );
  assert.equal(response.headers.get("access-control-allow-credentials"), "true");
  assert.equal(mongoose.connection.readyState, 0);
});

test("Vercel configuration errors include CORS headers for allowed origins", async (t) => {
  const previousMongoUri = process.env.MONGODB_URI;
  const previousNodeEnv = process.env.NODE_ENV;
  process.env.MONGODB_URI = "";
  process.env.NODE_ENV = "production";
  let invalidConfigurationHandler;
  try {
    ({ default: invalidConfigurationHandler } = await import(
      "../src/vercelHandler.js?cors-error-test"
    ));
  } finally {
    if (previousMongoUri === undefined) delete process.env.MONGODB_URI;
    else process.env.MONGODB_URI = previousMongoUri;
  }

  const server = createServer((req, res) => {
    res.status = (statusCode) => {
      res.statusCode = statusCode;
      return res;
    };
    res.json = (body) => {
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify(body));
      return res;
    };
    invalidConfigurationHandler(req, res);
  });
  server.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  t.after(() =>
    new Promise((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve()))
    )
  );

  try {
    const response = await fetch(
      `http://127.0.0.1:${server.address().port}/api/auth/me`,
      { headers: { Origin: "https://applora-seven.vercel.app" } }
    );

    assert.equal(response.status, 500);
    assert.equal(
      response.headers.get("access-control-allow-origin"),
      "https://applora-seven.vercel.app"
    );
    assert.equal(response.headers.get("access-control-allow-credentials"), "true");
  } finally {
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousNodeEnv;
  }
});

test("Vercel health endpoint responds without connecting to MongoDB", async (t) => {
  const previousReadyState = mongoose.connection.readyState;
  mongoose.connection.readyState = 0;

  const server = createServer(handler);
  server.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));

  t.after(async () => {
    mongoose.connection.readyState = previousReadyState;
    await new Promise((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve()))
    );
  });

  const response = await fetch(
    `http://127.0.0.1:${server.address().port}/api?__api_path=health`
  );
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { success: true, status: "ok" });
  assert.equal(mongoose.connection.readyState, 0);
});
