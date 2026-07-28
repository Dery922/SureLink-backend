// backend/routes/notificationRoutes.js
import express from "express";

import { authMiddleware } from "./auth/auth.validation.middleware.js";
import {
  getMyNotifications,
  getUnreadMetrics,
  markAllAsRead,
} from "../controllers/notificationsController.js";

const router = express.Router();
router.get("/notifications", authMiddleware, getMyNotifications);
router.put("/notifications/read-all", authMiddleware, markAllAsRead);
router.get("/unread-metrics", authMiddleware, getUnreadMetrics);
export default router;
