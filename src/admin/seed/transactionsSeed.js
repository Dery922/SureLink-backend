/**
 * Seeds transactions.
 * Idempotent: skips if transactions already exist.
 * Run: node src/admin/seed/transactionsSeed.js
 */
import dotenv from "dotenv";
import mongoose from "mongoose";
import Transaction, { TRANSACTION_STATUSES } from "../models/Transaction.js";

dotenv.config();

const now = new Date();
const hrsAgo = (n) => new Date(now - n * 3600 * 1000);
const daysAgo = (n) => new Date(now - n * 24 * 3600 * 1000);

// platform fee 10%, processing 2%, remainder to provider payout.
const fees = (amount) => {
  const platform = Math.round(amount * 0.1);
  const processing = Math.round(amount * 0.02);
  return { platform, processing, provider_payout: amount - platform - processing };
};

const TRANSACTIONS = [
  {
    reference: "TXN-50012", status: TRANSACTION_STATUSES.PAID, amount: 350, currency: "GHS", fees: fees(350),
    method: "mobile_money", booking: { reference: "BK-10234" }, customer: { name: "Kwame Asante" }, provider: { name: "CityMove" },
    audit: [
      { status: TRANSACTION_STATUSES.PROCESSING, at: hrsAgo(6), actor: "system", note: "Payment initiated" },
      { status: TRANSACTION_STATUSES.PAID, at: hrsAgo(6), actor: "system", note: "Payment captured" },
    ],
  },
  {
    reference: "TXN-50013", status: TRANSACTION_STATUSES.PROCESSING, amount: 200, currency: "GHS", fees: fees(200),
    method: "mobile_money", booking: { reference: "BK-10235" }, customer: { name: "Ama Owusu" }, provider: { name: null },
    audit: [{ status: TRANSACTION_STATUSES.PROCESSING, at: hrsAgo(2), actor: "system", note: "Awaiting confirmation" }],
  },
  {
    reference: "TXN-50014", status: TRANSACTION_STATUSES.PAID, amount: 500, currency: "GHS", fees: fees(500),
    method: "card", booking: { reference: "BK-10236" }, customer: { name: "Yaw Boateng" }, provider: { name: "FastTrack Inc" },
    audit: [
      { status: TRANSACTION_STATUSES.PROCESSING, at: daysAgo(3), actor: "system", note: "Payment initiated" },
      { status: TRANSACTION_STATUSES.PAID, at: daysAgo(3), actor: "system", note: "Payment captured" },
    ],
  },
  {
    reference: "TXN-50015", status: TRANSACTION_STATUSES.DISPUTED, amount: 1200, currency: "GHS", fees: fees(1200),
    method: "mobile_money", booking: { reference: "BK-10237" }, customer: { name: "Akosua Dankwa" }, provider: { name: "PrimeFreight GH" },
    dispute: { state: "open", reason: "Damaged item during move" },
    audit: [
      { status: TRANSACTION_STATUSES.PROCESSING, at: daysAgo(5), actor: "system", note: "Payment initiated" },
      { status: TRANSACTION_STATUSES.PAID, at: daysAgo(5), actor: "system", note: "Payment captured" },
      { status: TRANSACTION_STATUSES.DISPUTED, at: daysAgo(3), actor: "system", note: "Customer opened dispute" },
    ],
  },
  {
    reference: "TXN-50016", status: TRANSACTION_STATUSES.FAILED, amount: 300, currency: "GHS", fees: fees(300),
    method: "card", booking: { reference: "BK-10238" }, customer: { name: "Nii Laryea" }, provider: { name: "SwiftCouriers Ltd" },
    audit: [
      { status: TRANSACTION_STATUSES.PROCESSING, at: daysAgo(2), actor: "system", note: "Payment initiated" },
      { status: TRANSACTION_STATUSES.FAILED, at: daysAgo(2), actor: "system", note: "Card declined" },
    ],
  },
  {
    reference: "TXN-50017", status: TRANSACTION_STATUSES.PAID, amount: 450, currency: "GHS", fees: fees(450),
    method: "card", booking: { reference: "BK-10239" }, customer: { name: "Efua Mensah" }, provider: { name: "NovaDrop" },
    audit: [
      { status: TRANSACTION_STATUSES.PROCESSING, at: hrsAgo(8), actor: "system", note: "Payment initiated" },
      { status: TRANSACTION_STATUSES.PAID, at: hrsAgo(6), actor: "system", note: "Payment captured" },
    ],
  },
  {
    reference: "TXN-50018", status: TRANSACTION_STATUSES.REFUNDED, amount: 280, currency: "GHS", fees: fees(280),
    method: "mobile_money", booking: { reference: "BK-10240" }, customer: { name: "Kwabena Ofori" }, provider: { name: "AirLink Express" },
    refund: { state: "completed", reason: "Repair unsuccessful" },
    audit: [
      { status: TRANSACTION_STATUSES.PROCESSING, at: daysAgo(7), actor: "system", note: "Payment initiated" },
      { status: TRANSACTION_STATUSES.PAID, at: daysAgo(7), actor: "system", note: "Payment captured" },
      { status: TRANSACTION_STATUSES.REFUNDED, at: daysAgo(5), actor: "system", note: "Refund issued" },
    ],
  },
];

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("✅ MongoDB connected");

  const count = await Transaction.countDocuments();
  if (count === 0) {
    await Transaction.insertMany(TRANSACTIONS);
    console.log(`✅ Seeded ${TRANSACTIONS.length} transactions`);
  } else {
    console.log(`⏭  Transactions already seeded (${count} docs) — skipping`);
  }

  await mongoose.disconnect();
  console.log("✅ Done");
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
