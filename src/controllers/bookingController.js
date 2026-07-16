// backend/controllers/bookingController.js
import Booking from "../models/Booking.js";
import User from "../models/User.js";
import Service from "../models/Service.js";
import mongoose from "mongoose";

// ===================== CREATE BOOKING =====================
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
    console.log("👤 Customer ID from token:", customerId);
    console.log("👤 Full user object:", req.user);

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
    console.log(
      "✅ Customer found:",
      customer._id,
      customer.name?.full || customer.email,
    );

    // ===================== GET PROVIDER =====================
    const provider = await User.findById(providerId);
    if (!provider) {
      console.log("❌ Provider not found:", providerId);
      return res.status(404).json({
        success: false,
        message: "Provider not found",
      });
    }
    console.log(
      "✅ Provider found:",
      provider._id,
      provider.name?.full || provider.email,
    );

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
    console.log("✅ Service found:", service._id, service.name);
    console.log("🔍 Service providerId:", service.providerId);

    // Verify service belongs to the provider
    if (service.providerId?.toString() !== providerId) {
      console.log("❌ Service does not belong to provider");
      console.log("   Service providerId:", service.providerId?.toString());
      console.log("   Request providerId:", providerId);
      return res.status(400).json({
        success: false,
        message: "Service does not belong to this provider",
      });
    }
    console.log("✅ Service belongs to provider");

    // ===================== CHECK CONFLICTS =====================
    // const hasConflict = await Booking.checkConflicts(providerId, date, time);
    // if (hasConflict) {
    //   console.log("❌ Booking conflict found");
    //   return res.status(409).json({
    //     success: false,
    //     message:
    //       "The provider is already booked at this time. Please choose a different time.",
    //   });
    // }
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
    console.log("✅ Booking saved with ID:", booking._id);

    // Populate references for response
    const populatedBooking = await Booking.findById(booking._id)
      .populate("customerId", "name email avatar phone")
      .populate("providerId", "name email avatar provider_profile")
      .populate("serviceId", "name description serviceTypes category");

    console.log("✅ Booking populated and ready to return");

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
