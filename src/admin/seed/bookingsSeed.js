/**
 * Seeds bookings.
 * Idempotent: skips if bookings already exist.
 * Run: node src/admin/seed/bookingsSeed.js
 */
import dotenv from "dotenv";
import mongoose from "mongoose";
import Booking, { BOOKING_STATUSES, PAYMENT_STATUSES } from "../models/Booking.js";

dotenv.config();

const now = new Date();
const hrsAgo = (n) => new Date(now - n * 3600 * 1000);
const daysAgo = (n) => new Date(now - n * 24 * 3600 * 1000);

const BOOKINGS = [
  {
    reference: "BK-10234",
    status: BOOKING_STATUSES.IN_PROGRESS,
    service: { category: "Home Cleaning", description: "3-bedroom deep clean", scheduled_at: hrsAgo(1), location: "East Legon, Accra" },
    customer: { name: "Kwame Asante", phone: "233201234567", email: "kwame@example.com" },
    provider: { name: "CityMove", phone: "233277445566" },
    payment: { status: PAYMENT_STATUSES.PAID, amount: 350, currency: "GHS", method: "mobile_money" },
    timeline: [
      { status: BOOKING_STATUSES.PENDING, at: hrsAgo(6), actor: "system", note: "Booking created" },
      { status: BOOKING_STATUSES.CONFIRMED, at: hrsAgo(5), actor: "system", note: "Provider accepted" },
      { status: BOOKING_STATUSES.IN_PROGRESS, at: hrsAgo(1), actor: "system", note: "Service started" },
    ],
  },
  {
    reference: "BK-10235",
    status: BOOKING_STATUSES.PENDING,
    service: { category: "Plumbing", description: "Kitchen sink leak", scheduled_at: hrsAgo(-4), location: "Osu, Accra" },
    customer: { name: "Ama Owusu", phone: "233209876543", email: "ama@example.com" },
    provider: { name: null, phone: null },
    payment: { status: PAYMENT_STATUSES.UNPAID, amount: 200, currency: "GHS", method: null },
    timeline: [{ status: BOOKING_STATUSES.PENDING, at: hrsAgo(2), actor: "system", note: "Awaiting provider" }],
  },
  {
    reference: "BK-10236",
    status: BOOKING_STATUSES.COMPLETED,
    service: { category: "Electrical", description: "Ceiling fan installation", scheduled_at: daysAgo(2), location: "Tema" },
    customer: { name: "Yaw Boateng", phone: "233244112233", email: "yaw@example.com" },
    provider: { name: "FastTrack Inc", phone: "233233778899" },
    payment: { status: PAYMENT_STATUSES.PAID, amount: 500, currency: "GHS", method: "card" },
    timeline: [
      { status: BOOKING_STATUSES.PENDING, at: daysAgo(3), actor: "system", note: "Booking created" },
      { status: BOOKING_STATUSES.CONFIRMED, at: daysAgo(3), actor: "system", note: "Provider accepted" },
      { status: BOOKING_STATUSES.IN_PROGRESS, at: daysAgo(2), actor: "system", note: "Service started" },
      { status: BOOKING_STATUSES.COMPLETED, at: daysAgo(2), actor: "system", note: "Completed & paid" },
    ],
  },
  {
    reference: "BK-10237",
    status: BOOKING_STATUSES.DISPUTED,
    service: { category: "Moving", description: "2-bedroom apartment relocation", scheduled_at: daysAgo(4), location: "Spintex → Kasoa" },
    customer: { name: "Akosua Dankwa", phone: "233277001122", email: "akosua@example.com" },
    provider: { name: "PrimeFreight GH", phone: "233240334455" },
    payment: { status: PAYMENT_STATUSES.PAID, amount: 1200, currency: "GHS", method: "mobile_money" },
    timeline: [
      { status: BOOKING_STATUSES.PENDING, at: daysAgo(5), actor: "system", note: "Booking created" },
      { status: BOOKING_STATUSES.CONFIRMED, at: daysAgo(5), actor: "system", note: "Provider accepted" },
      { status: BOOKING_STATUSES.COMPLETED, at: daysAgo(4), actor: "system", note: "Marked complete" },
      { status: BOOKING_STATUSES.DISPUTED, at: daysAgo(3), actor: "system", note: "Customer raised dispute — damaged item" },
    ],
  },
  {
    reference: "BK-10238",
    status: BOOKING_STATUSES.CANCELLED,
    service: { category: "Home Cleaning", description: "Post-event cleanup", scheduled_at: daysAgo(1), location: "Cantonments" },
    customer: { name: "Nii Laryea", phone: "233265889900", email: "nii@example.com" },
    provider: { name: "SwiftCouriers Ltd", phone: "233201234567" },
    payment: { status: PAYMENT_STATUSES.UNPAID, amount: 300, currency: "GHS", method: null },
    cancelled_reason: "Customer no longer needs the service",
    timeline: [
      { status: BOOKING_STATUSES.PENDING, at: daysAgo(2), actor: "system", note: "Booking created" },
      { status: BOOKING_STATUSES.CONFIRMED, at: daysAgo(2), actor: "system", note: "Provider accepted" },
      { status: BOOKING_STATUSES.CANCELLED, at: daysAgo(1), actor: "system", note: "Customer no longer needs the service" },
    ],
  },
  {
    reference: "BK-10239",
    status: BOOKING_STATUSES.CONFIRMED,
    service: { category: "Landscaping", description: "Garden trimming & lawn care", scheduled_at: hrsAgo(-24), location: "Airport Residential" },
    customer: { name: "Efua Mensah", phone: "233256001122", email: "efua@example.com" },
    provider: { name: "NovaDrop", phone: "233256001122" },
    payment: { status: PAYMENT_STATUSES.PAID, amount: 450, currency: "GHS", method: "card" },
    timeline: [
      { status: BOOKING_STATUSES.PENDING, at: hrsAgo(8), actor: "system", note: "Booking created" },
      { status: BOOKING_STATUSES.CONFIRMED, at: hrsAgo(6), actor: "system", note: "Provider accepted" },
    ],
  },
  {
    reference: "BK-10240",
    status: BOOKING_STATUSES.REFUNDED,
    service: { category: "Appliance Repair", description: "Washing machine not spinning", scheduled_at: daysAgo(6), location: "Dansoman" },
    customer: { name: "Kwabena Ofori", phone: "233209876543", email: "kwabena@example.com" },
    provider: { name: "AirLink Express", phone: "233209876543" },
    payment: { status: PAYMENT_STATUSES.REFUNDED, amount: 280, currency: "GHS", method: "mobile_money" },
    timeline: [
      { status: BOOKING_STATUSES.PENDING, at: daysAgo(7), actor: "system", note: "Booking created" },
      { status: BOOKING_STATUSES.CONFIRMED, at: daysAgo(7), actor: "system", note: "Provider accepted" },
      { status: BOOKING_STATUSES.COMPLETED, at: daysAgo(6), actor: "system", note: "Marked complete" },
      { status: BOOKING_STATUSES.REFUNDED, at: daysAgo(5), actor: "system", note: "Refund issued — repair unsuccessful" },
    ],
  },
];

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("✅ MongoDB connected");

  const count = await Booking.countDocuments();
  if (count === 0) {
    await Booking.insertMany(BOOKINGS);
    console.log(`✅ Seeded ${BOOKINGS.length} bookings`);
  } else {
    console.log(`⏭  Bookings already seeded (${count} docs) — skipping`);
  }

  await mongoose.disconnect();
  console.log("✅ Done");
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
