import { Router } from "express";
import { authenticateAdmin } from "../middleware/adminAuth.js";
import { requireRole, ADMIN_ROLES } from "../middleware/adminAuthorize.js";
import * as ctrl from "../controllers/providerController.js";

const router = Router();
const canManageProviders = requireRole(ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.PROVIDER_MANAGEMENT_ADMIN);

router.use(authenticateAdmin);

// GET /api/admin/providers          — list provider-type users + stats
router.get("/", canManageProviders, ctrl.list);

// GET /api/admin/providers/:id      — single provider user
router.get("/:id", canManageProviders, ctrl.getOne);

// Status transitions (approve = set active, suspend, reinstate)
router.post("/:id/approve",   canManageProviders, ctrl.approve);
router.post("/:id/suspend",   canManageProviders, ctrl.suspend);
router.post("/:id/reinstate", canManageProviders, ctrl.reinstate);

export default router;
