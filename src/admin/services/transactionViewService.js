import { AppError } from "../../utils/errors.js";
import { publishEvent } from "../../services/eventBus.js";
import { bookingReadRepository } from "../repositories/bookingReadRepository.js";

const CURRENCY = "GHS";
// Platform commission and payment-processor fee, as fractions of the charge.
const PLATFORM_FEE_PCT = 0.1;
const PROCESSING_FEE_PCT = 0.02;

const PAYMENT_METHOD_MAP = {
  "mobile-money": "mobile_money",
  "debit-card": "card",
  "bank-transfer": "bank_transfer",
  cash: "cash",
  wallet: "wallet",
};

// Booking.paymentStatus → transaction status shown in the admin dashboard.
const TX_STATUS_MAP = {
  paid: "paid",
  pending: "processing",
  partially_paid: "processing",
  failed: "failed",
  refunded: "refunded",
};

function reference(b) {
  return b.paymentReference || `TXN-${String(b._id).slice(-6).toUpperCase()}`;
}

function fees(amount) {
  const platform = Math.round(amount * PLATFORM_FEE_PCT);
  const processing = Math.round(amount * PROCESSING_FEE_PCT);
  return { platform, processing, provider_payout: amount - platform - processing };
}

/** Read a value from a paymentDetails Map or plain object (lean docs vary). */
function metaGet(details, key) {
  if (!details) return undefined;
  if (typeof details.get === "function") return details.get(key);
  return details[key];
}

/**
 * Map a lean Booking document to the transaction shape the dashboard renders.
 */
export function toTransactionView(b) {
  const details = b.paymentDetails;
  const disputeState = metaGet(details, "disputeState") || "none";
  const amount = b.totalAmount ?? 0;

  const status = disputeState === "open" ? "disputed" : (TX_STATUS_MAP[b.paymentStatus] || "processing");

  return {
    _id: String(b._id),
    reference: reference(b),
    status,
    amount,
    currency: CURRENCY,
    fees: fees(amount),
    method: PAYMENT_METHOD_MAP[b.paymentMethod] || b.paymentMethod || null,
    booking: { id: String(b._id), reference: `BK-${String(b._id).slice(-6).toUpperCase()}` },
    customer: { name: b.customerName || null },
    provider: { name: b.providerName || null },
    refund: {
      state: b.paymentStatus === "refunded" ? "completed" : (metaGet(details, "refundState") || "none"),
      reason: metaGet(details, "refundReason") || null,
    },
    dispute: { state: disputeState, reason: metaGet(details, "disputeReason") || null },
    audit: buildAudit(b),
    createdAt: b.createdAt,
  };
}

function buildAudit(b) {
  const events = [{ status: "processing", at: b.createdAt, actor: "system", note: "Payment initiated" }];
  if (b.paymentStatus === "paid") events.push({ status: "paid", at: b.updatedAt || b.createdAt, actor: "system", note: "Payment captured" });
  if (b.paymentStatus === "failed") events.push({ status: "failed", at: b.updatedAt || b.createdAt, actor: "system", note: "Payment failed" });
  if (b.paymentStatus === "refunded") events.push({ status: "refunded", at: b.updatedAt || b.createdAt, actor: "system", note: "Refund issued" });
  return events;
}

export async function listTransactions({ status, search, page, limit }) {
  const [{ bookings, total }, stats] = await Promise.all([
    bookingReadRepository.findTransactions({ status, search, page, limit }),
    bookingReadRepository.countTransactionStats(),
  ]);
  return { transactions: bookings.map(toTransactionView), total, page, limit, stats };
}

export async function getTransaction(id) {
  const booking = await bookingReadRepository.findById(id);
  if (!booking) throw new AppError("Transaction not found", 404, "TRANSACTION_NOT_FOUND");
  return toTransactionView(booking);
}

export async function refundTransaction(id, reason, adminId) {
  const booking = await bookingReadRepository.findById(id);
  if (!booking) throw new AppError("Transaction not found", 404, "TRANSACTION_NOT_FOUND");
  if (booking.paymentStatus !== "paid") {
    throw new AppError("Only paid transactions can be refunded", 409, "TRANSACTION_NOT_REFUNDABLE");
  }

  const updated = await bookingReadRepository.setPaymentMeta(id, {
    paymentStatus: "refunded",
    meta: { refundState: "completed", refundReason: reason || "Refunded by admin" },
  });
  publishEvent("admin.transaction.refunded", { transaction_id: id, admin_id: String(adminId), reason });
  return toTransactionView(updated);
}

export async function disputeTransaction(id, reason, adminId) {
  const booking = await bookingReadRepository.findById(id);
  if (!booking) throw new AppError("Transaction not found", 404, "TRANSACTION_NOT_FOUND");

  const updated = await bookingReadRepository.setPaymentMeta(id, {
    meta: { disputeState: "open", disputeReason: reason || "Dispute opened by admin" },
  });
  publishEvent("admin.transaction.disputed", { transaction_id: id, admin_id: String(adminId), reason });
  return toTransactionView(updated);
}

export async function resolveDispute(id, note, adminId) {
  const booking = await bookingReadRepository.findById(id);
  if (!booking) throw new AppError("Transaction not found", 404, "TRANSACTION_NOT_FOUND");

  const updated = await bookingReadRepository.setPaymentMeta(id, {
    meta: { disputeState: "completed", disputeNote: note || "Dispute resolved by admin" },
  });
  publishEvent("admin.transaction.dispute_resolved", { transaction_id: id, admin_id: String(adminId), note });
  return toTransactionView(updated);
}
