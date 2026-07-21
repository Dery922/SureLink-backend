import { Router } from "express";
import { authenticateAdmin } from "../middleware/adminAuth.js";
import { requireRole, ADMIN_ROLES } from "../middleware/adminAuthorize.js";
import * as ctrl from "../controllers/verificationController.js";

const router = Router();
const canReviewVerifications = requireRole(ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.PROVIDER_MANAGEMENT_ADMIN);

// PUBLIC (signature-gated) — must be registered before the admin auth guard so
// <img> tags can load private verification docs via a short-lived HMAC-signed URL.
router.get("/:id/documents/:index", ctrl.serveDocument);

router.use(authenticateAdmin);

// GET  /api/admin/verifications          — review queue (oldest pending first) + stats
router.get("/", canReviewVerifications, ctrl.list);

// GET  /api/admin/verifications/:id       — submission detail + document previews + history
router.get("/:id", canReviewVerifications, ctrl.getOne);

// POST /api/admin/verifications/:id/approve — approve + activate provider account
router.post("/:id/approve", canReviewVerifications, ctrl.approve);

// POST /api/admin/verifications/:id/reject  — reject with required reason
router.post("/:id/reject", canReviewVerifications, ctrl.reject);

export default router;
