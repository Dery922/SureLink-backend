import { platformSettingRepository } from "../repositories/platformSettingRepository.js";

const PLATFORM_FIELDS = [
  "max_delivery_radius_km",
  "provider_auto_approval",
  "maintenance_mode",
  "otp_expiry_minutes",
  "push_notifications_enabled",
];

const SECURITY_FIELDS = [
  "admin_session_ttl_hours",
  "login_lockout_threshold",
  "lockout_duration_minutes",
  "require_strong_passwords",
  "token_rotation_on_refresh",
];

const ALLOWED_FIELDS = new Set([...PLATFORM_FIELDS, ...SECURITY_FIELDS]);

export async function getSettings() {
  return platformSettingRepository.get();
}

export async function updateSettings(updates, adminId) {
  // Strip unknown fields
  const safe = Object.fromEntries(
    Object.entries(updates).filter(([k]) => ALLOWED_FIELDS.has(k))
  );
  return platformSettingRepository.update(safe, adminId);
}
