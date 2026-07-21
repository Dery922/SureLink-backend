import { Router } from "express";
import { login, logout, refresh, me, verifyOTP, resendOTP } from "../controllers/adminAuthController.js";
import {
  validateAdminLogin,
  validateAdminSessionToken,
  validateVerifyOTP,
  validateResendOTP,
} from "../middleware/adminAuthValidation.js";
import { authenticateAdmin } from "../middleware/adminAuth.js";

const router = Router();

// Step 1 — validate email + password, send OTP
router.post("/login", validateAdminLogin, login);

// Step 2a — verify OTP → issue real session
router.post("/verify-otp", validateVerifyOTP, verifyOTP);

// Step 2b — resend OTP (invalidates old code, issues new pending_token)
router.post("/resend-otp", validateResendOTP, resendOTP);

// Session management (require a valid session token in body)
router.post("/refresh", validateAdminSessionToken, refresh);
router.post("/logout", validateAdminSessionToken, logout);

// Protected — requires active session via Authorization: Bearer header
router.get("/me", authenticateAdmin, me);

export default router;
