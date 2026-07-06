// backend/models/Service.js
import mongoose from "mongoose";
const { Schema } = mongoose;

const serviceSchema = new Schema(
  {
    provider_id: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
    category: {
      type: String,
      required: true,
      index: true,
    },
    // Multiple service types under this category
    serviceTypes: {
      type: [String],
      default: [],
      index: true,
    },
    // Pricing model: 'package' or 'individual'
    pricingModel: {
      type: String,
      enum: ["package", "individual"],
      default: "package",
    },
    // Base price for package pricing
    basePrice: {
      type: Number,
      default: 0,
      min: 0,
    },
    // Individual prices for each service type
    individualPrices: {
      type: Map,
      of: Number,
      default: {},
    },
    // Price type: fixed, hourly, daily, weekly, monthly, negotiable
    priceType: {
      type: String,
      enum: ["fixed", "hourly", "daily", "weekly", "monthly", "negotiable"],
      default: "fixed",
    },
    // Legacy support for single price (kept for backward compatibility)
    price: {
      type: Number,
      default: 0,
      min: 0,
    },
    // Service tags for better discoverability
    tags: {
      type: [String],
      default: [],
      index: true,
    },
    // Service image URL
    imageUrl: {
      type: String,
      default: "",
    },
    // Service status
    is_active: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Virtual for getting all price options
serviceSchema.virtual("priceOptions").get(function () {
  if (this.pricingModel === "individual") {
    const prices = {};
    this.individualPrices.forEach((value, key) => {
      prices[key] = {
        amount: value,
        type: this.priceType,
      };
    });
    return prices;
  }
  return {
    base: {
      amount: this.basePrice || this.price,
      type: this.priceType,
    },
  };
});

// Indexes for better performance
serviceSchema.index({ provider_id: 1, category: 1 });
serviceSchema.index({ provider_id: 1, is_active: 1 });
serviceSchema.index({ category: 1, is_active: 1 });
serviceSchema.index({ tags: 1 });

export default mongoose.model("Service", serviceSchema);
