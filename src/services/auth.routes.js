import { Router } from "express";
import {
  logout,
  logoutAll,
  refreshSession,
  requestOtp,
  verifyOtpAndRegister,
} from "../controllers/authController.js";
import {
  validateRequestOtp,
  validateSessionTokenRequest,
  validateVerifyOtp,
} from "../middleware/authValidation.js";

const router = Router();

/**
 * Auth module routes.
 *
 * Validation middleware keeps controllers thin and consistent.
 */
router.post("/request-otp", validateRequestOtp, requestOtp);
router.post("/verify-otp", validateVerifyOtp, verifyOtpAndRegister);
router.post("/refresh", validateSessionTokenRequest, refreshSession);
router.post("/logout", validateSessionTokenRequest, logout);
router.post("/logout-all", validateSessionTokenRequest, logoutAll);

export default router;
