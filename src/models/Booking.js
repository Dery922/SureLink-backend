// backend/models/Booking.js
import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema(
  {
    // Customer (who is booking)
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    customerName: {
      type: String,
      required: true,
    },
    customerEmail: {
      type: String,
    },
    customerPhone: {
      type: String,
    },

    // Provider (who is providing the service)
    providerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    providerName: {
      type: String,
      required: true,
    },

    // Service details
    serviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Service",
      required: true,
    },
    serviceName: {
      type: String,
      required: true,
    },
    servicePrice: {
      type: Number,
      required: true,
      min: 0,
    },
    serviceDuration: {
      type: String,
      default: "Variable",
    },
    serviceCategory: {
      type: String,
    },
    serviceTypes: {
      type: [String],
      default: [],
    },

    // Booking details
    bookingDate: {
      type: Date,
      required: true,
    },
    bookingTime: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: [
        "pending",
        "confirmed",
        "in_progress",
        "completed",
        "cancelled",
        "no_show",
        "rescheduled",
      ],
      default: "pending",
      index: true,
    },

    // Location
    location: {
      address: {
        type: String,
        required: true,
      },
      city: {
        type: String,
        required: true,
      },
      landmark: {
        type: String,
        default: "",
      },
      coordinates: {
        lat: {
          type: Number,
        },
        lng: {
          type: Number,
        },
      },
    },

    // Payment
    paymentMethod: {
      type: String,
      enum: ["mobile-money", "debit-card", "cash", "bank-transfer", "wallet"],
      default: "mobile-money",
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded", "partially_paid"],
      default: "pending",
      index: true,
    },
    paymentReference: {
      type: String,
    },
    paymentDetails: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      default: {},
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    depositAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    remainingAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Additional details
    specialInstructions: {
      type: String,
      default: "",
    },
    notes: {
      type: String,
      default: "",
    },
    internalNotes: {
      type: String,
      default: "",
    },

    // Timeline
    confirmedAt: {
      type: Date,
    },
    startedAt: {
      type: Date,
    },
    completedAt: {
      type: Date,
    },
    cancelledAt: {
      type: Date,
    },
    cancelledReason: {
      type: String,
    },
    rescheduledAt: {
      type: Date,
    },
    rescheduledReason: {
      type: String,
    },
    previousBookingDate: {
      type: Date,
    },

    // Rating (after completion)
    rating: {
      score: {
        type: Number,
        min: 1,
        max: 5,
      },
      comment: {
        type: String,
        default: "",
      },
      ratedAt: {
        type: Date,
      },
    },

    // Reminders
    reminders: {
      customerReminded: {
        type: Boolean,
        default: false,
      },
      customerRemindedAt: {
        type: Date,
      },
      providerReminded: {
        type: Boolean,
        default: false,
      },
      providerRemindedAt: {
        type: Date,
      },
    },

    // Notifications
    notifications: {
      customerNotified: {
        type: Boolean,
        default: false,
      },
      providerNotified: {
        type: Boolean,
        default: false,
      },
    },

    // Metadata
    metadata: {
      source: {
        type: String,
        enum: ["web", "mobile", "api", "admin"],
        default: "web",
      },
      ipAddress: {
        type: String,
      },
      userAgent: {
        type: String,
      },
      deviceType: {
        type: String,
      },
    },

    // Additional fields
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    deletedAt: {
      type: Date,
    },
    deletedReason: {
      type: String,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// ===================== INDEXES =====================

// Single field indexes
bookingSchema.index({ customerId: 1, createdAt: -1 });
bookingSchema.index({ providerId: 1, createdAt: -1 });
bookingSchema.index({ status: 1, bookingDate: 1 });
bookingSchema.index({ bookingDate: 1, bookingTime: 1 });
bookingSchema.index({ paymentStatus: 1 });
bookingSchema.index({ isDeleted: 1 });

// Compound indexes for common queries
bookingSchema.index({ providerId: 1, status: 1, bookingDate: 1 });
bookingSchema.index({ customerId: 1, status: 1, bookingDate: 1 });
bookingSchema.index({ providerId: 1, bookingDate: 1, bookingTime: 1 });

// Text index for search
bookingSchema.index({
  customerName: "text",
  providerName: "text",
  serviceName: "text",
  "location.address": "text",
  "location.city": "text",
});



// // Cancel booking
bookingSchema.methods.cancel = function (reason = "") {
  if (!this.canCancel) {
    throw new Error("This booking cannot be cancelled");
  }
  this.status = "cancelled";
  this.cancelledAt = new Date();
  this.cancelledReason = reason;
  return this.save();
};

// // Confirm booking
bookingSchema.methods.confirm = function () {
  if (!this.canConfirm) {
    throw new Error("Only pending bookings can be confirmed");
  }
  this.status = "confirmed";
  this.confirmedAt = new Date();
  return this.save();
};

// // Start booking (in-progress)
bookingSchema.methods.start = function () {
  if (!this.canStart) {
    throw new Error("Only confirmed bookings can be started");
  }
  this.status = "in_progress";
  this.startedAt = new Date();
  return this.save();
};

// // Complete booking
bookingSchema.methods.complete = function () {
  if (!this.canComplete) {
    throw new Error("Only confirmed or in-progress bookings can be completed");
  }
  this.status = "completed";
  this.completedAt = new Date();
  return this.save();
};



// // Check for conflicting bookings
bookingSchema.statics.checkConflicts = async function (
  customerId,
  providerId,
  date,
  time,
) {
  const bookingDate = new Date(date);

  const activeStatuses = ["pending", "confirmed", "in_progress", "rescheduled"];

  // Provider conflict
  const providerConflict = await this.findOne({
    providerId,
    bookingDate,
    bookingTime: time,
    status: {
      $in: activeStatuses,
    },
    isDeleted: false,
  });

  if (providerConflict) {
    return {
      type: "provider",
      booking: providerConflict,
    };
  }

  // Customer conflict
  const customerConflict = await this.findOne({
    customerId,
    bookingDate,
    bookingTime: time,
    status: {
      $in: activeStatuses,
    },
    isDeleted: false,
  });

  if (customerConflict) {
    return {
      type: "customer",
      booking: customerConflict,
    };
  }

  return null;
};


export default mongoose.model("Booking", bookingSchema);
