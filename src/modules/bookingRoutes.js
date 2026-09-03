import { Router } from "express";

const router = Router();

import { authMiddleware } from "./auth/auth.validation.middleware.js";
import {
  acceptBooking,
  cancelBooking,
  checkBookingAvailability,
  completeBooking,
  createBooking,
  customerCancelBooking,
  getAllBookings,
  getBookingHistory,
  getIncomingBookings,
  getOutgoingBookings,
  getPendingRequests,
  muteOnboardingAlert,
  respondToRequest,
} from "../controllers/bookingController.js";
import { getOne } from "../admin/controllers/providerController.js";

router.post("/bookings", authMiddleware, createBooking);

// ===============================
// CREATE BOOKING
// POST /api/bookings
// ===============================
router.post("/check-availability", authMiddleware, checkBookingAvailability);
// ===============================
// GET ALL BOOKINGS
// GET /api/bookings
// ===============================
router.get("/get/all/bookings", authMiddleware, getAllBookings);

// ===============================
// INCOMING BOOKINGS
// Provider receives bookings
// GET /api/bookings/incoming
// ===============================
router.get("/bookings/incoming", authMiddleware, getIncomingBookings);

// ===============================
// OUTGOING BOOKINGS
// Customer bookings created
// GET /api/bookings/outgoing
// ===============================
router.get("/bookings/outgoing", authMiddleware, getOutgoingBookings);

// ===============================
// BOOKING HISTORY
// Completed / Cancelled bookings
// GET /api/bookings/history
// ===============================
router.get("/bookings/history", authMiddleware, getBookingHistory);

// ===============================
// GET SINGLE BOOKING
// GET /api/bookings/:id
// ===============================
// router.get("/bookings/:id", authMiddleware, getSingleBooking);

// // ===============================
// // ACCEPT BOOKING
// // PUT /api/bookings/:id/accept
// // ===============================
router.put("/bookings/:id/accept", authMiddleware, acceptBooking);

// // ===============================
// // CANCEL BOOKING
// // PUT /api/bookings/:id/cancel
// // ===============================
router.put("/bookings/:id/cancel", authMiddleware, cancelBooking);

// // ===============================
// // COMPLETE BOOKING
// // PUT /api/bookings/:id/complete
// // ===============================
router.put("/bookings/:id/complete", authMiddleware, completeBooking);
router.patch("/mute-onboarding", authMiddleware, muteOnboardingAlert);
router.get("/pending", authMiddleware, getPendingRequests);
router.patch("/:id/respond", authMiddleware, respondToRequest);

// Cancel a booking (customer only)
router.put('/bookings/customer/:id/cancel', authMiddleware, customerCancelBooking);

export default router;
