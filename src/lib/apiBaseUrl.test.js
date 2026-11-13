import test from "node:test";
import assert from "node:assert/strict";
import { normalizeApiBaseUrl } from "./apiBaseUrl.js";

test("API base URL appends the backend API prefix when only an origin is configured", () => {
  assert.equal(
    normalizeApiBaseUrl("https://applora-2f8o.vercel.app"),
    "https://applora-2f8o.vercel.app/api"
  );
});

test("API base URL preserves an existing API prefix and removes trailing slashes", () => {
  assert.equal(
    normalizeApiBaseUrl("https://applora-2f8o.vercel.app/api/"),
    "https://applora-2f8o.vercel.app/api"
  );
});

test("API base URL defaults to the same-origin API path", () => {
  assert.equal(normalizeApiBaseUrl(""), "/api");
  assert.equal(normalizeApiBaseUrl(undefined), "/api");
});
