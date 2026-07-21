import bcrypt from "bcryptjs";
import { AppError } from "../../services/errors.js";
import { publishEvent } from "../../services/eventBus.js";
import { adminRepository } from "../repositories/adminRepository.js";
import { adminSessionRepository } from "../repositories/adminSessionRepository.js";
import { AdminFactory } from "./adminFactory.js";

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000;

// ────────────────────────────────────────────────────────────
// Internal helpers
// ────────────────────────────────────────────────────────────

async function createAdminSession({ adminId, role, ip, user_agent }) {
  const sessionPayload = AdminFactory.createSessionPayload({
    adminId,
    role,
    ip,
    userAgent: user_agent,
  });

  await adminSessionRepository.create(sessionPayload.payload);

  publishEvent("admin.auth.session.created", {
    admin_id: String(adminId),
    role,
    expires_at: sessionPayload.expiresAt.toISOString(),
    created_at: new Date().toISOString(),
  });

  return AdminFactory.createSessionResponse({
    token: sessionPayload.token,
    expiresAt: sessionPayload.expiresAt,
  });
}

// ────────────────────────────────────────────────────────────
// Public service functions
// ────────────────────────────────────────────────────────────

/**
 * Validate email + password and, on success, create a session.
 *
 * Returns { admin, session }. Login is a single step — there is no OTP.
 */
export async function loginAdmin({ email, password, ip, user_agent }) {
  if (!email || !password) {
    throw new AppError("Email and password are required", 400, "VALIDATION_ERROR");
  }

  const admin = await adminRepository.findByEmailWithPassword(email);

  const GENERIC_AUTH_ERROR = new AppError(
    "Invalid email or password",
    401,
    "ADMIN_AUTH_INVALID_CREDENTIALS",
  );

  if (!admin) throw GENERIC_AUTH_ERROR;

  if (admin.status !== "active") {
    throw new AppError(
      "Account is not active. Contact a Super Admin.",
      403,
      "ADMIN_AUTH_ACCOUNT_INACTIVE",
    );
  }

  if (admin.locked_until && admin.locked_until > new Date()) {
    const remaining = Math.ceil((admin.locked_until - Date.now()) / 1000 / 60);
    throw new AppError(
      `Account is temporarily locked. Try again in ${remaining} minute(s).`,
      403,
      "ADMIN_AUTH_ACCOUNT_LOCKED",
    );
  }

  const passwordValid = await bcrypt.compare(password, admin.password_hash);

  if (!passwordValid) {
    const updated = await adminRepository.incrementFailedLogins(admin._id);

    if (updated.failed_login_attempts >= MAX_FAILED_ATTEMPTS) {
      await adminRepository.updateById(admin._id, {
        locked_until: new Date(Date.now() + LOCK_DURATION_MS),
      });
      publishEvent("admin.auth.account.locked", {
        admin_id: String(admin._id),
        email: admin.email,
        locked_at: new Date().toISOString(),
      });
    }

    throw GENERIC_AUTH_ERROR;
  }

  // Password correct — record login and issue a session.
  await adminRepository.recordSuccessfulLogin(admin._id, { ip });

  const session = await createAdminSession({
    adminId: admin._id,
    role: admin.role,
    ip,
    user_agent,
  });

  publishEvent("admin.auth.login", {
    admin_id: String(admin._id),
    email: admin.email,
    role: admin.role,
    ip,
    logged_in_at: new Date().toISOString(),
  });

  return {
    admin: AdminFactory.createPublicAdmin(admin),
    session,
  };
}

/**
 * Resolve the current admin from a session token (used by /me + authenticateAdmin).
 */
export async function getAdminFromSession(sessionToken) {
  const token = AdminFactory.ensureSessionTokenShape(sessionToken);
  const tokenHash = AdminFactory.hashToken(token);
  const session = await adminSessionRepository.findByTokenHash(tokenHash);

  if (!session) {
    throw new AppError("Session not found or expired", 401, "ADMIN_AUTH_SESSION_INVALID");
  }

  const admin = await adminRepository.findById(session.admin_id);

  if (!admin || admin.status !== "active") {
    throw new AppError("Admin account not found or inactive", 401, "ADMIN_AUTH_SESSION_INVALID");
  }

  return { admin, session };
}

/**
 * Rotate an admin session token (refresh).
 */
export async function refreshAdminSession({ session_token, ip, user_agent }) {
  const token = AdminFactory.ensureSessionTokenShape(session_token);
  const tokenHash = AdminFactory.hashToken(token);
  const activeSession = await adminSessionRepository.findByTokenHash(tokenHash);

  if (!activeSession) {
    throw new AppError("Session not found or expired", 401, "ADMIN_AUTH_SESSION_INVALID");
  }

  await adminSessionRepository.deleteByTokenHash(tokenHash);

  const session = await createAdminSession({
    adminId: activeSession.admin_id,
    role: activeSession.role,
    ip,
    user_agent,
  });

  return { message: "Session refreshed successfully", session };
}

/**
 * Revoke a single admin session.
 */
export async function logoutAdmin({ session_token }) {
  const token = AdminFactory.ensureSessionTokenShape(session_token);
  const tokenHash = AdminFactory.hashToken(token);
  const activeSession = await adminSessionRepository.findByTokenHash(tokenHash);

  if (!activeSession) {
    return { message: "Session already invalidated" };
  }

  await adminSessionRepository.deleteByTokenHash(tokenHash);

  publishEvent("admin.auth.logout", {
    admin_id: activeSession.admin_id,
    logged_out_at: new Date().toISOString(),
  });

  return { message: "Logout successful" };
}
