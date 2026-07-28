// backend/utils/notificationHelper.js
import Notification from "../models/Notification.js";

export const createNotification = async ({
  recipientId,
  senderId,
  title,
  message,
  type,
  relatedId,
  onModel,
}) => {
  try {
    const notification = new Notification({
      recipientId,
      senderId,
      title,
      message,
      type,
      relatedId,
      onModel,
    });

    await notification.save();

    // 💡 FUTURE INTEGRATION ANCHOR:
    // If you add Socket.io for live updates or Firebase Push Notifications later,
    // you will trigger them right here in this exact block!

    return notification;
  } catch (error) {
    console.error("❌ Background Notification Generation Error:", error);
  }
};
