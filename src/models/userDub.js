// models/User.js
import { truncate } from "fs";
import mongoose, { now } from "mongoose";
import { type } from "os";

const { Schema } = mongoose;

// ========== GEO SCHEMA ==========
const pointSchema = new Schema(
  {
    type: {
      type: String,
      enum: ["Point"],
      default: "Point",
    },
    coordinates: {
      type: [Number], // [lng, lat]
      index: "2dsphere",
    },
  },
  { _id: false },
);

// ========== MAIN USER ==========
const userSchema = new Schema(
  {
    // ---------- Identity ----------
    phone: {
      type: String,
      sparse: true,
      unique: true,
      index: true,
    },
    email: {
      type: String,
      sparse: true, // allows null but still unique
    },

    name: {
      full: String,
      display: String,
      first: String,
      last: String,
    },

    avatar: {
      url: String,
      thumb: String,
      updated_at: Date,
    },

    // ---------- Verification ----------
    verification: {
      phone: {
        verified: { type: Boolean, default: false },
        verified_at: Date,
        verified_by_ip: String,
      },
      email: {
        verified: { type: Boolean, default: false },
        verified_at: Date,
      },
    },

    // ---------- Role ----------
    type: {
      type: String,
      enum: ["customer", "provider", "driver", "business", "admin"],
      default: "customer",
    },

    roles: {
      type: [String],
      default: ["user"],
    },

    onboarding: {
      completed: {
        type: Boolean,
        default: false,
      },
      // 🔑 Tracks if the user completed the checkbox click step
      terms_accepted: {
        type: Boolean,
        default: false,
      },
      // 🔑 Captures the precise timestamp of agreement
      terms_accepted_at: {
        type: Date,
        default: null,
      },
      // 🔑 Crucial string tracker used by your controllers to remember where they left off
      current_step: {
        type: String,
        enum: [
          "role_selection",
          "terms_consent",
          "provider_profile",
          "provider_profile_verification",
          "provider_profile_review",
          "completed",
        ],
        default: "role_selection",
      },
    },

    current_step: {
      type: String,
      default: "role_selection",
    },

    // ---------- Provider ----------
    provider_profile: {
      category: String,
      experience_years: Number,
      hourly_rate: Number,
      service_radius_km: Number,
    },

    // ---------- Driver ----------
    driver_profile: {
      vehicle_type: String,
      current_location: pointSchema,
      is_online: Boolean,
    },

    // ---------- Business ----------
    business_profile: {
      business_name: String,
      address: {
        street: String,
        area: String,
        city: String,
        gps_code: String,
        coordinates: pointSchema,
      },
    },

    // ---------- Trust ----------
    trust: {
      score: { type: Number, default: 5 },
      average_rating: Number,
      total_ratings: Number,
    },

    // ---------- Status ----------
    status: {
      type: String,
      enum: ["active", "suspended", "banned", "verification_pending"],
      default: "verification_pending",
    },

    // ---------- Security ----------
    security: {
      failed_login_attempts: { type: Number, default: 0 },
      mfa_enabled: { type: Boolean, default: false },
    },

    // ---------- Location ----------
    location: {
      home_address: {
        street: String,
        area: String,
        gps_code: String,
        coordinates: pointSchema,
      },
    },

    // ---------- Preferences ----------
    preferences: {
      language: { type: String, default: "en" },
      notifications: {
        sms: { type: Boolean, default: true },
        push: { type: Boolean, default: true },
      },
    },

    // ---------- Audit ----------
    audit: {
      created_at: { type: Date, default: Date.now },
      updated_at: Date,
      last_login_at: Date,
    },
  },
  { timestamps: true },
);

export default mongoose.model("User", userSchema);
