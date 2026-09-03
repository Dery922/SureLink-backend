// backend/controllers/bookingController.js
import Booking from "../models/Booking.js";
import User from "../models/User.js";
import Service from "../models/Service.js";
import mongoose from "mongoose";
import { createNotification } from "../utils/notificationHelper.js";

import Activity from "../models/Activity.js"; // ✅ Import Activity model

export const createBooking = async (req, res) => {
  try {
    console.log(
      "📝 Creating booking with data:",
      JSON.stringify(req.body, null, 2),
    );

    const {
      providerId,
      providerName,
      serviceId,
      serviceName,
      servicePrice,
      serviceDuration,
      serviceCategory,
      serviceTypes,
      date,
      time,
      address,
      city,
      landmark,
      paymentMethod,
      specialInstructions,
      customerName,
      totalAmount,
      depositAmount,
    } = req.body;

    const customerId = req.user?._id || req.user?.id;
    // ===================== VALIDATION =====================
    // Check authentication
    if (!customerId) {
      console.log("❌ No customer ID found in token");
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
    }

    // Check required fields
    const requiredFields = [
      { field: providerId, name: "providerId" },
      { field: serviceId, name: "serviceId" },
      { field: date, name: "date" },
      { field: time, name: "time" },
      { field: address, name: "address" },
      { field: city, name: "city" },
    ];

    for (const { field, name } of requiredFields) {
      if (!field) {
        console.log(`❌ Missing required field: ${name}`);
        return res.status(400).json({
          success: false,
          message: `${name} is required`,
        });
      }
    }

    // ===================== GET CUSTOMER =====================
    const customer = await User.findById(customerId);
    if (!customer) {
      console.log("❌ Customer not found:", customerId);
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    // ===================== GET PROVIDER =====================
    const provider = await User.findById(providerId);
    if (!provider) {
      console.log("❌ Provider not found:", providerId);
      return res.status(404).json({
        success: false,
        message: "Provider not found",
      });
    }

    // Check if user is a provider
    const isProvider =
      provider.type === "provider" || provider.roles?.includes("provider");
    if (!isProvider) {
      console.log("❌ User is not a provider:", provider.type, provider.roles);
      return res.status(400).json({
        success: false,
        message: "The selected user is not a service provider",
      });
    }

    // ===================== GET SERVICE =====================
    console.log("🔍 Looking for service with ID:", serviceId);
    const service = await Service.findById(serviceId);
    if (!service) {
      console.log("❌ Service not found:", serviceId);
      return res.status(404).json({
        success: false,
        message: "Service not found",
      });
    }

    // Verify service belongs to the provider
    if (service.providerId?.toString() !== providerId) {
      return res.status(400).json({
        success: false,
        message: "Service does not belong to this provider",
      });
    }
    console.log("✅ Service belongs to provider");

    // ===================== CHECK CONFLICTS =====================

    const conflict = await Booking.checkConflicts(
      customerId,
      providerId,
      date,
      time,
    );

    if (conflict) {
      console.log("❌ Booking conflict:", conflict.type);

      if (conflict.type === "provider") {
        return res.status(409).json({
          success: false,
          errorType: "PROVIDER_BUSY",
          message:
            "This provider is already booked at this time. Please choose another time.",
        });
      }

      if (conflict.type === "customer") {
        return res.status(409).json({
          success: false,
          errorType: "CUSTOMER_BOOKED",
          message: "You already have a booking scheduled at this time.",
        });
      }
    }

    console.log("✅ No booking conflicts");

    // ===================== CALCULATE PRICES =====================
    const finalPrice = servicePrice || service.basePrice || service.price || 0;
    const finalDeposit = depositAmount || 0;
    const finalTotal = totalAmount || finalPrice;

    console.log("💰 Price calculation:", {
      servicePrice,
      serviceBasePrice: service.basePrice,
      servicePrice: service.price,
      finalPrice,
      finalDeposit,
      finalTotal,
    });

    // ===================== CREATE BOOKING =====================
    const bookingData = {
      customerId,
      customerName:
        customerName || customer?.name?.full || customer?.email || "Customer",
      customerEmail: customer?.email,
      customerPhone: customer?.phone,

      providerId,
      providerName:
        providerName || provider?.name?.full || provider?.name || "Provider",

      serviceId,
      serviceName: serviceName || service?.name,
      servicePrice: finalPrice,
      serviceDuration: serviceDuration || service?.duration || "Variable",
      serviceCategory: serviceCategory || service?.category,
      serviceTypes: serviceTypes || service?.serviceTypes || [],

      bookingDate: new Date(date),
      bookingTime: time,

      location: {
        address,
        city,
        landmark: landmark || "",
      },

      paymentMethod: paymentMethod || "mobile-money",
      totalAmount: finalTotal,
      depositAmount: finalDeposit,
      remainingAmount: finalTotal - finalDeposit,

      specialInstructions: specialInstructions || "",
      status: "pending",
      paymentStatus: "pending",

      metadata: {
        source: "web",
        ipAddress: req.ip || req.connection?.remoteAddress,
        userAgent: req.headers["user-agent"],
      },
    };

    console.log("📦 Final booking data:", JSON.stringify(bookingData, null, 2));

    // Create booking
    const booking = new Booking(bookingData);
    await booking.save();

    await createNotification({
      recipientId: booking.providerId, // 🛡️ Sent to the Provider dashboard
      senderId: String(customerId), // 🛡️ From the Customer who initiated it
      title: "New Booking Request! 📦",
      message: `${booking.customerName} has requested a ${booking.serviceName} service. Please accept or decline this request.`,
      type: "booking_new", // 🛡️ Aligns type to your schema configurations
      relatedId: booking._id,
      onModel: "Booking",
    });
    // ===================== CREATE ACTIVITY FOR PROVIDER =====================
    try {
      const activityData = {
        userId: providerId,
        type: "booking",
        title: `New booking: ${serviceName || service?.name}`,
        description: `Booking from ${customerName || customer?.name?.full || "Customer"}`,
        amount: finalTotal,
        status: "pending",
        bookingId: booking._id,
        serviceId: serviceId,
        metadata: {
          customerName: customerName || customer?.name?.full || "Customer",
          customerEmail: customer?.email,
          serviceName: serviceName || service?.name,
          bookingDate: date,
          bookingTime: time,
          location: city,
          status: "pending",
        },
      };

      const activity = new Activity(activityData);
      await activity.save();
    } catch (activityError) {
      // Log error but don't fail the booking creation
      console.error("❌ Error creating activity:", activityError);
      // Activity creation failed but booking was successful
      // You can decide to continue or return error
    }

    // Populate references for response
    const populatedBooking = await Booking.findById(booking._id)
      .populate("customerId", "name email avatar phone")
      .populate("providerId", "name email avatar provider_profile")
      .populate("serviceId", "name description serviceTypes category");

    return res.status(201).json({
      success: true,
      data: populatedBooking,
      message: "Booking created successfully",
    });
  } catch (error) {
    console.error("❌ Error creating booking:", error);
    console.error("❌ Error stack:", error.stack);

    // Handle specific Mongoose errors
    if (error.name === "ValidationError") {
      const errors = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors: errors,
      });
    }

    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: `Invalid ${error.path}: ${error.value}`,
      });
    }

    // Handle duplicate key errors
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Duplicate booking found",
        duplicate: error.keyPattern,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to create booking",
      error: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
};
export const checkBookingAvailability = async (req, res) => {
  try {
    const { providerId, date, time } = req.body;

    if (!providerId || !date || !time) {
      return res.status(400).json({
        success: false,
        message: "Provider, date and time are required",
      });
    }

    const conflict = await Booking.findOne({
      providerId,
      bookingDate: new Date(date),
      bookingTime: time,
      status: {
        $in: ["pending", "confirmed", "in_progress", "rescheduled"],
      },
      isDeleted: false,
    });

    if (conflict) {
      return res.status(409).json({
        success: false,
        available: false,
        message:
          "This provider is already booked at this time. Please choose another time.",
      });
    }

    return res.status(200).json({
      success: true,
      available: true,
      message: "Time slot available",
    });
  } catch (error) {
    console.error("Availability Check Error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to check availability",
    });
  }
};

