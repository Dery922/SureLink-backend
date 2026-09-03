import User from "../models/User.js";
import Review from "../models/Review.js"; // Adjust the path as needed
import Booking from "../models/Booking.js"; // Assumes you have a Booking model
import Notification from "../models/Notification.js";
import mongoose from "mongoose";

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


//provider reviewing customers
export const createReview = async (req, res) => {
  try {
    const { bookingId } = req.params
    const { rating, comment, tags } = req.body;
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





/**this function is for customer reviewing provider */
export const reviewProvider = async (req, res) => {

  try {
    const { bookingId, rating, comment } = req.body;
    const customerId = req.user._id; // Extracted from your auth middleware

    // 1. Fetch booking details to get the provider & service metadata
    const booking = await Booking.findOne({ _id: bookingId, customerId: customerId });
    if (!booking) {
      return res.status(404).json({ message: "Booking transaction not found." });
    }

    if (booking.status !== 'completed') {
      return res.status(400).json({ message: "You can only review a completed service." });
    }

    // 2. Prevent duplicate submissions by the same user
    const existingReview = await Review.findOne({ bookingId, reviewerId: customerId });
    if (existingReview) {
      return res.status(400).json({ message: "You have already submitted a review for this booking." });
    }

    // 3. Create the review mapping the customer to the provider
    const newReview = await Review.create({
      bookingId: booking._id,
      reviewerId: customerId,              // The Customer
      revieweeId: booking.providerId,      // The Provider
      serviceId: booking.serviceId,        // The Service type
      rating: parseInt(rating),
      comment: comment || ""
    });

    return res.status(201).json({
      success: true,
      message: "Review posted successfully!",
      review: newReview
    });

  } catch (error) {
    return res.status(500).json({ message: error.message });
  }

}



/**this function is for un review providers, simple fetching all reviews that a */

export const unreviewedProvider = async (req, res) => {
  try {
    const customerId = req.user._id;

    // 1. Get all completed bookings for this user
    const completedBookings = await Booking.find({
      customerId,
      status: 'completed'
    }).sort({ completedAt: -1 });

    // 2. Find which booking IDs have already been reviewed by this customer
    const reviewedIds = await Review.find({
      reviewerId: customerId,
      bookingId: { $in: completedBookings.map(b => b._id) }
    }).distinct('bookingId');

    // 3. Filter out reviewed bookings to find the pending ones
    const unreviewed = completedBookings.filter(
      booking => !reviewedIds.map(id => id.toString()).includes(booking._id.toString())
    );

    return res.status(200).json(unreviewed);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}



// @desc    Get all reviews for a provider (reviewee)
// @route   GET /api/reviews/provider/:providerId
// @access  Public
export const getProviderReviews = async (req, res) => {
  console.log("🔥 PUBLIC REVIEW ROUTE HIT");
  try {
    const { providerId } = req.params;
    const { page = 1, limit = 10, sort = 'recent' } = req.query;

    // Validate provider exists
    const provider = await User.findById(providerId);
    if (!provider) {
      return res.status(404).json({
        success: false,
        message: 'Provider not found'
      });
    }

    // Build sort options
    let sortOptions = {};
    switch (sort) {
      case 'recent':
        sortOptions = { createdAt: -1 };
        break;
      case 'highest':
        sortOptions = { rating: -1 };
        break;
      case 'lowest':
        sortOptions = { rating: 1 };
        break;
      default:
        sortOptions = { createdAt: -1 };
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get reviews with pagination
    const [reviews, total] = await Promise.all([
      Review.find({
        revieweeId: providerId,
        status: 'active'
      })
        .populate('reviewerId', 'name avatar email')
        .populate('serviceId', 'name category')
        .populate('bookingId', 'status date')
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Review.countDocuments({
        revieweeId: providerId,
        status: 'active'
      })
    ]);

    // Get rating breakdown
    const ratingBreakdown = await getRatingBreakdown(providerId);

    // Format reviews for frontend
    const formattedReviews = reviews.map(review => ({
      _id: review._id,
      rating: review.rating,
      comment: review.comment,
      images: review.images || [],
      createdAt: review.createdAt,
      name: review.reviewerId?.name?.full || review.reviewerId?.name || 'Anonymous',
      avatar: review.reviewerId?.avatar?.url || null,
      serviceName: review.serviceId?.name || 'Service',
      bookingId: review.bookingId?._id,
      isEdited: review.isEdited || false,
      editedAt: review.editedAt || null
    }));

    res.status(200).json({
      success: true,
      data: {
        reviews: formattedReviews,
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit)),
        stats: {
          averageRating: provider.trust?.average_rating || 0,
          totalReviews: provider.trust?.total_ratings || 0,
          ratingBreakdown
        }
      }
    });

  } catch (error) {
    console.error('Get provider reviews error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching reviews',
      error: error.message
    });
  }
};

// Helper function to get rating breakdown
const getRatingBreakdown = async (providerId) => {
  const breakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

  const results = await Review.aggregate([
    {
      $match: {
        revieweeId: new mongoose.Types.ObjectId(providerId),
        status: 'active'
      }
    },
    {
      $group: {
        _id: '$rating',
        count: { $sum: 1 }
      }
    }
  ]);

  const total = results.reduce((sum, r) => sum + r.count, 0);

  if (total > 0) {
    results.forEach(({ _id, count }) => {
      if (_id >= 1 && _id <= 5) {
        breakdown[_id] = Math.round((count / total) * 100);
      }
    });
  }

  return breakdown;
};


export const getRatingStatus = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const reviewerId = req.user.id;

    // 1. Validate booking ID
    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid booking ID.",
      });
    }

    // 2. Find the booking
    const booking = await Booking.findById(bookingId);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "The requested booking transaction was not found.",
      });
    }

    // 3. Make sure the logged-in user participated in this booking
    const isCustomer =
      booking.customerId.toString() === reviewerId.toString();

    const isProvider =
      booking.providerId.toString() === reviewerId.toString();

    if (!isCustomer && !isProvider) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to access the rating status for this booking.",
      });
    }

    // 4. Check whether this user has already submitted a review
    const existingReview = await Review.findOne({
      bookingId: booking._id,
      reviewerId,
    });

    // 5. Return rating status
    return res.status(200).json({
      success: true,
      data: {
        isRated: !!existingReview,
      },
    });
  } catch (error) {
    console.error("Rating Status Error:", error);

    return res.status(500).json({
      success: false,
      message: "An internal server error occurred while checking rating status.",
    });
  }
};

