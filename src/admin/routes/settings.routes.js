import { Router } from "express";
import { authenticateAdmin } from "../middleware/adminAuth.js";
import { requireRole, ADMIN_ROLES } from "../middleware/adminAuthorize.js";
import * as ctrl from "../controllers/settingsController.js";

const router = Router();

router.use(authenticateAdmin, requireRole(ADMIN_ROLES.SUPER_ADMIN));

// GET   /api/admin/settings   — retrieve platform + security settings
// PATCH /api/admin/settings   — update any subset of settings
router.route("/")
  .get(ctrl.get)
  .patch(ctrl.update);

export default router;
