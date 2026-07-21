import Provider from "../models/Provider.js";
import { escapeRegex } from "../utils/escapeRegex.js";

export class ProviderRepository {
  async findAll({ status, category, search, page = 1, limit = 20 } = {}) {
    const query = {};
    if (status && status !== "all") query.status = status;
    if (category && category !== "all") query.category = category;
    if (search) {
      const re = new RegExp(escapeRegex(search), "i");
      query.$or = [{ name: re }, { email: re }];
    }

    const skip = (page - 1) * limit;
    const [providers, total] = await Promise.all([
      Provider.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Provider.countDocuments(query),
    ]);

    return { providers, total, page, limit };
  }

  async findById(id) {
    return Provider.findById(id).lean();
  }

  async create(payload) {
    return Provider.create(payload);
  }

  async updateById(id, updates) {
    return Provider.findByIdAndUpdate(id, updates, { new: true }).lean();
  }

  async countByStatus() {
    const counts = await Provider.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);
    const result = { total: 0, active: 0, pending: 0, suspended: 0, inactive: 0 };
    for (const { _id, count } of counts) {
      result[_id] = count;
      result.total += count;
    }
    return result;
  }
}

export const providerRepository = new ProviderRepository();
