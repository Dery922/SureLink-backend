import { Router } from "express";
import { authenticateAdmin } from "../middleware/adminAuth.js";
import { requireRole, ADMIN_ROLES } from "../middleware/adminAuthorize.js";
import * as ctrl from "../controllers/transactionController.js";

const router = Router();
const canManageTransactions = requireRole(ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.OPERATIONS_ADMIN);

router.use(authenticateAdmin);

// GET /api/admin/transactions      — list with status/search filter + stats
router.get("/", canManageTransactions, ctrl.list);

// GET /api/admin/transactions/:id  — full breakdown incl. fees + audit trail
router.get("/:id", canManageTransactions, ctrl.getOne);

// POST /api/admin/transactions/:id/refund           — refund a paid transaction
// POST /api/admin/transactions/:id/dispute          — open a dispute
// POST /api/admin/transactions/:id/resolve-dispute  — resolve an open dispute
router.post("/:id/refund", canManageTransactions, ctrl.refund);
router.post("/:id/dispute", canManageTransactions, ctrl.dispute);
router.post("/:id/resolve-dispute", canManageTransactions, ctrl.resolveDispute);

export default router;