export const getIncomingBookings = async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // 🚀 THE FIX: Force the filter to include both pending AND in_progress states by default
    const filter = {
      providerId: req.user.id,
      isDeleted: false,
      status: { $in: ["pending", "in_progress"] },
    };

    // If a user actively clicks the dropdown to filter by a specific status, override it
    if (req.query.status && req.query.status !== "all") {
      filter.status = req.query.status;
    }

    const bookings = await Booking.find(filter)
      .populate("customerId", "name email phone avatar")
      .populate("serviceId", "name category price description")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Booking.countDocuments(filter);
    const stats = await getBookingStats(req.user.id);

    res.status(200).json({
      success: true,
      data: bookings,
      pagination: { page, pages: Math.ceil(total / limit), total },
      stats,
    });
  } catch (error) {
    console.error("Incoming Booking Error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch bookings" });
  }
};
export const getOutgoingBookings = async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const filter = {
      customerId: req.user.id,
      isDeleted: false,
      status: {
        $in: ["pending", "in_progress"],
      },
    };

    const bookings = await Booking.find(filter)
      .populate("providerId", "name email phone avatar")
      .populate("serviceId", "name category price description")
      .sort({
        createdAt: -1,
      })
      .skip(skip)
      .limit(limit);

    const total = await Booking.countDocuments(filter);

    const stats = await getBookingStats(req.user.id);

    res.status(200).json({
      success: true,
      data: bookings,
      pagination: {
        page,
        pages: Math.ceil(total / limit),
        total,
      },
      stats,
    });
  } catch (error) {
    console.error("Outgoing Booking Error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch outgoing bookings",
      error: error.message,
    });
  }
};

