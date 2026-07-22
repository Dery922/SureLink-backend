import { Router } from "express";
import { authMiddleware } from "./auth/auth.validation.middleware.js";
import {
  initializePaystack,
  paystackVerify,
  paystackWebhook,
} from "../controllers/paystackController.js";

const router = Router();

router.post("/paystack/initialize", authMiddleware, initializePaystack);
router.post("/paystack/webhook", authMiddleware, paystackWebhook);
router.get("/paystack/verify/:reference", authMiddleware, paystackVerify);

export default router;
