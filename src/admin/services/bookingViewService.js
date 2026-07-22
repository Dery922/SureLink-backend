import { AppError } from "../../utils/errors.js";
import { publishEvent } from "../../services/eventBus.js";
import { bookingReadRepository } from "../repositories/bookingReadRepository.js";
import User from "../../models/User.js";

// ── Value maps (flat Booking → frontend mock contract) ────────
const PAYMENT_METHOD_MAP = {
  "mobile-money": "mobile_money",
  "debit-card": "card",
  "bank-transfer": "bank_transfer",
  cash: "cash",
  wallet: "wallet",
};

const PAYMENT_STATUS_MAP = {
  paid: "paid",
  refunded: "refunded",
  failed: "failed",
  partially_paid: "partial",
  pending: "unpaid",
};

const CURRENCY = "GHS";

function reference(booking) {
  return booking.paymentReference || `BK-${String(booking._id).slice(-6).toUpperCase()}`;
}

/**
 * Synthesize a timeline from the Booking's discrete timestamp fields, since
 * the flat model has no event log. Ordered oldest → newest.
 */
function timeline(booking) {
  const events = [];
  const push = (status, at, note) => {
    if (at) events.push({ status, at, actor: "system", note });
  };
  push("pending", booking.createdAt, "Booking created");
  push("confirmed", booking.confirmedAt, "Provider accepted");
  push("in_progress", booking.startedAt, "Service started");
  push("completed", booking.completedAt, "Service completed");
  push("cancelled", booking.cancelledAt, booking.cancelledReason || "Booking cancelled");
  return events;
}

/**
 * Map a lean Booking document to the nested shape the admin dashboard renders.
 */
export function toBookingView(b) {
  return {
    _id: String(b._id),
    reference: reference(b),
    status: b.status,
    service: {
      category: b.serviceCategory || b.serviceName || null,
      description: b.serviceName || null,
      scheduled_at: b.bookingDate || null,
      location: [b.location?.address, b.location?.city].filter(Boolean).join(", ") || null,
    },
    customer: {
      name: b.customerName || null,
      phone: b.customerPhone || null,
      email: b.customerEmail || null,
    },
    provider: {
      name: b.providerName || null,
      phone: null,
    },
    payment: {
      status: PAYMENT_STATUS_MAP[b.paymentStatus] || b.paymentStatus || "unpaid",
      amount: b.totalAmount ?? 0,
      currency: CURRENCY,
      method: PAYMENT_METHOD_MAP[b.paymentMethod] || b.paymentMethod || null,
    },
    cancelled_reason: b.cancelledReason || undefined,
    timeline: timeline(b),
    createdAt: b.createdAt,
  };
}

// ── Service functions ─────────────────────────────────────────
export async function listBookings({ status, search, page, limit }) {
  const [{ bookings, total }, stats] = await Promise.all([
    bookingReadRepository.findAll({ status, search, page, limit }),
    bookingReadRepository.countStats(),
  ]);
  return { bookings: bookings.map(toBookingView), total, page, limit, stats };
}

export async function getBooking(id) {
  const booking = await bookingReadRepository.findById(id);
  if (!booking) throw new AppError("Booking not found", 404, "BOOKING_NOT_FOUND");
  return toBookingView(booking);
}

export async function cancelBooking(id, reason, adminId) {
  const booking = await bookingReadRepository.findById(id);
  if (!booking) throw new AppError("Booking not found", 404, "BOOKING_NOT_FOUND");
  if (["completed", "cancelled"].includes(booking.status)) {
    throw new AppError("Booking cannot be cancelled in its current state", 409, "BOOKING_NOT_CANCELLABLE");
  }

  const updated = await bookingReadRepository.updateById(id, {
    status: "cancelled",
    cancelledAt: new Date(),
    cancelledReason: reason || "Cancelled by admin",
  });
  publishEvent("admin.booking.cancelled", { booking_id: id, admin_id: String(adminId), reason });
  return toBookingView(updated);
}

export async function refundBooking(id, reason, adminId) {
  const booking = await bookingReadRepository.findById(id);
  if (!booking) throw new AppError("Booking not found", 404, "BOOKING_NOT_FOUND");
  if (booking.paymentStatus !== "paid") {
    throw new AppError("Only paid bookings can be refunded", 409, "BOOKING_NOT_REFUNDABLE");
  }

  const updated = await bookingReadRepository.updateById(id, { paymentStatus: "refunded" });
  publishEvent("admin.booking.refunded", { booking_id: id, admin_id: String(adminId), reason });
  return toBookingView(updated);
}

export async function reassignBooking(id, providerId, adminId) {
  const booking = await bookingReadRepository.findById(id);
  if (!booking) throw new AppError("Booking not found", 404, "BOOKING_NOT_FOUND");

  const provider = await User.findOne({ _id: providerId, type: "provider" }).lean();
  if (!provider) throw new AppError("Provider not found", 404, "PROVIDER_NOT_FOUND");

  const updated = await bookingReadRepository.updateById(id, {
    providerId: provider._id,
    providerName: provider.name?.full || provider.name?.display || "Provider",
  });
  publishEvent("admin.booking.reassigned", { booking_id: id, provider_id: String(providerId), admin_id: String(adminId) });
  return toBookingView(updated);
}
