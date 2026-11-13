export const normalizeApiBaseUrl = (value) => {
  const configuredUrl = value?.trim().replace(/\/+$/, "");
  if (!configuredUrl) return "/api";
  return /\/api$/i.test(configuredUrl) ? configuredUrl : `${configuredUrl}/api`;
};
