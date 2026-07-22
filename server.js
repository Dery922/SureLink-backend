import dotenv from "dotenv";
dotenv.config();
import express from "express";
import mongoose from "mongoose";
import http from "http";
import cors from "cors";
import session from "express-session";
import { RedisStore } from "connect-redis";

// Security
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { errorResponse } from "./src/utils/apiResponse.js";

// Routes
import authRoutes from "./src/modules/auth/auth.routes.js";
import userRoutes from "./src/modules/users/user.routes.js";
import mainRoutes from "./src/modules/main/main.routes.js";
import bookingRoutes from "./src/modules/bookingRoutes.js";
import paystackRoutes from "./src/modules/paystackRoutes.js";

// Admin module routes
import adminAuthRoutes from "./src/admin/routes/adminAuth.routes.js";
import adminProvidersRoutes from "./src/admin/routes/providers.routes.js";
import adminOperationsRoutes from "./src/admin/routes/operations.routes.js";
import adminManagementRoutes from "./src/admin/routes/adminManagement.routes.js";
import adminSettingsRoutes from "./src/admin/routes/settings.routes.js";
import adminDashboardRoutes from "./src/admin/routes/dashboard.routes.js";
import adminBookingRoutes from "./src/admin/routes/booking.routes.js";
import adminCustomerRoutes from "./src/admin/routes/customer.routes.js";
import adminTransactionRoutes from "./src/admin/routes/transaction.routes.js";
import adminVerificationRoutes from "./src/admin/routes/verification.routes.js";
import { initializeAdminEventHandlers } from "./src/admin/events/adminEvents.js";

import { connectRedis, getRedisClient } from "./src/utils/redisClient.js";

// Socket (for future use)
import { Server } from "socket.io";

/**
 * Application entrypoint.
 *
 * High-level boot order:
 * - Load env
 * - Configure Express (security, CORS, rate limit)
 * - Connect Redis and wire session middleware (admin OTP/session state)
 * - Register routes and global error handler
 * - Connect MongoDB and start HTTP server
 */
const app = express();
const server = http.createServer(app);
const redisClient = getRedisClient();

// Register admin audit-log event handlers (synchronous subscriptions).
initializeAdminEventHandlers();

// ================== SOCKET.IO ==================
const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

// Make Socket.IO available to route handlers/controllers if needed.
app.set("io", io);

// ================== GLOBAL MIDDLEWARES ==================
app.set("trust proxy", false);
// Set to 10mb globally so base64 pictures don't throw 413 errors.
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

// Debug Network Logger
app.use((req, res, next) => {
  console.log("🔥 HIT:", req.method, req.url);
  next();
});

// Single CORS configuration allowing cookies/sessions.
// credentials:true forbids origin:"*", so we reflect the request origin against
// an allowlist. FRONTEND_URL may be a comma-separated list of dev/prod origins.
const allowedOrigins = (
  process.env.FRONTEND_URL ||
  "http://localhost:3000,http://localhost:3001,http://localhost:5173,http://localhost:5174"
)
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow non-browser clients (no Origin header) and allowlisted origins.
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`Origin ${origin} not allowed by CORS`));
    },
    credentials: true,
    optionsSuccessStatus: 200,
  }),
);

// Security headers
app.use(helmet());

// Global rate limiting (auth endpoints also apply a stricter module limiter).
const limiter = rateLimit({
  max: 100,
  windowMs: 15 * 60 * 1000, // 15 mins
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    return res.status(429).json(
      errorResponse({
        message: "Too many requests. Please try again later.",
        code: "RATE_LIMIT_EXCEEDED",
      }),
    );
  },
});
app.use("/api/", limiter);

//=================== END OF MIDDLEWARE===========

// ================== SOCKET EVENTS ==================
io.on("connection", (socket) => {
  console.log("🔌 User connected:", socket.id);

  socket.on("disconnect", () => {
    console.log("❌ User disconnected:", socket.id);
  });
});

// ================== DATABASE EVENT SYNCHRONIZATION ==================
// Drop the legacy rigid `phone_1` unique index if it lingers from an older schema.
mongoose.connection.once("open", async () => {
  try {
    console.log("🔍 Checking and cleaning stale collection indexes...");
    await mongoose.connection.db.collection("users").dropIndex("phone_1");
    console.log("✅ Stale index 'phone_1' successfully dropped.");
  } catch (err) {
    console.log("ℹ️ Index drop sync note:", err.message);
  }
});

// ================== START SERVER ==================
const PORT = process.env.PORT || 5000;

async function bootstrap() {
  if (!process.env.SESSION_SECRET) {
    throw new Error("SESSION_SECRET is required");
  }
  if (!process.env.MONGO_URI) {
    throw new Error("Missing MONGO_URI environment variable");
  }

  await connectRedis();

  /**
   * Session cookies are required because admin OTP 2FA state is stored on the
   * server side in the current admin auth implementation.
   */
  app.use(
    session({
      secret: process.env.SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      store: new RedisStore({
        client: redisClient,
        prefix: "http:sess:",
      }),
      cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      },
      name: "surelink.sid",
    }),
  );

  // ================== APPLICATION ROUTES ==================
  app.use("/api/auth", authRoutes);
  app.use("/api/users", userRoutes);
  app.use("/api", mainRoutes);
  app.use("/api", bookingRoutes);
  app.use("/api", paystackRoutes);

  // ================== ADMIN ROUTES ==================
  app.use("/api/admin/auth", adminAuthRoutes);
  app.use("/api/admin/providers", adminProvidersRoutes);
  app.use("/api/admin/operations", adminOperationsRoutes);
  app.use("/api/admin/admins", adminManagementRoutes);
  app.use("/api/admin/settings", adminSettingsRoutes);
  app.use("/api/admin/dashboard", adminDashboardRoutes);
  app.use("/api/admin/bookings", adminBookingRoutes);
  app.use("/api/admin/customers", adminCustomerRoutes);
  app.use("/api/admin/transactions", adminTransactionRoutes);
  app.use("/api/admin/verifications", adminVerificationRoutes);

  // Health check
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

  await mongoose.connect(process.env.MONGO_URI, {
    // Throw a real error if a query takes longer than 5 seconds.
    serverSelectionTimeoutMS: 5000,
  });
  console.log("✅ MongoDB connected");

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
}

bootstrap().catch((error) => {
  console.error("❌ Startup error:", error);
  process.exit(1);
});
