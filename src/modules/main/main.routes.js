// src/routes/mainRoutes.js
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
  updateUserProfile,
} from "../../controllers/mainController.js";
import { getAllProviders } from "../../controllers/providersController.js";

const router = Router();



// IMPORTANT: More specific routes should come FIRST
router.get("/get/all/categories/providers", getAllProviders);
router.get("/get/all/providers", getMarketplaceProviders);
router.get("/get/provider/:id", getProviderById);
router.get("/provider/services/:id", authMiddleware, getProviderServices);

// Then less specific routes
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

router.put("/users/profile/update", authMiddleware, updateUserProfile);

export default router;
