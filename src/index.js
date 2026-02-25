import "dotenv/config";
import express from "express";
import helmet from "helmet";
import cors from "cors";
import compression from "compression";
import mongoose from "mongoose";
import { connectMongoDB } from "./utils/db.js";

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Security middleware
app.use(helmet());
app.use(
  cors({
    origin: process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(",")
      : true,
  })
);
app.use(compression());

// Body parsing
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Request logging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// Health check (for monitoring)
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ status: "error", message: "Not found" });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  const statusCode = err.statusCode ?? 500;
  const message =
    process.env.NODE_ENV === "production" && statusCode === 500
      ? "Internal server error"
      : err.message ?? "Internal server error";
  res.status(statusCode).json({ status: "error", message });
});

let server;

async function start() {
  await connectMongoDB();
  server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

function shutdown(signal) {
  return () => {
    console.log(`${signal} received, shutting down gracefully`);
    if (server) {
      server.close(() => {
        mongoose.connection
          .close(false)
          .then(() => {
            console.log("Database connection closed");
            process.exit(0);
          })
          .catch(() => process.exit(0));
      });
    } else {
      process.exit(0);
    }
  };
}

process.on("SIGTERM", shutdown("SIGTERM"));
process.on("SIGINT", shutdown("SIGINT"));

start().catch((err) => {
  console.error("Failed to start server", err);
  process.exit(1);
});
