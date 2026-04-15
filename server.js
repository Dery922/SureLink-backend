import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import http from "http";
import cors from "cors";
import session from "express-session";
import MongoStore from "connect-mongo";


// Security
import helmet from "helmet";
import rateLimit from "express-rate-limit";

// Routes
// import authRoutes from "./src/modules/auth/auth.routes.js";
// import userRoutes from "./src/modules/users/user.routes.js";

// Socket (for future use)
import { Server } from "socket.io";

dotenv.config();

const app = express();
const server = http.createServer(app);

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
const limiter = rateLimit({
  max: 100,
  windowMs: 15 * 60 * 1000, // 15 mins
  message: "Too many requests, please try again later.",
});
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