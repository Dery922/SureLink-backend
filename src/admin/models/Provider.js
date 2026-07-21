import mongoose from "mongoose";

const { Schema } = mongoose;

export const PROVIDER_STATUSES = Object.freeze({
  PENDING: "pending",
  ACTIVE: "active",
  SUSPENDED: "suspended",
  INACTIVE: "inactive",
});

const providerSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: Object.values(PROVIDER_STATUSES),
      default: PROVIDER_STATUSES.PENDING,
      index: true,
    },
    hourly_rate: { type: Number, default: 0 },
    service_radius_km: { type: Number, default: 10 },
    trust: {
      average_rating: { type: Number, default: 0 },
      total_ratings: { type: Number, default: 0 },
    },
    // Track which admin took each action
    approved_by: { type: Schema.Types.ObjectId, ref: "Admin", default: null },
    approved_at: { type: Date, default: null },
    suspended_by: { type: Schema.Types.ObjectId, ref: "Admin", default: null },
    suspended_at: { type: Date, default: null },
    last_active_at: { type: Date, default: null },
  },
  { timestamps: true },
);

export default mongoose.model("Provider", providerSchema);
