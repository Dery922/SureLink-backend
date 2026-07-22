import { Router } from "express";
import { authenticateAdmin } from "../middleware/adminAuth.js";
import { requireRole, ADMIN_ROLES } from "../middleware/adminAuthorize.js";
import * as ctrl from "../controllers/bookingController.js";

const router = Router();
const canManageOps = requireRole(ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.OPERATIONS_ADMIN);

router.use(authenticateAdmin);

// GET /api/admin/bookings          — list customer bookings + stats
router.get("/", canManageOps, ctrl.list);

// GET /api/admin/bookings/:id      — single booking detail
router.get("/:id", canManageOps, ctrl.getOne);

// Actions
router.post("/:id/cancel",   canManageOps, ctrl.cancel);
router.post("/:id/refund",   canManageOps, ctrl.refund);
router.post("/:id/reassign", canManageOps, ctrl.reassign);

export default router;
