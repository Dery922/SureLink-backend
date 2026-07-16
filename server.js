import dotenv from "dotenv";
dotenv.config();
import express, { application } from "express";
import mongoose from "mongoose";
import http from "http";
import cors from "cors";
import session from "express-session";
import MongoStore from "connect-mongo";
import authRoutes from "./src/modules/auth/auth.routes.js";
import mainRoutes from "./src/modules/main/main.routes.js";
import bookingRoutes from "./src/modules/bookingRoutes.js";
import paystackRoutes from "./src/modules/paystackRoutes.js";
// Security
import helmet from "helmet";
import rateLimit from "express-rate-limit";

// Routes (Uncomment these when your files are ready)
// import authRoutes from "./src/modules/auth/auth.routes.js";
// import userRoutes from "./src/modules/users/user.routes.js";

// Socket (for future use)
import { Server } from "socket.io";

const app = express();
const server = http.createServer(app);

// ================== SOCKET.IO ==================
const io = new Server(server, {
  cors: {
    origin: "*",
  },
});
app.set("io", io);

// ================== GLOBAL MIDDLEWARES ==================
app.set("trust proxy", false);
// 🔑 FIXED: Set to 10mb once globally so base64 pictures don't throw 413 errors
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

// Debug Network Logger
app.use((req, res, next) => {
  console.log("🔥 HIT:", req.method, req.url);
  next();
});

// 🔑 FIXED: Single clean CORS configuration allowing cookies/sessions
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
    optionsSuccessStatus: 200,
  }),
);

// Security Headers
app.use(helmet());

// Session Handling & Storage configuration
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

// Rate limiting (explicitly targeted to security-sensitive routes)
const limiter = rateLimit({
  max: 100,
  windowMs: 15 * 60 * 1000, // 15 mins
  message: "Too many requests, please try again later.",
});
app.use("/api/", limiter);

// ================== APPLICATION ROUTES ==================
// Ensure your authRoutes variable is imported and uncommented at the top
app.use("/api/auth", authRoutes);
app.use("/api", mainRoutes);
app.use("/api", bookingRoutes);
app.use("/api", paystackRoutes);

// Root Endpoint / Health Check
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
    // Force drop old rigid index constraints directly from MongoDB
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

// ================== DATA & NETWORK LIFECYCLE MANAGEMENT ==================
const PORT = process.env.PORT || 5000;

async function bootstrap() {
  if (!process.env.MONGO_URI) {
    throw new Error("Missing MONGO_URI environment variable");
  }

  await mongoose.connect(process.env.MONGO_URI, {
    // Force Mongoose to throw a real error if a query takes longer than 5 seconds
    serverSelectionTimeoutMS: 5000,
  });
  console.log("✅ MongoDB connected");

  app.listen(PORT, "0.0.0.0", () => {
    console.log(
      `🚀 Server safely listening across local networks on port ${PORT}`,
    );
  });
}

bootstrap().catch((error) => {
  console.error("❌ Startup error:", error);
  process.exit(1);
});
