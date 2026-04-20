import { AppError } from "./errors.js";

/**
 * Ghana phone normalization/validation utilities.
 *
 * Normalization output:
 * - Returns digits-only string in the `233XXXXXXXXX` form (no leading `+`).
 *
 * Validation:
 * - `isValidGhanaPhone` checks supported mobile network prefixes via regex.
 */
const GHANA_MOBILE_REGEX = /^233(20|23|24|25|26|27|28|50|53|54|55|56|57|59)\d{7}$/;

/**
 * Normalize a phone input into `233XXXXXXXXX`.
 *
 * Accepts:
 * - Local `0XXXXXXXXX`
 * - Already-normalized `233XXXXXXXXX`
 *
 * Throws on unsupported shapes to keep callers honest.
 */
export function normalizeGhanaPhone(phoneInput) {
  const digitsOnly = String(phoneInput || "").replace(/\D/g, "");

  if (digitsOnly.length === 10 && digitsOnly.startsWith("0")) {
    return `233${digitsOnly.slice(1)}`;
  }

  if (digitsOnly.length === 12 && digitsOnly.startsWith("233")) {
    return digitsOnly;
  }

  throw new AppError(
    "Invalid phone number format. Use a valid Ghana number.",
    400,
    "AUTH_INVALID_PHONE",
  );
}

/**
 * Validate that the normalized phone matches supported Ghana mobile prefixes.
 */
export function isValidGhanaPhone(normalizedPhone) {
  return GHANA_MOBILE_REGEX.test(normalizedPhone);
}
