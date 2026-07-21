import User from "../../models/User.js";
import { escapeRegex } from "../utils/escapeRegex.js";

/**
 * Queries the User collection filtered to customer accounts.
 * Customers self-register via the mobile app / frontend with roles: ["customer"].
 * Admins can view and inspect them but never create customer accounts here.
 *
 * ponytail: filters on the real `roles` array field (not the commented-out
 * `type` field that userProviderRepository still references).
 */
export class UserCustomerRepository {
  async findAll({ status, search, page = 1, limit = 20 } = {}) {
    const query = { roles: "customer" };

    if (status && status !== "all") {
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
    const [customers, total] = await Promise.all([
      User.find(query)
        .select("-business_profile -driver_profile -verification -preferences")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(query),
    ]);

    return { customers, total, page, limit };
  }

  async findById(id) {
    return User.findOne({ _id: id, roles: "customer" }).lean();
  }

  async countByStatus() {
    const counts = await User.aggregate([
      { $match: { roles: "customer" } },
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

export const userCustomerRepository = new UserCustomerRepository();
