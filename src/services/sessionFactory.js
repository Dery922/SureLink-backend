import crypto from "crypto";
import { AppError } from "./errors.js";

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * SessionFactory - Handles creation of session-related objects
 */
export class SessionFactory {
  /**
   * Generate a cryptographically secure token
   */
  static generateToken() {
    return crypto.randomBytes(32).toString("hex");
  }

  /**
   * Hash a token using SHA-256
   */
  static hashToken(token) {
    if (!token) {
      throw new AppError("Token cannot be empty", 400, "SESSION_FACTORY_ERROR");
    }
    return crypto.createHash("sha256").update(token).digest("hex");
  }

  /**
   * Validate and normalize session token format
   */
  static ensureSessionTokenShape(sessionToken) {
    const clean = String(sessionToken || "").trim();
    if (!/^[a-f0-9]{64}$/i.test(clean)) {
      throw new AppError("Invalid session token format", 400, "AUTH_INVALID_SESSION_TOKEN");
    }
    return clean.toLowerCase();
  }

  /**
   * Create a session payload for database insertion
   */
  static createSessionPayload({ userId, ip, userAgent }) {
    if (!userId) {
      throw new AppError("User ID is required", 400, "SESSION_FACTORY_ERROR");
    }

    const token = this.generateToken();
    const tokenHash = this.hashToken(token);
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

    return {
      token,
      payload: {
        user_id: String(userId),
        token_hash: tokenHash,
        expires_at: expiresAt,
        ip,
        user_agent: userAgent,
      },
      expiresAt,
    };
  }

  /**
   * Create a session response object
   */
  static createSessionResponse({ token, expiresAt }) {
    return {
      token,
      expires_at: expiresAt,
    };
  }

  /**
   * Create an event payload for session creation
   */
  static createSessionEventPayload({ userId, expiresAt }) {
    return {
      user_id: String(userId),
      expires_at: expiresAt.toISOString(),
      created_at: new Date().toISOString(),
    };
  }

  /**
   * Validate session TTL
   */
  static validateSessionTTL(expiresAt) {
    if (!(expiresAt instanceof Date)) {
      throw new AppError("Invalid expiration date", 400, "SESSION_FACTORY_ERROR");
    }
    if (expiresAt <= new Date()) {
      throw new AppError("Session already expired", 400, "SESSION_FACTORY_ERROR");
    }
    return true;
  }
}
