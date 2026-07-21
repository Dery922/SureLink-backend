import { AppError } from "../../services/errors.js";
import { bookingRepository } from "../repositories/bookingRepository.js";
import { userProviderRepository } from "../repositories/userProviderRepository.js";
import { BOOKING_STATUSES, PAYMENT_STATUSES } from "../models/Booking.js";
import { publishEvent } from "../../services/eventBus.js";

export async function listBookings({ status, search, page, limit }) {
  const [result, stats] = await Promise.all([
    bookingRepository.findAll({ status, search, page, limit }),
    bookingRepository.countByStatus(),
  ]);
  return { ...result, stats };
}

export async function getBooking(id) {
  const booking = await bookingRepository.findById(id);
  if (!booking) throw new AppError("Booking not found", 404, "BOOKING_NOT_FOUND");
  return booking;
}

// Guards against re-cancelling terminal bookings, records reason on the timeline.
export async function cancelBooking(id, adminId, reason) {
  const booking = await bookingRepository.findById(id);
  if (!booking) throw new AppError("Booking not found", 404, "BOOKING_NOT_FOUND");
  if ([BOOKING_STATUSES.CANCELLED, BOOKING_STATUSES.COMPLETED, BOOKING_STATUSES.REFUNDED].includes(booking.status)) {
    throw new AppError(`Cannot cancel a ${booking.status} booking`, 409, "BOOKING_NOT_CANCELLABLE");
  }

  const updated = await bookingRepository.updateWithTimeline(
    id,
    { status: BOOKING_STATUSES.CANCELLED, cancelled_reason: reason || null },
    { status: BOOKING_STATUSES.CANCELLED, actor: String(adminId), note: reason || null },
  );
  publishEvent("admin.booking.cancelled", { booking_id: id, admin_id: String(adminId) });
  return updated;
}

// Refund requires the booking to have been paid.
export async function refundBooking(id, adminId, reason) {
  const booking = await bookingRepository.findById(id);
  if (!booking) throw new AppError("Booking not found", 404, "BOOKING_NOT_FOUND");
  if (booking.payment?.status !== PAYMENT_STATUSES.PAID) {
    throw new AppError("Only paid bookings can be refunded", 409, "BOOKING_NOT_REFUNDABLE");
  }

  const updated = await bookingRepository.updateWithTimeline(
    id,
    { status: BOOKING_STATUSES.REFUNDED, "payment.status": PAYMENT_STATUSES.REFUNDED },
    { status: BOOKING_STATUSES.REFUNDED, actor: String(adminId), note: reason || "Refund issued" },
  );
  publishEvent("admin.booking.refunded", { booking_id: id, admin_id: String(adminId) });
  return updated;
}

// Reassigns to another provider (validated against the User provider collection).
export async function reassignBooking(id, adminId, providerId) {
  const booking = await bookingRepository.findById(id);
  if (!booking) throw new AppError("Booking not found", 404, "BOOKING_NOT_FOUND");

  const provider = await userProviderRepository.findById(providerId);
  if (!provider) throw new AppError("Provider not found", 404, "PROVIDER_NOT_FOUND");

  const updated = await bookingRepository.updateWithTimeline(
    id,
    {
      "provider.id": provider._id,
      "provider.name": provider.name?.full || provider.name?.display || null,
      "provider.phone": provider.phone || null,
    },
    { status: booking.status, actor: String(adminId), note: `Reassigned to ${provider.name?.full || providerId}` },
  );
  publishEvent("admin.booking.reassigned", { booking_id: id, provider_id: String(providerId), admin_id: String(adminId) });
  return updated;
}
