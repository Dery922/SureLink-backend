import Transaction from "../models/Transaction.js";
import { escapeRegex } from "../utils/escapeRegex.js";

export class TransactionRepository {
  async findAll({ status, search, page = 1, limit = 20 } = {}) {
    const query = {};
    if (status && status !== "all") query.status = status;

    if (search) {
      const re = new RegExp(escapeRegex(search), "i");
      query.$or = [
        { reference: re },
        { "booking.reference": re },
        { "customer.name": re },
        { "provider.name": re },
      ];
    }

    const skip = (page - 1) * limit;
    const [transactions, total] = await Promise.all([
      Transaction.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Transaction.countDocuments(query),
    ]);

    return { transactions, total, page, limit };
  }

  async findById(id) {
    return Transaction.findById(id).lean();
  }

  async countByStatus() {
    const [byStatus, volume] = await Promise.all([
      Transaction.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
      Transaction.aggregate([
        { $match: { status: "paid" } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
    ]);

    const result = { total: 0, processing: 0, paid: 0, failed: 0, refunded: 0, disputed: 0, paid_volume: volume[0]?.total || 0 };
    for (const { _id, count } of byStatus) {
      result[_id] = (result[_id] || 0) + count;
      result.total += count;
    }
    return result;
  }

  async create(payload) {
    return Transaction.create(payload);
  }

  // Applies field updates and appends an audit entry atomically.
  async updateWithAudit(id, updates, auditEntry) {
    return Transaction.findByIdAndUpdate(
      id,
      { ...updates, $push: { audit: auditEntry } },
      { new: true },
    ).lean();
  }
}

export const transactionRepository = new TransactionRepository();
