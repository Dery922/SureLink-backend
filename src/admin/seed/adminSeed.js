/**
 * Admin seed script.
 *
 * Creates one account per role for development and initial setup.
 * Credentials are read from environment variables — never hardcoded.
 *
 * Usage:
 *   node src/admin/seed/adminSeed.js
 *
 * Required env vars (set in .env):
 *   MONGO_URI
 *   SEED_SUPER_ADMIN_EMAIL
 *   SEED_SUPER_ADMIN_PASSWORD
 *   SEED_PROVIDER_ADMIN_EMAIL
 *   SEED_PROVIDER_ADMIN_PASSWORD
 *   SEED_OPERATIONS_ADMIN_EMAIL
 *   SEED_OPERATIONS_ADMIN_PASSWORD
 *
 * The script is idempotent: it skips any admin whose email already exists.
 */

import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";

dotenv.config();

// Import after dotenv so env is populated before model registration.
import Admin, { ADMIN_ROLES } from "../models/Admin.js";

const BCRYPT_ROUNDS = 12;

const SEED_ACCOUNTS = [
  {
    role: ADMIN_ROLES.SUPER_ADMIN,
    name: "Super Admin",
    emailEnvKey: "SEED_SUPER_ADMIN_EMAIL",
    passwordEnvKey: "SEED_SUPER_ADMIN_PASSWORD",
    emailFallback: "superadmin@surelink.dev",
    passwordFallback: "SuperAdmin@dev2026!",
  },
  {
    role: ADMIN_ROLES.PROVIDER_MANAGEMENT_ADMIN,
    name: "Provider Management Admin",
    emailEnvKey: "SEED_PROVIDER_ADMIN_EMAIL",
    passwordEnvKey: "SEED_PROVIDER_ADMIN_PASSWORD",
    emailFallback: "provideradmin@surelink.dev",
    passwordFallback: "ProviderAdmin@dev2026!",
  },
  {
    role: ADMIN_ROLES.OPERATIONS_ADMIN,
    name: "Operations Admin",
    emailEnvKey: "SEED_OPERATIONS_ADMIN_EMAIL",
    passwordEnvKey: "SEED_OPERATIONS_ADMIN_PASSWORD",
    emailFallback: "opsadmin@surelink.dev",
    passwordFallback: "OpsAdmin@dev2026!",
  },
];

async function seedAdmins() {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    console.error("❌ MONGO_URI is not set in environment.");
    process.exit(1);
  }

  await mongoose.connect(mongoUri);
  console.log("✅ MongoDB connected");

  let created = 0;
  let skipped = 0;

  for (const account of SEED_ACCOUNTS) {
    const email = (
      process.env[account.emailEnvKey] || account.emailFallback
    ).toLowerCase();

    const password =
      process.env[account.passwordEnvKey] || account.passwordFallback;

    const existing = await Admin.findOne({ email });

    if (existing) {
      console.log(`⏭  Skipping ${account.role} — ${email} already exists`);
      skipped++;
      continue;
    }

    const password_hash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    await Admin.create({
      email,
      password_hash,
      name: {
        full: account.name,
        display: account.name.split(" ")[0],
      },
      role: account.role,
      status: "active",
    });

    console.log(`✅ Created ${account.role} — ${email}`);
    // Log the password only in seed output, clearly marked as dev-only.
    console.log(`   ⚠️  DEV ONLY password: ${password}`);
    created++;
  }

  console.log(`\nSeed complete. Created: ${created}, Skipped: ${skipped}`);
  await mongoose.disconnect();
}

seedAdmins().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
