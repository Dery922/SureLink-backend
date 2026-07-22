import { Router } from "express";
import { authenticateAdmin } from "../middleware/adminAuth.js";
import { requireRole, ADMIN_ROLES } from "../middleware/adminAuthorize.js";
import * as ctrl from "../controllers/verificationController.js";

const router = Router();
const canManageProviders = requireRole(ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.PROVIDER_MANAGEMENT_ADMIN);

router.use(authenticateAdmin);

// GET /api/admin/verifications      — provider verification queue + stats
router.get("/", canManageProviders, ctrl.list);

// GET /api/admin/verifications/:id  — single verification detail
router.get("/:id", canManageProviders, ctrl.getOne);

// Actions
router.post("/:id/approve", canManageProviders, ctrl.approve);
router.post("/:id/reject",  canManageProviders, ctrl.reject);

export default router;
