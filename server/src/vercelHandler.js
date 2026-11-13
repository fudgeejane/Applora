import mongoose from "mongoose";
import connectDB from "./config/db.js";
import { app } from "./server.js";
import { getServerConfigurationErrors } from "./utils/authConfig.js";

const connectionPromiseKey = Symbol.for("applora.mongoose.connectionPromise");
const configurationErrors = getServerConfigurationErrors();

if (configurationErrors.length) {
  console.error(
    `Invalid server configuration:\n- ${configurationErrors.join("\n- ")}`
  );
}

const isHealthCheck = (req) => {
  const requestUrl = new URL(req.url || "/", "http://vercel.local");
  return req.method === "GET" && requestUrl.pathname === "/api/health";
};

const ensureDatabaseConnection = () => {
  if (mongoose.connection.readyState === 1) return Promise.resolve();

  if (!globalThis[connectionPromiseKey]) {
    globalThis[connectionPromiseKey] = connectDB().catch((error) => {
      delete globalThis[connectionPromiseKey];
      throw error;
    });
  }

  return globalThis[connectionPromiseKey];
};

export default async function vercelHandler(req, res) {
  if (isHealthCheck(req)) return app(req, res);

  if (configurationErrors.length) {
    return res.status(500).json({
      success: false,
      message: "Server configuration is invalid. Check the function logs.",
    });
  }

  try {
    await ensureDatabaseConnection();
  } catch (error) {
    console.error(
      "Vercel API database connection failed:",
      error?.name || "Error",
      error?.code
    );
    return res.status(503).json({
      success: false,
      message: "The API is temporarily unavailable.",
    });
  }

  return app(req, res);
}
