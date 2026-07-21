/**
 * Seeds provider verification submissions.
 * Idempotent: skips if verifications already exist.
 * Run: node src/admin/seed/verificationsSeed.js
 */
import dotenv from "dotenv";
import mongoose from "mongoose";
import Verification, { VERIFICATION_STATUSES } from "../models/Verification.js";
import Counter from "../../models/Counter.js";
import User from "../../models/User.js";

dotenv.config();

const now = new Date();
const hrsAgo = (n) => new Date(now - n * 3600 * 1000);
const daysAgo = (n) => new Date(now - n * 24 * 3600 * 1000);

const docs = (prefix) => [
  { type: "ghana_card", label: "Ghana Card (Front)", url: `https://files.surelink.example/${prefix}/ghana-card-front.jpg` },
  { type: "ghana_card", label: "Ghana Card (Back)", url: `https://files.surelink.example/${prefix}/ghana-card-back.jpg` },
  { type: "business_cert", label: "Business Registration", url: `https://files.surelink.example/${prefix}/business-cert.pdf` },
  { type: "selfie", label: "Verification Selfie", url: `https://files.surelink.example/${prefix}/selfie.jpg` },
];

const VERIFICATIONS = [
  {
    reference: "VER-3001", status: VERIFICATION_STATUSES.PENDING,
    provider: { name: "SwiftCouriers Ltd", email: "ops@swiftcouriers.gh", phone: "+233201234567" },
    documents: docs("ver-3001"), submitted_at: hrsAgo(3),
    events: [{ status: VERIFICATION_STATUSES.PENDING, at: hrsAgo(3), actor: "system", note: "Submitted for review" }],
  },
  {
    reference: "VER-3002", status: VERIFICATION_STATUSES.PENDING,
    provider: { name: "NovaDrop", email: "hello@novadrop.gh", phone: "+233241112223" },
    documents: docs("ver-3002"), submitted_at: hrsAgo(9),
    events: [{ status: VERIFICATION_STATUSES.PENDING, at: hrsAgo(9), actor: "system", note: "Submitted for review" }],
  },
  {
    reference: "VER-3003", status: VERIFICATION_STATUSES.PENDING,
    provider: { name: "AirLink Express", email: "support@airlink.gh", phone: "+233209998887" },
    documents: docs("ver-3003"), submitted_at: daysAgo(1),
    events: [{ status: VERIFICATION_STATUSES.PENDING, at: daysAgo(1), actor: "system", note: "Submitted for review" }],
  },
  {
    reference: "VER-3004", status: VERIFICATION_STATUSES.APPROVED,
    provider: { name: "CityMove", email: "admin@citymove.gh", phone: "+233277654321" },
    documents: docs("ver-3004"), submitted_at: daysAgo(6), reviewed_at: daysAgo(5), reviewed_by: "system",
    events: [
      { status: VERIFICATION_STATUSES.PENDING, at: daysAgo(6), actor: "system", note: "Submitted for review" },
      { status: VERIFICATION_STATUSES.APPROVED, at: daysAgo(5), actor: "system", note: "Documents verified" },
    ],
  },
  {
    reference: "VER-3005", status: VERIFICATION_STATUSES.REJECTED,
    provider: { name: "PrimeFreight GH", email: "info@primefreight.gh", phone: "+233208889990" },
    documents: docs("ver-3005"), submitted_at: daysAgo(8), reviewed_at: daysAgo(7), reviewed_by: "system",
    rejection_reason: "Business certificate expired",
    events: [
      { status: VERIFICATION_STATUSES.PENDING, at: daysAgo(8), actor: "system", note: "Submitted for review" },
      { status: VERIFICATION_STATUSES.REJECTED, at: daysAgo(7), actor: "system", note: "Business certificate expired" },
    ],
  },
];

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("✅ MongoDB connected");

  const count = await Verification.countDocuments();
  if (count === 0) {
    const linked = [];
    for (const v of VERIFICATIONS) {
      // Ensure a matching provider User exists so admin approve -> activate has a real target.
      const providerStatus = v.status === VERIFICATION_STATUSES.APPROVED ? "active" : "verification_pending";
      const user = await User.findOneAndUpdate(
        { phone: v.provider.phone },
        {
          $setOnInsert: {
            phone: v.provider.phone,
            email: v.provider.email,
            roles: ["provider"],
            status: providerStatus,
            name: { full: v.provider.name, display: v.provider.name, first: v.provider.name, last: "" },
            verification: { phone: { verified: true, verified_at: new Date() } },
          },
        },
        { new: true, upsert: true },
      );
      linked.push({ ...v, provider: { ...v.provider, id: user._id } });
    }
    await Verification.insertMany(linked);
    console.log(`✅ Seeded ${linked.length} verifications + linked provider users`);

    // These references (VER-3001..) are hardcoded above but bypass nextSequence(),
    // so advance the shared counter past them. Otherwise the first real onboarding
    // submission mints VER-3001 again and hits a duplicate-key error.
    const maxSeq = VERIFICATIONS.reduce((max, v) => {
      const n = Number(String(v.reference).replace("VER-", "")) - 3000;
      return Number.isFinite(n) && n > max ? n : max;
    }, 0);
    await Counter.findByIdAndUpdate(
      "verification",
      { $max: { seq: maxSeq } },
      { new: true, upsert: true },
    );
    console.log(`✅ Advanced verification counter to seq=${maxSeq} (next: VER-${3000 + maxSeq + 1})`);
  } else {
    console.log(`⏭  Verifications already seeded (${count} docs) — skipping`);
  }

  await mongoose.disconnect();
  console.log("✅ Done");
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
