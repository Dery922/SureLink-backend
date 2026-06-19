import { Router } from "express";
import rateLimit from "express-rate-limit";

import {
  acceptTerms,
  refreshSession,
  requestOtp,
  selectRole,
  saveProviderDraft,
  verifyOtpAndRegister,
  saveProviderProfile,
  logoutUser,
  getMe,
} from "../../controllers/authController.js";
import { errorResponse } from "../../utils/apiResponse.js";
import {
  authMiddleware,
  validateRequestOtp,
  validateVerifyOtp,
} from "./auth.validation.middleware.js";

const router = Router();
router.use((req, res, next) => {
  console.log("🔥 AUTH ROUTER HIT:", req.method, req.path);
  next();
});

router.get("/me", authMiddleware, getMe);

router.post("/request-otp", validateRequestOtp, requestOtp);
router.post(
  "/verify-otp",

  validateVerifyOtp,
  verifyOtpAndRegister,
);
router.post("/refresh", refreshSession);

// router.post("/logout-all", authLimiter, validateSessionTokenRequest, logoutAll);
router.post("/select-role", authMiddleware, selectRole);
router.post("/accept-terms", authMiddleware, acceptTerms);
// Onboarding Endpoints
router.post("/provider-profile", authMiddleware, saveProviderProfile);

// 🔑 Add this line right here:
router.post("/provider-profile/draft", authMiddleware, saveProviderDraft);
router.post("/logout", authMiddleware, logoutUser);
export default router;
