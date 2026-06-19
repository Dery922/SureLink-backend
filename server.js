<<<<<<< HEAD
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
=======
import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import http from "http";
import cors from "cors";
import session from "express-session";
import MongoStore from "connect-mongo";

>>>>>>> 3ae27f9e11bc75efa9c289678af75e3bbb851246

// Security
import helmet from "helmet";
import rateLimit from "express-rate-limit";

<<<<<<< HEAD
// Socket
import { Server } from "socket.io";

// RESTORED ROUTE IMPORTS (Ensure relative extensions end with .js)

import authRoutes from "./src/modules/auth/auth.routes.js";
import { authMiddleware } from "./src/modules/auth/auth.validation.middleware.js";
import User from "./src/models/User.js";

console.log("🔥🔥 SERVER ENTRY FILE LOADED");
=======
// Routes
// import authRoutes from "./src/modules/auth/auth.routes.js";
// import userRoutes from "./src/modules/users/user.routes.js";

// Socket (for future use)
import { Server } from "socket.io";

dotenv.config();
>>>>>>> 3ae27f9e11bc75efa9c289678af75e3bbb851246

const app = express();
const server = http.createServer(app);

<<<<<<< HEAD
// ================== SOCKET.IO ================== //
=======
// ================== SOCKET.IO ==================
>>>>>>> 3ae27f9e11bc75efa9c289678af75e3bbb851246
const io = new Server(server, {
  cors: {
    origin: "*",
  },
});
<<<<<<< HEAD
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
=======

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

app.use(
  session({
    secret: process.env.SESSION_SECRET,
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
  })
);

// Security headers
app.use(helmet());

// Rate limiting (important for auth)
>>>>>>> 3ae27f9e11bc75efa9c289678af75e3bbb851246
const limiter = rateLimit({
  max: 100,
  windowMs: 15 * 60 * 1000, // 15 mins
  message: "Too many requests, please try again later.",
});
<<<<<<< HEAD
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
=======
app.use("/api", limiter);

//=================== END OF MIDDLEWARE===========

// ================== ROUTES ==================
// app.use("/api/auth", authRoutes);
// app.use("/api/users", userRoutes);

// Health check
app.get("/", (req, res) => {
  res.send("🚀 LocalLink API is running...");
});


//==================== END OF ROUTES ======================

// ================== GLOBAL ERROR HANDLER ==================
app.use((err, req, res, next) => {
  console.error(err);

  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
});

//================= END OF GLOBAL ERROR HANDLE==============

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
  });
});

// ================== START SERVER ==================
const PORT = process.env.PORT || 8000;

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
>>>>>>> 3ae27f9e11bc75efa9c289678af75e3bbb851246
