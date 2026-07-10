// backend/controllers/bookingController.js
import Booking from "../models/Booking.js";
import User from "../models/User.js";
import Service from "../models/Service.js";
import mongoose from "mongoose";

// ===================== CREATE BOOKING =====================
// backend/controllers/bookingController.js

// ===================== CREATE BOOKING =====================
// backend/controllers/bookingController.js

export const createBooking = async (req, res) => {
  try {
    const bookingData = req.body;
    const customerId = req.user?._id || req.user?.id;

    if (!customerId) {
      return res
        .status(401)
        .json({ success: false, message: "User not authenticated" });
    }

    // 1. Parallel Fetching: Get Customer, Provider, and Service at once
    const [customer, provider, service] = await Promise.all([
      User.findById(customerId).lean(),
      User.findById(bookingData.providerId).lean(),
      Service.findById(bookingData.serviceId).lean(),
    ]);

    // 2. Clear, structural checks
    if (!customer)
      return res
        .status(404)
        .json({ success: false, message: "Customer not found" });
    if (!provider)
      return res
        .status(404)
        .json({ success: false, message: "Provider not found" });
    if (!service)
      return res
        .status(404)
        .json({ success: false, message: "Service not found" });

    // 3. Verify business logic roles
    const isProvider =
      provider.type === "provider" || provider.roles?.includes("provider");
    if (!isProvider) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Selected user is not a service provider",
        });
    }

    if (service.providerId?.toString() !== bookingData.providerId) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Service does not belong to this provider",
        });
    }

    // 4. Fallback pricing engine
    const finalPrice =
      bookingData.servicePrice ?? service.basePrice ?? service.price ?? 0;
    const finalDeposit = bookingData.depositAmount ?? 0;
    const finalTotal = bookingData.totalAmount ?? finalPrice;

    // 5. Structure data utilizing Mongoose schema validations
    const booking = new Booking({
      customerId,
      customerName:
        bookingData.customerName ||
        customer.name?.full ||
        customer.email ||
        "Customer",
      customerEmail: customer.email,
      customerPhone: customer.phone,

      providerId: provider._id,
      providerName:
        bookingData.providerName ||
        provider.name?.full ||
        provider.name ||
        "Provider",

      serviceId: service._id,
      serviceName: bookingData.serviceName || service.name,
      servicePrice: finalPrice,
      serviceDuration:
        bookingData.serviceDuration || service.duration || "Variable",
      serviceCategory: bookingData.serviceCategory || service.category,
      serviceTypes: bookingData.serviceTypes || service.serviceTypes || [],

      bookingDate: new Date(bookingData.date),
      bookingTime: bookingData.time,

      location: {
        address: bookingData.address,
        city: bookingData.city,
        landmark: bookingData.landmark || "",
      },

      paymentMethod: bookingData.paymentMethod || "mobile-money",
      totalAmount: finalTotal,
      depositAmount: finalDeposit,
      remainingAmount: finalTotal - finalDeposit,
      specialInstructions: bookingData.specialInstructions || "",

      metadata: {
        source: "web",
        ipAddress: req.ip || req.headers["x-forwarded-for"] || "",
        userAgent: req.headers["user-agent"] || "",
      },
    });

    // 6. Save and populate documents instantly without extra DB trips
    await booking.save();

    await booking.populate([
      { path: "customerId", select: "name email avatar phone" },
      { path: "providerId", select: "name email avatar provider_profile" },
      { path: "serviceId", select: "name description serviceTypes category" },
    ]);

    return res.status(201).json({
      success: true,
      message: "Booking created successfully",
      data: booking,
    });
  } catch (error) {
    console.error("❌ Booking Error:", error);

    // Dynamic Safe Environment Check to eliminate ReferenceErrors
    const isDev =
      typeof process !== "undefined" && process.env?.NODE_ENV === "development";

    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors: Object.values(error.errors).map((err) => err.message),
      });
    }

    if (error.name === "CastError") {
      return res
        .status(400)
        .json({
          success: false,
          message: `Invalid data format for ${error.path}`,
        });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to create booking",
      error: error.message,
      stack: isDev ? error.stack : undefined,
    });
  }
};

// ... rest of the controller functions remain the same
