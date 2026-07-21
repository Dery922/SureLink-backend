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
