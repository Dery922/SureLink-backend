import { Router } from "express";
import { authenticateUser } from "../middleware/authenticateUser.js";
import { createBooking } from "../controllers/bookingController.js";

const router = Router();

// Create a booking for the authenticated customer.
router.post("/", authenticateUser, createBooking);

export default router;
