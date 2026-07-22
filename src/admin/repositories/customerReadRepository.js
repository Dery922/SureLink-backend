import User from "../../models/User.js";

/**
 * Read access to customer-type User accounts for the admin dashboard.
 * Customers self-register via the SureLink-Frontend with type: "customer".
 */
export class CustomerReadRepository {
  async findAll({ status, search, page = 1, limit = 20 } = {}) {
    const query = { type: "customer" };

    if (status && status !== "all") {
      query.status = status === "pending" ? "verification_pending" : status;
    }

    if (search) {
      const re = new RegExp(search, "i");
      query.$or = [{ "name.full": re }, { email: re }, { phone: re }];
    }

    const skip = (page - 1) * limit;
    const [customers, total] = await Promise.all([
      User.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      User.countDocuments(query),
    ]);

    return { customers, total, page, limit };
  }

  async findById(id) {
    return User.findOne({ _id: id, type: "customer" }).lean();
  }

  async countByStatus() {
    const counts = await User.aggregate([
      { $match: { type: "customer" } },
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

export const customerReadRepository = new CustomerReadRepository();
