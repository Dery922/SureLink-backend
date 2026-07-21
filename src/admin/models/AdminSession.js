import mongoose from "mongoose";

const { Schema } = mongoose;

/**
 * AdminSession model.
 *
 * Persists admin session records in MongoDB. Replaces the previous
 * Redis-backed store so the admin module has no external cache dependency.
 *
 * Security notes (AppSec):
 * - Only the SHA-256 `token_hash` is stored — the raw bearer token never
 *   touches the database.
 * - `expires_at` carries a TTL index (expireAfterSeconds: 0), so Mongo
 *   removes sessions automatically once they pass their expiry, mirroring
 *   the TTL behaviour Redis previously provided.
 */
const adminSessionSchema = new Schema(
  {
    admin_id: {
      type: String,
      required: true,
      index: true,
    },

    // SHA-256 hash of the session token. Raw tokens stay in memory only.
    token_hash: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    role: {
      type: String,
      required: true,
    },

    ip: {
      type: String,
      default: null,
    },

    user_agent: {
      type: String,
      default: null,
    },

    // TTL index — Mongo deletes the document once the current time passes this.
    expires_at: {
      type: Date,
      required: true,
      index: { expireAfterSeconds: 0 },
    },
  },
  { timestamps: true },
);

export default mongoose.model("AdminSession", adminSessionSchema);
