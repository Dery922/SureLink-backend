// backend/controllers/providerController.js

import User from "../models/User.js";
import Service from "../models/Service.js";
import cloudinary from "../config/cloudinary.js";
import Gallery from "../models/Gallery.js";

// Upload images to Cloudinary and save to database
export const uploadGalleryImages = async (req, res) => {
  try {
    const files = req.files;

    if (!files || files.length === 0) {
      return res.status(400).json({
        success: false,
        error: "No files uploaded",
      });
    }

    const uploadedImages = [];
    const errors = [];

    // Process each file
    for (const file of files) {
      try {
        // Upload to Cloudinary
        const result = await cloudinary.uploader.upload(file.path, {
          folder: `providers/${req.user.id}/gallery`,
          resource_type: "image",
          transformation: [{ quality: "auto:good" }, { fetch_format: "auto" }],
        });

        // Save to database
        const galleryItem = new Gallery({
          providerId: req.user.id,
          imageUrl: result.secure_url,
          publicId: result.public_id,
          title: file.originalname.split(".")[0] || "Untitled",
        });

        await galleryItem.save();
        uploadedImages.push(galleryItem);

        // Clean up temp file
        try {
          const fs = await import("fs");
          fs.unlinkSync(file.path);
        } catch (cleanupError) {
          console.warn("Failed to clean up temp file:", file.path);
        }
      } catch (error) {
        errors.push({
          file: file.originalname,
          error: error.message,
        });
        console.error(`Error uploading ${file.originalname}:`, error);
      }
    }

    // If all files failed
    if (uploadedImages.length === 0) {
      return res.status(500).json({
        success: false,
        error: "Failed to upload any images",
        details: errors,
      });
    }

    // Return success with uploaded images
    res.status(201).json({
      success: true,
      message: `Successfully uploaded ${uploadedImages.length} image(s)`,
      data: uploadedImages,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("Error uploading gallery images:", error);
    res.status(500).json({
      success: false,
      error: "Failed to upload images",
    });
  }
};

/**
 * GET /api/gallery/user/:userId
 * Get gallery images for a specific user (owner sees all, others see public only)
 */
export const getGalleryByUserId = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const { page = 1, limit = 20 } = req.query;

    // Check if the user exists
    const user = await User.findById(userId).select("name email roles");
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // FIXED: Use providerId instead of userId
    const filter = { providerId: userId }; // ← CHANGED HERE

    // Fetch gallery
    const [gallery, total] = await Promise.all([
      Gallery.find(filter)
        .sort({ createdAt: -1 })
        .skip((parseInt(page) - 1) * parseInt(limit))
        .limit(parseInt(limit))
        .lean(),
      Gallery.countDocuments(filter),
    ]);

    // Add isOwner flag to each image
    const imagesWithFlag = gallery.map((img) => ({
      ...img,
      isOwner: true,
    }));

    res.status(200).json({
      success: true,
      data: imagesWithFlag,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit)),
        hasMore: total > parseInt(page) * parseInt(limit),
      },
      user: {
        id: user._id,
        name: user.name,
        isOwner: true,
      },
    });
  } catch (error) {
    console.error("Error fetching user gallery:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch gallery",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * Save provider services (Create/Update/Delete)
 * POST /api/services/save
 */
export const saveProviderServices = async (req, res) => {
  try {
    const { services } = req.body;
    const userId = req.user?.id || req.user?._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
    }

    if (!services || !Array.isArray(services)) {
      return res.status(400).json({
        success: false,
        message: "Services array is required",
      });
    }

    // Find the user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Check if user is a provider
    if (user.type !== "provider" && !user.roles?.includes("provider")) {
      return res.status(403).json({
        success: false,
        message: "Only providers can manage services",
      });
    }

    // Validate each service
    for (const service of services) {
      if (!service.name || service.name.trim() === "") {
        return res.status(400).json({
          success: false,
          message: "Service name is required for all services",
        });
      }

      if (!service.category || service.category.trim() === "") {
        return res.status(400).json({
          success: false,
          message: `Category is required for service: ${service.name}`,
        });
      }

      // Validate pricing based on model
      if (service.pricingModel === "package") {
        const price = service.basePrice || service.price;
        if (!price || price <= 0) {
          return res.status(400).json({
            success: false,
            message: `Valid base price is required for service: ${service.name}`,
          });
        }
      } else if (service.pricingModel === "individual") {
        if (!service.serviceTypes || service.serviceTypes.length === 0) {
          return res.status(400).json({
            success: false,
            message: `At least one service type is required for individual pricing: ${service.name}`,
          });
        }
        // Check if all service types have prices
        const missingPrices = service.serviceTypes.filter(
          (type) =>
            !service.individualPrices?.[type] ||
            service.individualPrices[type] <= 0,
        );
        if (missingPrices.length > 0) {
          return res.status(400).json({
            success: false,
            message: `Missing prices for service types: ${missingPrices.join(", ")}`,
          });
        }
      }
    }

    // Get existing service IDs from the request (exclude temp IDs)
    const serviceIds = services
      .filter((s) => s._id && !s._id.startsWith("service-"))
      .map((s) => s._id);

    // Delete services that are no longer in the list
    if (serviceIds.length > 0) {
      await Service.deleteMany({
        provider_id: userId,
        _id: { $nin: serviceIds },
      });
    } else {
      // If no service IDs provided, delete all services for this provider
      await Service.deleteMany({ provider_id: userId });
    }

    // Process each service (create or update)
    const savedServices = [];
    for (const serviceData of services) {
      let service;

      // Check if this is an existing service (has an ID that's not a temp ID)
      const isExisting =
        serviceData._id && !serviceData._id.startsWith("service-");

      // Prepare service data
      const servicePayload = {
        name: serviceData.name.trim(),
        description: serviceData.description?.trim() || "",
        category: serviceData.category.trim(),
        serviceTypes: serviceData.serviceTypes || [],
        pricingModel: serviceData.pricingModel || "package",
        priceType: serviceData.priceType || "fixed",
        is_active: serviceData.isActive !== false,
        tags: serviceData.tags
          ? serviceData.tags
              .split(",")
              .map((t) => t.trim())
              .filter(Boolean)
          : [],
        imageUrl: serviceData.imageUrl || "",
      };

      // Set pricing based on model
      if (serviceData.pricingModel === "package") {
        servicePayload.basePrice = parseFloat(
          serviceData.basePrice || serviceData.price || 0,
        );
        servicePayload.price = parseFloat(
          serviceData.basePrice || serviceData.price || 0,
        ); // Keep legacy field
        servicePayload.individualPrices = {};
      } else if (serviceData.pricingModel === "individual") {
        servicePayload.basePrice = 0;
        servicePayload.price = 0; // Legacy field
        // Convert individualPrices object to Map
        const individualPrices = new Map();
        if (serviceData.individualPrices) {
          Object.entries(serviceData.individualPrices).forEach(
            ([key, value]) => {
              individualPrices.set(key, parseFloat(value) || 0);
            },
          );
        }
        servicePayload.individualPrices = individualPrices;
      }

      if (isExisting) {
        // Update existing service
        service = await Service.findOneAndUpdate(
          {
            _id: serviceData._id,
            provider_id: userId,
          },
          servicePayload,
          { new: true, runValidators: true },
        );

        if (!service) {
          // If service not found, create it as new
          service = new Service({
            provider_id: userId,
            ...servicePayload,
          });
          await service.save();
        }
      } else {
        // Create new service
        service = new Service({
          provider_id: userId,
          ...servicePayload,
        });
        await service.save();
      }

      savedServices.push(service);
    }

    return res.status(200).json({
      success: true,
      message: "Services saved successfully",
      data: {
        services: savedServices,
        count: savedServices.length,
      },
    });
  } catch (error) {
    console.error("Error saving provider services:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to save services",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// Get all services for a provider
export const getProviderServices = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Check if user is a provider
    if (user.type !== "provider" && !user.roles.includes("provider")) {
      return res.status(403).json({
        success: false,
        message: "Only providers can access services",
      });
    }

    const services = await Service.find({ provider_id: userId }).sort({
      createdAt: -1,
    });

    console.log(services);

    return res.status(200).json({
      success: true,
      data: {
        services: services,
        count: services.length,
      },
    });
  } catch (error) {
    console.error("Error fetching provider services:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch services",
      error: error.message,
    });
  }
};

// Add a single service
export const addProviderService = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const serviceData = req.body;

    // Validate required fields
    if (!serviceData.name || serviceData.name.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Service name is required",
      });
    }
    if (!serviceData.price || serviceData.price <= 0) {
      return res.status(400).json({
        success: false,
        message: "Valid price is required",
      });
    }
    if (!serviceData.category || serviceData.category.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Category is required",
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Check if user is a provider
    if (user.type !== "provider" && !user.roles.includes("provider")) {
      return res.status(403).json({
        success: false,
        message: "Only providers can add services",
      });
    }

    // Create new service
    const newService = new Service({
      provider_id: userId,
      name: serviceData.name.trim(),
      description: serviceData.description?.trim() || "",
      category: serviceData.category.trim(),
      price: parseFloat(serviceData.price),
      is_active: serviceData.isActive !== false,
      gallery: serviceData.gallery || [],
    });

    await newService.save();

    return res.status(201).json({
      success: true,
      message: "Service added successfully",
      data: newService,
    });
  } catch (error) {
    console.error("Error adding provider service:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to add service",
      error: error.message,
    });
  }
};

