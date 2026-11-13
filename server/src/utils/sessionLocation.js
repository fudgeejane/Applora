const LOCATION_HEADERS = {
  city: ["x-vercel-ip-city", "cf-ipcity", "x-geo-city"],
  region: ["x-vercel-ip-country-region", "cf-region", "x-geo-region"],
  country: ["x-vercel-ip-country", "cf-ipcountry", "x-geo-country"],
};

const headerValue = (headers, names) => {
  for (const name of names) {
    const value = headers[name];
    if (typeof value !== "string" || !value.trim()) continue;
    const clean = (header) =>
      Array.from(header)
        .filter((character) => {
          const code = character.codePointAt(0);
          return code >= 32 && code !== 127;
        })
        .join("")
        .trim();

    try {
      return clean(decodeURIComponent(value));
    } catch {
      return clean(value);
    }
  }
  return "";
};

export const getSessionLocation = (req) => {
  if (!req.app?.get("trust proxy")) return "";

  const parts = Object.entries(LOCATION_HEADERS)
    .map(([, names]) => headerValue(req.headers || {}, names))
    .filter(Boolean);
  return [...new Set(parts)].join(", ").slice(0, 120);
};
