import User from "../../models/User.js";
import { escapeRegex } from "../utils/escapeRegex.js";

/**
 * Queries the User collection filtered to provider accounts.
 * Providers self-register via the SureLink-Frontend with roles: "provider".
 * Admins review, approve, or suspend them — they never create provider accounts.
 */
export class UserProviderRepository {
  async findAll({ status, search, page = 1, limit = 20 } = {}) {
    const query = { roles: "provider" };

    if (status && status !== "all") {
      // Map frontend "pending" filter to the actual User status value
      query.status = status === "pending" ? "verification_pending" : status;
    }

    if (search) {
      const re = new RegExp(escapeRegex(search), "i");
      query.$or = [
        { "name.full": re },
        { email: re },
        { phone: re },
      ];
    }

    const skip = (page - 1) * limit;
    const [providers, total] = await Promise.all([
      User.find(query)
        .select("-location -business_profile -driver_profile -verification -preferences")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(query),
    ]);

    return { providers, total, page, limit };
  }

  async findById(id) {
    return User.findOne({ _id: id, roles: "provider" }).lean();
  }

  async updateStatus(id, status) {
    return User.findOneAndUpdate(
      { _id: id, roles: "provider" },
      { status },
      { new: true },
    ).lean();
  }

  async countByStatus() {
    const counts = await User.aggregate([
      { $match: { roles: "provider" } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    const result = { total: 0, active: 0, pending: 0, suspended: 0, banned: 0 };
    for (const { _id, count } of counts) {
      if (_id === "verification_pending") result.pending += count;
      else result[_id] = (result[_id] || 0) + count;
      result.total += count;
    }
    return result;
  }
}

export const userProviderRepository = new UserProviderRepository();
