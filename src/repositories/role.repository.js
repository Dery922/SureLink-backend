// repositories/role.repository.js
import PermissionOverride from "../models/Permission.js";

/**
 * RoleRepository — Database abstraction for RBAC overrides.
 *
 * Pattern: Repository (design doc)
 * Rule: Services never touch the DB — they go through here.
 *
 * Awilix registers this as a SINGLETON (see containers/index.js).
 */
export class RoleRepository {

  /**
   * Get active permission overrides for a user.
   * Filters out expired overrides automatically.
   *
   * @param {string} userId
   * @returns {Promise<{granted: string[], revoked: string[]} | null>}
   */
  async getOverridesForUser(userId) {
    return PermissionOverride.findOne({
      user_id: userId,
      $or: [
        { expires_at: null },
        { expires_at: { $gt: new Date() } },
      ],
    }).lean();
  }

  /**
   * Create or update a user's permission overrides.
   * Only admins should ever call this (enforced at middleware level).
   *
   * @param {string} userId
   * @param {object} payload
   * @returns {Promise<PermissionOverride>}
   */
  async upsertOverrides(userId, { granted = [], revoked = [], reason, grantedBy, expiresAt = null }) {
    return PermissionOverride.findOneAndUpdate(
      { user_id: userId },
      {
        $set: {
          granted,
          revoked,
          reason,
          granted_by: grantedBy,
          expires_at: expiresAt,
        },
      },
      { upsert: true, new: true, runValidators: true }
    );
  }

  /**
   * Remove all overrides for a user — resets them to pure role permissions.
   *
   * @param {string} userId
   * @returns {Promise<void>}
   */
  async clearOverrides(userId) {
    await PermissionOverride.deleteOne({ user_id: userId });
  }
}