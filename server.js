// server.js
import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

import http from "http";
import cors from "cors";
import session from "express-session";
<<<<<<< Updated upstream
import MongoStore from "connect-mongo";
=======
import { RedisStore } from "connect-redis";
>>>>>>> Stashed changes

// Security
import helmet from "helmet";
import rateLimit from "express-rate-limit";

// Routes
import authRoutes from "./src/modules/auth/auth.routes.js";
import userRoutes from "./src/modules/users/user.routes.js";

// Socket
import { Server } from "socket.io";

<<<<<<< Updated upstream
dotenv.config();

const app = express();
const server = http.createServer(app);
=======
console.log("🔥🔥 SERVER ENTRY FILE LOADED");

initializeAuthEventHandlers();

const app = express();
const server = http.createServer(app);

// Initialize Redis Client early so we can pass it synchronously to the store config
await connectRedis(); 
const redisClient = getRedisClient();
>>>>>>> Stashed changes

// ================== SOCKET.IO ================== //
const io = new Server(server, {
  cors: {
    origin: "*",
  },
});
<<<<<<< Updated upstream

// we are Making io accessible in routes/controllers
=======
>>>>>>> Stashed changes
app.set("io", io);

// ================== GLOBAL MIDDLEWARES ==================
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true }));

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
  })
);

// Security Headers
app.use(helmet());

<<<<<<< Updated upstream
// Rate limiting (important for auth)
const limiter = rateLimit({
  max: 100,
  windowMs: 15 * 60 * 1000, // 15 mins
  message: "Too many requests, please try again later.",
=======
// Session Management Layer (Moved up out of bootstrap to execute before routes)
if (!process.env.SESSION_SECRET) {
  throw new Error("SESSION_SECRET is required");
}

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
  })
);

// ================== APPLICATION ROUTES ==================
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);


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
>>>>>>> Stashed changes
});

<<<<<<< Updated upstream
// ================== ROUTES ==================
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);

// Health check
app.get("/", (req, res) => {
  res.send("🚀 SureLink API is running...");
});

// ================== GLOBAL ERROR HANDLER ==================
app.use((err, req, res, next) => {
  console.error(err);

  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
});

// ================== DATABASE ==================
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => {
    console.error("❌ DB connection error:", err);
    process.exit(1);
  });

// ================== SOCKET EVENTS ==================
io.on("connection", (socket) => {
  console.log("🔌 User connected:", socket.id);

  socket.on("disconnect", () => {
    console.log("❌ User disconnected:", socket.id);
=======
// Root Endpoint / Health Check
app.get("/", (req, res) => {
  return res.status(200).json({
    success: true,
    message: "SureLink API is running.",
>>>>>>> Stashed changes
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
    })
  );
});

// ================== DATA & NETWORK LIFECYCLE MANAGEMENT ==================
const PORT = process.env.PORT || 5001;

<<<<<<< Updated upstream
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
=======
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
>>>>>>> Stashed changes
