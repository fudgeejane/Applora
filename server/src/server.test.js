import test from "node:test";
import assert from "node:assert/strict";
import process from "node:process";

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

  const crossOriginRequest = await fetch(`${baseUrl}/api/auth/logout`, {
    method: "POST",
    headers: { Origin: "https://attacker.example" },
  });
  assert.equal(crossOriginRequest.status, 403);

  const previousEnvironment = process.env.NODE_ENV;
  process.env.NODE_ENV = "production";
  try {
    const insecureProductionRequest = await fetch(baseUrl);
    assert.equal(insecureProductionRequest.status, 403);
  } finally {
    process.env.NODE_ENV = previousEnvironment;
  }
});
