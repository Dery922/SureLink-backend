import Booking from "../../models/Booking.js";

/**
 * Read/write access to the real customer Booking collection (Frank's model)
 * for the admin dashboard. The customer app writes these documents; the admin
 * only reads them and performs a few status transitions.
 */
export class BookingReadRepository {
  async findAll({ status, search, page = 1, limit = 20 } = {}) {
    const query = {};

    if (status && status !== "all") query.status = status;

    if (search) {
      const re = new RegExp(search, "i");
      query.$or = [
        { customerName: re },
        { providerName: re },
        { serviceName: re },
        { serviceCategory: re },
        { paymentReference: re },
      ];
    }

    const skip = (page - 1) * limit;
    const [bookings, total] = await Promise.all([
      Booking.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Booking.countDocuments(query),
    ]);

    return { bookings, total, page, limit };
  }

  async findById(id) {
    return Booking.findById(id).lean();
  }

  async findByCustomer(customerId, { limit = 50 } = {}) {
    return Booking.find({ customerId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
  }

  async updateById(id, patch) {
    return Booking.findByIdAndUpdate(id, patch, { new: true }).lean();
  }

  /**
   * Set paymentStatus and/or paymentDetails Map entries on a booking, then
   * persist. Used by the transactions view for refund/dispute actions, whose
   * state lives in the paymentDetails Map (the flat Booking has no dispute
   * field). Loads a full document (not lean) so Map .set() works.
   */
  async setPaymentMeta(id, { paymentStatus, meta = {} } = {}) {
    const doc = await Booking.findById(id);
    if (!doc) return null;
    if (paymentStatus) doc.paymentStatus = paymentStatus;
    for (const [key, value] of Object.entries(meta)) doc.paymentDetails.set(key, value);
    await doc.save();
    return doc.toObject();
  }

  // ── Transactions view (a read model over Booking payment fields) ──
  async findTransactions({ status, search, page = 1, limit = 20 } = {}) {
    const query = {};

    if (status && status !== "all") {
      if (status === "disputed") query["paymentDetails.disputeState"] = "open";
      else if (status === "processing") query.paymentStatus = { $in: ["pending", "partially_paid"] };
      else query.paymentStatus = status; // paid | failed | refunded
    }

    if (search) {
      const re = new RegExp(search, "i");
      query.$or = [
        { customerName: re },
        { providerName: re },
        { paymentReference: re },
      ];
    }

    const skip = (page - 1) * limit;
    const [bookings, total] = await Promise.all([
      Booking.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Booking.countDocuments(query),
    ]);

    return { bookings, total, page, limit };
  }

  async countTransactionStats() {
    const [byPayment, disputed] = await Promise.all([
      Booking.aggregate([
        { $group: { _id: "$paymentStatus", count: { $sum: 1 }, volume: { $sum: "$totalAmount" } } },
      ]),
      Booking.countDocuments({ "paymentDetails.disputeState": "open" }),
    ]);

    const stats = { total: 0, processing: 0, paid: 0, failed: 0, refunded: 0, disputed, paid_volume: 0 };
    for (const { _id, count, volume } of byPayment) {
      stats.total += count;
      if (_id === "pending" || _id === "partially_paid") stats.processing += count;
      else if (_id === "paid") { stats.paid += count; stats.paid_volume += volume || 0; }
      else if (_id === "failed") stats.failed += count;
      else if (_id === "refunded") stats.refunded += count;
    }
    return stats;
  }

  /**
   * Count bookings grouped by status. Returns every bucket the admin UI
   * expects, initialised to 0. `disputed` has no equivalent booking status
   * (bookings are never disputed directly) so it stays 0; `refunded` is
   * derived from paymentStatus.
   */
  async countStats() {
    const [byStatus, refundedCount] = await Promise.all([
      Booking.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
      Booking.countDocuments({ paymentStatus: "refunded" }),
    ]);

    const stats = {
      total: 0,
      pending: 0,
      confirmed: 0,
      in_progress: 0,
      completed: 0,
      cancelled: 0,
      disputed: 0,
      refunded: refundedCount,
    };

    for (const { _id, count } of byStatus) {
      if (_id in stats) stats[_id] += count;
      stats.total += count;
    }

    return stats;
  }
}

export const bookingReadRepository = new BookingReadRepository();
