// src/routes/activityRoutes.js

import express from "express";

import { authMiddleware } from "./auth/auth.validation.middleware.js";
import {
  getUserActivities,
  getRecentActivities,
  createActivity,
  deleteActivity,
  deleteAllActivities,
  restoreActivity,
  restoreAllActivities,
  getActivityStats,
} from "../controllers/mainController.js";

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Get activities
router.get("/activities", getUserActivities);
// router.get("/activities/recent", getRecentActivities);
// router.get("/activities/stats", getActivityStats);

// Create activity (internal use)
router.post("/activities", createActivity);

// Delete activities
router.delete("/activities/:activityId", deleteActivity);
router.delete("/activities/all", deleteAllActivities);

// Restore activities (undo delete)
router.put("/activities/:activityId/restore", restoreActivity);
router.put("/activities/all/restore", restoreAllActivities);

export default router;
