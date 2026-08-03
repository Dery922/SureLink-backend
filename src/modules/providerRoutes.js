import { Router } from "express";

import { getProviderReviews, markNotificationsAsRead, unreviewedProvider } from "../controllers/providersController.js";
import { authMiddleware } from "./auth/auth.validation.middleware.js";

const router = Router();


router.patch("/notifications/:id/read", (req, res, next) => {
  console.log("🔥 Notification route hit:", req.params.id);
  next();
}, authMiddleware, markNotificationsAsRead)

// backend/routes/bookingRoutes.js
router.get('/unreviewed-completed', authMiddleware, unreviewedProvider)
router.get('/reviews/provider/:providerId', getProviderReviews);


export default router;