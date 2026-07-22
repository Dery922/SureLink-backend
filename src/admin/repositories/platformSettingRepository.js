import PlatformSetting from "../models/PlatformSetting.js";

const GLOBAL_KEY = "global";

export class PlatformSettingRepository {
  async get() {
    let doc = await PlatformSetting.findOne({ _key: GLOBAL_KEY }).lean();
    if (!doc) {
      doc = await PlatformSetting.create({ _key: GLOBAL_KEY });
      doc = doc.toObject();
    }
    return doc;
  }

  async update(updates, adminId) {
    return PlatformSetting.findOneAndUpdate(
      { _key: GLOBAL_KEY },
      { ...updates, last_updated_by: adminId },
      { new: true, upsert: true },
    ).lean();
  }
}

export const platformSettingRepository = new PlatformSettingRepository();
