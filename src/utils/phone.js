import { AppError } from "./errors.js";

const GHANA_MOBILE_REGEX =
  /^233(20|23|24|25|26|27|28|50|53|54|55|56|57|59)\d{7}$/;

export function normalizeGhanaPhone(phoneInput) {
  if (!phoneInput) {
    throw new AppError(
      "Phone number is required",
      400,
      "AUTH_INVALID_PHONE"
    );
  }

  // remove spaces, dashes etc
  let digits = String(phoneInput).trim().replace(/\D/g, "");

  // case 1: 0XXXXXXXXX
  if (digits.length === 10 && digits.startsWith("0")) {
    digits = "233" + digits.slice(1);
  }

  // case 2: 233XXXXXXXXX
  else if (digits.length === 12 && digits.startsWith("233")) {
    // already ok
  }

  // case 3: invalid format
  else {
    throw new AppError(
      "Invalid Ghana phone format. Use 0XXXXXXXXX or +233XXXXXXXXX",
      400,
      "AUTH_INVALID_PHONE"
    );
  }

  // FINAL VALIDATION (IMPORTANT)
  if (!GHANA_MOBILE_REGEX.test(digits)) {
    throw new AppError(
      "Phone number is not a valid Ghana mobile number",
      400,
      "AUTH_INVALID_PHONE"
    );
  }

  return digits; // always returns 233XXXXXXXXX
}

export function isValidGhanaPhone(phone) {
  return GHANA_MOBILE_REGEX.test(phone);
}