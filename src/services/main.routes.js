import { Router } from "express";
import { authenticateUser } from "../middleware/authenticateUser.js";
import { upload } from "../middleware/uploadMiddleware.js";
import {
  getMarketplaceProviders,
  getProviderById,
  getProviderServices,
  saveProviderServices,
  uploadGalleryImages,
  getGalleryByUserId,
  deleteProviderService,
  deleteProviderGallery,
} from "../controllers/mainController.js";

const router = Router();

// Public marketplace reads.
router.get("/get/all/providers", getMarketplaceProviders);
router.get("/get/provider/:id", getProviderById);

// Authenticated provider service + gallery management.
router.get("/provider/services/:id", authenticateUser, getProviderServices);
router.post("/save/services", authenticateUser, saveProviderServices);
router.post(
  "/provider/gallery/upload",
  authenticateUser,
  upload.array("images", 10),
  uploadGalleryImages,
);
router.get("/gallery/user/:userId", authenticateUser, getGalleryByUserId);
router.delete("/provider/services/:id", authenticateUser, deleteProviderService);
router.delete("/provider/gallery/:imageId", authenticateUser, deleteProviderGallery);

export default router;
