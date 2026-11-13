
import axios from "axios";

const api = axios.create({
  baseURL: "/api",
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

let refreshPromise = null;
const publicAuthPaths = new Set([
  "/auth/login",
  "/auth/register",
  "/auth/verify-email",
  "/auth/resend-verification",
  "/auth/refresh",
  "/auth/logout",
]);

const renewSession = () => {
  const refresh = () => api.post("/auth/refresh");
  if (typeof navigator !== "undefined" && navigator.locks) {
    return navigator.locks.request("applora-auth-refresh", refresh);
  }
  return refresh();
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const request = error.config;
    if (error.response?.status !== 401 || !request) {
      return Promise.reject(error);
    }

    const base = new URL(api.defaults.baseURL || "/", window.location.origin);
    const requestPath = new URL(request.url || "/", base).pathname.replace(
      /^\/api(?=\/)/,
      ""
    );
    if (publicAuthPaths.has(requestPath)) return Promise.reject(error);

    if (request._authRetry) {
      window.dispatchEvent(new Event("auth:session-expired"));
      return Promise.reject(error);
    }

    request._authRetry = true;
    try {
      if (!refreshPromise) {
        refreshPromise = renewSession()
          .finally(() => {
            refreshPromise = null;
          });
      }
      await refreshPromise;
      return api(request);
    } catch (refreshError) {
      window.dispatchEvent(new Event("auth:session-expired"));
      return Promise.reject(refreshError);
    }
  }
);

export default api;
