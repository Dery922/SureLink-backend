import Booking from "../models/Booking.js";
import User from "../models/User.js";
import mongoose from "mongoose";


export const getOutgoingBookings = async (req, res) => {
    try {
        const page = Number(req.query.page) || 1;
        const limit = Number(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const filter = {
            customerId: req.user.id,
            isDeleted: false,
        };

        if (req.query.status) {
            filter.status = req.query.status;
        }

        const bookings = await Booking.find(filter)
            .populate("providerId", "name email phone avatar")
            .populate("serviceId", "name category price description")
            // ✅ POPULATE THE RATING
            .populate({
                path: "rating",
                // If you want to ensure you only get the customer's rating
                // match: { reviewerId: req.user.id }
            })
            .sort({
                createdAt: -1,
            })
            .skip(skip)
            .limit(limit);

        const total = await Booking.countDocuments(filter);
        const stats = await getBookingStats(req.user.id);

        res.status(200).json({
            success: true,
            data: bookings,
            pagination: {
                page,
                pages: Math.ceil(total / limit),
                total,
            },
            stats,
        });
    } catch (error) {
        console.error("Outgoing Booking Error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch outgoing bookings",
            error: error.message,
        });
    }
};