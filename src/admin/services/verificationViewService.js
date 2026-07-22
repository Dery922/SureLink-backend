import { AppError } from "../../utils/errors.js";
import { publishEvent } from "../../services/eventBus.js";
import { verificationRepository } from "../repositories/verificationRepository.js";

function reference(u) {
  return `VER-${String(u._id).slice(-6).toUpperCase()}`;
}

/**
 * Build the documents array from the provider's uploaded ID + selfie.
 * The flat provider_profile stores a single ID document and an avatar;
 * we surface them in the {type,label,url} shape the dashboard expects.
 */
function documents(u) {
  const pp = u.provider_profile || {};
  const out = [];

  if (pp.id_doc_url) {
    const isBusiness = String(pp.id_type || "").toLowerCase().includes("business");
    out.push({
      type: isBusiness ? "business_cert" : "ghana_card",
      label: isBusiness ? "Business Registration" : `Ghana Card${pp.id_number ? ` (${pp.id_number})` : ""}`,
      url: pp.id_doc_url,
    });
  }

  const selfieUrl = pp.avatar_url || u.avatar?.url;
  if (selfieUrl) out.push({ type: "selfie", label: "Verification Selfie", url: selfieUrl });

  return out;
}

function events(u) {
  const pp = u.provider_profile || {};
  const list = [{ status: "pending", at: u.createdAt, actor: "system", note: "Submitted for review" }];
  if (pp.verification_status === "approved") {
    list.push({ status: "approved", at: pp.reviewed_at || u.updatedAt, actor: "admin", note: "Documents verified" });
  } else if (pp.verification_status === "rejected") {
    list.push({ status: "rejected", at: pp.reviewed_at || u.updatedAt, actor: "admin", note: pp.rejection_reason || "Rejected" });
  }
  return list;
}

/**
 * Map a lean provider User document to the verification shape the dashboard
 * renders.
 */
export function toVerificationView(u) {
  const pp = u.provider_profile || {};
  const reviewed = pp.verification_status === "approved" || pp.verification_status === "rejected";
  return {
    _id: String(u._id),
    reference: reference(u),
    status: pp.verification_status,
    provider: {
      name: u.name?.full || u.name?.display || null,
      email: u.email || null,
      phone: u.phone || null,
    },
    documents: documents(u),
    submitted_at: u.createdAt,
    reviewed_at: reviewed ? (pp.reviewed_at || u.updatedAt) : null,
    reviewed_by: pp.reviewed_by ? String(pp.reviewed_by) : null,
    rejection_reason: pp.rejection_reason || null,
    events: events(u),
  };
}

export async function listVerifications({ status, search, page, limit }) {
  const [{ providers, total }, stats] = await Promise.all([
    verificationRepository.findAll({ status, search, page, limit }),
    verificationRepository.countByStatus(),
  ]);
  return { verifications: providers.map(toVerificationView), total, page, limit, stats };
}

export async function getVerification(id) {
  const provider = await verificationRepository.findById(id);
  if (!provider) throw new AppError("Verification not found", 404, "VERIFICATION_NOT_FOUND");
  return toVerificationView(provider);
}

export async function approveVerification(id, note, adminId) {
  const provider = await verificationRepository.findById(id);
  if (!provider) throw new AppError("Verification not found", 404, "VERIFICATION_NOT_FOUND");
  if (provider.provider_profile?.verification_status === "approved") {
    throw new AppError("Provider is already approved", 409, "VERIFICATION_ALREADY_APPROVED");
  }

  const updated = await verificationRepository.review(id, {
    verification_status: "approved",
    userStatus: "active",
    rejection_reason: null,
    reviewed_by: adminId,
  });
  publishEvent("admin.verification.approved", { provider_id: id, admin_id: String(adminId), note });
  return toVerificationView(updated);
}

export async function rejectVerification(id, reason, adminId) {
  const provider = await verificationRepository.findById(id);
  if (!provider) throw new AppError("Verification not found", 404, "VERIFICATION_NOT_FOUND");
  if (!reason) throw new AppError("A rejection reason is required", 400, "VALIDATION_ERROR");

  const updated = await verificationRepository.review(id, {
    verification_status: "rejected",
    userStatus: "verification_pending",
    rejection_reason: reason,
    reviewed_by: adminId,
  });
  publishEvent("admin.verification.rejected", { provider_id: id, admin_id: String(adminId), reason });
  return toVerificationView(updated);
}
