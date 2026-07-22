import { Router } from "express";
import { login, logout, refresh, me } from "../controllers/adminAuthController.js";
import {
  validateAdminLogin,
  validateAdminSessionToken,
} from "../middleware/adminAuthValidation.js";
import { authenticateAdmin } from "../middleware/adminAuth.js";

const router = Router();

// Single-step login — validate email + password, issue session
router.post("/login", validateAdminLogin, login);

// Session management (require a valid session token in body)
router.post("/refresh", validateAdminSessionToken, refresh);
router.post("/logout", validateAdminSessionToken, logout);

// Protected — requires active session via Authorization: Bearer header
router.get("/me", authenticateAdmin, me);

export default router;
