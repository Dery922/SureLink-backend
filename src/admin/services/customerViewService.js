import { AppError } from "../../utils/errors.js";
import { customerReadRepository } from "../repositories/customerReadRepository.js";
import { bookingReadRepository } from "../repositories/bookingReadRepository.js";

const CURRENCY = "GHS";

/**
 * Map a lean customer User document to the shape the admin dashboard renders.
 */
export function toCustomerView(u) {
  return {
    _id: String(u._id),
    name: { full: u.name?.full || u.name?.display || null },
    email: u.email || null,
    phone: u.phone || null,
    avatar: { url: u.avatar?.url || null },
    status: u.status,
    trust: {
      score: u.trust?.score ?? null,
      average_rating: u.trust?.average_rating ?? null,
      total_ratings: u.trust?.total_ratings ?? 0,
    },
    location: { home_address: { area: u.location?.home_address?.area || null } },
    createdAt: u.createdAt,
    audit: { last_login_at: u.audit?.last_login_at || null },
  };
}

/**
 * Compact booking shape used inside the customer detail view.
 */
function toCustomerBooking(b) {
  return {
    _id: String(b._id),
    reference: b.paymentReference || `BK-${String(b._id).slice(-6).toUpperCase()}`,
    status: b.status,
    service: { category: b.serviceCategory || b.serviceName || null },
    payment: { amount: b.totalAmount ?? 0, currency: CURRENCY, status: b.paymentStatus },
    createdAt: b.createdAt,
  };
}

export async function listCustomers({ status, search, page, limit }) {
  const [{ customers, total }, stats] = await Promise.all([
    customerReadRepository.findAll({ status, search, page, limit }),
    customerReadRepository.countByStatus(),
  ]);
  return { customers: customers.map(toCustomerView), total, page, limit, stats };
}

export async function getCustomer(id) {
  const customer = await customerReadRepository.findById(id);
  if (!customer) throw new AppError("Customer not found", 404, "CUSTOMER_NOT_FOUND");

  const bookings = await bookingReadRepository.findByCustomer(id);
  return { customer: toCustomerView(customer), bookings: bookings.map(toCustomerBooking) };
}
