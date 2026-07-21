import { Router } from "express";
import { authenticateAdmin } from "../middleware/adminAuth.js";
import { requireRole, ADMIN_ROLES } from "../middleware/adminAuthorize.js";
import { validateCreateAdmin, validateResetPassword } from "../middleware/adminValidation.js";
import * as ctrl from "../controllers/adminManagementController.js";

const router = Router();
const superOnly = requireRole(ADMIN_ROLES.SUPER_ADMIN);

router.use(authenticateAdmin, superOnly);

// GET  /api/admin/admins       — list all admin accounts
// POST /api/admin/admins       — create a new admin
router.route("/")
  .get(ctrl.list)
  .post(validateCreateAdmin, ctrl.create);

// PATCH  /api/admin/admins/:id                — update name/role/status
// DELETE /api/admin/admins/:id                — remove admin
router.route("/:id")
  .patch(ctrl.update)
  .delete(ctrl.remove);

// POST /api/admin/admins/:id/reset-password   — force-set password
// POST /api/admin/admins/:id/unlock           — clear lockout
router.post("/:id/reset-password", validateResetPassword, ctrl.resetPassword);
router.post("/:id/unlock", ctrl.unlock);

export default router;
