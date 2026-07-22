import mongoose from "mongoose";
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
      sparse: true,
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
    coverPicture: {
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
      terms_accepted: {
        type: Boolean,
        default: false,
      },
      terms_accepted_at: {
        type: Date,
        default: null,
      },
      current_step: {
        type: String,
        enum: [
          "role_selection",
          "terms_consent",
          "provider_profile",
          "provider_profile_verification",
          "provider_profile_review", // 🎯 Normalized to match your frontend currentStep switches
          "verification", // 🎯 Normalized to match your frontend currentStep switches
          "review", // 🎯 Normalized to match your frontend currentStep switches
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
      // 🎯 CRITICAL: Add a specific verification status for the provider side only!
      verification_status: {
        type: String,
        enum: ["not_started", "pending", "approved", "rejected"],
        default: "not_started",
      },
      // Admin review outcome (set by the admin verifications queue).
      rejection_reason: String,
      reviewed_at: Date,
      reviewed_by: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" },
      category: String,
      secondaryCategories: [String], // ✨ Added to catch extra service capabilities
      service_area: String, // ✨ Added to store location strings like "East Legon"
      service_radius_km: { type: Number, default: 25 },
      bio: String, // ✨ Added to ensure your biographies do not vanish
      avatar_url: String, // ✨ Added to track provider-specific image avatars
      selfie_url: String, // Verification selfie for admin review
      id_type: String,
      id_number: String,
      id_doc_url: String,
      experience_years: Number,
      hourly_rate: Number,
      base_price: { type: Number, default: 0 },
      open_for_work: { type: Boolean, default: true },
    },

    // ---------- Driver ----------
    driver_profile: {
      vehicle_type: String,
      current_location: pointSchema,
      is_online: Boolean,
    },

    // ---------- Business ----------
    business_profile: {
      businessName: String,
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
      default: "active", // New accounts are active customers instantly.
      // Use provider_profile.verification_status for the provider review state!
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

    _locationMetadata: {
      ip: String,
      capturedAt: Date,
      accuracy: String, // 'ip-based', 'frontend', 'default'
      source: String, // 'geoip', 'ipapi', 'ipinfo', 'frontend'
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
