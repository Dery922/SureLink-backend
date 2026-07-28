import bcrypt from "bcryptjs";
import { randomInt, createHash } from "crypto";
import { AppError } from "../../services/errors.js";
import { publishEvent } from "../../services/eventBus.js";
import { adminRepository } from "../repositories/adminRepository.js";
import { adminSessionRepository } from "../repositories/adminSessionRepository.js";
import { AdminFactory } from "./adminFactory.js";

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;

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

function hashOtp(code) {
  return createHash("sha256").update(String(code)).digest("hex");
}

/**
 * Generate a 6-digit OTP, store it in Redis, and return the pending token
 * the client must present when calling /verify-otp.
 *
 * If the admin already has a pending OTP in flight it is overwritten —
 * this prevents a denial-of-service where an attacker keeps triggering a
 * pending to block the legitimate admin from completing login.
 */
async function createOtpFlow(adminId) {
  // Overwrite any existing pending for this admin
  const existingHash = await adminSessionRepository.findExistingPending(
    String(adminId),
  );
  if (existingHash) {
    await adminSessionRepository.deleteOtpPending(
      existingHash,
      String(adminId),
    );
  }

  const otpCode = String(randomInt(100000, 1000000));
  console.log("This is the real otp", otpCode);
  const otpHash = hashOtp(otpCode);

  const pendingToken = AdminFactory.generateToken();
  const pendingTokenHash = AdminFactory.hashToken(pendingToken);

  await adminSessionRepository.createOtpPending({
    adminId: String(adminId),
    pendingTokenHash,
    otpHash,
  });

  // In production, send OTP via email/SMS here.
  // For development the code is returned in the response as dev_otp.
  if (process.env.NODE_ENV === "development") {
    console.log(`[AdminOTP] Code for admin ${adminId}: ${otpCode}`);
  }

  return { pendingToken, otpCode };
}

// ────────────────────────────────────────────────────────────
// Public service functions
// ────────────────────────────────────────────────────────────

/**
 * Step 1 — validate email + password.
 *
 * On success: generates OTP, returns { requires_otp, pending_token }.
 * The real session is NOT created here — only after OTP verification.
 */
export async function loginAdmin({ email, password, ip, user_agent }) {
  if (!email || !password) {
    throw new AppError(
      "Email and password are required",
      400,
      "VALIDATION_ERROR",
    );
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

  // Password correct — generate OTP (do NOT record successful login yet)
  const { pendingToken, otpCode } = await createOtpFlow(admin._id);

  publishEvent("admin.auth.otp.sent", {
    admin_id: String(admin._id),
    email: admin.email,
  });

  return {
    requires_otp: true,
    pending_token: pendingToken,
    ...(process.env.NODE_ENV === "development" && { dev_otp: otpCode }),
  };
}

/**
 * Step 2 — verify OTP code.
 *
 * On success: deletes pending state, records login, creates full session.
 * Returns { admin, session }.
 */
export async function verifyAdminOtp({ pending_token, otp, ip, user_agent }) {
  const cleanToken = AdminFactory.ensureSessionTokenShape(pending_token);
  const pendingTokenHash = AdminFactory.hashToken(cleanToken);

  const pending = await adminSessionRepository.findOtpPending(pendingTokenHash);

  if (!pending) {
    throw new AppError(
      "OTP session expired or invalid. Please log in again.",
      401,
      "ADMIN_AUTH_OTP_EXPIRED",
    );
  }

  // Check attempt limit before comparing (prevent timing oracle on attempt count)
  if (pending.attempts >= OTP_MAX_ATTEMPTS) {
    await adminSessionRepository.deleteOtpPending(
      pendingTokenHash,
      pending.admin_id,
    );
    throw new AppError(
      "Too many incorrect attempts. Please log in again.",
      429,
      "ADMIN_AUTH_OTP_ATTEMPTS_EXCEEDED",
    );
  }

  const submittedHash = hashOtp(otp);

  if (submittedHash !== pending.otp_hash) {
    pending.attempts += 1;
    await adminSessionRepository.updateOtpAttempts(pendingTokenHash, pending);

    if (pending.attempts >= OTP_MAX_ATTEMPTS) {
      await adminSessionRepository.deleteOtpPending(
        pendingTokenHash,
        pending.admin_id,
      );
      throw new AppError(
        "Too many incorrect attempts. Please log in again.",
        429,
        "ADMIN_AUTH_OTP_ATTEMPTS_EXCEEDED",
      );
    }

    const remaining = OTP_MAX_ATTEMPTS - pending.attempts;
    throw new AppError(
      `Incorrect code. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.`,
      401,
      "ADMIN_AUTH_OTP_INVALID",
    );
  }

  // OTP correct — delete pending state before creating session (prevent replay)
  await adminSessionRepository.deleteOtpPending(
    pendingTokenHash,
    pending.admin_id,
  );

  const admin = await adminRepository.findById(pending.admin_id);
  if (!admin || admin.status !== "active") {
    throw new AppError(
      "Admin account not found or inactive",
      401,
      "ADMIN_AUTH_SESSION_INVALID",
    );
  }

  // Record successful login now that both factors are verified
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
 * Resend OTP — generates a fresh code and returns a new pending_token.
 * The old pending_token is invalidated immediately.
 */
export async function resendAdminOtp({ pending_token }) {
  const cleanToken = AdminFactory.ensureSessionTokenShape(pending_token);
  const pendingTokenHash = AdminFactory.hashToken(cleanToken);

  const pending = await adminSessionRepository.findOtpPending(pendingTokenHash);

  if (!pending) {
    throw new AppError(
      "OTP session expired or invalid. Please log in again.",
      401,
      "ADMIN_AUTH_OTP_EXPIRED",
    );
  }

  // Delete the old pending before creating a new one
  await adminSessionRepository.deleteOtpPending(
    pendingTokenHash,
    pending.admin_id,
  );

  const admin = await adminRepository.findById(pending.admin_id);
  if (!admin || admin.status !== "active") {
    throw new AppError(
      "Admin account not found or inactive",
      401,
      "ADMIN_AUTH_SESSION_INVALID",
    );
  }

  const { pendingToken, otpCode } = await createOtpFlow(admin._id);

  publishEvent("admin.auth.otp.sent", {
    admin_id: String(admin._id),
    email: admin.email,
    resent: true,
  });

  return {
    requires_otp: true,
    pending_token: pendingToken,
    ...(process.env.NODE_ENV === "development" && { dev_otp: otpCode }),
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
    throw new AppError(
      "Session not found or expired",
      401,
      "ADMIN_AUTH_SESSION_INVALID",
    );
  }

  const admin = await adminRepository.findById(session.admin_id);

  if (!admin || admin.status !== "active") {
    throw new AppError(
      "Admin account not found or inactive",
      401,
      "ADMIN_AUTH_SESSION_INVALID",
    );
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
    throw new AppError(
      "Session not found or expired",
      401,
      "ADMIN_AUTH_SESSION_INVALID",
    );
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