// Update a single service
export const updateProviderService = async (req, res) => {
  try {
    const { serviceId } = req.params;
    const userId = req.user?.id || req.user?._id;
    const updateData = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Check if user is a provider
    if (user.type !== "provider" && !user.roles.includes("provider")) {
      return res.status(403).json({
        success: false,
        message: "Only providers can update services",
      });
    }

    // Validate updates
    if (updateData.name && updateData.name.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Service name cannot be empty",
      });
    }
    if (updateData.price && updateData.price <= 0) {
      return res.status(400).json({
        success: false,
        message: "Price must be greater than 0",
      });
    }
    if (updateData.category && updateData.category.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Category cannot be empty",
      });
    }

    // Find and update the service
    const service = await Service.findOneAndUpdate(
      {
        _id: serviceId,
        provider_id: userId,
      },
      {
        name: updateData.name?.trim(),
        description: updateData.description?.trim(),
        category: updateData.category?.trim(),
        price: updateData.price ? parseFloat(updateData.price) : undefined,
        is_active:
          updateData.isActive !== undefined ? updateData.isActive : undefined,
        gallery: updateData.gallery || undefined,
        updatedAt: new Date(),
      },
      { new: true, runValidators: true },
    );

    if (!service) {
      return res.status(404).json({
        success: false,
        message: "Service not found or you don't have permission to update it",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Service updated successfully",
      data: service,
    });
  } catch (error) {
    console.error("Error updating provider service:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update service",
      error: error.message,
    });
  }
};

