import { Router } from "express";
import rateLimit from "express-rate-limit";
import {
  acceptTerms,
  logout,
  logoutAll,
  refreshSession,
  requestOtp,
  selectRole,
  verifyOtpAndRegister,
} from "../../controllers/authController.js";
import { errorResponse } from "../../utils/apiResponse.js";
import {
  authMiddleware,
  validateRequestOtp,
  validateSessionTokenRequest,
  validateVerifyOtp,
} from "./auth.validation.middleware.js";

const router = Router();
router.use((req, res, next) => {
  console.log("🔥 AUTH ROUTER HIT:", req.method, req.path);
  next();
});

//Rate limit to block users from abusing the site by limiting
const authLimiter = rateLimit({
  max: 20,
  windowMs: 15 * 60 * 1000,
  handler: (req, res) => {
    console.log("🚨 RATE LIMIT HIT");
    return res.status(429).json(
      errorResponse({
        message: "Too many authentication requests.",
      }),
    );
  },
});

router.get("/me", authMiddleware, (req, res) => {
  // If authMiddleware successfully decodes, req.user.id is accessible
  return res.status(200).json({
    success: true,
    data: { user: req.user },
  });
});

router.post("/request-otp", authLimiter, validateRequestOtp, requestOtp);
router.post(
  "/verify-otp",
  authLimiter,
  validateVerifyOtp,
  verifyOtpAndRegister,
);
router.post(
  "/refresh",
  authLimiter,
  validateSessionTokenRequest,
  refreshSession,
);
router.post("/logout", authLimiter, validateSessionTokenRequest, logout);
router.post("/logout-all", authLimiter, validateSessionTokenRequest, logoutAll);
router.post("/select-role", authLimiter, authMiddleware, selectRole);
router.post("/accept-terms", authLimiter, authMiddleware, acceptTerms);
export default router;
