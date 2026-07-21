import { Router } from "express";
import { authenticateAdmin } from "../middleware/adminAuth.js";
import { requireRole, ADMIN_ROLES } from "../middleware/adminAuthorize.js";
import * as ctrl from "../controllers/customerController.js";

const router = Router();
const canViewCustomers = requireRole(ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.OPERATIONS_ADMIN);

router.use(authenticateAdmin);

// GET /api/admin/customers      — list with status/search filter + stats
router.get("/", canViewCustomers, ctrl.list);

// GET /api/admin/customers/:id  — customer detail + booking history
router.get("/:id", canViewCustomers, ctrl.getOne);

export default router;
