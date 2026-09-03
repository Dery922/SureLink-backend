// backend/controllers/notificationController.js
import Notification from "../models/Notification.js";
import { Router } from "express";

const router = Router();



// ✅ Updated: Fetch ALL notifications, not just unread ones
export const getMyNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({
      recipientId: req.user.id,
      // ❌ Remove this filter: isRead: false
    })
      .sort({ createdAt: -1 })
      .limit(20);

    const unreadCount = await Notification.countDocuments({
      recipientId: req.user.id,
      isRead: false,
    });

    return res
      .status(200)
      .json({ success: true, data: notifications, unreadCount });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ✅ Mark all as read (called when user opens dropdown)
export const markNotificationsAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      {
        recipientId: req.user.id,
        isRead: false
      },
      {
        isRead: true
      }
    );

    const unreadCount = await Notification.countDocuments({
      recipientId: req.user.id,
      isRead: false,
    });

    return res.status(200).json({
      success: true,
      message: "All notifications marked as read",
      unreadCount: 0
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
// Batch clear alerts
export const markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { recipientId: req.user.id, isRead: false },
      { $set: { isRead: true, readAt: new Date() } },
    );
    return res
      .status(200)
      .json({ success: true, message: "All marked as read" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
// Fetch distinct summary counts for dashboard badges
export const getUnreadMetrics = async (req, res) => {
  try {
    const activeUserId = req.user?._id || req.user?.id;
    if (!activeUserId) {
      return res
        .status(401)
        .json({ success: false, message: "Session expired" });
    }

    // 🚀 SINGLE-PASS AGGREGATION: Counts unread entries in parallel
    const [unreadNotificationsCount, unreadMessagesMockCount] =
      await Promise.all([
        Notification.countDocuments({
          recipientId: String(activeUserId),
          isRead: false,
        }),
        // Placeholder for your upcoming Chat/Message Model count logic:
        // Message.countDocuments({ receiverId: String(activeUserId), isRead: false })
        Promise.resolve(0), // Mocking 0 for now until you build chat models
      ]);

    return res.status(200).json({
      success: true,
      data: {
        unreadNotifications: unreadNotificationsCount,
        unreadMessages: unreadMessagesMockCount,
        totalUnreadBadges: unreadNotificationsCount + unreadMessagesMockCount,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch badge counts",
      error: error.message,
    });
  }
};
export const clearAllNotifications = async (req, res) => {
  try {
    const result = await Notification.deleteMany({
      recipientId: req.user.id,
    });

    return res.status(200).json({
      success: true,
      message: "All notifications deleted successfully",
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error("❌ Error clearing notifications:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to clear notifications",
    });
  }
};


export const deleteNotifications = async (req, res) => {
  try {
    const notificationId = req.params.id;
    // Assuming your auth middleware populates req.user
    const userId = req.user?.id;

    console.log(`🗑️ Attempting to delete notification: ${notificationId} for user: ${userId}`);

    // 1. Find the notification and make sure it belongs to the requesting user
    const notification = await Notification.findOne({
      _id: notificationId,
      recipientId: userId // 🔒 Security check: prevent deleting other users' notifications
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found or unauthorized"
      });
    }

    // 2. Perform the permanent deletion
    await Notification.deleteOne({ _id: notificationId });
    console.log("✅ Notification successfully wiped from database");

    return res.status(200).json({
      success: true,
      message: "Notification deleted successfully"
    });

  } catch (error) {
    console.error("❌ Notification Delete Router Error:", error);
    return res.status(500).json({
      success: false,
      error: "Server error trying to discard notification",
      message: error.message
    });
  }
}


export default router;
