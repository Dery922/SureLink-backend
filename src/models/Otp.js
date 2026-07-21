import mongoose from "mongoose";

const otpSchema = new mongoose.Schema(
  {
    identifier: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },

    codeHash: {
      type: String,
      required: true,
    },

    purpose: {
      type: String,
      enum: ["login", "signup"],
      required: true,
    },

    attempts: {
      type: Number,
      default: 0,
    },

    expiresAt: {
      type: Date,
      required: true,
      
    },
  },
  {
    timestamps: true,
  }
);

// Automatically remove expired OTPs
otpSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0 }
);

export default mongoose.model("Otp", otpSchema);