// backend/controllers/providerController.js

import User from "../models/User.js";
import Service from "../models/Service.js";
import cloudinary from "../config/cloudinary.js";
import Gallery from "../models/Gallery.js";
import Activity from "../models/Activity.js";

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
        providerId: userId,
        _id: { $nin: serviceIds },
      });
    } else {
      // If no service IDs provided, delete all services for this provider
      await Service.deleteMany({ providerId: userId });
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
        tags: Array.isArray(serviceData.tags)
          ? serviceData.tags.map((t) => t.trim()).filter(Boolean)
          : typeof serviceData.tags === "string" && serviceData.tags
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
            providerId: userId,
          },
          servicePayload,
          { new: true, runValidators: true },
        );

        if (!service) {
          // If service not found, create it as new
          service = new Service({
            providerId: userId,
            ...servicePayload,
          });
          await service.save();
        }
      } else {
        // Create new service
        service = new Service({
          providerId: userId,
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

export const getProviderById = async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Run database queries concurrently for maximum efficiency
    const [provider, services, gallery] = await Promise.all([
      User.findOne({ _id: id, type: "provider" }).select("-security"), // Exclude sensitive security data
      Service.find({ providerId: id, is_active: true }), // Fetch only active services
      Gallery.find({ providerId: id }).sort({ createdAt: -1 }), // Fetch gallery items (newest first)
    ]);

    // 2. Validate provider existence and role type
    if (!provider) {
      return res.status(404).json({
        success: false,
        message: "Provider profile not found.",
      });
    }

    // 3. Return the consolidated provider profile package
    return res.status(200).json({
      success: true,
      data: {
        provider,
        services,
        gallery,
      },
    });
  } catch (error) {
    // 4. Catch invalid MongoDB ObjectIds or unexpected errors
    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid provider ID format.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "An internal server error occurred while fetching the provider.",
      error: error.message,
    });
  }
};


//   try {
//     const { id } = req.params;

//     console.log("Fetching provider with ID:", id);

//     // Find the user by ID and populate services and gallery
//     const provider = await User.findById(id)
//       .populate({
//         path: "services",
//         match: { is_active: true }, // Only get active services
//         select: "-__v", // Exclude version field
//         options: { sort: { createdAt: -1 } }, // Sort by newest first
//       })
//       .populate({
//         path: "gallery",
//         select: "-__v",
//         options: { sort: { createdAt: -1 } },
//       })
//       .select("-password -__v"); // Exclude sensitive fields

//     if (!provider) {
//       return res.status(404).json({
//         success: false,
//         message: "Provider not found",
//       });
//     }

//     // Transform the data to include counts and summaries
//     const providerData = provider.toObject();

//     // Add additional computed fields
//     providerData._meta = {
//       servicesCount: providerData.services?.length || 0,
//       galleryCount: providerData.gallery?.length || 0,
//       activeServices:
//         providerData.services?.filter((s) => s.is_active !== false)?.length ||
//         0,
//     };

//     // Calculate price range if services exist
//     if (providerData.services && providerData.services.length > 0) {
//       const prices = providerData.services
//         .filter((s) => s.basePrice || s.price)
//         .map((s) => s.basePrice || s.price || 0);

//       if (prices.length > 0) {
//         providerData._meta.priceRange = {
//           min: Math.min(...prices),
//           max: Math.max(...prices),
//         };
//       }
//     }

//     console.log(
//       `✅ Provider found: ${providerData.name?.full || providerData.name}`,
//     );
//     console.log(
//       `📊 Services: ${providerData._meta.servicesCount}, Gallery: ${providerData._meta.galleryCount}`,
//     );