export const getBookingHistory = async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const filter = {
      $or: [
        {
          customerId: req.user.id,
        },
        {
          providerId: req.user.id,
        },
      ],
      status: {
        $in: ["completed", "cancelled", "no_show"],
      },
      isDeleted: false,
    };

    const bookings = await Booking.find(filter)
      .populate("customerId", "name email phone avatar")
      .populate("providerId", "name email phone avatar")
      .populate("serviceId", "name category price description")
      // ✅ POPULATE THE RATING
      .populate({
        path: "rating", // This should match the ref in your Booking schema
        match: {
          // If you want only the current user's rating
          // reviewerId: req.user.id
        },
        options: {
          sort: { createdAt: -1 },
          limit: 1, // Get the most recent rating
        }
      })
      .sort({
        createdAt: -1,
      })
      .skip(skip)
      .limit(limit);

    const total = await Booking.countDocuments(filter);
    const stats = await getBookingStats(req.user.id);

    res.status(200).json({
      success: true,
      data: bookings,
      pagination: {
        page,
        pages: Math.ceil(total / limit),
        total,
      },
      stats,
    });
  } catch (error) {
    console.error("History Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch booking history",
      error: error.message,
    });
  }
};

export const getAllBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({
      $or: [
        {
          customerId: req.user.id,
        },

        {
          providerId: req.user.id,
        },
      ],

      isDeleted: false,
    })

      .populate("customerId")
      .populate("providerId")
      .populate("serviceId")

      .sort({
        createdAt: -1,
      });

    res.status(200).json({
      success: true,

      data: bookings,
    });
  } catch (error) {
    res.status(500).json({
      success: false,

      message: "Failed to fetch bookings",

      error: error.message,
    });
  }
};

export const getSingleBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)

      .populate("customerId")

      .populate("providerId")

      .populate("serviceId");

    if (!booking) {
      return res.status(404).json({
        success: false,

        message: "Booking not found",
      });
    }

    res.status(200).json({
      success: true,

      data: booking,
    });
  } catch (error) {
    res.status(500).json({
      success: false,

      message: "Failed to fetch booking",

      error: error.message,
    });
  }
};

// ACCEPT / CONFIRM BOOKING
// PUT /api/bookings/:id/accept
// ==========================================
// export const acceptBooking = async (req, res) => {
//   try {
//     const booking = await Booking.findById(req.params.id);

//     if (!booking) {
//       return res.status(404).json({
//         success: false,

//         message: "Booking not found",
//       });
//     }

//     if (String(booking.providerId) !== String(req.user.id)) {
//       return res.status(403).json({
//         success: false,

