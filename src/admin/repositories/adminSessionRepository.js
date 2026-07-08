import { redisClient } from "../../services/redisClient.js";

/**
 * AdminSessionRepository (Redis).
 *
 * Mirrors the existing SessionRepository pattern exactly, but uses a separate
 * key namespace (`auth:admin:session:*`) so admin sessions are clearly isolated
 * from user sessions. This prevents any accidental cross-session token reuse
 * between admin and user auth flows.
 *
 * Key layout:
 *   auth:admin:session:<token_hash>       → session payload JSON (with TTL)
 *   auth:admin:user-sessions:<adminId>    → set of token_hash values
 */
export class AdminSessionRepository {
  tokenKey(tokenHash) {
    return `auth:admin:session:${tokenHash}`;
  }

  userSetKey(adminId) {
    return `auth:admin:user-sessions:${adminId}`;
  }

  /**
   * Persist an admin session with a TTL derived from `expires_at`.
   */
  async create(payload) {
    const tokenKey = this.tokenKey(payload.token_hash);
    const userSetKey = this.userSetKey(payload.admin_id);
    const ttlSeconds = Math.max(
      1,
      Math.floor(
        (new Date(payload.expires_at).getTime() - Date.now()) / 1000,
      ),
    );

    await redisClient.set(
      tokenKey,
      JSON.stringify({
        admin_id: payload.admin_id,
        token_hash: payload.token_hash,
        role: payload.role,
        ip: payload.ip || null,
        user_agent: payload.user_agent || null,
        expires_at: new Date(payload.expires_at).toISOString(),
        created_at: new Date().toISOString(),
      }),
      { EX: ttlSeconds },
    );

    await redisClient.sAdd(userSetKey, payload.token_hash);
    await redisClient.expire(userSetKey, ttlSeconds);

    return { token_hash: payload.token_hash, expires_at: payload.expires_at };
  }

  /**
   * Look up an admin session by token hash.
   */
  async findByTokenHash(tokenHash) {
    const raw = await redisClient.get(this.tokenKey(tokenHash));
    if (!raw) return null;
    return JSON.parse(raw);
  }

  /**
   * Delete a single admin session.
   */
  async deleteByTokenHash(tokenHash) {
    const session = await this.findByTokenHash(tokenHash);
    await redisClient.del(this.tokenKey(tokenHash));

    if (session?.admin_id) {
      await redisClient.sRem(this.userSetKey(session.admin_id), tokenHash);
    }
  }

  /**
   * Delete all sessions for an admin (logout-all).
   *
   * Returns the number of revoked sessions.
   */
  async deleteByAdminId(adminId) {
    const userSetKey = this.userSetKey(adminId);
    const tokenHashes = await redisClient.sMembers(userSetKey);

    if (tokenHashes.length > 0) {
      const keys = tokenHashes.map((h) => this.tokenKey(h));
      await redisClient.del(keys);
    }

    await redisClient.del(userSetKey);
    return tokenHashes.length;
  }
}

export const adminSessionRepository = new AdminSessionRepository();
