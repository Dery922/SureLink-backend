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

// ===================== VIRTUALS =====================

// // Check if booking can be cancelled
// bookingSchema.virtual("canCancel").get(function () {
//   const cancelableStatuses = ["pending", "confirmed"];
//   return cancelableStatuses.includes(this.status) && !this.isDeleted;
// });

// // Check if booking can be confirmed
// bookingSchema.virtual("canConfirm").get(function () {
//   return this.status === "pending" && !this.isDeleted;
// });

// // Check if booking can be started
// bookingSchema.virtual("canStart").get(function () {
//   return this.status === "confirmed" && !this.isDeleted;
// });

// // Check if booking can be completed
// bookingSchema.virtual("canComplete").get(function () {
//   return ["confirmed", "in_progress"].includes(this.status) && !this.isDeleted;
// });

// // Check if booking can be rated
// bookingSchema.virtual("canRate").get(function () {
//   return this.status === "completed" && !this.rating?.score && !this.isDeleted;
// });

// // Get booking status display
// bookingSchema.virtual("statusDisplay").get(function () {
//   const statusMap = {
//     pending: "Pending",
//     confirmed: "Confirmed",
//     in_progress: "In Progress",
//     completed: "Completed",
//     cancelled: "Cancelled",
//     no_show: "No Show",
//     rescheduled: "Rescheduled",
//   };
//   return statusMap[this.status] || this.status;
// });

// // Get payment status display
// bookingSchema.virtual("paymentStatusDisplay").get(function () {
//   const statusMap = {
//     pending: "Pending",
//     paid: "Paid",
//     failed: "Failed",
//     refunded: "Refunded",
//     partially_paid: "Partially Paid",
//   };
//   return statusMap[this.paymentStatus] || this.paymentStatus;
// });

// // Calculate total with deposit
// bookingSchema.virtual("totalWithDeposit").get(function () {
//   return this.totalAmount + (this.depositAmount || 0);
// });

// // Check if booking is overdue (for pending payments)
// bookingSchema.virtual("isOverdue").get(function () {
//   if (this.paymentStatus !== "pending") return false;
//   const threeDaysAgo = new Date();
//   threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
//   return this.createdAt < threeDaysAgo;
// });

// // ===================== INSTANCE METHODS =====================

// // Cancel booking
// bookingSchema.methods.cancel = function (reason = "") {
//   if (!this.canCancel) {
//     throw new Error("This booking cannot be cancelled");
//   }
//   this.status = "cancelled";
//   this.cancelledAt = new Date();
//   this.cancelledReason = reason;
//   return this.save();
// };

// // Confirm booking
// bookingSchema.methods.confirm = function () {
//   if (!this.canConfirm) {
//     throw new Error("Only pending bookings can be confirmed");
//   }
//   this.status = "confirmed";
//   this.confirmedAt = new Date();
//   return this.save();
// };

// // Start booking (in-progress)
// bookingSchema.methods.start = function () {
//   if (!this.canStart) {
//     throw new Error("Only confirmed bookings can be started");
//   }
//   this.status = "in_progress";
//   this.startedAt = new Date();
//   return this.save();
// };

// // Complete booking
// bookingSchema.methods.complete = function () {
//   if (!this.canComplete) {
//     throw new Error("Only confirmed or in-progress bookings can be completed");
//   }
//   this.status = "completed";
//   this.completedAt = new Date();
//   return this.save();
// };

// // Mark as no-show
// bookingSchema.methods.markAsNoShow = function () {
//   if (this.status !== "confirmed" && this.status !== "pending") {
//     throw new Error(
//       "Only pending or confirmed bookings can be marked as no-show",
//     );
//   }
//   this.status = "no_show";
//   this.completedAt = new Date();
//   this.notes = this.notes
//     ? `${this.notes}\nCustomer did not show up.`
//     : "Customer did not show up.";
//   return this.save();
// };

// // Reschedule booking
// bookingSchema.methods.reschedule = function (newDate, newTime, reason = "") {
//   if (
//     this.status === "completed" ||
//     this.status === "cancelled" ||
//     this.status === "no_show"
//   ) {
//     throw new Error(
//       "Completed, cancelled, or no-show bookings cannot be rescheduled",
//     );
//   }

//   this.previousBookingDate = this.bookingDate;
//   this.bookingDate = newDate;
//   this.bookingTime = newTime;
//   this.status = "rescheduled";
//   this.rescheduledAt = new Date();
//   this.rescheduledReason = reason;
//   return this.save();
// };

// // Add rating
// bookingSchema.methods.addRating = function (score, comment = "") {
//   if (!this.canRate) {
//     throw new Error("This booking cannot be rated");
//   }
//   this.rating = {
//     score: score,
//     comment: comment,
//     ratedAt: new Date(),
//   };
//   return this.save();
// };

// // Mark payment as paid
// bookingSchema.methods.markAsPaid = function (reference = "") {
//   this.paymentStatus = "paid";
//   this.paymentReference = reference;
//   this.paymentDetails.set("paidAt", new Date());
//   this.remainingAmount = 0;
//   return this.save();
// };

