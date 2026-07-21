import mongoose from "mongoose";

const { Schema } = mongoose;

export const BOOKING_STATUSES = Object.freeze({
  PENDING: "pending",
  CONFIRMED: "confirmed",
  IN_PROGRESS: "in_progress",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
  DISPUTED: "disputed",
  REFUNDED: "refunded",
});

export const PAYMENT_STATUSES = Object.freeze({
  UNPAID: "unpaid",
  PAID: "paid",
  REFUNDED: "refunded",
  FAILED: "failed",
});

// One entry appended per status change / admin action. Drives the UI timeline.
const timelineEntrySchema = new Schema(
  {
    status: { type: String, enum: Object.values(BOOKING_STATUSES), required: true },
    at: { type: Date, default: Date.now },
    actor: { type: String, default: "system" }, // admin id or "system"
    note: { type: String, default: null },
  },
  { _id: false },
);

const bookingSchema = new Schema(
  {
    // Human-readable ID e.g. BK-10234
    reference: { type: String, required: true, unique: true, index: true },
    status: {
      type: String,
      enum: Object.values(BOOKING_STATUSES),
      default: BOOKING_STATUSES.PENDING,
      index: true,
    },
    service: {
      category: { type: String, required: true },
      description: { type: String, default: null },
      scheduled_at: { type: Date, default: null },
      location: { type: String, default: null },
    },
    customer: {
      id: { type: Schema.Types.ObjectId, ref: "User", default: null },
      name: { type: String, required: true },
      phone: { type: String, default: null },
      email: { type: String, default: null },
    },
    provider: {
      id: { type: Schema.Types.ObjectId, ref: "User", default: null },
      name: { type: String, default: null },
      phone: { type: String, default: null },
    },
    payment: {
      status: { type: String, enum: Object.values(PAYMENT_STATUSES), default: PAYMENT_STATUSES.UNPAID },
      amount: { type: Number, default: 0 },
      currency: { type: String, default: "GHS" },
      method: { type: String, default: null }, // mobile_money | card | cash
    },
    timeline: { type: [timelineEntrySchema], default: [] },
    cancelled_reason: { type: String, default: null },
  },
  { timestamps: true },
);

export default mongoose.model("Booking", bookingSchema);
