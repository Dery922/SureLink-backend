import crypto from "crypto";
import { AppError } from "../../services/errors.js";

const ADMIN_SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours (shorter than user sessions)

/**
 * AdminFactory.
 *
 * Mirrors the existing SessionFactory and UserFactory pattern.
 * Centralizes all object-creation logic for the admin module so controllers and
 * services never construct payloads manually.
 */
export class AdminFactory {
  // ────────────────────────────────────────────────────────────
  // Session
  // ────────────────────────────────────────────────────────────

  /**
   * Generate a cryptographically secure 64-char hex token.
   * Matches the shape used by the user SessionFactory.
   */
  static generateToken() {
    return crypto.randomBytes(32).toString("hex");
  }

  /**
   * Hash a token with SHA-256 before storing it in the session store.
   * Only the hash ever touches the database — raw tokens stay in memory.
   */
  static hashToken(token) {
    if (!token) {
      throw new AppError("Token cannot be empty", 400, "ADMIN_FACTORY_ERROR");
    }
    return crypto.createHash("sha256").update(token).digest("hex");
  }

  /**
   * Validate and normalize an admin session token shape.
   */
  static ensureSessionTokenShape(sessionToken) {
    const clean = String(sessionToken || "").trim();
    if (!/^[a-f0-9]{64}$/i.test(clean)) {
      throw new AppError(
        "Invalid session token format",
        400,
        "ADMIN_AUTH_INVALID_SESSION_TOKEN",
      );
    }
    return clean.toLowerCase();
  }

  /**
   * Build the full session payload for persistence.
   */
  static createSessionPayload({ adminId, role, ip, userAgent }) {
    if (!adminId || !role) {
      throw new AppError(
        "Admin ID and role are required",
        400,
        "ADMIN_FACTORY_ERROR",
      );
    }

    const token = this.generateToken();
    const tokenHash = this.hashToken(token);
    const expiresAt = new Date(Date.now() + ADMIN_SESSION_TTL_MS);

    return {
      token,
      payload: {
        admin_id: String(adminId),
        token_hash: tokenHash,
        role,
        ip: ip || null,
        user_agent: userAgent || null,
        expires_at: expiresAt,
      },
      expiresAt,
    };
  }

  static createSessionResponse({ token, expiresAt }) {
    return { token, expires_at: expiresAt };
  }

  // ────────────────────────────────────────────────────────────
  // Admin account
  // ────────────────────────────────────────────────────────────

  /**
   * Build an admin creation payload.
   *
   * `password_hash` must already be computed by the caller (bcrypt) — this
   * factory does not hash passwords to keep hashing isolated in the service.
   */
  static createAdminPayload({ email, passwordHash, name, role }) {
    if (!email || !passwordHash || !name || !role) {
      throw new AppError(
        "email, passwordHash, name, and role are required",
        400,
        "ADMIN_FACTORY_ERROR",
      );
    }

    return {
      email: email.toLowerCase().trim(),
      password_hash: passwordHash,
      name: {
        full: name.trim(),
        display: name.trim().split(" ")[0],
      },
      role,
      status: "active",
    };
  }

  /**
   * Shape a safe admin object for API responses.
   * Never includes password_hash.
   */
  static createPublicAdmin(admin) {
    if (!admin || !admin._id) {
      throw new AppError("Invalid admin object", 500, "ADMIN_FACTORY_ERROR");
    }

    return {
      id: admin._id,
      email: admin.email,
      name: admin.name,
      role: admin.role,
      status: admin.status,
      last_login_at: admin.last_login_at,
      locked_until: admin.locked_until || null,
    };
  }
}
