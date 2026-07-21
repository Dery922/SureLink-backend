import mongoose from "mongoose";

const { Schema } = mongoose;

/**
 * User model.
 *
 * This schema is intentionally broad to support multiple actor types
 * (customer/provider/driver/business/admin). Keep auth-critical fields stable:
 * `phone` (unique), `type`, and `verification.phone`.
 */

// ========== GEO SCHEMA ==========
const pointSchema = new Schema({
  type: {
    type: String,
    enum: ["Point"],
    default: "Point",
  },
  coordinates: {
    type: [Number], // [lng, lat]
    index: "2dsphere",
    validate:{               //validate coordinates
      validator:v => v.length === 2,
      message:"coordinates must be [lng, lat]"
    }
  },
}, { _id: false });

// ========== MAIN USER ==========
const userSchema = new Schema({
  // ---------- Identity ----------
  // Either phone OR email is sufficient to identify a user (see the
  // at-least-one validator below). Both are unique+sparse so accounts can be
  // created via phone-OTP or email-OTP.
  phone: {
    type: String,
    required: false,
    unique: true,
    sparse: true,
    index: true,
  },
  email: {
    type: String,
    unique: true,
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
    // ghana_card: {
    //   verified: { type: Boolean, default: false },
    //   card_reference: String,
    //   card_number_hashed: String,
    // },
  },

  // ---------- Role ----------
  // type: {
  //   type: String,
  //   enum: ["customer", "provider", "driver", "business", "admin"],
  //   default: "customer",
  // },

  roles: {                   
    type: [String],
    enum:["customer","provider","driver","business","admin"],
    default: ["customer"],
  },

  // ---------- Provider ----------
  provider_profile: {
    category: String,
    secondary_category: String,
    service_area: String,
    experience_years: Number,
    hourly_rate: Number,
    service_radius_km: Number,
    bio: String,
    base_price: Number,
    availability: Boolean,
    id_type: String,
    id_number: String,
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
  { timestamps: true });

// Require at least one primary identifier. Phone and email are both optional
// individually, but a user must have one of them to be reachable/loginable.
userSchema.pre("validate", function requirePrimaryIdentifier(next) {
  if (!this.phone && !this.email) {
    this.invalidate("phone", "Either phone or email is required");
  }
  next();
});

export default mongoose.model("User", userSchema);