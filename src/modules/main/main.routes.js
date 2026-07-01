import { Router } from "express";
import { authMiddleware } from "../auth/auth.validation.middleware.js";
import {
  getMarketplaceProviders,
  getProviderById,
} from "../../controllers/authController.js";
import { saveProviderServices } from "../../controllers/mainController.js";

const router = Router();

router.get("home", (req, res) => {
  console.log("Welcome home because all just started and is for testing");
});

router.get("/get/all/providers", getMarketplaceProviders);
router.get("/get/provider/:id", getProviderById);
router.post("/save/services", authMiddleware, saveProviderServices);

export default router;
