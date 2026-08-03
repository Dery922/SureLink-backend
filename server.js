import { connectRedis } from "./src/services/redisClient.js";
import dotenv from "dotenv";
dotenv.config();
import express from "express";
import mongoose from "mongoose";
import http from "http";
import cors from "cors";
import session from "express-session";
import MongoStore from "connect-mongo";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { Server } from "socket.io";
import { errorResponse } from "./src/services/apiResponse.js";

// Routes
import providerRoutes from "./src/modules/providerRoutes.js";
import authRoutes from "./src/modules/auth/auth.routes.js";
import mainRoutes from "./src/modules/main/main.routes.js";
import activityRoutes from "./src/modules/activityRoutes.js";
import bookingRoutes from "./src/modules/bookingRoutes.js";
import paystackRoutes from "./src/modules/paystackRoutes.js";
import userRoutes from "./src/services/user.routes.js";
import { initializeAuthEventHandlers } from "./src/services/authEvents.js";
import providerStatsRoutes from "./src/modules/providerStatsRoutes.js";
import notificationsRoutes from "./src/modules/notificationsRoutes.js";


// Admin module
import adminAuthRoutes from "./src/admin/routes/adminAuth.routes.js";
import adminProvidersRoutes from "./src/admin/routes/providers.routes.js";
import adminOperationsRoutes from "./src/admin/routes/operations.routes.js";
import adminManagementRoutes from "./src/admin/routes/adminManagement.routes.js";
import adminSettingsRoutes from "./src/admin/routes/settings.routes.js";
import adminDashboardRoutes from "./src/admin/routes/dashboard.routes.js";
import { initializeAdminEventHandlers } from "./src/admin/events/adminEvents.js";

// Initialize event handlers
initializeAuthEventHandlers();
initializeAdminEventHandlers();

const app = express();
const server = http.createServer(app);

// ================== SOCKET.IO ==================
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  },
});

app.set("io", io);

// ================== GLOBAL MIDDLEWARES ==================
app.set("trust proxy", false);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

// Debug Network Logger
app.use((req, res, next) => {
  console.log("🔥 HIT:", req.method, req.url);
  next();
});

// CORS configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim())
  : [
    process.env.FRONTEND_URL || "http://localhost:3000",
    "http://localhost:5173",
  ];

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
    optionsSuccessStatus: 200,
  }),
);

// Security Headers
app.use(helmet());

// Session Handling
app.use(
  session({
    secret: process.env.SESSION_SECRET || "default_fallback_secret",
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGO_URI,
      collectionName: "sessions",
      ttl: 7 * 24 * 60 * 60, // 7 days
    }),
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    },
    name: "surelink.sid",
  }),
);

// Rate limiting
// const limiter = rateLimit({
//   max: 100,
//   windowMs: 15 * 60 * 1000, // 15 mins
//   message: "Too many requests, please try again later.",
// });
// app.use("/api/", limiter);

// ================== APPLICATION ROUTES ==================
app.use("/api", providerRoutes);
app.use("/api/auth", authRoutes);
app.use("/api", mainRoutes);
app.use("/api", bookingRoutes);
app.use("/api", paystackRoutes);
app.use("/api/users", userRoutes);
app.use("/api", providerStatsRoutes);
app.use("/api", activityRoutes);
app.use("/api", notificationsRoutes);


// Admin module routes
app.use("/api/admin/auth", adminAuthRoutes);
app.use("/api/admin/providers", adminProvidersRoutes);
app.use("/api/admin/operations", adminOperationsRoutes);
app.use("/api/admin/admins", adminManagementRoutes);
app.use("/api/admin/settings", adminSettingsRoutes);
app.use("/api/admin/dashboard", adminDashboardRoutes);

// Health Check
app.get("/", (req, res) => {
  return res.status(200).json({
    success: true,
    message: "SureLink API is running.",
  });
});

// ================== DATABASE EVENT SYNCHRONIZATION ==================
mongoose.connection.once("open", async () => {
  try {
    console.log("🔍 Checking and cleaning stale collection indexes...");
    await mongoose.connection.db.collection("users").dropIndex("phone_1");
    console.log("✅ Stale index 'phone_1' successfully dropped.");
  } catch (err) {
    console.log("ℹ️ Index drop sync note:", err.message);
  }
});

// ================== GLOBAL ERROR HANDLER ==================
app.use((err, req, res, next) => {
  console.error("🔴 GLOBAL APP ERROR:", err);

  return res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
    code: err.code || "INTERNAL_ERROR",
    details: err.details || null,
  });
});

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
  if (!process.env.MONGO_URI) {
    throw new Error("Missing MONGO_URI environment variable");
  }

  if (!process.env.SESSION_SECRET) {
    throw new Error("SESSION_SECRET is required");
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log("✅ MongoDB connected");

  await connectRedis();
  console.log("✅ Redis connected");

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
}

bootstrap().catch((error) => {
  console.error("❌ Startup error:", error);
  process.exit(1);
});
