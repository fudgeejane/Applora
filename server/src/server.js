
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import process from "node:process";
import { fileURLToPath } from "node:url";
import path from "node:path";

import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import applicationRoutes from "./routes/applicationRoutes.js";
import resumeRoutes from "./routes/resumeRoutes.js";
import { csrfProtection } from "./middleware/csrfProtection.js";
import { assertAuthConfiguration } from "./utils/authConfig.js";

dotenv.config({
  path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../.env"),
});

export const app = express();

if (process.env.TRUST_PROXY) {
  app.set("trust proxy", process.env.TRUST_PROXY);
}

app.use((req, res, next) => {
  if (process.env.NODE_ENV === "production" && !req.secure) {
    return res.status(403).json({
      success: false,
      message: "HTTPS is required.",
    });
  }
  return next();
});

app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  })
);

app.use(express.json({ limit: "12mb" }));
app.use(cookieParser());
app.use(csrfProtection);

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/applications", applicationRoutes);
app.use("/api/resumes", resumeRoutes);

// Test route
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Applora API is running.",
  });
});

app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  console.error("Unhandled API error:", error?.name || "Error", error?.code);
  const status = error?.type === "entity.too.large" ? 413
    : error?.name === "ValidationError" || error?.name === "CastError" || error?.name === "SyntaxError" ? 400
      : 500;
  return res.status(status).json({
    success: false,
    message: status === 413 ? "Request is too large." : status === 400 ? "Request data is invalid." : "An unexpected server error occurred.",
  });
});

export const startServer = async () => {
  try {
    assertAuthConfiguration();
    console.log("Starting Applora server...");
    console.log("Connecting to MongoDB...");

    await connectDB();

    const PORT = process.env.PORT || 5000;

    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Server startup failed:", error?.name || "Error", error?.code);
    process.exit(1);
  }
};

const isMainModule =
  process.argv[1] &&
  fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (isMainModule) startServer();
