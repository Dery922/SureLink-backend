import Delivery, { DELIVERY_STATUSES } from "../models/Delivery.js";

export class DeliveryRepository {
  async findAll({ status, page = 1, limit = 30 } = {}) {
    const query = {};
    if (status && status !== "all") query.status = status;

    const skip = (page - 1) * limit;
    const [deliveries, total] = await Promise.all([
      Delivery.find(query).sort({ started_at: -1, createdAt: -1 }).skip(skip).limit(limit).lean(),
      Delivery.countDocuments(query),
    ]);

    return { deliveries, total, page, limit };
  }

  async countByStatus() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [byStatus, completedToday] = await Promise.all([
      Delivery.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
      Delivery.countDocuments({ status: DELIVERY_STATUSES.COMPLETED, completed_at: { $gte: today } }),
    ]);

    const result = { active: 0, delayed: 0, completed: 0, pending: 0, cancelled: 0, completedToday };
    for (const { _id, count } of byStatus) result[_id] = count;
    result.active = result[DELIVERY_STATUSES.IN_TRANSIT] || 0;

    return result;
  }

  async avgDeliveryMinutes() {
    const res = await Delivery.aggregate([
      { $match: { status: DELIVERY_STATUSES.COMPLETED, started_at: { $ne: null }, completed_at: { $ne: null } } },
      {
        $project: {
          minutes: { $divide: [{ $subtract: ["$completed_at", "$started_at"] }, 60000] },
        },
      },
      { $group: { _id: null, avg: { $avg: "$minutes" } } },
    ]);
    return res[0] ? Math.round(res[0].avg) : 0;
  }

  async create(payload) {
    return Delivery.create(payload);
  }

  async updateById(id, updates) {
    return Delivery.findByIdAndUpdate(id, updates, { new: true }).lean();
  }
}

export const deliveryRepository = new DeliveryRepository();
