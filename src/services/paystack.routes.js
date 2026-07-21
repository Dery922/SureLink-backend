import { Router } from "express";
import { authenticateUser } from "../middleware/authenticateUser.js";
import {
  initializePaystack,
  paystackVerify,
  paystackWebhook,
} from "../controllers/paystackController.js";

const router = Router();

router.post("/initialize", authenticateUser, initializePaystack);
// Paystack calls the webhook server-to-server; it authenticates via the
// x-paystack-signature HMAC check inside the handler, not the session token.
router.post("/webhook", paystackWebhook);
router.get("/verify/:reference", authenticateUser, paystackVerify);

export default router;
