import { Router } from "express";
import rateLimit from "express-rate-limit";
import {
  logout,
  logoutAll,
  refreshSession,
  requestOtp,
  verifyOtpAndRegister,
} from "../../controllers/authController.js";
import { errorResponse } from "../../utils/apiResponse.js";
import {
  validateRequestOtp,
  validateSessionTokenRequest,
  validateVerifyOtp,
} from "./auth.validation.middleware.js";

const router = Router();

/**
 * Auth route-level rate limit.
 *
 * This is intentionally stricter than the global `/api` limiter in `server.js`
 * because OTP endpoints are high-risk for brute-force / SMS abuse.
 */
const authLimiter = rateLimit({
  max: 20,
  windowMs: 15 * 60 * 1000,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    return res.status(429).json(
      errorResponse({
        message: "Too many authentication requests. Please try again later.",
        code: "RATE_LIMIT_EXCEEDED",
      }),
    );
  },
});

/**
 * Auth module routes.
 *
 * Validation middleware keeps controllers thin and consistent.
 */
router.post("/request-otp", authLimiter, validateRequestOtp, requestOtp);
router.post("/verify-otp", authLimiter, validateVerifyOtp, verifyOtpAndRegister);
router.post("/refresh", authLimiter, validateSessionTokenRequest, refreshSession);
router.post("/logout", authLimiter, validateSessionTokenRequest, logout);
router.post("/logout-all", authLimiter, validateSessionTokenRequest, logoutAll);

export default router;
