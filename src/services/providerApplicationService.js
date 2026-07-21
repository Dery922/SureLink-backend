import Verification, { VERIFICATION_STATUSES } from "../admin/models/Verification.js";
import { nextSequence } from "../models/Counter.js";
import { AppError } from "./errors.js";
import { publishEvent } from "./eventBus.js";

/**
 * Coerce a multipart/form field (always a string) into a number or null.
 */
function toNumberOrNull(value) {
  if (value === undefined || value === null || String(value).trim() === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/**
 * Coerce a multipart/form boolean-ish field into a real boolean or null.
 */
function toBoolOrNull(value) {
  if (value === undefined || value === null || String(value).trim() === "") return null;
  return ["true", "1", "yes", "on"].includes(String(value).toLowerCase());
}

function trimOrNull(value) {
  const s = String(value ?? "").trim();
  return s === "" ? null : s;
}

/**
 * Build the provider_profile snapshot from the onboarding form body.
 */
function buildProviderProfile(body) {
  return {
    category: trimOrNull(body.category),
    secondary_category: trimOrNull(body.secondary_category),
    service_area: trimOrNull(body.service_area),
    service_radius_km: toNumberOrNull(body.service_radius_km),
    experience_years: toNumberOrNull(body.experience_years),
    bio: trimOrNull(body.bio),
    base_price: toNumberOrNull(body.base_price),
    availability: toBoolOrNull(body.availability),
    id_type: trimOrNull(body.id_type),
    id_number: trimOrNull(body.id_number),
  };
}

/**
 * Ingests an authenticated provider onboarding submission.
 *
 * Unlike the old public `/apply` flow, this updates the *existing* user (the one
 * who just signed up via OTP) rather than creating a new one: it grants the
 * `provider` role, moves them to `verification_pending`, and stores the full
 * provider profile. A linked Verification review record is created with a
 * snapshot of the submitted profile plus the uploaded documents (already stored
 * as private disk paths by multer in the route).
 */
export async function submitProviderOnboarding({ user, body, documents }) {
  if (!user) throw new AppError("Authentication required", 401, "AUTH_REQUIRED");

  const profile = buildProviderProfile(body);
  if (!profile.category) {
    throw new AppError("Service category is required", 400, "VALIDATION_ERROR");
  }
  if (!Array.isArray(documents) || documents.length === 0) {
    throw new AppError("At least one verification document is required", 400, "VALIDATION_ERROR");
  }

  // Grant the provider role (idempotently) and populate the profile.
  user.roles = Array.from(new Set([...(user.roles || []), "provider"]));
  user.status = "verification_pending";
  user.set("provider_profile", {
    ...(user.provider_profile?.toObject?.() ?? user.provider_profile ?? {}),
    ...profile,
  });
  user.markModified("provider_profile");
  await user.save();

  const seq = await nextSequence("verification");
  const reference = `VER-${3000 + seq}`;
  const now = new Date();
  const displayName = user.name?.full || user.name?.display || "Provider";

  const verification = await Verification.create({
    reference,
    status: VERIFICATION_STATUSES.PENDING,
    provider: { id: user._id, name: displayName, email: user.email || null, phone: user.phone || null },
    provider_profile: profile,
    documents,
    submitted_at: now,
    events: [{ status: VERIFICATION_STATUSES.PENDING, at: now, actor: "system", note: "Submitted for review" }],
  });

  publishEvent("provider.application.submitted", {
    user_id: user._id.toString(),
    reference,
    submitted_at: now.toISOString(),
  });

  return { reference: verification.reference, status: verification.status };
}