//     return res.status(200).json({
//       success: true,
//       data: providerData,
//     });
//   } catch (error) {
//     console.error("Error fetching provider:", error);
//     return res.status(500).json({
//       success: false,
//       message: "Failed to fetch provider",
//       error: error.message,
//     });
//   }
// };

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

    const services = await Service.find({ providerId: userId }).sort({
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
      providerId: userId,
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
        providerId: userId,
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
    const { id } = req.params; // Changed from serviceId to id to match route
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
      _id: id, // Changed from serviceId to id
      providerId: userId,
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
        providerId: userId,
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

    const services = await Service.find({ providerId: userId });
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

export const deleteProviderGallery = async (req, res) => {
  try {
    console.log("🗑️ Delete request received:", {
      params: req.params,
      user: req.user?.id,
      headers: req.headers,
    });

    const { imageId } = req.params;
    const userId = req.user?.id || req.user?._id;

    // Validate input
    if (!imageId) {
      console.log("❌ No imageId provided");
      return res.status(400).json({
        success: false,
        message: "Image ID is required",
      });
    }

    if (!userId) {
      console.log("❌ No user ID found");
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
    }

    // Find the user
    const user = await User.findById(userId);
    if (!user) {
      console.log("❌ User not found:", userId);
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Check if user is a provider
    if (user.type !== "provider" && !user.roles?.includes("provider")) {
      console.log("❌ User is not a provider:", userId);
      return res.status(403).json({
        success: false,
        message: "Only providers can delete gallery images",
      });
    }

    console.log(`🔍 Looking for image: ${imageId} for provider: ${userId}`);

    // Find the gallery image - using providerId as per your model
    const galleryImage = await Gallery.findOne({
      _id: imageId,
      providerId: userId,
    });

    if (!galleryImage) {
      console.log("❌ Image not found:", imageId);
      return res.status(404).json({
        success: false,
        message: "Image not found or you don't have permission to delete it",
      });
    }

    console.log(`✅ Found image:`, {
      id: galleryImage._id,
      publicId: galleryImage.publicId,
      providerId: galleryImage.providerId,
    });

    // Delete from Cloudinary using the publicId
    let cloudinaryDeleted = false;
    if (galleryImage.publicId) {
      try {
        console.log(`🗑️ Deleting from Cloudinary: ${galleryImage.publicId}`);

        const result = await cloudinary.uploader.destroy(
          galleryImage.publicId,
          {
            invalidate: true,
          },
        );

        console.log(`📊 Cloudinary result:`, result);

        if (result.result === "ok") {
          cloudinaryDeleted = true;
          console.log(`✅ Cloudinary deletion successful`);
        } else {
          console.warn(`⚠️ Cloudinary deletion result: ${result.result}`);
        }
      } catch (cloudinaryError) {
        console.error("❌ Cloudinary error:", cloudinaryError);
        // Continue with database deletion
      }
    }

    // Delete from database
    const deletedImage = await Gallery.findByIdAndDelete(imageId);

    console.log(`✅ Database deletion successful`);

    return res.status(200).json({
      success: true,
      message: "Image deleted successfully",
      data: {
        id: imageId,
        publicId: galleryImage.publicId,
        deletedFromCloudinary: cloudinaryDeleted,
      },
    });
  } catch (error) {
    console.error("❌ Error deleting gallery image:", error);
    console.error("❌ Error stack:", error.stack);
    return res.status(500).json({
      success: false,
      message: "Failed to delete image",
      error: error.message,
    });
  }
};

// Get user activities
export const getUserActivities = async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 10, page = 1 } = req.query;

    const activities = await Activity.find({
      userId,
      isDeleted: false,
    })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await Activity.countDocuments({
      userId,
      isDeleted: false,
    });

    res.status(200).json({
      success: true,
      data: activities,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching activities:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch activities",
    });
  }
};

// Create activity (called from booking creation, etc.)
export const createActivity = async (req, res) => {
  try {
    const userId = req.user.id;
    const { type, title, description, amount, status, metadata } = req.body;

    const activity = await Activity.create({
      userId,
      type,
      title,
      description,
      amount,
      status,
      metadata,
    });

    res.status(201).json({
      success: true,
      data: activity,
    });
  } catch (error) {
    console.error("Error creating activity:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create activity",
    });
  }
};

// Soft delete activity
export const deleteActivity = async (req, res) => {
  try {
    const { activityId } = req.params;
    const userId = req.user.id;

    const activity = await Activity.findOne({
      _id: activityId,
      userId,
    });

    if (!activity) {
      return res.status(404).json({
        success: false,
        message: "Activity not found",
      });
    }

    // Soft delete
    activity.isDeleted = true;
    activity.deletedAt = new Date();
    await activity.save();

    res.status(200).json({
      success: true,
      message: "Activity deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting activity:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete activity",
    });
  }
};

// Soft delete all activities
export const deleteAllActivities = async (req, res) => {
  try {
    const userId = req.user.id;

    await Activity.updateMany(
      { userId },
      {
        isDeleted: true,
        deletedAt: new Date(),
      },
    );

    res.status(200).json({
      success: true,
      message: "All activities deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting all activities:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete activities",
    });
  }
};

// Get recent activities (limited for dashboard)
export const getRecentActivities = async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 5 } = req.query;

    const activities = await Activity.find({
      userId,
      isDeleted: false,
    })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .lean();

    res.status(200).json({
      success: true,
      message: "Recent activities retrieved successfully",
      data: activities,
      count: activities.length,
    });
  } catch (error) {
    console.error("❌ Error fetching recent activities:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch recent activities",
      error: error.message,
    });
  }
};

export const getActivityStats = async (req, res) => {
  try {
    const userId = req.user.id;

    const [total, byType, recent] = await Promise.all([
      Activity.countDocuments({ userId, isDeleted: false }),
      Activity.aggregate([
        { $match: { userId, isDeleted: false } },
        { $group: { _id: "$type", count: { $sum: 1 } } },
      ]),
      Activity.find({ userId, isDeleted: false })
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
    ]);

    // Format stats by type
    const statsByType = {};
    byType.forEach((item) => {
      statsByType[item._id] = item.count;
    });

    res.status(200).json({
      success: true,
      message: "Activity statistics retrieved successfully",
      data: {
        total,
        byType: statsByType,
        recent,
      },
    });
  } catch (error) {
    console.error("❌ Error fetching activity stats:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch activity statistics",
      error: error.message,
    });
  }
};

