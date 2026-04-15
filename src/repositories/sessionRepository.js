import { redisClient } from "../utils/redisClient.js";

export class SessionRepository {
  tokenKey(tokenHash) {
    return `auth:session:${tokenHash}`;
  }

  userSetKey(userId) {
    return `auth:user-sessions:${userId}`;
  }

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

  async findByTokenHash(tokenHash) {
    const raw = await redisClient.get(this.tokenKey(tokenHash));
    if (!raw) return null;
    return JSON.parse(raw);
  }

  async deleteByTokenHash(tokenHash) {
    const session = await this.findByTokenHash(tokenHash);
    await redisClient.del(this.tokenKey(tokenHash));

    if (session?.user_id) {
      await redisClient.sRem(this.userSetKey(session.user_id), tokenHash);
    }
  }

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
