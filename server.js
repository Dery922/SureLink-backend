// server.js
// 🔑 STEP 1: LOAD ENVIRONMENT VARIABLES IMMEDIATELY BEFORE ANY OTHER LOCAL IMPORTS
import dotenv from "dotenv";
dotenv.config();

import express from "express";
import mongoose from "mongoose";
import http from "http";
import cors from "cors";
// Inside your server.js file near the top:

// ❌ OLD DISCONNECTED IMPORT (Missing errorResponse)
// import { successResponse } from "./src/utils/apiResponse.js";

// ✅ NEW FIXED IMPORT: Explicitly import both wrappers!
import { successResponse, errorResponse } from "./src/utils/apiResponse.js";

// Security
import helmet from "helmet";
import rateLimit from "express-rate-limit";

// Socket
import { Server } from "socket.io";

// RESTORED ROUTE IMPORTS (Ensure relative extensions end with .js)

import authRoutes from "./src/modules/auth/auth.routes.js";
import { authMiddleware } from "./src/modules/auth/auth.validation.middleware.js";
import User from "./src/models/User.js";

console.log("🔥🔥 SERVER ENTRY FILE LOADED");

const app = express();
const server = http.createServer(app);

// ================== SOCKET.IO ================== //
const io = new Server(server, {
  cors: {
    origin: "*",
  },
});
app.set("io", io);

// ================== GLOBAL MIDDLEWARES ==================
// ================== GLOBAL MIDDLEWARES ==================
// 🔑 FIX: Increase the limit to 10mb to allow Base64 profile picture string transfers
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

// Debug Network Logger
app.use((req, res, next) => {
  console.log("🔥 HIT:", req.method, req.url);
  next();
});

// CORS Configurations
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
    optionsSuccessStatus: 200,
  }),
);

// Security Headers
app.use(helmet());

// Rate Limiting Security Layer
const limiter = rateLimit({
  max: 100,
  windowMs: 15 * 60 * 1000, // 15 mins
  message: "Too many requests, please try again later.",
});
app.use("/api/", limiter);

// ================== FACEBOOK-STYLE AUTO LOGIN ENDPOINT ==================

// ================== APPLICATION ROUTES ==================
app.use("/api/auth", authRoutes);

// ================== DATABASE EVENT SYNCHRONIZATION ==================
mongoose.connection.once("open", async () => {
  try {
    console.log("🔍 Checking and cleaning stale collection indexes...");

    // Force drop the old, rigid index constraint directly from MongoDB
    await mongoose.connection.db.collection("users").dropIndex("phone_1");

    console.log("✅ Stale index 'phone_1' successfully dropped.");
  } catch (err) {
    // This catches and ignores the error if the index has already been dropped
    console.log("ℹ️ Index drop sync note:", err.message);
  }
});

// Root Endpoint / Health Check
app.get("/", (req, res) => {
  return res.status(200).json({
    success: true,
    message: "SureLink API is running.",
  });
});

// ================== GLOBAL ERROR HANDLER ==================
app.use((err, req, res, next) => {
  console.error("🔴 GLOBAL APP ERROR:", err);

  return res.status(err.status || 500).json(
    errorResponse({
      message: err.message || "Internal Server Error",
      code: err.code || "INTERNAL_ERROR",
      details: err.details || null,
    }),
  );
});

// ================== DATA & NETWORK LIFECYCLE MANAGEMENT ==================
const PORT = process.env.PORT || 5000;

async function bootstrap() {
  // Connect database adapter
  await mongoose.connect(process.env.MONGO_URI);
  console.log("✅ MongoDB connected");

  // Open up network listeners
  server.listen(PORT, () => {
    console.log(`🚀 Server running cleanly on port ${PORT}`);
  });
}

bootstrap().catch((error) => {
  console.error("❌ Startup error:", error);
  process.exit(1);
});
