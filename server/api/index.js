import handler from "../src/vercelHandler.js";

export default function apiHandler(req, res) {
  const requestUrl = new URL(req.url || "/", "http://vercel.local");
  const routePath = requestUrl.searchParams.get("__api_path");

  if (routePath !== null) {
    const segments = routePath.split("/").filter(Boolean);
    if (!segments.length || segments.some((segment) => segment === "." || segment === "..")) {
      return res.status(400).json({
        success: false,
        message: "API path is invalid.",
      });
    }

    requestUrl.searchParams.delete("__api_path");
    req.url = `/api/${segments.join("/")}${requestUrl.search}`;
  }

  return handler(req, res);
}
