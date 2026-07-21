import mongoose from "mongoose";

const { Schema } = mongoose;

export const DELIVERY_STATUSES = Object.freeze({
  PENDING: "pending",
  IN_TRANSIT: "in_transit",
  DELAYED: "delayed",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
});

const deliverySchema = new Schema(
  {
    // Human-readable ID e.g. SL-9901
    reference: { type: String, required: true, unique: true, index: true },
    customer_name: { type: String, required: true },
    driver_name: { type: String, default: null },
    provider_name: { type: String, default: null },
    from_address: { type: String, required: true },
    to_address: { type: String, required: true },
    status: {
      type: String,
      enum: Object.values(DELIVERY_STATUSES),
      default: DELIVERY_STATUSES.PENDING,
      index: true,
    },
    eta_minutes: { type: Number, default: null },
    started_at: { type: Date, default: null },
    completed_at: { type: Date, default: null },
  },
  { timestamps: true },
);

export default mongoose.model("Delivery", deliverySchema);
