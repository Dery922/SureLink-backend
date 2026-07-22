import { Router } from "express";

const router = Router();

import { authMiddleware } from "./auth/auth.validation.middleware.js";
import { createBooking } from "../controllers/bookingController.js";

router.post("/bookings", authMiddleware, createBooking);

export default router;
