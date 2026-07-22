import { successResponse } from "../../utils/apiResponse.js";
import * as bookingService from "../services/bookingViewService.js";

export async function list(req, res, next) {
  try {
    const { status, search, page = 1, limit = 20 } = req.query;
    const result = await bookingService.listBookings({ status, search, page: +page, limit: +limit });
    return res.json(successResponse({ message: "Bookings retrieved", data: result }));
  } catch (err) { return next(err); }
}

export async function getOne(req, res, next) {
  try {
    const booking = await bookingService.getBooking(req.params.id);
    return res.json(successResponse({ message: "Booking retrieved", data: { booking } }));
  } catch (err) { return next(err); }
}

export async function cancel(req, res, next) {
  try {
    const booking = await bookingService.cancelBooking(req.params.id, req.body?.reason, req.admin._id);
    return res.json(successResponse({ message: "Booking cancelled", data: { booking } }));
  } catch (err) { return next(err); }
}

export async function refund(req, res, next) {
  try {
    const booking = await bookingService.refundBooking(req.params.id, req.body?.reason, req.admin._id);
    return res.json(successResponse({ message: "Booking refunded", data: { booking } }));
  } catch (err) { return next(err); }
}

export async function reassign(req, res, next) {
  try {
    const booking = await bookingService.reassignBooking(req.params.id, req.body?.provider_id, req.admin._id);
    return res.json(successResponse({ message: "Booking reassigned", data: { booking } }));
  } catch (err) { return next(err); }
}
