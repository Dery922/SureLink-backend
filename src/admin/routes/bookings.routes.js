import { Router } from "express";
import { authenticateAdmin } from "../middleware/adminAuth.js";
import { requireRole, ADMIN_ROLES } from "../middleware/adminAuthorize.js";
import * as ctrl from "../controllers/bookingController.js";

const router = Router();
const canManageBookings = requireRole(ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.OPERATIONS_ADMIN);

router.use(authenticateAdmin);

// GET /api/admin/bookings         — list with status/search filter + stats
router.get("/", canManageBookings, ctrl.list);

// GET /api/admin/bookings/:id     — full booking detail incl. timeline
router.get("/:id", canManageBookings, ctrl.getOne);

// POST /api/admin/bookings/:id/cancel   — cancel with reason
// POST /api/admin/bookings/:id/refund   — refund a paid booking
// POST /api/admin/bookings/:id/reassign — reassign to another provider
router.post("/:id/cancel", canManageBookings, ctrl.cancel);
router.post("/:id/refund", canManageBookings, ctrl.refund);
router.post("/:id/reassign", canManageBookings, ctrl.reassign);

export default router;