// // Mark payment as failed
// bookingSchema.methods.markPaymentFailed = function (reason = "") {
//   this.paymentStatus = "failed";
//   this.paymentDetails.set("failedReason", reason);
//   this.paymentDetails.set("failedAt", new Date());
//   return this.save();
// };

// // Process refund
// bookingSchema.methods.processRefund = function (reason = "") {
//   if (this.paymentStatus !== "paid") {
//     throw new Error("Only paid bookings can be refunded");
//   }
//   this.paymentStatus = "refunded";
//   this.paymentDetails.set("refundReason", reason);
//   this.paymentDetails.set("refundedAt", new Date());
//   return this.save();
// };

// // Soft delete
// bookingSchema.methods.softDelete = function (reason = "") {
//   this.isDeleted = true;
//   this.deletedAt = new Date();
//   this.deletedReason = reason;
//   return this.save();
// };

// // ===================== STATIC METHODS =====================

// // Get booking statistics
// bookingSchema.statics.getStats = async function (
//   providerId,
//   startDate,
//   endDate,
// ) {
//   const match = {};
//   if (providerId) {
//     match.providerId = mongoose.Types.ObjectId(providerId);
//   }
//   if (startDate || endDate) {
//     match.createdAt = {};
//     if (startDate) match.createdAt.$gte = new Date(startDate);
//     if (endDate) match.createdAt.$lte = new Date(endDate);
//   }

//   const stats = await this.aggregate([
//     { $match: { ...match, isDeleted: false } },
//     {
//       $group: {
//         _id: "$status",
//         count: { $sum: 1 },
//         totalAmount: { $sum: "$totalAmount" },
//         averageAmount: { $avg: "$totalAmount" },
//       },
//     },
//   ]);

//   const total = await this.countDocuments({ ...match, isDeleted: false });

//   return {
//     total,
//     byStatus: stats,
//   };
// };

// // Get monthly bookings for provider
// bookingSchema.statics.getMonthlyStats = async function (
//   providerId,
//   months = 6,
// ) {
//   const match = { isDeleted: false };
//   if (providerId) {
//     match.providerId = mongoose.Types.ObjectId(providerId);
//   }

//   const startDate = new Date();
//   startDate.setMonth(startDate.getMonth() - months);

//   match.createdAt = { $gte: startDate };

//   const stats = await this.aggregate([
//     { $match: match },
//     {
//       $group: {
//         _id: {
//           year: { $year: "$createdAt" },
//           month: { $month: "$createdAt" },
//         },
//         count: { $sum: 1 },
//         totalAmount: { $sum: "$totalAmount" },
//       },
//     },
//     { $sort: { "_id.year": -1, "_id.month": -1 } },
//     { $limit: months },
//   ]);

//   return stats;
// };

// // Get upcoming bookings for provider
// bookingSchema.statics.getUpcoming = async function (providerId, limit = 10) {
//   const match = {
//     providerId: mongoose.Types.ObjectId(providerId),
//     status: { $in: ["pending", "confirmed"] },
//     bookingDate: { $gte: new Date() },
//     isDeleted: false,
//   };

//   const bookings = await this.find(match)
//     .sort({ bookingDate: 1, bookingTime: 1 })
//     .limit(limit)
//     .populate("customerId", "name email avatar")
//     .populate("serviceId", "name description");

//   return bookings;
// };

// // Check for conflicting bookings
// bookingSchema.statics.checkConflicts = async function (
//   providerId,
//   date,
//   time,
//   excludeBookingId = null,
// ) {
//   const query = {
//     providerId: new mongoose.Types.ObjectId(providerId),
//     bookingDate: new Date(date),
//     bookingTime: time,
//     status: { $in: ["pending", "confirmed"] },
//     isDeleted: false,
//   };

//   if (excludeBookingId) {
//     query._id = {
//       $ne: new mongoose.Types.ObjectId(excludeBookingId),
//     };
//   }

//   const conflicting = await this.findOne(query);
//   return !!conflicting;
// };
// // ===================== MIDDLEWARE =====================

// // Pre-save middleware
// bookingSchema.pre("save", function (next) {
//   // Calculate remaining amount if deposit is set
//   if (this.depositAmount > 0) {
//     this.remainingAmount = this.totalAmount - this.depositAmount;
//   }

//   // Ensure booking date is a Date object
//   if (this.bookingDate && typeof this.bookingDate === "string") {
//     this.bookingDate = new Date(this.bookingDate);
//   }
// });

// // Pre-find middleware to exclude soft-deleted by default
// bookingSchema.pre(/^find/, function (next) {
//   // Only apply if not explicitly including deleted
//   if (this._conditions && this._conditions.includeDeleted !== true) {
//     this._conditions.isDeleted = { $ne: true };
//   }
// });

export default mongoose.model("Booking", bookingSchema);
