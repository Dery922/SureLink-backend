import { Router } from "express";
import { login, logout, refresh, me } from "../controllers/adminAuthController.js";
import {
  validateAdminLogin,
  validateAdminSessionToken,
} from "../middleware/adminAuthValidation.js";
import { authenticateAdmin } from "../middleware/adminAuth.js";

const router = Router();

/**
 * Admin auth routes — mounted at /api/admin/auth
 *
 * Public routes (no session required):
 *   POST /login    — email + password → session token
 *   POST /refresh  — rotate a session token
 *   POST /logout   — revoke a session token
 *
 * Protected routes (session required):
 *   GET  /me       — return current admin profile
 *
 * Future protected routes on other admin routers will use:
 *   authenticateAdmin, requireRole(ADMIN_ROLES.SUPER_ADMIN), handler
 */
router.post("/login", validateAdminLogin, login);
router.post("/refresh", validateAdminSessionToken, refresh);
router.post("/logout", validateAdminSessionToken, logout);
router.get("/me", authenticateAdmin, me);

export default router;
