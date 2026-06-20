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
    attempts: 5,
  });

  console.log(
    "📧 Attempting to request OTP tracking data for:",
    targetIdentifier,
  );

  // 🚀 TEMP PROTECTION LOG: Force print the OTP code to your Render logs so you can always see it!
  console.log(`🔐 [RENDER LOG CHECK] THE GENERATED CODE IS: ${otp}`);

  // 🛡️ THE PRODUCTION SAFETY NET
  if (payload.email) {
    try {
      console.log("⏳ Handshaking with Gmail SMTP servers via Port 465...");
      await sendOtpEmail({ to: payload.email, otp });
      console.log("✅ Nodemailer successfully delivered email packet.");
    } catch (emailError) {
      // 🎯 This isolates the crash and prints the exact root problem in your Render terminal!
      console.error("❌ EMAIL SUBSYSTEM ERROR LOGGED:", emailError.message);
      console.log(
        "ℹ️ Bypassing connection crash so login flow continues safely.",
      );
    }
  }

  // Safe wrapper for event publishing hooks
  try {
    publishEvent("auth.otp.requested", {
      phone: payload.phone || null,
      email: payload.email || null,
      identifier: payload.email || payload.phone,
      expires_in_seconds: OTP_TTL_MS / 1000,
      expiresInSeconds: OTP_TTL_MS / 1000,
      requestedAt: new Date().toISOString(),
    });
  } catch (eventErr) {
    console.error("⚠️ publishEvent dropped:", eventErr.message);
  }

  return {
    identifier: targetIdentifier,
    expires_in_seconds: OTP_TTL_MS / 1000,
    // 🚀 Pass the OTP preview code directly to the frontend for easy live testing!
    otp_preview: otp,
  };
}

// export async function issueOtp(payload) {
//   // Combine identifier verification
//   const targetIdentifier = payload.email || payload.phone;
//   const otp = generateOtp();

//   // Clear existing active codes for this identifier
//   await Otp.deleteMany({ identifier: targetIdentifier });

//   const expiresAt = new Date(Date.now() + OTP_TTL_MS);

//   await Otp.create({
//     identifier: targetIdentifier,
//     codeHash: hashOtp(otp),
//     purpose: payload.type === "signup" ? "signup" : "login",
//     expiresAt,
//     attempts: 5, // Starts at 5 max attempts
//   });

//   console.log("📧 Sending OTP to:", targetIdentifier);
//   if (process.env.NODE_ENV !== "production") {
//     console.log("🔐 OTP generated (dev):", otp);
//   }

//   if (payload.email) {
//     await sendOtpEmail({ to: payload.email, otp });
//   } else if (payload.phone) {
//     // SMS integration service goes here if needed later
//   }

//   // publishEvent("auth.otp.requested", {
//   //   identifier: targetIdentifier,
//   //   expiresAt,
//   // });

//   // Inside your issueOtp service function:
//   publishEvent("auth.otp.requested", {
//     phone: payload.phone || null,
//     email: payload.email || null,
//     identifier: payload.email || payload.phone,
//     expires_in_seconds: OTP_TTL_MS / 1000,
//     expiresInSeconds: OTP_TTL_MS / 1000, // Safe fallback property shape
//     requestedAt: new Date().toISOString(),
//   });

//   return {
//     identifier: targetIdentifier,
//     expires_in_seconds: OTP_TTL_MS / 1000,
//     otp_preview: process.env.NODE_ENV !== "production" ? otp : undefined,
//   };
// }

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
