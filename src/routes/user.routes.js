import { Router } from "express";
import { successResponse } from "../utils/apiResponse.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { requireMinLevel } from "../middleware/rbac.middleware.js";

const router = Router();

/**
 * Minimal user endpoint(s) to demonstrate auth+RBAC plumbing.
 * Extend with proper controllers as features land.
 */
router.get("/me", requireAuth, (req, res) => {
  return res.status(200).json(
    successResponse({
      message: "User loaded",
      data: {
        user: req.user,
      },
    }),
  );
});

// Example of RBAC: only business/admin can access.
router.get("/admin/ping", requireAuth, requireMinLevel("business"), (req, res) => {
  return res.status(200).json(
    successResponse({
      message: "RBAC OK",
      data: { ok: true },
    }),
  );
});

export default router;

