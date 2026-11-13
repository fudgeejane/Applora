import test from "node:test";
import assert from "node:assert/strict";

import { searchLocations } from "./locationSearch.js";

test("searches OpenStreetMap and returns bounded location labels", async () => {
  const originalFetch = globalThis.fetch;
  let requestUrl;
  let requestHeaders;
  globalThis.fetch = async (url, options) => {
    requestUrl = new URL(url);
    requestHeaders = options.headers;
    return {
      ok: true,
      json: async () => [
        { display_name: "Quezon City, Metro Manila, Philippines" },
        { display_name: "  Manila, Philippines  " },
      ],
    };
  };

  try {
    const locations = await searchLocations("Quezon City");
    assert.deepEqual(locations, [
      "Quezon City, Metro Manila, Philippines",
      "Manila, Philippines",
    ]);
    assert.equal(requestUrl.hostname, "nominatim.openstreetmap.org");
    assert.equal(requestUrl.searchParams.get("q"), "Quezon City");
    assert.equal(requestUrl.searchParams.get("limit"), "6");
    assert.equal(requestHeaders["User-Agent"], "Applora/1.0");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
