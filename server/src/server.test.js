import test from "node:test";
import assert from "node:assert/strict";
import process from "node:process";
import { csrfProtection } from "./middleware/csrfProtection.js";

process.env.CLIENT_URL = "http://localhost:5173";
process.env.NODE_ENV = "test";

const { app } = await import("./server.js");

test("health and request-origin protection work without starting a DB listener", async (t) => {
  const server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  t.after(
    () =>
      new Promise((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve()))
      )
  );

  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  const health = await fetch(baseUrl);
  assert.equal(health.status, 200);

  const protectedResumes = await fetch(`${baseUrl}/api/resumes`);
  assert.equal(protectedResumes.status, 401);

  const protectedAssistant = await fetch(`${baseUrl}/api/assistant/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: "Hello" }),
  });
  assert.equal(protectedAssistant.status, 401);

  const protectedResumeAnalysis = await fetch(
    `${baseUrl}/api/resumes/64b000000000000000000002/analyze`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ consent: true }) },
  );
  assert.equal(protectedResumeAnalysis.status, 401);

  const crossOriginRequest = await fetch(`${baseUrl}/api/auth/logout`, {
    method: "POST",
    headers: { Origin: "https://attacker.example" },
  });
  assert.equal(crossOriginRequest.status, 403);

  const preflight = await fetch(`${baseUrl}/api/auth/login`, {
    method: "OPTIONS",
    headers: {
      Origin: "http://localhost:5173",
      "Access-Control-Request-Method": "POST",
      "Access-Control-Request-Headers": "content-type,authorization",
    },
  });
  assert.equal(preflight.status, 204);
  assert.equal(
    preflight.headers.get("access-control-allow-origin"),
    "http://localhost:5173"
  );
  assert.equal(preflight.headers.get("access-control-allow-credentials"), "true");
  assert.match(preflight.headers.get("access-control-allow-methods"), /OPTIONS/);
  assert.match(
    preflight.headers.get("access-control-allow-headers"),
    /Content-Type/i
  );
  assert.match(
    preflight.headers.get("access-control-allow-headers"),
    /Authorization/i
  );

  const previousEnvironment = process.env.NODE_ENV;
  process.env.NODE_ENV = "production";
  try {
    const productionPreflight = await fetch(`${baseUrl}/api/auth/login`, {
      method: "OPTIONS",
      headers: {
        Origin: "https://applora-seven.vercel.app",
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "content-type",
      },
    });
    assert.equal(productionPreflight.status, 204);
    assert.equal(
      productionPreflight.headers.get("access-control-allow-origin"),
      "https://applora-seven.vercel.app"
    );

    const insecureProductionRequest = await fetch(baseUrl);
    assert.equal(insecureProductionRequest.status, 403);
  } finally {
    process.env.NODE_ENV = previousEnvironment;
  }
});

test("CSRF permits cross-site fetch metadata only for the configured frontend origin", () => {
  const allowedRequest = {
    method: "POST",
    get: (name) => ({
      origin: "http://localhost:5173",
      "sec-fetch-site": "cross-site",
    })[name.toLowerCase()],
  };
  let allowedNextCalled = false;
  csrfProtection(allowedRequest, {}, () => {
    allowedNextCalled = true;
  });
  assert.equal(allowedNextCalled, true);

  const blockedRequest = {
    method: "POST",
    get: (name) =>
      name.toLowerCase() === "sec-fetch-site" ? "cross-site" : undefined,
  };
  const blockedResponse = {
    statusCode: null,
    status(statusCode) {
      this.statusCode = statusCode;
      return this;
    },
    json() {},
  };
  let blockedNextCalled = false;
  csrfProtection(blockedRequest, blockedResponse, () => {
    blockedNextCalled = true;
  });
  assert.equal(blockedNextCalled, false);
  assert.equal(blockedResponse.statusCode, 403);
});
