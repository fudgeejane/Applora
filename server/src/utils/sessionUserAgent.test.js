import test from "node:test";
import assert from "node:assert/strict";

import { parseSessionUserAgent } from "./sessionUserAgent.js";

test("parses mobile device, operating system, and browser details", () => {
  assert.deepEqual(
    parseSessionUserAgent(
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
    ),
    {
      deviceType: "Mobile Phone",
      deviceName: "iPhone",
      os: "iOS",
      browser: "Safari",
      browserVersion: "17.0",
    }
  );
});

test("parses desktop browser details and handles missing user agents", () => {
  const session = parseSessionUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36 Edg/124.0.0.0"
  );
  assert.equal(session.deviceType, "Desktop");
  assert.equal(session.os, "Windows");
  assert.equal(session.browser, "Edge");
  assert.equal(session.browserVersion, "124.0.0.0");
  assert.equal(parseSessionUserAgent("").deviceType, "Unknown device");
});

test("includes an Android model when the user agent provides one", () => {
  const session = parseSessionUserAgent(
    "Mozilla/5.0 (Linux; Android 13; SM-G996B Build/TP1A.220624.014) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile Safari/537.36"
  );
  assert.equal(session.deviceType, "Mobile Phone");
  assert.equal(session.deviceName, "SM-G996B");
  assert.equal(session.os, "Android");
});
