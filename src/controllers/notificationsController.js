// backend/controllers/notificationController.js
import Notification from "../models/Notification.js";

// Fetch user's notification list
export const getMyNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ recipientId: req.user.id })
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
