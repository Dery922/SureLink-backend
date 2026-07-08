import mongoose from "mongoose";

const { Schema } = mongoose;

/**
 * Admin roles.
 *
 * Exported as a constant so controllers, middleware, and seed scripts share one
 * source of truth rather than duplicating the string literals.
 */
export const ADMIN_ROLES = Object.freeze({
  SUPER_ADMIN: "SUPER_ADMIN",
  PROVIDER_MANAGEMENT_ADMIN: "PROVIDER_MANAGEMENT_ADMIN",
  OPERATIONS_ADMIN: "OPERATIONS_ADMIN",
});

/**
 * Admin model.
 *
 * Separate from the User model because admins authenticate differently
 * (email + password instead of phone OTP) and have a fundamentally different
 * access model. Keeping them separate avoids polluting User with admin-specific
 * fields and makes authorization checks unambiguous.
 *
 * Security notes (AppSec):
 * - `password_hash` is never selected by default (select: false). Every query
 *   that needs the hash must explicitly add `.select("+password_hash")`.
 * - `role` uses an enum to prevent arbitrary role injection via mass assignment.
 * - `last_login_at` and `last_login_ip` support audit requirements.
 */
const adminSchema = new Schema(
  {
    // ---------- Identity ----------
    email: {
      type: String,
      required: true,
      unique: true,
      index: true,
      lowercase: true,
      trim: true,
    },

    // Excluded from all queries by default — must be explicitly opted in.
    password_hash: {
      type: String,
      required: true,
      select: false,
    },

    name: {
      full: { type: String, required: true, trim: true },
      display: { type: String, trim: true },
    },

    // ---------- Role ----------
    role: {
      type: String,
      enum: Object.values(ADMIN_ROLES),
      required: true,
      index: true,
    },

    // ---------- Status ----------
    status: {
      type: String,
      enum: ["active", "suspended", "inactive"],
      default: "active",
      index: true,
    },

    // ---------- Audit ----------
    last_login_at: {
      type: Date,
      default: null,
    },
    last_login_ip: {
      type: String,
      default: null,
    },

    // ---------- Security ----------
    // Incremented on each failed login attempt; reset on success.
    failed_login_attempts: {
      type: Number,
      default: 0,
    },
    // If set, the account is locked until this time.
    locked_until: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

export default mongoose.model("Admin", adminSchema);
