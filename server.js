import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import http from "http";
import cors from "cors";
import session from "express-session";
import { RedisStore } from "connect-redis";

// Security
import helmet from "helmet";
import { errorResponse } from "./src/services/apiResponse.js";

// Routes
import authRoutes from "./src/services/auth.routes.js";
import userRoutes from "./src/services/user.routes.js";
import providerApplicationRoutes from "./src/services/providerApplication.routes.js";
import bookingRoutes from "./src/services/booking.routes.js";
import mainRoutes from "./src/services/main.routes.js";
import paystackRoutes from "./src/services/paystack.routes.js";
import { registerContainerMiddleware } from "./src/containers/rbac.container.js";
import { initializeAuthEventHandlers } from "./src/services/authEvents.js";

// Admin module
import adminAuthRoutes from "./src/admin/routes/adminAuth.routes.js";
import adminProvidersRoutes from "./src/admin/routes/providers.routes.js";
import adminOperationsRoutes from "./src/admin/routes/operations.routes.js";
import adminManagementRoutes from "./src/admin/routes/adminManagement.routes.js";
import adminSettingsRoutes from "./src/admin/routes/settings.routes.js";
import adminDashboardRoutes from "./src/admin/routes/dashboard.routes.js";
import adminBookingsRoutes from "./src/admin/routes/bookings.routes.js";
import adminTransactionsRoutes from "./src/admin/routes/transactions.routes.js";
import adminCustomersRoutes from "./src/admin/routes/customers.routes.js";
import adminVerificationsRoutes from "./src/admin/routes/verifications.routes.js";
import { initializeAdminEventHandlers } from "./src/admin/events/adminEvents.js";
import { connectRedis, getRedisClient } from "./src/services/redisClient.js";

// Socket (for future use)
import { Server } from "socket.io";

/**
 * Application entrypoint.
 *
 * High-level boot order:
 * - Load env
 * - Initialize in-process event handlers
 * - Configure Express (security, CORS, rate limit)
 * - Connect Redis and wire session middleware
 * - Register routes and global error handler
 * - Connect MongoDB and start HTTP server
 */
dotenv.config();
initializeAuthEventHandlers();
initializeAdminEventHandlers();

const app = express();
const server = http.createServer(app);
const redisClient = getRedisClient();

// Shared CORS allowlist — used by both the HTTP layer and Socket.IO so a
// wildcard never slips into either. Falls back to local dev origins.
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim())
  : [process.env.FRONTEND_URL || "http://localhost:3000", "http://localhost:5173"];

// ================== SOCKET.IO ==================
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
  },
});

// Make Socket.IO available to route handlers/controllers if needed.
app.set("io", io);

// ================== MIDDLEWARE ==================
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true }));

// CORS
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true, // Required for session cookies
    optionsSuccessStatus: 200,
  })
);

// Security headers
app.use(helmet());

//=================== END OF MIDDLEWARE===========

// ================== SOCKET EVENTS ==================
io.on("connection", (socket) => {
  console.log("🔌 User connected:", socket.id);

  socket.on("disconnect", () => {
    console.log("❌ User disconnected:", socket.id);
  });
});

// ================== START SERVER ==================
const PORT = process.env.PORT || 5000;

async function bootstrap() {
  if (!process.env.SESSION_SECRET) {
    throw new Error("SESSION_SECRET is required");
  }

  await connectRedis();

  /**
   * Session cookies are required because OTP state is stored on the server side
   * (`req.session.pending_otp`) in the current auth implementation.
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

  // RBAC: attach a per-request container exposing rbacService/roleRepository so
  // requireRole/requirePermission middleware (src/middleware/rbac.middleware.js)
  // can resolve them via req.container.resolve(...).
  app.use(registerContainerMiddleware());

  // ================== ROUTES ==================
  app.use("/api/auth", authRoutes);
  app.use("/api/users", userRoutes);
  app.use("/api/providers", providerApplicationRoutes);
  app.use("/api/bookings", bookingRoutes);
  app.use("/api/main", mainRoutes);
  app.use("/api/paystack", paystackRoutes);

  // Admin module
  app.use("/api/admin/auth", adminAuthRoutes);
  app.use("/api/admin/providers", adminProvidersRoutes);
  app.use("/api/admin/operations", adminOperationsRoutes);
  app.use("/api/admin/admins", adminManagementRoutes);
  app.use("/api/admin/settings", adminSettingsRoutes);
  app.use("/api/admin/dashboard", adminDashboardRoutes);
  app.use("/api/admin/bookings", adminBookingsRoutes);
  app.use("/api/admin/transactions", adminTransactionsRoutes);
  app.use("/api/admin/customers", adminCustomersRoutes);
  app.use("/api/admin/verifications", adminVerificationsRoutes);

  // Health check
  app.get("/", (req, res) => {
    return res.status(200).json({
      success: true,
      message: "SureLink API is running.",
    });
  });

  // ================== GLOBAL ERROR HANDLER ==================
  app.use((err, req, res, next) => {
    console.error(err);

    return res.status(err.status || 500).json(
      errorResponse({
        message: err.message || "Internal Server Error",
        code: err.code || "INTERNAL_ERROR",
        details: err.details || null,
      }),
    );
  });

  await mongoose.connect(process.env.MONGO_URI);
  console.log("✅ MongoDB connected");

  server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
}

bootstrap().catch((error) => {
  console.error("❌ Startup error:", error);
  process.exit(1);
});