//         message: "You cannot confirm this booking",
//       });
//     }

//     booking.status = "confirmed";

//     booking.confirmedAt = new Date();

//     await booking.save();

//     res.json({
//       success: true,

//       message: "Booking confirmed successfully",

//       data: booking,
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,

//       message: "Failed to confirm booking",

//       error: error.message,
//     });
//   }
// };
export const acceptBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    if (String(booking.providerId) !== String(req.user.id)) {
      return res.status(403).json({
        success: false,
        message: "You cannot confirm this booking",
      });
    }

    // 🚀 THE STREAMLINED LIFECYCLE TRANSITION
    booking.status = "in_progress";
    booking.confirmedAt = new Date();
    booking.startedAt = new Date();

    // Clean historical conflict records from the document variables
    booking.cancelledAt = undefined;
    booking.cancelledReason = undefined;
    booking.completedAt = undefined;
    booking.rescheduledAt = undefined;
    booking.rescheduledReason = undefined;

    await booking.save();

    // 🚀 FIXED NOTIFICATION: Send a tracking notice back to the Customer account
    // All parameters are derived directly from the loaded "booking" record
    await createNotification({
      recipientId: booking.customerId, // 🛡️ Sent to the Customer dashboard list
      senderId: req.user.id, // 🛡️ Triggered from the active logged-in Provider
      title: "Service In Progress! 🛠️",
      message: `${booking.providerName} has accepted your booking for ${booking.serviceName} and is now working on it.`,
      type: "booking_accepted", // 🛡️ Matches your Notification type enum
      relatedId: booking._id,
      onModel: "Booking",
    });

    return res.status(200).json({
      success: true,
      message: "Booking accepted and is now in progress!",
      data: booking,
    });
  } catch (error) {
    console.error("❌ Accept Booking Controller Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to accept booking",
      error: error.message,
    });
  }
};

// ==========================================
// CANCEL BOOKING
// PUT /api/bookings/:id/cancel
// ==========================================
export const cancelBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    // Verify authorized access (Must be either the customer or the provider)
    const isCustomer = String(booking.customerId) === String(req.user.id);
    const isProvider = String(booking.providerId) === String(req.user.id);

    if (!isCustomer && !isProvider) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to cancel this booking",
      });
    }

    // Capture the cancel reason if passed in the body, fallback to default
    const reasonText = req.body.reason || "No reason provided";

    // Update state progression rules
    booking.status = "cancelled";
    booking.cancelledAt = new Date();
    booking.cancelledReason = reasonText;

    await booking.save();

    // 🚀 DYNAMIC NOTIFICATION DISPATCHER: Route recipient dynamically based on who canceled
    const recipientId = isCustomer ? booking.providerId : booking.customerId;
    const actorName = isCustomer ? booking.customerName : booking.providerName;

    await createNotification({
      recipientId: recipientId, // 🛡️ Sent to the opposite party dashboard
      senderId: req.user.id, // 🛡️ From the user who triggered the cancel
      title: "Booking Cancelled 🛑",
      message: `${actorName} has cancelled the booking for ${booking.serviceName}. Reason: ${reasonText}`,
      type: "booking_cancelled", // 🛡️ Matches your Notification type enum
      relatedId: booking._id,
      onModel: "Booking",
    });

    return res.json({
      success: true,
      message: "Booking cancelled successfully",
      data: booking,
    });
  } catch (error) {
    console.error("❌ Cancel Booking Controller Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to cancel booking",
      error: error.message,
    });
  }
};


// controllers/bookingController.js - Customer Cancel Booking

