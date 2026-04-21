import { redisClient } from "../utils/redisClient.js";

/**
 * SessionRepository (Redis).
 *
 * Storage strategy:
 * - A session is stored as `auth:session:<token_hash>` -> JSON payload (TTL set).
 * - For "logout all", we also maintain a per-user set:
 *   `auth:user-sessions:<userId>` -> set of token_hash values.
 *
 * `token_hash` is used instead of raw token so Redis never stores bearer tokens.
 */
export class SessionRepository {
  tokenKey(tokenHash) {
    return `auth:session:${tokenHash}`;
  }

  userSetKey(userId) {
    return `auth:user-sessions:${userId}`;
  }

  /**
   * Persist a session with a TTL derived from `expires_at`.
   *
   * Note: we clamp TTL to at least 1 second to avoid Redis rejecting EX=0.
   */
  async create(payload) {
    const tokenKey = this.tokenKey(payload.token_hash);
    const userSetKey = this.userSetKey(payload.user_id);
    const ttlSeconds = Math.max(
      1,
      Math.floor((new Date(payload.expires_at).getTime() - Date.now()) / 1000),
    );

    await redisClient.set(
      tokenKey,
      JSON.stringify({
        user_id: payload.user_id,
        token_hash: payload.token_hash,
        ip: payload.ip || null,
        user_agent: payload.user_agent || null,
        expires_at: new Date(payload.expires_at).toISOString(),
        created_at: new Date().toISOString(),
      }),
      {
        EX: ttlSeconds,
      },
    );

    await redisClient.sAdd(userSetKey, payload.token_hash);
    await redisClient.expire(userSetKey, ttlSeconds);

    return { token_hash: payload.token_hash, expires_at: payload.expires_at };
  }

  /**
   * Lookup an active session by token hash.
   *
   * Returns the stored JSON payload or null if missing/expired.
   */
  async findByTokenHash(tokenHash) {
    const raw = await redisClient.get(this.tokenKey(tokenHash));
    if (!raw) return null;
    return JSON.parse(raw);
  }

  /**
   * Delete a session key and remove it from the per-user set (best effort).
   */
  async deleteByTokenHash(tokenHash) {
    const session = await this.findByTokenHash(tokenHash);
    await redisClient.del(this.tokenKey(tokenHash));

    if (session?.user_id) {
      await redisClient.sRem(this.userSetKey(session.user_id), tokenHash);
    }
  }

  /**
   * Delete all sessions for a user.
   *
   * Returns the number of revoked sessions.
   */
  async deleteByUserId(userId) {
    const userSetKey = this.userSetKey(userId);
    const tokenHashes = await redisClient.sMembers(userSetKey);

    if (tokenHashes.length > 0) {
      const keys = tokenHashes.map((tokenHash) => this.tokenKey(tokenHash));
      await redisClient.del(keys);
    }

    await redisClient.del(userSetKey);
    return tokenHashes.length;
  }
}

export const sessionRepository = new SessionRepository();