// Delete a single service
export const deleteProviderService = async (req, res) => {
  try {
    const { serviceId } = req.params;
    const userId = req.user?.id || req.user?._id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Check if user is a provider
    if (user.type !== "provider" && !user.roles.includes("provider")) {
      return res.status(403).json({
        success: false,
        message: "Only providers can delete services",
      });
    }

    // Find and delete the service
    const service = await Service.findOneAndDelete({
      _id: serviceId,
      provider_id: userId,
    });

    if (!service) {
      return res.status(404).json({
        success: false,
        message: "Service not found or you don't have permission to delete it",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Service deleted successfully",
      data: service,
    });
  } catch (error) {
    console.error("Error deleting provider service:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete service",
      error: error.message,
    });
  }
};

// Toggle service status (active/inactive)
export const toggleServiceStatus = async (req, res) => {
  try {
    const { serviceId } = req.params;
    const userId = req.user?.id || req.user?._id;
    const { isActive } = req.body;

    if (isActive === undefined) {
      return res.status(400).json({
        success: false,
        message: "isActive status is required",
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Check if user is a provider
    if (user.type !== "provider" && !user.roles.includes("provider")) {
      return res.status(403).json({
        success: false,
        message: "Only providers can update service status",
      });
    }

    // Find and update the service
    const service = await Service.findOneAndUpdate(
      {
        _id: serviceId,
        provider_id: userId,
      },
      {
        is_active: isActive,
        updatedAt: new Date(),
      },
      { new: true },
    );

    if (!service) {
      return res.status(404).json({
        success: false,
        message: "Service not found or you don't have permission to update it",
      });
    }

    return res.status(200).json({
      success: true,
      message: `Service ${isActive ? "activated" : "paused"} successfully`,
      data: service,
    });
  } catch (error) {
    console.error("Error toggling service status:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update service status",
      error: error.message,
    });
  }
};

// Get service statistics for a provider
export const getServiceStats = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Check if user is a provider
    if (user.type !== "provider" && !user.roles.includes("provider")) {
      return res.status(403).json({
        success: false,
        message: "Only providers can access service statistics",
      });
    }

    const services = await Service.find({ provider_id: userId });
    const totalServices = services.length;
    const activeServices = services.filter((s) => s.is_active).length;
    const inactiveServices = totalServices - activeServices;
    const totalValue = services.reduce((sum, s) => sum + s.price, 0);

    return res.status(200).json({
      success: true,
      data: {
        total: totalServices,
        active: activeServices,
        inactive: inactiveServices,
        totalValue: totalValue.toFixed(2),
        services: services,
      },
    });
  } catch (error) {
    console.error("Error fetching service stats:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch service statistics",
      error: error.message,
    });
  }
};
