import { Router } from "express";

const router = Router();

/**
 * User module routes.
 *
 * This currently only exposes a lightweight health endpoint and is intended as
 * a placeholder for future user/profile APIs.
 */
router.get("/health", (req, res) => {
  return res.status(200).json({
    success: true,
    message: "User routes active",
  });
});

export default router;
