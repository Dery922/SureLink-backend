/**
 * Seeds the real marketplace collections the admin dashboard reads:
 *   - customer Users  (Customers page)
 *   - provider Users with submitted verification (Verifications + Providers pages)
 *   - Bookings via Frank's flat Booking model (Bookings + Transactions pages)
 *
 * All records go through the real Mongoose models, so they match the production
 * schema exactly (unlike the earlier raw-inserted mock docs, which are removed).
 *
 * Idempotent:
 *   - Users are upserted by email (re-running never duplicates them).
 *   - Stale mock bookings (no customerId / totalAmount) are deleted.
 *   - Prior runs of this seed (paymentReference prefixed SL-BK-) are cleared
 *     and re-inserted, so the booking set is always the canonical demo set.
 *
 * Run: node src/admin/seed/marketplaceSeed.js
 */
import dotenv from "dotenv";
import mongoose from "mongoose";
import User from "../../models/User.js";
import Booking from "../../models/Booking.js";

dotenv.config();

const now = new Date();
const minsAgo = (n) => new Date(now - n * 60 * 1000);
const hrsAgo = (n) => new Date(now - n * 3600 * 1000);
const daysAgo = (n) => new Date(now - n * 24 * 3600 * 1000);

const REF_PREFIX = "SL-BK-";

// ─────────────────────────── Customers ───────────────────────────
const CUSTOMERS = [
  { email: "kwame.asante@example.com", phone: "233540000001", full: "Kwame Asante", area: "East Legon", status: "active", trust: { score: 5, average_rating: 4.8, total_ratings: 12 } },
  { email: "ama.owusu@example.com",    phone: "233540000002", full: "Ama Owusu",    area: "Osu",        status: "active", trust: { score: 5, average_rating: 4.6, total_ratings: 7 } },
  { email: "yaw.boateng@example.com",  phone: "233540000003", full: "Yaw Boateng",  area: "Dansoman",   status: "verification_pending", trust: { score: 5, average_rating: 0, total_ratings: 0 } },
  { email: "akosua.dankwa@example.com",phone: "233540000004", full: "Akosua Dankwa",area: "Adenta",     status: "suspended", trust: { score: 3, average_rating: 3.2, total_ratings: 4 } },
  { email: "nii.laryea@example.com",   phone: "233540000005", full: "Nii Laryea",   area: "Tema",       status: "banned",    trust: { score: 1, average_rating: 2.1, total_ratings: 9 } },
];

// ─────────────────────── Providers (verification queue) ───────────────────────
const PROVIDERS = [
  { email: "swiftclean@surelink.gh", phone: "233500000001", full: "SwiftClean Services", category: "Home Cleaning", area: "East Legon", verification_status: "pending",  status: "verification_pending", id_type: "Ghana Card",           id_number: "GHA-1122334455" },
  { email: "homefixpro@surelink.gh", phone: "233500000002", full: "HomeFix Pro",         category: "Handyman",      area: "Spintex",   verification_status: "pending",  status: "verification_pending", id_type: "Ghana Card",           id_number: "GHA-2233445566" },
  { email: "sparklemaids@surelink.gh",phone: "233500000003", full: "SparkleMaids GH",    category: "Home Cleaning", area: "Cantonments",verification_status: "approved", status: "active",               id_type: "Ghana Card",           id_number: "GHA-3344556677" },
  { email: "quickplumb@surelink.gh", phone: "233500000004", full: "QuickPlumb",          category: "Plumbing",      area: "Madina",    verification_status: "rejected", status: "verification_pending", id_type: "Business Registration",id_number: "BRN-778899",   rejection_reason: "ID document was blurred and unreadable." },
  { email: "greengarden@surelink.gh",phone: "233500000005", full: "GreenGarden Care",    category: "Gardening",     area: "Airport Res.",verification_status: "pending", status: "verification_pending", id_type: "Ghana Card",           id_number: "GHA-4455667788" },
];

const PLACEHOLDER_DOC = "https://placehold.co/600x400?text=ID+Document";
const PLACEHOLDER_AVATAR = "https://i.pravatar.cc/150";

