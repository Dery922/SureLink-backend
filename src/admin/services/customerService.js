import { AppError } from "../../services/errors.js";
import { userCustomerRepository } from "../repositories/userCustomerRepository.js";
import { bookingRepository } from "../repositories/bookingRepository.js";

export async function listCustomers({ status, search, page, limit }) {
  const [result, stats] = await Promise.all([
    userCustomerRepository.findAll({ status, search, page, limit }),
    userCustomerRepository.countByStatus(),
  ]);
  return { ...result, stats };
}

// Customer detail + their booking history for the drill-in view.
export async function getCustomer(id) {
  const customer = await userCustomerRepository.findById(id);
  if (!customer) throw new AppError("Customer not found", 404, "CUSTOMER_NOT_FOUND");

  const bookings = await bookingRepository.findByCustomer(id);
  return { customer, bookings };
}
