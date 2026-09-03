import { Router } from "express";

import { getProviderReviews, getRatingStatus, unreviewedProvider } from "../controllers/providersController.js";
import { authMiddleware } from "./auth/auth.validation.middleware.js";

const router = Router();





// backend/routes/bookingRoutes.js
router.get('/unreviewed-completed', authMiddleware, unreviewedProvider)
router.get('/reviews/provider/:providerId', getProviderReviews);
router.get(
  "/bookings/:bookingId/rating-status",
  authMiddleware,
  getRatingStatus
);


export default router;