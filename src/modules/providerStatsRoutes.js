// backend/routes/providerStatsRoutes.js

import express from "express";
import {
  getProviderStats,
  getRatingDistribution,
  getPerformanceMetrics,
  getProviderDashboard,
  getProviderSimpleStats,
} from "../controllers/providerStatsController.js";
import { authMiddleware } from "./auth/auth.validation.middleware.js";
import { createReview } from "../controllers/providersController.js";

const router = express.Router();

// ==========================================
// ALL ROUTES REQUIRE AUTHENTICATION
// ==========================================
router.use(authMiddleware);

// ==========================================
// PROVIDER DASHBOARD (for logged-in provider)
// GET /api/providers/me/dashboard
// ==========================================
router.get("/me/dashboard", getProviderDashboard);

// ==========================================
// GET PROVIDER SIMPLE STATS (for quick display)
// GET /api/providers/:providerId/simple-stats
// ==========================================
router.get("/:providerId/simple-stats", getProviderSimpleStats);

// ==========================================
// GET PROVIDER STATISTICS
// GET /api/providers/:providerId/stats
// ==========================================
router.get("/:providerId/stats", getProviderStats);

// ==========================================
// GET RATING DISTRIBUTION
// GET /api/providers/:providerId/ratings
// ==========================================
router.get("/:providerId/ratings", getRatingDistribution);

// ==========================================
// GET PERFORMANCE METRICS
// GET /api/providers/:providerId/performance
// ==========================================
router.get("/:providerId/performance", getPerformanceMetrics);
router.post("/rate", authMiddleware, createReview);

export default router;
