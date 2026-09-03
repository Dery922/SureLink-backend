// backend/routes/notificationRoutes.js
import { Router } from "express";

import { authMiddleware } from "./auth/auth.validation.middleware.js";
import {
  clearAllNotifications,
  deleteNotifications,
  getMyNotifications,
  getUnreadMetrics,
  markAllAsRead,
  markNotificationsAsRead,
} from "../controllers/notificationsController.js";


const router = Router();


router.get("/notifications", authMiddleware, getMyNotifications);
router.put("/notifications/read-all", authMiddleware, markAllAsRead);
router.get("/unread-metrics", authMiddleware, getUnreadMetrics);
//this route is for provider notification
router.post("/notifications/:id/read", (req, res, next) => {
  console.log("🔥 Notification route hit:", req.params.id);
  next();
}, authMiddleware, markNotificationsAsRead);
router.delete("/notifications/clear-all", authMiddleware, clearAllNotifications);
// 🗑️ DELETE a notification by ID
router.delete(
  "/notifications/:id",
  (req, res, next) => {
    console.log("🔥 DELETE notification route hit:", req.params.id);
    next();
  },
  authMiddleware,
  deleteNotifications
);


export default router;