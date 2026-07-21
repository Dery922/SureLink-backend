import mongoose from "mongoose";

const { Schema } = mongoose;

export const TRANSACTION_STATUSES = Object.freeze({
  PROCESSING: "processing",
  PAID: "paid",
  FAILED: "failed",
  REFUNDED: "refunded",
  DISPUTED: "disputed",
});

// Appended on every status change / admin action — the transaction audit trail.
const auditEntrySchema = new Schema(
  {
    status: { type: String, enum: Object.values(TRANSACTION_STATUSES), required: true },
    at: { type: Date, default: Date.now },
    actor: { type: String, default: "system" }, // admin id or "system"
    note: { type: String, default: null },
  },
  { _id: false },
);

const transactionSchema = new Schema(
  {
    // Human-readable ID e.g. TXN-50012
    reference: { type: String, required: true, unique: true, index: true },
    status: {
      type: String,
      enum: Object.values(TRANSACTION_STATUSES),
      default: TRANSACTION_STATUSES.PROCESSING,
      index: true,
    },
    amount: { type: Number, required: true },
    currency: { type: String, default: "GHS" },
    fees: {
      platform: { type: Number, default: 0 },
      processing: { type: Number, default: 0 },
      provider_payout: { type: Number, default: 0 },
    },
    method: { type: String, default: null }, // mobile_money | card | cash
    booking: {
      id: { type: Schema.Types.ObjectId, ref: "Booking", default: null },
      reference: { type: String, default: null },
    },
    customer: {
      id: { type: Schema.Types.ObjectId, ref: "User", default: null },
      name: { type: String, required: true },
    },
    provider: {
      id: { type: Schema.Types.ObjectId, ref: "User", default: null },
      name: { type: String, default: null },
    },
    refund: {
      state: { type: String, enum: ["none", "requested", "completed"], default: "none" },
      reason: { type: String, default: null },
    },
    dispute: {
      state: { type: String, enum: ["none", "open", "resolved"], default: "none" },
      reason: { type: String, default: null },
    },
    audit: { type: [auditEntrySchema], default: [] },
  },
  { timestamps: true },
);

export default mongoose.model("Transaction", transactionSchema);