async function upsertCustomer(c) {
  const doc = await User.findOneAndUpdate(
    { email: c.email },
    {
      $set: {
        type: "customer",
        "name.full": c.full,
        "name.display": c.full.split(" ")[0],
        phone: c.phone,
        status: c.status,
        "avatar.url": `${PLACEHOLDER_AVATAR}?u=${encodeURIComponent(c.email)}`,
        trust: c.trust,
        "location.home_address.area": c.area,
        "audit.last_login_at": hrsAgo(Math.floor(Math.random() * 72) + 1),
      },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );
  return doc;
}

async function upsertProvider(p) {
  const doc = await User.findOneAndUpdate(
    { email: p.email },
    {
      $set: {
        type: "provider",
        "name.full": p.full,
        "name.display": p.full.split(" ")[0],
        phone: p.phone,
        status: p.status,
        "avatar.url": `${PLACEHOLDER_AVATAR}?u=${encodeURIComponent(p.email)}`,
        trust: { score: 5, average_rating: p.verification_status === "approved" ? 4.7 : 0, total_ratings: p.verification_status === "approved" ? 34 : 0 },
        "provider_profile.verification_status": p.verification_status,
        "provider_profile.category": p.category,
        "provider_profile.service_area": p.area,
        "provider_profile.id_type": p.id_type,
        "provider_profile.id_number": p.id_number,
        "provider_profile.id_doc_url": PLACEHOLDER_DOC,
        "provider_profile.avatar_url": `${PLACEHOLDER_AVATAR}?u=${encodeURIComponent(p.email)}`,
        "provider_profile.rejection_reason": p.rejection_reason ?? null,
        "provider_profile.reviewed_at": p.verification_status === "pending" ? null : daysAgo(2),
      },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );
  return doc;
}

/**
 * Build the 8 demo bookings once the customer/provider _ids are known.
 * Covers every booking-status bucket (pending/confirmed/in_progress/completed/
 * cancelled) and every transaction bucket (processing/paid/failed/refunded/
 * disputed) so both stat rows populate fully.
 */
function buildBookings(customers, providers) {
  const c = (i) => customers[i];
  const p = (i) => providers[i];
  const base = (cust, prov, extra) => ({
    customerId: cust._id,
    customerName: cust.name.full,
    customerEmail: cust.email,
    customerPhone: cust.phone,
    providerId: prov._id,
    providerName: prov.name.full,
    serviceId: new mongoose.Types.ObjectId(),
    serviceName: prov.provider_profile.category,
    servicePrice: extra.totalAmount,
    serviceCategory: prov.provider_profile.category,
    serviceTypes: [prov.provider_profile.category],
    bookingTime: "10:00",
    location: { address: `${cust.location.home_address.area}, Accra`, city: "Accra", landmark: "" },
    paymentMethod: "mobile-money",
    ...extra,
  });

  return [
    // 1 — pending booking, unpaid → tx:processing
    base(c(0), p(0), {
      reference: 1, status: "pending", paymentStatus: "pending",
      totalAmount: 250, bookingDate: minsAgo(30), createdAt: minsAgo(30),
    }),
    // 2 — confirmed, paid → tx:paid
    base(c(1), p(2), {
      reference: 2, status: "confirmed", paymentStatus: "paid",
      totalAmount: 480, bookingDate: hrsAgo(4), confirmedAt: hrsAgo(3), createdAt: hrsAgo(5),
    }),
    // 3 — in_progress, paid → tx:paid
    base(c(0), p(1), {
      reference: 3, status: "in_progress", paymentStatus: "paid",
      totalAmount: 320, bookingDate: hrsAgo(2), confirmedAt: hrsAgo(2), startedAt: minsAgo(45), createdAt: hrsAgo(3),
    }),
    // 4 — completed, paid → tx:paid
    base(c(1), p(2), {
      reference: 4, status: "completed", paymentStatus: "paid",
      totalAmount: 600, bookingDate: daysAgo(1), confirmedAt: daysAgo(1), startedAt: daysAgo(1), completedAt: hrsAgo(20), createdAt: daysAgo(1),
    }),
    // 5 — completed, paid, DISPUTED → tx:disputed
    base(c(3), p(0), {
      reference: 5, status: "completed", paymentStatus: "paid",
      totalAmount: 540, bookingDate: daysAgo(2), confirmedAt: daysAgo(2), startedAt: daysAgo(2), completedAt: daysAgo(2), createdAt: daysAgo(2),
      paymentDetails: { disputeState: "open", disputeReason: "Service not completed as agreed" },
    }),
    // 6 — cancelled, refunded → booking:cancelled + refunded, tx:refunded
    base(c(4), p(3), {
      reference: 6, status: "cancelled", paymentStatus: "refunded",
      totalAmount: 200, bookingDate: daysAgo(3), cancelledAt: daysAgo(3), cancelledReason: "Customer no longer needed the service", createdAt: daysAgo(3),
      paymentDetails: { refundState: "completed", refundReason: "Cancelled before service" },
    }),
    // 7 — confirmed, partially_paid → tx:processing
    base(c(2), p(2), {
      reference: 7, status: "confirmed", paymentStatus: "partially_paid",
      totalAmount: 750, depositAmount: 300, remainingAmount: 450, bookingDate: hrsAgo(6), confirmedAt: hrsAgo(5), createdAt: hrsAgo(7),
    }),
    // 8 — pending, failed payment → tx:failed
    base(c(0), p(4), {
      reference: 8, status: "pending", paymentStatus: "failed",
      totalAmount: 180, bookingDate: hrsAgo(1), createdAt: hrsAgo(1),
    }),
  ].map((b) => ({ ...b, paymentReference: `${REF_PREFIX}${String(b.reference).padStart(4, "0")}`, reference: undefined }));
}

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("✅ MongoDB connected");

  // 1. Customers (upsert by email)
  const customers = [];
  for (const c of CUSTOMERS) customers.push(await upsertCustomer(c));
  console.log(`✅ Upserted ${customers.length} customer users`);

  // 2. Providers (upsert by email)
  const providers = [];
  for (const p of PROVIDERS) providers.push(await upsertProvider(p));
  console.log(`✅ Upserted ${providers.length} provider users`);

  // 3. Remove stale raw-inserted mock bookings (they lack the required real
  //    schema fields) and any prior run of this seed, then insert fresh.
  const staleDel = await Booking.deleteMany({ $or: [{ customerId: { $exists: false } }, { totalAmount: { $exists: false } }] });
  const seedDel = await Booking.deleteMany({ paymentReference: new RegExp(`^${REF_PREFIX}`) });
  console.log(`🧹 Removed ${staleDel.deletedCount} stale mock booking(s), ${seedDel.deletedCount} previous seed booking(s)`);

  const bookings = buildBookings(customers, providers);
  const inserted = await Booking.insertMany(bookings);
  console.log(`✅ Seeded ${inserted.length} bookings via the real Booking model`);

  await mongoose.disconnect();
  console.log("✅ Done");
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
