// backend/models/Notification.js
import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    // The recipient of the notification (Customer or Provider)
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    // The actor who triggered the notification
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: [
        "booking_new",
        "booking_accepted",
        "booking_completed",
        "booking_cancelled",
        "review_new",
      ],
      required: true,
    },
    // Link to the exact document that triggered it
    relatedId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "onModel",
    },
    onModel: {
      type: String,
      required: true,
      enum: ["Booking", "Review"],
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    isSeen: { type: Boolean, default: false },   // ← User opened dropdown
    readAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  },
);

// Compound index for fast unread notifications delivery
notificationSchema.index({ recipientId: 1, isRead: 1, createdAt: -1 });

export default mongoose.model("Notification", notificationSchema);