export const customerCancelBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    // Verify the user is the customer who made the booking
    const isCustomer = String(booking.customerId) === String(req.user.id);

    if (!isCustomer) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to cancel this booking",
      });
    }

    // Check if booking can be cancelled (only pending bookings)
    if (booking.status === "completed") {
      return res.status(400).json({
        success: false,
        message: "Completed bookings cannot be cancelled",
      });
    }

    if (booking.status === "cancelled") {
      return res.status(400).json({
        success: false,
        message: "Booking is already cancelled",
      });
    }

    // Capture the cancel reason from the body
    const reasonText = req.body.reason || "No reason provided";

    // Update booking status
    booking.status = "cancelled";
    booking.cancelledAt = new Date();
    booking.cancelledReason = reasonText;
    booking.cancelledBy = "customer"; // Track who cancelled

    await booking.save();

    // 🚀 SEND NOTIFICATION TO PROVIDER
    await createNotification({
      recipientId: booking.providerId, // Notify the provider
      senderId: req.user.id,
      title: "Booking Cancelled by Customer 🛑",
      message: `${booking.customerName || 'Customer'} has cancelled the booking for "${booking.serviceName}". Reason: ${reasonText}`,
      type: "booking_cancelled",
      relatedId: booking._id,
      onModel: "Booking",
    });

    // 🚀 SEND CONFIRMATION TO CUSTOMER (optional but good UX)
    await createNotification({
      recipientId: req.user.id,
      senderId: req.user.id,
      title: "Booking Cancelled Successfully ✅",
      message: `Your booking for "${booking.serviceName}" has been cancelled successfully.`,
      type: "booking_cancelled",
      relatedId: booking._id,
      onModel: "Booking",
    });

    // Process refund if payment was made
    if (booking.paymentStatus === "paid" || booking.paymentStatus === "partially_paid") {
      // You can trigger a refund process here
      // This would depend on your payment integration
      console.log(`💰 Refund initiated for booking ${booking._id} - Amount: ${booking.totalAmount}`);

      // Optionally update payment status
      booking.paymentStatus = "refunded";
      await booking.save();
    }

    return res.json({
      success: true,
      message: "Booking cancelled successfully",
      data: booking,
    });
  } catch (error) {
    console.error("❌ Cancel Booking Controller Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to cancel booking",
      error: error.message,
    });
  }
};


// ==========================================
// COMPLETE BOOKING
// PUT /api/bookings/:id/complete
// ==========================================
export const completeBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    // Verify authorized access
    if (String(booking.providerId) !== String(req.user.id)) {
      return res.status(403).json({
        success: false,
        message: "You cannot complete this booking",
      });
    }

    // Execute state progression rules
    booking.status = "completed";
    booking.completedAt = new Date();

    // Automatically flag payment status update if needed (e.g., cash transactions on delivery)
    if (booking.paymentMethod === "cash") {
      booking.paymentStatus = "paid";
    }

    await booking.save();

    // 🚀 TRIGGER NOTIFICATION: Send an alert to the Customer dashboard list
    // This tells them the job is done and explicitly asks for a platform review
    await createNotification({
      recipientId: booking.customerId, // 🛡️ Sent directly to the customer who booked the service
      senderId: req.user.id, // 🛡️ Triggered from the active logged-in Provider
      title: "Job Completed! 🎉",
      message: `${booking.providerName} has marked your service for ${booking.serviceName} as completed. Please take a moment to leave a review and rate their work!`,
      type: "booking_completed", // 🛡️ Aligns perfectly with your notification type enum
      relatedId: booking._id,
      onModel: "Booking",
    });

    return res.status(200).json({
      success: true,
      message: "Booking service completed successfully!",
      data: booking,
    });
  } catch (error) {
    console.error("❌ Complete Booking Controller Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to complete booking",
      error: error.message,
    });
  }
};

// ==========================================
// HELPER - BOOKING STATS
// ==========================================
const getBookingStats = async (userId) => {
  const result = await Booking.aggregate([
    {
      $match: {
        $or: [
          {
            customerId: userId,
          },
          {
            providerId: userId,
          },
        ],

        isDeleted: false,
      },
    },

    {
      $group: {
        _id: "$status",

        count: {
          $sum: 1,
        },
      },
    },
  ]);

  const stats = {
    total: 0,

    pending: 0,

    accepted: 0,

    completed: 0,

    cancelled: 0,
  };

  result.forEach((item) => {
    stats.total += item.count;

    if (item._id === "pending") stats.pending = item.count;

    if (item._id === "confirmed") stats.accepted = item.count;

    if (item._id === "completed") stats.completed = item.count;

    if (item._id === "cancelled") stats.cancelled = item.count;
  });

  return stats;
};

