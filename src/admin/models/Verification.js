import mongoose from "mongoose";

const { Schema } = mongoose;

export const VERIFICATION_STATUSES = Object.freeze({
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
});

const documentSchema = new Schema(
  {
    type: { type: String, required: true }, // ghana_card | business_cert | selfie | proof_of_address
    label: { type: String, required: true },
    url: { type: String, required: true },
  },
  { _id: false },
);

// One entry per submission / review action — the verification status history.
const eventSchema = new Schema(
  {
    status: { type: String, enum: Object.values(VERIFICATION_STATUSES), required: true },
    at: { type: Date, default: Date.now },
    actor: { type: String, default: "system" }, // admin id or "system"
    note: { type: String, default: null },
  },
  { _id: false },
);

// Snapshot of the provider profile exactly as submitted at onboarding time, so
// the admin reviewer sees what the applicant entered even if the User document
// later changes.
const providerProfileSchema = new Schema(
  {
    category: { type: String, default: null },
    secondary_category: { type: String, default: null },
    service_area: { type: String, default: null },
    service_radius_km: { type: Number, default: null },
    experience_years: { type: Number, default: null },
    bio: { type: String, default: null },
    base_price: { type: Number, default: null },
    availability: { type: Boolean, default: null },
    id_type: { type: String, default: null },
    id_number: { type: String, default: null },
  },
  { _id: false },
);

const verificationSchema = new Schema(
  {
    // Human-readable ID e.g. VER-3001
    reference: { type: String, required: true, unique: true, index: true },
    provider: {
      id: { type: Schema.Types.ObjectId, ref: "User", default: null },
      name: { type: String, required: true },
      email: { type: String, default: null },
      phone: { type: String, default: null },
    },
    status: {
      type: String,
      enum: Object.values(VERIFICATION_STATUSES),
      default: VERIFICATION_STATUSES.PENDING,
      index: true,
    },
    documents: { type: [documentSchema], default: [] },
    provider_profile: { type: providerProfileSchema, default: null },
    events: { type: [eventSchema], default: [] },
    submitted_at: { type: Date, default: Date.now },
    reviewed_at: { type: Date, default: null },
    reviewed_by: { type: String, default: null }, // admin id
    rejection_reason: { type: String, default: null },
  },
  { timestamps: true },
);

export default mongoose.model("Verification", verificationSchema);
