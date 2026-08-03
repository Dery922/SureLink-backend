import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
  {
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
    },
    reviewerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    revieweeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    serviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Service",
      required: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
      validate: {
        validator: Number.isInteger,
        message: "{VALUE} must be a whole number between 1 and 5",
      },
    },
    comment: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    isEdited: {
      type: Boolean,
      default: false,
    },
    editedAt: Date,
    status: {
      type: String,
      enum: ["active", "hidden", "reported", "deleted"],
      default: "active",
    },
  },
  {
    timestamps: true,
  },
);

// FIX 1: Enforce one review per unique booking transaction
// Replace Fix 1 with this in your Review model file:
reviewSchema.index({ bookingId: 1, reviewerId: 1 }, { unique: true });


// FIX 2: Compound index for blazing-fast profile queries (Sorted by newest first)
reviewSchema.index({ revieweeId: 1, status: 1, createdAt: -1 });
reviewSchema.index({ serviceId: 1, status: 1, createdAt: -1 });

// FIX 3: Automated middleware to catch edits instantly
// Paste this inside your Review model file right before: export default mongoose.model("Review", reviewSchema);

reviewSchema.statics.calculateAverageRating = async function (revieweeId) {
  const stats = await this.aggregate([
    {
      $match: { revieweeId: revieweeId, status: "active" },
    },
    {
      $group: {
        _id: "$revieweeId",
        nRating: { $sum: 1 },
        avgRating: { $avg: "$rating" },
      },
    },
  ]);

  if (stats.length > 0) {
    // Rounds the average to 2 decimal places smoothly
    const roundedAvg = Math.round(stats[0].avgRating * 100) / 100;

    await mongoose.model("User").findByIdAndUpdate(revieweeId, {
      $set: {
        "trust.total_ratings": stats[0].nRating,
        "trust.average_rating": roundedAvg,
      },
    });
  } else {
    await mongoose.model("User").findByIdAndUpdate(revieweeId, {
      $set: {
        "trust.total_ratings": 0,
        "trust.average_rating": 0,
      },
    });
  }
};

// Fire calculation after a new review is saved
reviewSchema.post("save", async function () {
  await this.constructor.calculateAverageRating(this.revieweeId);
});

// Fire calculation if a review is modified or status drops to hidden/deleted
reviewSchema.post(/^findOneAnd/, async function (doc) {
  if (doc) {
    await doc.constructor.calculateAverageRating(doc.revieweeId);
  }
});

export default mongoose.model("Review", reviewSchema);
