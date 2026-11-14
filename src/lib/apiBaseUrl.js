export const normalizeApiBaseUrl = (value) => {
  const configuredUrl = typeof value === "string" ? value.trim() : "";
  if (!configuredUrl) return "/api";

  const normalizedValue = configuredUrl.replace(/\/+$/, "") || "/";

  if (/^https?:\/\//i.test(normalizedValue)) {
    const parsed = new URL(normalizedValue);
    const pathname = parsed.pathname === "/" ? "/api" : parsed.pathname;
    return /\/api$/i.test(pathname) ? `${parsed.origin}${pathname}` : `${parsed.origin}${pathname}/api`;
  }

  if (normalizedValue.startsWith("/")) {
    return /\/api$/i.test(normalizedValue) ? normalizedValue : `${normalizedValue}/api`;
  }

  return /\/api$/i.test(normalizedValue)
    ? `/${normalizedValue}`
    : `/${normalizedValue}/api`;
};
