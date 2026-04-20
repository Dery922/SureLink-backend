import crypto from "crypto";
import { AppError } from "./errors.js";
import { publishEvent } from "./eventBus.js";

/**
 * OTP service.
 *
 * This implementation stores OTP state in the user's server-side session
 * (`req.session.pending_otp`). That means:
 * - OTP verification is tied to the same browser/device session that requested it
 * - OTPs are not globally verifiable across devices unless you change storage
 *
 * For production, integrate SMS/WhatsApp delivery where `issueOtp` is called.
 */
const OTP_TTL_MS = 5 * 60 * 1000;
const OTP_DIGITS = 6;

function hashOtp(otp) {
  return crypto.createHash("sha256").update(otp).digest("hex");
}

function generateOtp() {
  const min = 10 ** (OTP_DIGITS - 1);
  const max = 10 ** OTP_DIGITS - 1;
  return String(Math.floor(Math.random() * (max - min + 1) + min));
}

/**
 * Generate an OTP, store a hashed version in session, and return a response
 * suitable for the API layer.
 *
 * Security notes:
 * - We only store a hash of the OTP.
 * - `otp_preview` is intentionally hidden in production.
 */
export function issueOtp(req, payload) {
  const otp = generateOtp();
  req.session.pending_otp = {
    phone: payload.phone,
    full_name: payload.full_name,
    email: payload.email || null,
    type: payload.type || "customer",
    otp_hash: hashOtp(otp),
    expires_at: Date.now() + OTP_TTL_MS,
    attempts_left: 5,
  };

  const response = {
    phone: payload.phone,
    expires_in_seconds: OTP_TTL_MS / 1000,
  };

  if (process.env.NODE_ENV !== "production") {
    response.otp_preview = otp;
  }

  publishEvent("auth.otp.requested", {
    phone: payload.phone,
    expires_in_seconds: response.expires_in_seconds,
    requested_at: new Date().toISOString(),
  });

  return response;
}

/**
 * Verify an OTP against the session-scoped pending request.
 *
 * On success, clears `pending_otp` and returns a verified payload for the auth
 * service to consume (register/login).
 */
export function verifyOtp(req, { phone, otp }) {
  const pending = req.session.pending_otp;
  if (!pending) {
    throw new AppError("No OTP request found for this session", 400, "AUTH_OTP_NOT_REQUESTED");
  }

  if (pending.phone !== phone) {
    throw new AppError("OTP phone mismatch", 400, "AUTH_OTP_PHONE_MISMATCH");
  }

  if (Date.now() > pending.expires_at) {
    req.session.pending_otp = null;
    throw new AppError("OTP has expired", 400, "AUTH_OTP_EXPIRED");
  }

  if (pending.attempts_left <= 0) {
    req.session.pending_otp = null;
    throw new AppError("Too many failed OTP attempts", 429, "AUTH_OTP_ATTEMPTS_EXCEEDED");
  }

  if (pending.otp_hash !== hashOtp(otp)) {
    pending.attempts_left -= 1;
    throw new AppError("Invalid OTP", 400, "AUTH_OTP_INVALID", {
      attempts_left: pending.attempts_left,
    });
  }

  const verifiedPayload = {
    phone: pending.phone,
    full_name: pending.full_name,
    email: pending.email,
    type: pending.type,
  };

  req.session.pending_otp = null;
  publishEvent("auth.otp.verified", {
    phone: verifiedPayload.phone,
    verified_at: new Date().toISOString(),
  });
  return verifiedPayload;
}
