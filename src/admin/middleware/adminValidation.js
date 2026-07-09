import { AppError } from "../../services/errors.js";
import { ADMIN_ROLES } from "../models/Admin.js";

function isBlank(v) { return v === undefined || v === null || String(v).trim() === ""; }

export function validateCreateProvider(req, res, next) {
  const { name, email, phone, category } = req.body || {};
  if (isBlank(name)) return next(new AppError("name is required", 400, "VALIDATION_ERROR"));
  if (isBlank(email) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return next(new AppError("Valid email is required", 400, "VALIDATION_ERROR"));
  if (isBlank(phone)) return next(new AppError("phone is required", 400, "VALIDATION_ERROR"));
  if (isBlank(category)) return next(new AppError("category is required", 400, "VALIDATION_ERROR"));
  return next();
}

export function validateCreateAdmin(req, res, next) {
  const { name, email, role, password } = req.body || {};
  if (isBlank(name)) return next(new AppError("name is required", 400, "VALIDATION_ERROR"));
  if (isBlank(email) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return next(new AppError("Valid email is required", 400, "VALIDATION_ERROR"));
  if (!Object.values(ADMIN_ROLES).includes(role))
    return next(new AppError(`role must be one of: ${Object.values(ADMIN_ROLES).join(", ")}`, 400, "VALIDATION_ERROR"));
  if (isBlank(password) || String(password).length < 8)
    return next(new AppError("password must be at least 8 characters", 400, "VALIDATION_ERROR"));
  return next();
}

export function validateResetPassword(req, res, next) {
  const { password } = req.body || {};
  if (isBlank(password) || String(password).length < 8)
    return next(new AppError("password must be at least 8 characters", 400, "VALIDATION_ERROR"));
  return next();
}
