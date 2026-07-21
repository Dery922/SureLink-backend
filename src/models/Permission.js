// models/Permission.js
import mongoose from "mongoose";

const { Schema } = mongoose;

/**
 * Stores dynamic per-user permission overrides.
 *
 * Base permissions always come from roles.config.js.
 * This collection only exists for EXCEPTIONS — e.g.:
 *   - Temporarily granting a customer "service:create"
 *   - Revoking a specific permission without changing the user's role
 *
 * Kept lean intentionally. The heavy lifting is in RbacService.
 */
const permissionOverrideSchema = new Schema(
  {
    user_id: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,   // one override doc per user
      index: true,
    },

    // Permissions added on top of what their role already grants
    granted: {
      type: [String],
      default: [],
    },

    // Permissions explicitly stripped from what their role grants
    revoked: {
      type: [String],
      default: [],
    },

    // Why was this override created? — feeds into audit logging later
    reason: {
      type: String,
      required: true,
    },

    // Which admin made this change
    granted_by: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Optional expiry — null means permanent until manually cleared
    expires_at: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

export default mongoose.model("PermissionOverride", permissionOverrideSchema);