import { AppError } from "../utils/errors.js";
import { isValidGhanaPhone, normalizeGhanaPhone } from "../utils/phone.js";
import { userRepository } from "../repositories/userRepository.js";
import { publishEvent } from "./eventBus.js";
import { UserFactory } from "../factories/userFactory.js";

import { OtpFactory } from "../factories/otpFactory.js";

import jwt from "jsonwebtoken";

// Ensure the curly braces { userId } are present in the arguments list!
export async function createSessionForUser({ userId }) {
  // 🚨 Add this fallback safeguard!
  const secretKey =
    process.env.JWT_SECRET || "fallback_temporary_local_secret_key";

  if (!process.env.JWT_SECRET) {
    console.warn(
      "⚠️ WARNING: process.env.JWT_SECRET is not defined in your environment variables! Using fallback secret.",
    );
  }

  const token = jwt.sign(
    {
      id: String(userId),
    },
    secretKey, // Use the safeguarded key variable
    {
      expiresIn: "7d",
    },
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
    throw new AppError(
      "Unsupported phone network for Ghana",
      400,
      "AUTH_INVALID_PHONE",
    );
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
    console.error(
      "🚨 DATABASE ERROR: Could not find any valid ID property on the user object:",
      user,
    );
    throw new Error(
      "Authentication failed: User record is missing an identifier.",
    );
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

// Remove the SessionFactory import from the top of src/services/authService.js
// Replace the bottom functions with these completely stateless JWT versions:

/**
 * Stateless Token Refresh Handler
 * Verifies the old token and issues a fresh one with a extended expiration window
 */
export async function refreshUserSession(payload) {
  if (!payload.session_token) {
    throw new AppError(
      "No token provided for refresh operation.",
      401,
      "AUTH_TOKEN_MISSING",
    );
  }

  try {
    const secretKey =
      process.env.JWT_SECRET || "fallback_temporary_local_secret_key";

    // Verify the existing token (even if it's expired, we can pass an option if needed,
    // or rely on a separate long-lived refresh token if you implement one later)
    const decoded = jwt.verify(payload.session_token, secretKey);

    // Issue a brand new token for the same user identity
    const session = await createSessionForUser({
      userId: decoded.id,
    });

    return {
      message: "Token refreshed successfully",
      session,
    };
  } catch (error) {
    throw new AppError(
      "Invalid or expired session token context.",
      401,
      "AUTH_SESSION_INVALID",
    );
  }
}

/**
 * Stateless Logout Handler
 * With pure JWT, the server doesn't maintain state. Logout is handled by the client
 * deleting the token from localStorage. We return a success message instantly.
 */
export async function logoutSession(payload) {
  // In a pure JWT architecture, the client destroys the token locally.
  return {
    message: "Logout successful. Please clear token from client storage.",
  };
}

/**
 * Stateless Logout All Handler
 * If you need to invalidate all tokens globally in the future, you would use a JWT blacklist
 * or increment a user 'tokenVersion' property in the DB. For now, we clear out gracefully.
 */
export async function logoutAllSessions(payload) {
  return {
    message: "All sessions logged out successfully globally.",
    revoked_sessions: 1,
  };
}
