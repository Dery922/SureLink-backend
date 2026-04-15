import { AppError } from "../utils/errors.js";
import { isValidGhanaPhone, normalizeGhanaPhone } from "../utils/phone.js";
import { sessionRepository } from "../repositories/sessionRepository.js";
import { userRepository } from "../repositories/userRepository.js";
import { publishEvent } from "./eventBus.js";
import { UserFactory } from "../factories/userFactory.js";
import { SessionFactory } from "../factories/sessionFactory.js";
import { OtpFactory } from "../factories/otpFactory.js";


async function createSessionForUser({ userId, ip, user_agent }) {
  const sessionPayload = SessionFactory.createSessionPayload({
    userId,
    ip,
    userAgent: user_agent,
  });

  await sessionRepository.create(sessionPayload.payload);

  publishEvent("auth.session.created",
    SessionFactory.createSessionEventPayload({
      userId,
      expiresAt: sessionPayload.expiresAt,
    })
  );

  return SessionFactory.createSessionResponse({
    token: sessionPayload.token,
    expiresAt: sessionPayload.expiresAt,
  });
}

export async function prepareOtpPayload(input) {
  const phone = normalizeGhanaPhone(input.phone);
  validateNormalizedPhone(phone);

  const fullName = String(input.full_name || input.fullName).trim();

  return OtpFactory.createOtpPayload({
    phone,
    fullName,
    email: input.email,
    type: input.type,
  });
}

export function validateNormalizedPhone(phone) {
  if (!isValidGhanaPhone(phone)) {
    throw new AppError("Unsupported phone network for Ghana", 400, "AUTH_INVALID_PHONE");
  }
}

export function normalizeAndValidatePhone(phoneInput) {
  const phone = normalizeGhanaPhone(phoneInput);
  validateNormalizedPhone(phone);
  return phone;
}

export async function registerOrLoginUser(payload) {
  let user = await userRepository.findByPhone(payload.phone);
  let userState = "existing";

  if (!user) {
    const userPayload = UserFactory.createUserPayload({
      phone: payload.phone,
      email: payload.email,
      type: payload.type,
      fullName: payload.full_name,
    });

    user = await userRepository.create(userPayload);
    userState = "created";

    publishEvent("auth.user.created", {
      user_id: user._id.toString(),
      phone: user.phone,
      created_at: new Date().toISOString(),
    });
  }

  await userRepository.updateLastLogin(user._id);

  const session = await createSessionForUser({
    userId: user._id.toString(),
    ip: payload.ip,
    user_agent: payload.user_agent,
  });

  return {
    user_state: userState,
    user: UserFactory.createPublicUser(user),
    session,
  };
}

export async function refreshUserSession(payload) {
  const sessionToken = SessionFactory.ensureSessionTokenShape(payload.session_token);
  const tokenHash = SessionFactory.hashToken(sessionToken);
  const activeSession = await sessionRepository.findByTokenHash(tokenHash);

  if (!activeSession) {
    throw new AppError("Session not found or expired", 401, "AUTH_SESSION_INVALID");
  }

  await sessionRepository.deleteByTokenHash(tokenHash);
  const session = await createSessionForUser({
    userId: activeSession.user_id,
    ip: payload.ip,
    user_agent: payload.user_agent,
  });

  return {
    message: "Session refreshed successfully",
    session,
  };
}

export async function logoutSession(payload) {
  const sessionToken = SessionFactory.ensureSessionTokenShape(payload.session_token);
  const tokenHash = SessionFactory.hashToken(sessionToken);
  const activeSession = await sessionRepository.findByTokenHash(tokenHash);

  if (!activeSession) {
    return { message: "Session already invalidated" };
  }

  await sessionRepository.deleteByTokenHash(tokenHash);
  return { message: "Logout successful" };
}

export async function logoutAllSessions(payload) {
  const sessionToken = SessionFactory.ensureSessionTokenShape(payload.session_token);
  const tokenHash = SessionFactory.hashToken(sessionToken);
  const activeSession = await sessionRepository.findByTokenHash(tokenHash);

  if (!activeSession) {
    throw new AppError("Session not found or expired", 401, "AUTH_SESSION_INVALID");
  }

  const revokedCount = await sessionRepository.deleteByUserId(activeSession.user_id);
  return {
    message: "All sessions logged out successfully",
    revoked_sessions: revokedCount,
  };
}
