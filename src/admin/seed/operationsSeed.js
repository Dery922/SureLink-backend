/**
 * Seeds providers, deliveries, and zones.
 * Idempotent: skips collections that already have data.
 * Run: node src/admin/seed/operationsSeed.js
 */
import dotenv from "dotenv";
import mongoose from "mongoose";
import Provider from "../models/Provider.js";
import Delivery, { DELIVERY_STATUSES } from "../models/Delivery.js";
import Zone from "../models/Zone.js";

dotenv.config();

const PROVIDERS = [
  { name: "SwiftCouriers Ltd", email: "contact@swiftcouriers.gh", phone: "233201234567", category: "Logistics", status: "active", hourly_rate: 45, service_radius_km: 50, trust: { average_rating: 4.8, total_ratings: 312 }, last_active_at: new Date() },
  { name: "AirLink Express", email: "ops@airlink.gh", phone: "233209876543", category: "Courier", status: "active", hourly_rate: 55, service_radius_km: 30, trust: { average_rating: 4.6, total_ratings: 189 }, last_active_at: new Date() },
  { name: "QuickRide Logistics", email: "hello@quickride.gh", phone: "233244112233", category: "Logistics", status: "pending", hourly_rate: 38, service_radius_km: 25, trust: { average_rating: 0, total_ratings: 0 } },
  { name: "CityMove", email: "team@citymove.gh", phone: "233277445566", category: "Moving", status: "active", hourly_rate: 60, service_radius_km: 40, trust: { average_rating: 4.9, total_ratings: 521 }, last_active_at: new Date() },
  { name: "FastTrack Inc", email: "info@fasttrack.gh", phone: "233233778899", category: "Courier", status: "active", hourly_rate: 35, service_radius_km: 20, trust: { average_rating: 4.3, total_ratings: 98 }, last_active_at: new Date() },
  { name: "NovaDrop", email: "support@novadrop.gh", phone: "233256001122", category: "Last-mile", status: "suspended", hourly_rate: 30, service_radius_km: 15, trust: { average_rating: 3.1, total_ratings: 44 } },
  { name: "PrimeFreight GH", email: "prime@primefreight.gh", phone: "233240334455", category: "Freight", status: "active", hourly_rate: 75, service_radius_km: 100, trust: { average_rating: 4.7, total_ratings: 276 }, last_active_at: new Date() },
  { name: "ZoomDeliver", email: "info@zoomdeliver.gh", phone: "233265889900", category: "Last-mile", status: "pending", hourly_rate: 28, service_radius_km: 10, trust: { average_rating: 0, total_ratings: 0 } },
];

const now = new Date();
const minsAgo = (n) => new Date(now - n * 60 * 1000);
const hrsAgo = (n) => new Date(now - n * 3600 * 1000);

const DELIVERIES = [
  { reference: "SL-9901", customer_name: "Kwame Asante", driver_name: "Kofi Mensah", provider_name: "SwiftCouriers Ltd", from_address: "East Legon", to_address: "Tema", status: DELIVERY_STATUSES.IN_TRANSIT, eta_minutes: 14, started_at: minsAgo(20) },
  { reference: "SL-9902", customer_name: "Ama Owusu", driver_name: "Abena Darko", provider_name: "AirLink Express", from_address: "Osu", to_address: "Madina", status: DELIVERY_STATUSES.IN_TRANSIT, eta_minutes: 8, started_at: minsAgo(15) },
  { reference: "SL-9903", customer_name: "Yaw Boateng", driver_name: "Kweku Frimpong", provider_name: "CityMove", from_address: "Accra Mall", to_address: "Kasoa", status: DELIVERY_STATUSES.DELAYED, eta_minutes: 45, started_at: minsAgo(90) },
  { reference: "SL-9904", customer_name: "Akosua Dankwa", driver_name: "Mawuli Tetteh", provider_name: "FastTrack Inc", from_address: "Airport Res.", to_address: "Adenta", status: DELIVERY_STATUSES.IN_TRANSIT, eta_minutes: 22, started_at: minsAgo(10) },
  { reference: "SL-9905", customer_name: "Nii Laryea", driver_name: "Esi Asiedu", provider_name: "PrimeFreight GH", from_address: "Takoradi", to_address: "Kumasi", status: DELIVERY_STATUSES.DELAYED, eta_minutes: 120, started_at: hrsAgo(3) },
  { reference: "SL-9906", customer_name: "Efua Mensah", driver_name: "Kofi Mensah", provider_name: "SwiftCouriers Ltd", from_address: "Cantonments", to_address: "Spintex", status: DELIVERY_STATUSES.COMPLETED, eta_minutes: null, started_at: hrsAgo(2), completed_at: hrsAgo(1) },
  { reference: "SL-9907", customer_name: "Kwabena Ofori", driver_name: "Abena Darko", provider_name: "AirLink Express", from_address: "Labone", to_address: "Dansoman", status: DELIVERY_STATUSES.COMPLETED, eta_minutes: null, started_at: hrsAgo(3), completed_at: hrsAgo(2) },
  { reference: "SL-9908", customer_name: "Adwoa Sarpong", driver_name: "Kweku Frimpong", provider_name: "CityMove", from_address: "Tesano", to_address: "Nima", status: DELIVERY_STATUSES.IN_TRANSIT, eta_minutes: 5, started_at: minsAgo(5) },
];

const ZONES = [
  { name: "Zone A — Greater Accra Central", capacity: 60, active_drivers: 50 },
  { name: "Zone B — East Legon / Airport", capacity: 40, active_drivers: 35 },
  { name: "Zone C — Tema Industrial", capacity: 30, active_drivers: 20 },
  { name: "Zone D — Kumasi Metro", capacity: 25, active_drivers: 23 },
];

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("✅ MongoDB connected");

  // Providers
  const pCount = await Provider.countDocuments();
  if (pCount === 0) {
    await Provider.insertMany(PROVIDERS);
    console.log(`✅ Seeded ${PROVIDERS.length} providers`);
  } else {
    console.log(`⏭  Providers already seeded (${pCount} docs) — skipping`);
  }

  // Deliveries
  const dCount = await Delivery.countDocuments();
  if (dCount === 0) {
    await Delivery.insertMany(DELIVERIES);
    console.log(`✅ Seeded ${DELIVERIES.length} deliveries`);
  } else {
    console.log(`⏭  Deliveries already seeded (${dCount} docs) — skipping`);
  }

  // Zones
  const zCount = await Zone.countDocuments();
  if (zCount === 0) {
    await Zone.insertMany(ZONES);
    console.log(`✅ Seeded ${ZONES.length} zones`);
  } else {
    console.log(`⏭  Zones already seeded (${zCount} docs) — skipping`);
  }

  await mongoose.disconnect();
  console.log("✅ Done");
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
