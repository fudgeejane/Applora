import assert from "node:assert/strict";
import { createServer } from "node:http";
import process from "node:process";
import test from "node:test";
import mongoose from "mongoose";

process.env.CLIENT_URL = "http://localhost:5173";
process.env.JWT_SECRET = "test-jwt-secret-that-is-at-least-32-bytes-long";
process.env.OTP_SECRET = "test-otp-secret-that-is-also-32-bytes-long";
process.env.MONGODB_URI = "mongodb://127.0.0.1:27017/applora-test";
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
    `http://127.0.0.1:${server.address().port}/api?__api_path=auth/me`
  );
  assert.equal(response.status, 401);

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
