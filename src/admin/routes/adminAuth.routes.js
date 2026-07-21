import { Router } from "express";
import rateLimit from "express-rate-limit";
import { login, logout, refresh, me } from "../controllers/adminAuthController.js";
import {
  validateAdminLogin,
  validateAdminSessionToken,
} from "../middleware/adminAuthValidation.js";
import { authenticateAdmin } from "../middleware/adminAuth.js";

const router = Router();

// Throttle unauthenticated auth traffic per IP to blunt credential stuffing /
// brute force. Account lockout is per-account; this covers cross-account spray.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: "Too many attempts. Try again later." },
});

// Validate email + password → issue a session
router.post("/login", authLimiter, validateAdminLogin, login);

// Session management (require a valid session token in body)
router.post("/refresh", authLimiter, validateAdminSessionToken, refresh);
router.post("/logout", validateAdminSessionToken, logout);

// Protected — requires active session via Authorization: Bearer header
router.get("/me", authenticateAdmin, me);

export default router;
