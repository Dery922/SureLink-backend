import { AppError } from "../../services/errors.js";

function isBlank(value) {
  return value === undefined || value === null || String(value).trim() === "";
}

export function validateAdminLogin(req, res, next) {
  const { email, password } = req.body || {};

  if (isBlank(email)) {
    return next(new AppError("Email is required", 400, "VALIDATION_ERROR"));
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email))) {
    return next(new AppError("Invalid email format", 400, "VALIDATION_ERROR"));
  }
  if (isBlank(password)) {
    return next(new AppError("Password is required", 400, "VALIDATION_ERROR"));
  }

  return next();
}

export function validateVerifyOTP(req, res, next) {
  const { pending_token, otp } = req.body || {};

  if (isBlank(pending_token)) {
    return next(new AppError("pending_token is required", 400, "VALIDATION_ERROR"));
  }
  if (!/^[a-f0-9]{64}$/i.test(String(pending_token))) {
    return next(new AppError("pending_token format is invalid", 400, "VALIDATION_ERROR"));
  }
  if (isBlank(otp)) {
    return next(new AppError("otp is required", 400, "VALIDATION_ERROR"));
  }
  if (!/^\d{6}$/.test(String(otp).trim())) {
    return next(new AppError("otp must be a 6-digit code", 400, "VALIDATION_ERROR"));
  }

  return next();
}

export function validateResendOTP(req, res, next) {
  const { pending_token } = req.body || {};

  if (isBlank(pending_token)) {
    return next(new AppError("pending_token is required", 400, "VALIDATION_ERROR"));
  }
  if (!/^[a-f0-9]{64}$/i.test(String(pending_token))) {
    return next(new AppError("pending_token format is invalid", 400, "VALIDATION_ERROR"));
  }

  return next();
}

export function validateAdminSessionToken(req, res, next) {
  const { session_token: sessionToken } = req.body || {};

  if (isBlank(sessionToken)) {
    return next(new AppError("session_token is required", 400, "VALIDATION_ERROR"));
  }
  if (!/^[a-f0-9]{64}$/i.test(String(sessionToken))) {
    return next(new AppError("session_token format is invalid", 400, "VALIDATION_ERROR"));
  }

  return next();
}
