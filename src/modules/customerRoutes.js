import { Router } from "express";


import { authMiddleware } from "./auth/auth.validation.middleware.js";
import { createReview } from "../controllers/providersController.js";

const router = Router();



router.post("/bookings/:id/customer/rate", authMiddleware, createReview);
router.get("/customer/bookings/outgoing", authMiddleware,);
router.get("/customer/bookings/history", authMiddleware,);


export default router;