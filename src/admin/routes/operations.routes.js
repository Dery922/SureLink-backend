import { Router } from "express";
import { authenticateAdmin } from "../middleware/adminAuth.js";
import { requireRole, ADMIN_ROLES } from "../middleware/adminAuthorize.js";
import * as ctrl from "../controllers/operationsController.js";

const router = Router();
const canViewOps = requireRole(ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.OPERATIONS_ADMIN);

router.use(authenticateAdmin);

// GET /api/admin/operations/summary     — stats + zones in one call
router.get("/summary", canViewOps, ctrl.summary);

// GET /api/admin/operations/deliveries  — list deliveries with status filter
router.get("/deliveries", canViewOps, ctrl.listDeliveries);

// GET   /api/admin/operations/zones     — list all zones
// PATCH /api/admin/operations/zones/:id — update zone capacity/drivers
router.get("/zones", canViewOps, ctrl.listZones);
router.patch("/zones/:id", requireRole(ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.OPERATIONS_ADMIN), ctrl.updateZone);

export default router;
