import mongoose from "mongoose";

const { Schema } = mongoose;

/**
 * Session model (MongoDB).
 *
 * Note: The current auth flow stores active sessions in Redis via
 * `SessionRepository`. This model is kept for future persistence/auditing or
 * as an alternative storage backend.
 */
const sessionSchema = new Schema(
  {
    user_id: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    token_hash: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    ip: String,
    user_agent: String,
    expires_at: {
      type: Date,
      required: true,
    },
    revoked_at: Date,
  },
  {
    timestamps: true,
    collection: "auth_sessions",
  },
);

/**
 * TTL index: MongoDB will automatically delete documents after `expires_at`.
 * (Only effective if sessions are persisted to MongoDB.)
 */
sessionSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model("Session", sessionSchema);
