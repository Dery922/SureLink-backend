import { AppError } from "../utils/errors.js";
import { isValidGhanaPhone, normalizeGhanaPhone } from "../utils/phone.js";
import { sessionRepository } from "../repositories/sessionRepository.js";
import { userRepository } from "../repositories/userRepository.js";
import { publishEvent } from "./eventBus.js";
import { UserFactory } from "../factories/userFactory.js";
import { SessionFactory } from "../factories/sessionFactory.js";
import { OtpFactory } from "../factories/otpFactory.js";


import jwt from "jsonwebtoken";

// Ensure the curly braces { userId } are present in the arguments list!
export async function createSessionForUser({ userId }) {
  // 🚨 Add this fallback safeguard!
  const secretKey = process.env.JWT_SECRET || "fallback_temporary_local_secret_key";
  
  if (!process.env.JWT_SECRET) {
    console.warn("⚠️ WARNING: process.env.JWT_SECRET is not defined in your environment variables! Using fallback secret.");
  }

  const token = jwt.sign(
    {
      id: String(userId), 
    },
    secretKey, // Use the safeguarded key variable
    {
      expiresIn: "7d",
    }
  );

  return {
    token,
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  };
}




export async function prepareOtpPayload(input) {
  const identifier = input.identifier;

  if (!identifier) {
    throw new AppError("Identifier is required", 400, "VALIDATION_ERROR");
  }

  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier);
  const isPhone = /^(\+?233|0)\d{9}$/.test(identifier);

  let phone = null;
  let email = null;

  if (isPhone) {
    phone = normalizeGhanaPhone(identifier);
  } else if (isEmail) {
    email = identifier.toLowerCase();
  } else {
    throw new AppError("Invalid identifier", 400, "AUTH_INVALID_IDENTIFIER");
  }

  return OtpFactory.createOtpPayload({
    phone,
    email,
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
  let user = null;
  let userState = "existing";
  
  if (payload.phone) {
    user = await userRepository.findByPhone(payload.phone);
  } else if (payload.email) {
    user = await userRepository.findByEmail(payload.email.trim().toLowerCase()); 
  }

  if (!user) {
    userState = "created"; 

    const userPayload = UserFactory.createUserPayload({
      phone: payload.phone,
      email: payload.email,
      type: payload.type || "customer",
    });

    user = await userRepository.create(userPayload);

    // FIX: Extract the ID safely using a fallback chain
    const safeId = user._id || user.id || user.userId;

    publishEvent("auth.user.created", {
      user_id: safeId.toString(),
      phone: user.phone || null,
      email: user.email || null,
      created_at: new Date().toISOString(),
    });
  }

  // FIX: Extract the ID safely here as well
  const finalUserId = user._id || user.id || user.userId;

  if (!finalUserId) {
    console.error("🚨 DATABASE ERROR: Could not find any valid ID property on the user object:", user);
    throw new Error("Authentication failed: User record is missing an identifier.");
  }

  // Keep audit records updated
  await userRepository.updateLastLogin(finalUserId);

  // Issue standard system access token session details
  const session = await createSessionForUser({
    userId: finalUserId.toString(), // 🔑 This will now be the real hex ID string!
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
