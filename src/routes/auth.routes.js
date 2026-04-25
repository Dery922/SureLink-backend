import { Router } from "express";
import rateLimit from "express-rate-limit";
import {
  logout,
  logoutAll,
  refreshSession,
  requestOtp,
  verifyOtpAndRegister,
} from "../controllers/authController.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const router = Router();

// Stricter limits for OTP endpoints (abuse protection).
const otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
});

router.post("/otp/request", otpLimiter, requestOtp);
router.post("/otp/verify", otpLimiter, verifyOtpAndRegister);

router.post("/session/refresh", requireAuth, refreshSession);
router.post("/session/logout", requireAuth, logout);
router.post("/session/logout-all", requireAuth, logoutAll);

export default router;

