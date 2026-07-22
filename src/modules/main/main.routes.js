import { Router } from "express";
import { authMiddleware } from "../auth/auth.validation.middleware.js";
import { upload } from "../../middleware/uploadMiddlware.js";
import {
  getMarketplaceProviders,
  getProviderServices,
} from "../../controllers/authController.js";
import {
  saveProviderServices,
  uploadGalleryImages,
  getGalleryByUserId,
  getProviderById,
  deleteProviderService,
  deleteProviderGallery,
} from "../../controllers/mainController.js";
import Booking from "../../models/Booking.js";

const router = Router();

// ── Provider dashboard (logged-in provider) ──────────────────
router.get("/me/dashboard", authMiddleware, async (req, res) => {
  try {
    const providerId = req.user._id;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [
      todayBookings,
      todayRevenue,
      upcomingCount,
      completedJobs,
      pendingRequests,
      recentBookings,
      ratedBookings,
    ] = await Promise.all([
      Booking.countDocuments({ providerId, bookingDate: { $gte: today, $lt: tomorrow } }),
      Booking.aggregate([
        { $match: { providerId, bookingDate: { $gte: today, $lt: tomorrow }, status: "completed" } },
        { $group: { _id: null, total: { $sum: "$servicePrice" } } },
      ]),
      Booking.countDocuments({ providerId, bookingDate: { $gte: tomorrow }, status: { $in: ["pending", "confirmed"] } }),
      Booking.countDocuments({ providerId, status: "completed" }),
      Booking.countDocuments({ providerId, status: "pending" }),
      Booking.find({ providerId })
        .sort({ createdAt: -1 })
        .limit(10)
        .select("customerName serviceName bookingDate bookingTime status servicePrice totalAmount")
        .lean(),
      Booking.aggregate([
        { $match: { providerId, "rating.score": { $exists: true, $gt: 0 } } },
        { $group: { _id: null, avg: { $avg: "$rating.score" }, count: { $sum: 1 } } },
      ]),
    ]);

    const revenue = todayRevenue[0]?.total || 0;
    const avgRating = ratedBookings[0]?.avg || 0;
    const totalRatings = ratedBookings[0]?.count || 0;

    return res.json({
      success: true,
      data: {
        today: { bookings: todayBookings, revenue },
        upcoming: upcomingCount,
        completedJobs,
        pendingRequests,
        averageRating: avgRating,
        totalRatings,
        recentBookings: recentBookings.map((b) => ({
          id: b._id,
          customerName: b.customerName,
          serviceName: b.serviceName,
          bookingDate: b.bookingDate,
          bookingTime: b.bookingTime,
          status: b.status,
          price: b.servicePrice,
          totalAmount: b.totalAmount || b.servicePrice || 0,
        })),
      },
    });
  } catch (err) {
    console.error("Dashboard error:", err);
    return res.status(500).json({ success: false, message: "Failed to load dashboard." });
  }
});

router.get("home", (req, res) => {
  console.log("Welcome home because all just started and is for testing");
});
router.get("/provider/services/:id", authMiddleware, getProviderServices);

router.get("/get/all/providers", getMarketplaceProviders);
router.get("/get/provider/:id", getProviderById);
router.post("/save/services", authMiddleware, saveProviderServices);
router.post(
  "/provider/gallery/upload",
  authMiddleware,
  upload.array("images", 10),
  uploadGalleryImages,
);

router.get("/gallery/user/:userId", authMiddleware, getGalleryByUserId);
router.delete("/provider/services/:id", authMiddleware, deleteProviderService);
router.delete(
  "/provider/gallery/:imageId",
  authMiddleware,
  deleteProviderGallery,
);

export default router;
