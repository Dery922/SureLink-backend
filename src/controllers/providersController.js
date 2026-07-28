import User from "../models/User.js";
import Review from "../models/Review.js"; // Adjust the path as needed
import Booking from "../models/Booking.js"; // Assumes you have a Booking model

/**
 * Get ALL providers without pagination
 * Used for admin panels, exports, or when you need all data at once
 */
export async function getAllProviders(req, res, next) {
  try {
    const { category } = req.query;

    // 1. Build query filters
    const query = {
      type: "provider",
      "onboarding.completed": true,
      status: { $in: ["active", "verification_pending"] },
    };

    // If a customer filters by category
    if (category && category !== "all") {
      query["provider_profile.category"] = category;
    }

    // 2. Execute query without pagination
    const providers = await User.find(query)
      .select("-security -verification -id_number -id_doc_url") // Protect sensitive metrics
      .sort({ "trust.score": -1, createdAt: -1 }) // Sort top rated & newest first
      .lean(); // Convert to plain JS objects

    // 3. Dispatch response
    return res.status(200).json({
      success: true,
      message: "All providers retrieved successfully.",
      total: providers.length,
      data: providers,
    });
  } catch (error) {
    console.error("❌ All Providers Fetch Error:", error.message);
    next(error);
  }
}

export const createReview = async (req, res) => {
  try {
    const { bookingId, rating, comment, tags } = req.body;
    const reviewerId = req.user.id; // Populated from your authentication middleware

    // 1. Validate basic required fields from payload
    if (!bookingId || !rating) {
      return res.status(400).json({
        success: false,
        message: "Booking ID and a rating value are required.",
      });
    }

    // 2. Fetch the corresponding booking transaction
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "The requested booking transaction was not found.",
      });
    }

    // 3. Prevent reviewing incomplete work
    if (booking.status !== "completed") {
      return res.status(400).json({
        success: false,
        message:
          "You can only leave a review after the job is fully completed.",
      });
    }

    // 4. Identify who the reviewee is based on the reviewer's identity
    // 4. Identify who the reviewee is based on the reviewer's identity
    // 4. Identify who the reviewee is based on the reviewer's identity
    let revieweeId;

    const currentReviewerId = reviewerId.toString();
    const bookingCustomerId = booking.customerId.toString(); // 🌟 Changed from clientId to customerId
    const bookingProviderId = booking.providerId.toString();

    if (currentReviewerId === bookingCustomerId) {
      // If the reviewer is the client, then the person being reviewed is the provider
      revieweeId = booking.providerId;
    } else if (currentReviewerId === bookingProviderId) {
      // If the reviewer is the provider, then the person being reviewed is the client
      revieweeId = booking.customerId;
    } else {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to review this transaction.",
      });
    }

    // 5. Build and save the new review document
    // (Note: Add tags to your schema if you plan to save quick-chips)
    const newReview = new Review({
      bookingId,
      reviewerId,
      revieweeId,
      serviceId: booking.serviceId,
      rating,
      comment,
      tags: tags || [],
    });

    await newReview.save();
    // The pre/post save hooks on your model now update user aggregates automatically

    return res.status(201).json({
      success: true,
      message: "Feedback submitted successfully!",
      data: newReview,
    });
  } catch (error) {
    // Catch Mongo duplicate key errors (code 11000) for bookingId index constraint
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message:
          "You have already submitted a review for this completed booking.",
      });
    }

    console.error("Review Submission Error:", error);
    return res.status(500).json({
      success: false,
      message: "An internal server error occurred while posting your review.",
    });
  }
};
