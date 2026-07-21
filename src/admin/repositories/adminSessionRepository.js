import AdminSession from "../models/AdminSession.js";

/**
 * AdminSessionRepository (MongoDB/Mongoose).
 *
 * Persists admin sessions in the `AdminSession` collection. Previously backed
 * by Redis; migrated to Mongo so the admin module has no cache dependency.
 * Session expiry is handled by the model's TTL index on `expires_at`.
 *
 * Only the SHA-256 `token_hash` is stored — raw bearer tokens never reach
 * the database.
 */
export class AdminSessionRepository {
  /**
   * Persist an admin session. Expiry is enforced by the model's TTL index.
   */
  async create(payload) {
    await AdminSession.create({
      admin_id: String(payload.admin_id),
      token_hash: payload.token_hash,
      role: payload.role,
      ip: payload.ip || null,
      user_agent: payload.user_agent || null,
      expires_at: new Date(payload.expires_at),
    });

    return { token_hash: payload.token_hash, expires_at: payload.expires_at };
  }

  /**
   * Look up an admin session by token hash. Returns a plain object or null.
   */
  async findByTokenHash(tokenHash) {
    const session = await AdminSession.findOne({ token_hash: tokenHash }).lean();
    if (!session) return null;

    return {
      admin_id: session.admin_id,
      token_hash: session.token_hash,
      role: session.role,
      ip: session.ip,
      user_agent: session.user_agent,
      expires_at: session.expires_at,
      created_at: session.createdAt,
    };
  }

  /**
   * Delete a single admin session by token hash.
   */
  async deleteByTokenHash(tokenHash) {
    await AdminSession.deleteOne({ token_hash: tokenHash });
  }

  /**
   * Delete all sessions for an admin (logout-all).
   *
   * Returns the number of revoked sessions.
   */
  async deleteByAdminId(adminId) {
    const result = await AdminSession.deleteMany({ admin_id: String(adminId) });
    return result.deletedCount || 0;
  }
}

export const adminSessionRepository = new AdminSessionRepository();
