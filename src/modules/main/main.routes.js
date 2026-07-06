import { Router } from "express";
import { authMiddleware } from "../auth/auth.validation.middleware.js";
import { upload } from "../../middleware/uploadMiddlware.js";
import {
  getMarketplaceProviders,
  getProviderById,
  getProviderServices,
} from "../../controllers/authController.js";
import {
  saveProviderServices,
  uploadGalleryImages,
  getGalleryByUserId,
} from "../../controllers/mainController.js";

const router = Router();

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

export default router;
