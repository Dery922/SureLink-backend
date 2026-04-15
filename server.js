import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
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
import { initializeAuthEventHandlers } from "./src/services/authEvents.js";
import { connectRedis, getRedisClient } from "./src/utils/redisClient.js";

// Socket (for future use)
import { Server } from "socket.io";

dotenv.config();
initializeAuthEventHandlers();

const app = express();
const server = http.createServer(app);
const redisClient = getRedisClient();

// ================== SOCKET.IO ==================
const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

//io is accessible in all routes/controllers
app.set("io", io);

// ================== MIDDLEWARE ==================
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true }));

// CORS
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true, // Required for session cookies
    optionsSuccessStatus: 200,
  })
);

// Security headers
app.use(helmet());

// Rate limiting (important for auth)
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
app.use("/api", limiter);

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

  // ================== ROUTES ==================
  app.use("/api/auth", authRoutes);
  app.use("/api/users", userRoutes);

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