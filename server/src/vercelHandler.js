import mongoose from "mongoose";
import connectDB from "./config/db.js";
import { app } from "./server.js";
import { assertAuthConfiguration } from "./utils/authConfig.js";

let connectionPromise;

const ensureDatabaseConnection = () => {
  if (mongoose.connection.readyState === 1) return Promise.resolve();

  if (!connectionPromise) {
    connectionPromise = connectDB().finally(() => {
      connectionPromise = null;
    });
  }

  return connectionPromise;
};

export default async function vercelHandler(req, res) {
  assertAuthConfiguration();

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