// Restore all activities
export const restoreAllActivities = async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await Activity.updateMany(
      { userId, isDeleted: true },
      {
        isDeleted: false,
        deletedAt: null,
      },
    );

    res.status(200).json({
      success: true,
      message: "All activities restored successfully",
      data: {
        restoredCount: result.modifiedCount,
      },
    });
  } catch (error) {
    console.error("❌ Error restoring all activities:", error);
    res.status(500).json({
      success: false,
      message: "Failed to restore activities",
      error: error.message,
    });
  }
};

// Restore activity
export const restoreActivity = async (req, res) => {
  try {
    const { activityId } = req.params;
    const userId = req.user.id;

    const activity = await Activity.findOne({
      _id: activityId,
      userId,
    });

    if (!activity) {
      return res.status(404).json({
        success: false,
        message: "Activity not found",
      });
    }

    activity.isDeleted = false;
    activity.deletedAt = null;
    await activity.save();

    res.status(200).json({
      success: true,
      message: "Activity restored successfully",
    });
  } catch (error) {
    console.error("Error restoring activity:", error);
    res.status(500).json({
      success: false,
      message: "Failed to restore activity",
    });
  }
};

export const updateUserProfile = async (req, res) => {
  try {
    const activeUserId = req.user?._id || req.user?.id;

    if (!activeUserId) {
      return res.status(401).json({
        success: false,
        message: "User session token verification failed",
      });
    }

    // Flatten parameters manually into a single safe update map
    const updateFields = {};

    // 1. Root Level Standard Fields Whitelist
    if (req.body.name) updateFields.name = req.body.name;

    if (req.body.services) updateFields.services = req.body.services;
    if (req.body.gallery) updateFields.gallery = req.body.gallery;

    // 2. 🚀 THE CRITICAL FLAT-SET FIX FOR NESTED OBJECTS:
    // We map sub-properties explicitly to protect existing fields from deletion
    if (req.body.provider_profile) {
      const pp = req.body.provider_profile;
      if (pp.bio !== undefined) updateFields["provider_profile.bio"] = pp.bio;
      if (pp.category !== undefined)
        updateFields["provider_profile.category"] = pp.category;
      if (pp.secondaryCategories !== undefined)
        updateFields["provider_profile.secondaryCategories"] =
          pp.secondaryCategories;
      if (pp.service_area !== undefined)
        updateFields["provider_profile.service_area"] = pp.service_area;
      if (pp.service_radius_km !== undefined)
        updateFields["provider_profile.service_radius_km"] = Number(
          pp.service_radius_km,
        );
      if (pp.experience_years !== undefined)
        updateFields["provider_profile.experience_years"] = Number(
          pp.experience_years,
        );
      if (pp.hourly_rate !== undefined)
        updateFields["provider_profile.hourly_rate"] = Number(pp.hourly_rate);
      if (pp.base_price !== undefined)
        updateFields["provider_profile.base_price"] = Number(pp.base_price);
      if (pp.open_for_work !== undefined)
        updateFields["provider_profile.open_for_work"] = pp.open_for_work;
    }

    // 3. Home Address Subdocument Safe Mapping
    if (req.body.home_address) {
      const ha = req.body.home_address;
      if (ha.street !== undefined)
        updateFields["home_address.street"] = ha.street;
      if (ha.area !== undefined) updateFields["home_address.area"] = ha.area;
      if (ha.gps_code !== undefined)
        updateFields["home_address.gps_code"] = ha.gps_code;
      if (ha.coordinates !== undefined)
        updateFields["home_address.coordinates"] = ha.coordinates;
    }

    // 4. 🛑 SECURITY SAFEGUARD: Never allow email tampering via a generic patch profile endpoint
    // Changes to email configurations must run through a distinct route to prevent verification exploits!

    delete updateFields.status;
    delete updateFields.roles;
    delete updateFields.isVerified;

    // 5. Commit calculations and retrieve modified profile document record
    const updatedUser = await User.findByIdAndUpdate(
      activeUserId,
      { $set: updateFields },
      { new: true, runValidators: true }, // 'new: true' pushes the updated state package back
    ).select("-password"); // Strip encrypted secret values out entirely

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully!",
      data: updatedUser,
    });
  } catch (error) {
    console.error("❌ Profile Update Process Error:", error);

    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: Object.values(error.errors)
          .map((err) => err.message)
          .join(", "),
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to update profile",
      error: error.message,
    });
  }
};
