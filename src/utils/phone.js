import { AppError } from "./errors.js";

const GHANA_MOBILE_REGEX = /^233(20|23|24|25|26|27|28|50|53|54|55|56|57|59)\d{7}$/;

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

export function isValidGhanaPhone(normalizedPhone) {
  return GHANA_MOBILE_REGEX.test(normalizedPhone);
}
