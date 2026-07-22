import { Router } from "express";
import { authenticateAdmin } from "../middleware/adminAuth.js";
import { requireRole, ADMIN_ROLES } from "../middleware/adminAuthorize.js";
import * as ctrl from "../controllers/transactionController.js";

const router = Router();
const canManageOps = requireRole(ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.OPERATIONS_ADMIN);

router.use(authenticateAdmin);

// GET /api/admin/transactions      — list (view over booking payments) + stats
router.get("/", canManageOps, ctrl.list);

// GET /api/admin/transactions/:id  — single transaction detail
router.get("/:id", canManageOps, ctrl.getOne);

// Actions
router.post("/:id/refund",          canManageOps, ctrl.refund);
router.post("/:id/dispute",         canManageOps, ctrl.dispute);
router.post("/:id/resolve-dispute", canManageOps, ctrl.resolveDispute);

export default router;
