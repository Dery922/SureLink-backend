import Zone from "../models/Zone.js";

export class ZoneRepository {
  async findAll() {
    return Zone.find().sort({ name: 1 }).lean();
  }

  async findById(id) {
    return Zone.findById(id).lean();
  }

  async create(payload) {
    return Zone.create(payload);
  }

  async updateById(id, updates) {
    return Zone.findByIdAndUpdate(id, updates, { new: true }).lean();
  }

  async deleteById(id) {
    return Zone.findByIdAndDelete(id);
  }
}

export const zoneRepository = new ZoneRepository();
