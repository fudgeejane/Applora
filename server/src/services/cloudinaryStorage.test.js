import test from "node:test";
import assert from "node:assert/strict";
import process from "node:process";
import { createResumeDownloadUrl } from "./cloudinaryStorage.js";

test("resume download URLs are temporary signed Cloudinary URLs", () => {
  const keys = ["CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET"];
  const previous = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  process.env.CLOUDINARY_CLOUD_NAME = "resume-test-cloud";
  process.env.CLOUDINARY_API_KEY = "resume-test-key";
  process.env.CLOUDINARY_API_SECRET = "resume-test-secret";

  try {
    const now = Math.floor(Date.now() / 1000);
    const url = new URL(createResumeDownloadUrl("resumes/test-id"));
    assert.equal(url.origin, "https://api.cloudinary.com");
    assert.equal(url.pathname, "/v1_1/resume-test-cloud/image/download");
    assert.equal(url.searchParams.get("public_id"), "resumes/test-id");
    assert.equal(url.searchParams.get("format"), "pdf");
    assert.equal(url.searchParams.get("attachment"), "false");
    assert.ok(Number(url.searchParams.get("expires_at")) >= now + 299);
    assert.ok(Number(url.searchParams.get("expires_at")) <= now + 300);
    assert.ok(url.searchParams.get("signature"));
    assert.ok(!url.href.includes(process.env.CLOUDINARY_API_SECRET));
  } finally {
    for (const key of keys) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
  }
});
