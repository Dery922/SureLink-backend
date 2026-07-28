import { AppError } from "../utils/errors.js";

const ALLOWED_TYPES = new Set(["customer", "provider", "driver", "business"]);

/**
 * OtpFactory - Handles creation of OTP-related objects
 */
export class OtpFactory {
  /**
   * Create an OTP payload from input
   */
static createOtpPayload({
  phone,
  email,
  type = "customer",
}) {
  if (!phone && !email) {
    throw new AppError(
      "Either phone or email is required",
      400,
      "VALIDATION_ERROR"
    );
  }

  if (!ALLOWED_TYPES.has(type)) {
    throw new AppError("Invalid user type", 400, "VALIDATION_ERROR");
  }

  return {
    phone,
    email: email?.trim()?.toLowerCase() || null,
    type,
  };
}
  /**
   * Create an event payload for OTP requested
   */
  static createOtpRequestedEventPayload({
    phone,
    expiresInSeconds,
  }) {
    return {
      phone,
      expires_in_seconds: expiresInSeconds,
      requested_at: new Date().toISOString(),
    };
  }

  /**
   * Create an event payload for OTP verified
   */
  static createOtpVerifiedEventPayload({
    phone,
  }) {
    return {
      phone,
      verified_at: new Date().toISOString(),
    };
  }

  /**
   * Validate OTP format
   */
  static validateOtpFormat(otp) {
    const otpString = String(otp || "");
    if (!/^\d{6}$/.test(otpString)) {
      throw new AppError("OTP must be a 6-digit code", 400, "VALIDATION_ERROR");
    }
    return otpString;
  }

  /**
   * Get list of allowed user types
   */
  static getAllowedTypes() {
    return Array.from(ALLOWED_TYPES);
  }

  /**
   * Check if user type is allowed
   */
  static isValidType(type) {
    return ALLOWED_TYPES.has(type);
  }
}
