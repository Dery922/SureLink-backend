import { Router } from "express";
import { authenticateAdmin } from "../middleware/adminAuth.js";
import { requireRole, ADMIN_ROLES } from "../middleware/adminAuthorize.js";
import * as ctrl from "../controllers/customerController.js";

const router = Router();
const canManageOps = requireRole(ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.OPERATIONS_ADMIN);

router.use(authenticateAdmin);

// GET /api/admin/customers      — list customer-type users + stats
router.get("/", canManageOps, ctrl.list);

// GET /api/admin/customers/:id  — customer detail + their bookings
router.get("/:id", canManageOps, ctrl.getOne);

export default router;
