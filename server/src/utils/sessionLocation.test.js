import test from "node:test";
import assert from "node:assert/strict";

import { getSessionLocation } from "./sessionLocation.js";

const request = (trustProxy, headers) => ({
  app: { get: () => trustProxy },
  headers,
});

test("does not trust location headers unless a proxy is configured", () => {
  assert.equal(
    getSessionLocation(request(false, { "x-vercel-ip-city": "Manila" })),
    ""
  );
});

test("combines trusted city, region, and country headers", () => {
  assert.equal(
    getSessionLocation(
      request(true, {
        "x-vercel-ip-city": "Quezon%20City",
        "x-vercel-ip-country-region": "Metro Manila",
        "x-vercel-ip-country": "PH",
      })
    ),
    "Quezon City, Metro Manila, PH"
  );
});
