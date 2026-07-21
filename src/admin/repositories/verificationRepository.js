import Verification, { VERIFICATION_STATUSES } from "../models/Verification.js";
import { escapeRegex } from "../utils/escapeRegex.js";

export class VerificationRepository {
  async findAll({ status, search, page = 1, limit = 20 } = {}) {
    // Default queue view shows pending submissions first.
    const query = {};
    if (status && status !== "all") query.status = status;

    if (search) {
      const re = new RegExp(escapeRegex(search), "i");
      query.$or = [
        { reference: re },
        { "provider.name": re },
        { "provider.email": re },
      ];
    }

    const skip = (page - 1) * limit;
    const [verifications, total] = await Promise.all([
      Verification.find(query).sort({ submitted_at: 1 }).skip(skip).limit(limit).lean(),
      Verification.countDocuments(query),
    ]);

    return { verifications, total, page, limit };
  }

  async findById(id) {
    return Verification.findById(id).lean();
  }

  async countByStatus() {
    const counts = await Verification.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    const result = { total: 0, pending: 0, approved: 0, rejected: 0 };
    for (const { _id, count } of counts) {
      result[_id] = (result[_id] || 0) + count;
      result.total += count;
    }
    return result;
  }

  async create(payload) {
    return Verification.create(payload);
  }

  // Applies review fields and appends a status-history event atomically.
  async updateWithEvent(id, updates, event) {
    return Verification.findByIdAndUpdate(
      id,
      { ...updates, $push: { events: event } },
      { new: true },
    ).lean();
  }
}

export const verificationRepository = new VerificationRepository();