const formatBooking = (booking, currentUserId) => {
  const bookingObj = booking.toObject ? booking.toObject() : booking;

  return {
    _id: bookingObj._id,
    bookingRef: `BK${bookingObj._id.toString().slice(-6).toUpperCase()}`,

    role:
      bookingObj.providerId.toString() === currentUserId.toString()
        ? "provider"
        : "customer",

    customerId: bookingObj.customerId,
    providerId: bookingObj.providerId,

    customer: {
      name: bookingObj.customerName,
      email: bookingObj.customerEmail,
      phone: bookingObj.customerPhone,
      avatar: {
        url: `https://ui-avatars.com/api/?name=${encodeURIComponent(
          bookingObj.customerName,
        )}&background=0057FF&color=fff`,
      },
    },

    provider: {
      name: bookingObj.providerName,
      avatar: {
        url: `https://ui-avatars.com/api/?name=${encodeURIComponent(
          bookingObj.providerName,
        )}&background=6B7280&color=fff`,
      },
    },

    service: {
      _id: bookingObj.serviceId,
      name: bookingObj.serviceName,
      category: bookingObj.serviceCategory,
      price: bookingObj.servicePrice,
      duration: bookingObj.serviceDuration,
      types: bookingObj.serviceTypes,
    },

    bookingDate: bookingObj.bookingDate,

    time: bookingObj.bookingTime,

    location: bookingObj.location
      ? `${bookingObj.location.address}, ${bookingObj.location.city}${bookingObj.location.landmark
        ? ` (${bookingObj.location.landmark})`
        : ""
      }`
      : "Not specified",

    address: bookingObj.location?.address,
    city: bookingObj.location?.city,
    landmark: bookingObj.location?.landmark,
    coordinates: bookingObj.location?.coordinates,

    paymentMethod: bookingObj.paymentMethod,
    paymentStatus: bookingObj.paymentStatus,

    totalPrice: bookingObj.totalAmount,

    notes: bookingObj.specialInstructions || bookingObj.notes || "",

    status: bookingObj.status,

    createdAt: bookingObj.createdAt,
    updatedAt: bookingObj.updatedAt,
    confirmedAt: bookingObj.confirmedAt,
    completedAt: bookingObj.completedAt,
    cancelledAt: bookingObj.cancelledAt,
  };
};

export const muteOnboardingAlert = async (req, res) => {
  try {
    const userId = req.user.id; // Populated from your auth middleware

    // Use -1 as a cloud flag meaning "Don't show onboarding again"
    await User.findByIdAndUpdate(userId, {
      $set: { "trust.total_ratings": -1 },
    });

    return res.status(200).json({
      success: true,
      message: "Onboarding reminder preferences saved successfully.",
    });
  } catch (error) {
    console.error("❌ Preference Update Failure:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error while saving preferences.",
    });
  }
};

// GET /api/bookings/pending
export const getPendingRequests = async (req, res) => {
  try {
    const providerId = req.user.id; // Populated from your protection middleware

    // Fetch the 3 newest pending jobs to keep the dashboard view clean and fast
    const pending = await Booking.find({
      providerId: providerId,
      status: "pending",
    })
      .sort({ createdAt: -1 })
      .limit(3);

    return res.status(200).json({
      success: true,
      data: pending,
    });
  } catch (error) {
    console.error("❌ Fetch Pending Requests Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error occurred while pulling your pending queue.",
    });
  }
};

// PATCH /api/bookings/:id/respond
export const respondToRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { action } = req.body; // Expects either 'accepted' or 'declined'
    const providerId = req.user.id;

    if (!["confirmed", "cancelled"].includes(action)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid choice parameter provided. Action must be 'accepted' or 'declined'.",
      });
    }

    // Verify booking belongs to this specific provider before editing
    const booking = await Booking.findOne({ _id: id, providerId: providerId });
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "The requested job was not found or is unauthorized.",
      });
    }

    if (booking.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: `This job can no longer be updated because its current status is: ${booking.status}.`,
      });
    }

    // Process and update status field
    booking.status = action;
    await booking.save();

    return res.status(200).json({
      success: true,
      message: `Job request has been successfully ${action}!`,
      data: booking,
    });
  } catch (error) {
    console.error("❌ Respond Request Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error updating booking status.",
    });
  }
};
