import Booking, { BOOKING_STATUSES } from "../models/Booking.js";
import { escapeRegex } from "../utils/escapeRegex.js";

export class BookingRepository {
  async findAll({ status, search, page = 1, limit = 20 } = {}) {
    const query = {};
    if (status && status !== "all") query.status = status;

    if (search) {
      const re = new RegExp(escapeRegex(search), "i");
      query.$or = [
        { reference: re },
        { "customer.name": re },
        { "provider.name": re },
        { "service.category": re },
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

  // Booking history for a given customer (drill-in view).
  async findByCustomer(customerId) {
    return Booking.find({ "customer.id": customerId }).sort({ createdAt: -1 }).lean();
  }

  async countByStatus() {
    const counts = await Booking.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    const result = { total: 0, pending: 0, confirmed: 0, in_progress: 0, completed: 0, cancelled: 0, disputed: 0, refunded: 0 };
    for (const { _id, count } of counts) {
      result[_id] = (result[_id] || 0) + count;
      result.total += count;
    }
    return result;
  }

  async create(payload) {
    return Booking.create(payload);
  }

  // Applies status/field updates and appends a timeline entry atomically.
  async updateWithTimeline(id, updates, timelineEntry) {
    return Booking.findByIdAndUpdate(
      id,
      { ...updates, $push: { timeline: timelineEntry } },
      { new: true },
    ).lean();
  }
}

export const bookingRepository = new BookingRepository();
