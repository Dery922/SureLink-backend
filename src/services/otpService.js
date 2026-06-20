import crypto from "crypto";
import { AppError } from "../utils/errors.js";
import { publishEvent } from "./eventBus.js";
import Otp from "../models/Otp.js";

import { sendOtpEmail } from "./mailService.js";

const OTP_TTL_MS = 5 * 60 * 1000;
const OTP_DIGITS = 6;

function generateOtp() {
  const min = 10 ** (OTP_DIGITS - 1);
  const max = 10 ** OTP_DIGITS - 1;
  return String(Math.floor(Math.random() * (max - min + 1) + min));
}

function hashOtp(otp) {
  return crypto.createHash("sha256").update(otp).digest("hex");
}

export async function issueOtp(payload) {
  // Combine identifier verification
  const targetIdentifier = payload.email || payload.phone;
  const otp = generateOtp();

  // Clear existing active codes for this identifier
  await Otp.deleteMany({ identifier: targetIdentifier });

  const expiresAt = new Date(Date.now() + OTP_TTL_MS);

  await Otp.create({
    identifier: targetIdentifier,
    codeHash: hashOtp(otp),
    purpose: payload.type === "signup" ? "signup" : "login",
    expiresAt,
    attempts: 5, // Starts at 5 max attempts
  });

  console.log("📧 Sending OTP to:", targetIdentifier);
  if (process.env.NODE_ENV !== "production") {
    console.log("🔐 OTP generated (dev):", otp);
  }

  if (payload.email) {
    await sendOtpEmail({ to: payload.email, otp });
  } else if (payload.phone) {
    // SMS integration service goes here if needed later
  }

  // publishEvent("auth.otp.requested", {
  //   identifier: targetIdentifier,
  //   expiresAt,
  // });

  // Inside your issueOtp service function:
  publishEvent("auth.otp.requested", {
    phone: payload.phone || null,
    email: payload.email || null,
    identifier: payload.email || payload.phone,
    expires_in_seconds: OTP_TTL_MS / 1000,
    expiresInSeconds: OTP_TTL_MS / 1000, // Safe fallback property shape
    requestedAt: new Date().toISOString(),
  });

  return {
    identifier: targetIdentifier,
    expires_in_seconds: OTP_TTL_MS / 1000,
    otp_preview: process.env.NODE_ENV !== "production" ? otp : undefined,
  };
}

export async function verifyOtp({ identifier, otp }) {
  const record = await Otp.findOne({ identifier });

  if (!record) {
    throw new AppError("No OTP request found", 400, "AUTH_OTP_NOT_FOUND");
  }

  // Security Fix 1: Check if too many attempts occurred before checking code match
  if (record.attempts <= 0) {
    await record.deleteOne();
    throw new AppError(
      "Too many failed attempts. Request a new OTP.",
      429,
      "AUTH_OTP_ATTEMPTS_EXCEEDED",
    );
  }

  if (Date.now() > record.expiresAt) {
    await record.deleteOne();
    throw new AppError("OTP expired", 400, "AUTH_OTP_EXPIRED");
  }

  const hashedInput = crypto.createHash("sha256").update(otp).digest("hex");

  if (record.codeHash !== hashedInput) {
    record.attempts -= 1;
    await record.save();

    throw new AppError("Invalid OTP", 400, "AUTH_OTP_INVALID", {
      attempts_left: record.attempts,
    });
  }

  // Clear token immediately upon validation success
  await record.deleteOne();

  return { identifier };
}

// const OTP_TTL_MS = 5 * 60 * 1000;
// const OTP_DIGITS = 6;

// function hashOtp(otp) {
//   return crypto.createHash("sha256").update(otp).digest("hex");
// }

// function generateOtp() {
//   const min = 10 ** (OTP_DIGITS - 1);
//   const max = 10 ** OTP_DIGITS - 1;
//   return String(Math.floor(Math.random() * (max - min + 1) + min));
// }

// export function issueOtp(req, payload) {
//   const otp = generateOtp();
//   req.session.pending_otp = {
//     phone: payload.phone,
//     full_name: payload.full_name,
//     email: payload.email || null,
//     type: payload.type || "customer",
//     otp_hash: hashOtp(otp),
//     expires_at: Date.now() + OTP_TTL_MS,
//     attempts_left: 5,
//   };

//   const response = {
//     phone: payload.phone,
//     expires_in_seconds: OTP_TTL_MS / 1000,
//   };

//   if (process.env.NODE_ENV !== "production") {
//     response.otp_preview = otp;
//   }

//   publishEvent("auth.otp.requested", {
//     phone: payload.phone,
//     expires_in_seconds: response.expires_in_seconds,
//     requested_at: new Date().toISOString(),
//   });

//   return response;
// }

// export function verifyOtp(req, { phone, otp }) {
//   const pending = req.session.pending_otp;
//   if (!pending) {
//     throw new AppError("No OTP request found for this session", 400, "AUTH_OTP_NOT_REQUESTED");
//   }

//   if (pending.phone !== phone) {
//     throw new AppError("OTP phone mismatch", 400, "AUTH_OTP_PHONE_MISMATCH");
//   }

//   if (Date.now() > pending.expires_at) {
//     req.session.pending_otp = null;
//     throw new AppError("OTP has expired", 400, "AUTH_OTP_EXPIRED");
//   }

//   if (pending.attempts_left <= 0) {
//     req.session.pending_otp = null;
//     throw new AppError("Too many failed OTP attempts", 429, "AUTH_OTP_ATTEMPTS_EXCEEDED");
//   }

//   if (pending.otp_hash !== hashOtp(otp)) {
//     pending.attempts_left -= 1;
//     throw new AppError("Invalid OTP", 400, "AUTH_OTP_INVALID", {
//       attempts_left: pending.attempts_left,
//     });
//   }

//   const verifiedPayload = {
//     phone: pending.phone,
//     full_name: pending.full_name,
//     email: pending.email,
//     type: pending.type,
//   };

//   req.session.pending_otp = null;
//   publishEvent("auth.otp.verified", {
//     phone: verifiedPayload.phone,
//     verified_at: new Date().toISOString(),
//   });
//   return verifiedPayload;
// }
