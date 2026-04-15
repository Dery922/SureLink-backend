import mongoose from "mongoose";

const { Schema } = mongoose;

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

sessionSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model("Session", sessionSchema);
