import User from "../../models/User.js";

const SUBMITTED_STATES = ["pending", "approved", "rejected"];

/**
 * Read/write access to provider verification state, which lives on
 * User.provider_profile.verification_status. The verification "queue" is the
 * set of provider accounts that have submitted their profile for review
 * (i.e. verification_status is no longer "not_started").
 */
export class VerificationRepository {
  async findAll({ status, search, page = 1, limit = 20 } = {}) {
    const query = {
      type: "provider",
      "provider_profile.verification_status": { $in: SUBMITTED_STATES },
    };

    if (status && status !== "all") {
      query["provider_profile.verification_status"] = status;
    }

    if (search) {
      const re = new RegExp(search, "i");
      query.$or = [{ "name.full": re }, { email: re }, { phone: re }];
    }

    const skip = (page - 1) * limit;
    const [providers, total] = await Promise.all([
      User.find(query).sort({ updatedAt: -1 }).skip(skip).limit(limit).lean(),
      User.countDocuments(query),
    ]);

    return { providers, total, page, limit };
  }

  async findById(id) {
    return User.findOne({ _id: id, type: "provider" }).lean();
  }

  async review(id, { verification_status, userStatus, rejection_reason, reviewed_by }) {
    const set = {
      "provider_profile.verification_status": verification_status,
      "provider_profile.reviewed_at": new Date(),
      "provider_profile.reviewed_by": reviewed_by,
      "provider_profile.rejection_reason": rejection_reason ?? null,
    };
    if (userStatus) set.status = userStatus;

    return User.findOneAndUpdate({ _id: id, type: "provider" }, { $set: set }, { new: true }).lean();
  }

  async countByStatus() {
    const counts = await User.aggregate([
      { $match: { type: "provider", "provider_profile.verification_status": { $in: SUBMITTED_STATES } } },
      { $group: { _id: "$provider_profile.verification_status", count: { $sum: 1 } } },
    ]);

    const result = { total: 0, pending: 0, approved: 0, rejected: 0 };
    for (const { _id, count } of counts) {
      if (_id in result) result[_id] += count;
      result.total += count;
    }
    return result;
  }
}

export const verificationRepository = new VerificationRepository();
