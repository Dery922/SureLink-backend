import { AppError } from "../../utils/errors.js";

function isBlank(value) {
  return value === undefined || value === null || String(value).trim() === "";
}

export function validateRequestOtp(req, res, next) {
  const { phone, full_name: fullNameSnake, fullName, type } = req.body || {};

  if (isBlank(phone)) {
    return next(new AppError("Phone number is required", 400, "VALIDATION_ERROR"));
  }

  if (isBlank(fullNameSnake) && isBlank(fullName)) {
    return next(new AppError("Full name is required", 400, "VALIDATION_ERROR"));
  }

  if (type !== undefined && !["customer", "provider", "driver", "business"].includes(type)) {
    return next(new AppError("Invalid user type", 400, "VALIDATION_ERROR"));
  }

  return next();
}

export function validateVerifyOtp(req, res, next) {
  const { phone, otp } = req.body || {};

  if (isBlank(phone) || isBlank(otp)) {
    return next(new AppError("Phone and OTP are required", 400, "VALIDATION_ERROR"));
  }

  if (!/^\d{6}$/.test(String(otp))) {
    return next(new AppError("OTP must be a 6-digit code", 400, "VALIDATION_ERROR"));
  }

  return next();
}

export function validateSessionTokenRequest(req, res, next) {
  const { session_token: sessionToken } = req.body || {};

  if (isBlank(sessionToken)) {
    return next(new AppError("session_token is required", 400, "VALIDATION_ERROR"));
  }

  if (!/^[a-f0-9]{64}$/i.test(String(sessionToken))) {
    return next(new AppError("session_token format is invalid", 400, "VALIDATION_ERROR"));
  }

  return next();
}
