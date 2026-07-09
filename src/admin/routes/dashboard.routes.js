import { Router } from "express";
import { authenticateAdmin } from "../middleware/adminAuth.js";
import { summary } from "../controllers/dashboardController.js";

const router = Router();

router.use(authenticateAdmin);

// GET /api/admin/dashboard/summary — role-appropriate stats + activity
router.get("/summary", summary);

export default router;
