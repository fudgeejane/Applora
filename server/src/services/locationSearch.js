import process from "node:process";

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const MIN_REQUEST_INTERVAL_MS = 1100;
const CACHE_TTL_MS = 5 * 60 * 1000;
const MAX_CACHE_ENTRIES = 500;

const cache = new Map();
let nextRequestAt = 0;
let requestQueue = Promise.resolve();

const delay = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

const fetchLocations = async (query) => {
  const cached = cache.get(query.toLowerCase());
  if (cached && cached.expiresAt > Date.now()) return cached.locations;

  const remainingDelay = Math.max(0, nextRequestAt - Date.now());
  if (remainingDelay) await delay(remainingDelay);
  nextRequestAt = Date.now() + MIN_REQUEST_INTERVAL_MS;

  const url = new URL(NOMINATIM_URL);
  url.search = new URLSearchParams({
    q: query,
    format: "jsonv2",
    addressdetails: "1",
    limit: "6",
  }).toString();
  const email = process.env.NOMINATIM_EMAIL;
  if (email) url.searchParams.set("email", email);

  const response = await fetch(url, {
    headers: {
      "Accept-Language": "en",
      "User-Agent": "Applora/1.0",
    },
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) {
    throw new Error(`Location provider returned ${response.status}.`);
  }

  const results = await response.json();
  if (!Array.isArray(results)) {
    throw new Error("Location provider returned an invalid response.");
  }

  const locations = results
    .map((result) => result.display_name)
    .filter((name) => typeof name === "string" && name.trim())
    .map((name) => name.trim().length > 120
      ? `${name.trim().slice(0, 117)}...`
      : name.trim())
    .slice(0, 6);
  cache.set(query.toLowerCase(), {
    locations,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
  if (cache.size > MAX_CACHE_ENTRIES) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey) cache.delete(oldestKey);
  }
  return locations;
};

export const searchLocations = (query) => {
  const result = requestQueue.then(() => fetchLocations(query));
  requestQueue = result.catch(() => {});
  return result;
};
