import mongoose from "mongoose";

const { Schema } = mongoose;

/**
 * Single-document settings store.
 * Always upserted with key "global" — never a collection of docs.
 */
const platformSettingSchema = new Schema(
  {
    _key: { type: String, default: "global", unique: true },

    // Platform
    max_delivery_radius_km: { type: Number, default: 50 },
    provider_auto_approval: { type: Boolean, default: false },
    maintenance_mode: { type: Boolean, default: false },
    otp_expiry_minutes: { type: Number, default: 5 },
    push_notifications_enabled: { type: Boolean, default: true },

    // Security
    admin_session_ttl_hours: { type: Number, default: 8 },
    login_lockout_threshold: { type: Number, default: 5 },
    lockout_duration_minutes: { type: Number, default: 15 },
    require_strong_passwords: { type: Boolean, default: true },
    token_rotation_on_refresh: { type: Boolean, default: true },

    last_updated_by: { type: Schema.Types.ObjectId, ref: "Admin", default: null },
  },
  { timestamps: true },
);

export default mongoose.model("PlatformSetting", platformSettingSchema);
