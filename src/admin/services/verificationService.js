import path from "path";
import { AppError } from "../../services/errors.js";
import { verificationRepository } from "../repositories/verificationRepository.js";
import { userProviderRepository } from "../repositories/userProviderRepository.js";
import { VERIFICATION_STATUSES } from "../models/Verification.js";
import { publishEvent } from "../../services/eventBus.js";
import { signDocUrl } from "../../services/docSigning.js";

const UPLOAD_ROOT = path.resolve("uploads");

// Replaces private on-disk document paths with short-lived signed URLs so the
// admin UI can render them via <img>. Legacy http(s) urls (seed data) pass through.
function signDocuments(id, documents = []) {
  return documents.map((doc, i) =>
    doc.url?.startsWith("http") ? doc : { ...doc, url: signDocUrl(id, i) },
  );
}

export async function listVerifications({ status, search, page, limit }) {
  const [result, stats] = await Promise.all([
    verificationRepository.findAll({ status, search, page, limit }),
    verificationRepository.countByStatus(),
  ]);
  return { ...result, stats };
}

export async function getVerification(id) {
  const verification = await verificationRepository.findById(id);
  if (!verification) throw new AppError("Verification not found", 404, "VERIFICATION_NOT_FOUND");
  return { ...verification, documents: signDocuments(id, verification.documents) };
}

// Resolves the absolute on-disk path for a verification document after bounds
// and path-traversal checks. Callers must validate the signed URL first.
export async function getVerificationDocumentPath(id, index) {
  const verification = await verificationRepository.findById(id);
  if (!verification) throw new AppError("Verification not found", 404, "VERIFICATION_NOT_FOUND");
  const doc = verification.documents?.[index];
  if (!doc) throw new AppError("Document not found", 404, "DOCUMENT_NOT_FOUND");

  const abs = path.resolve(doc.url);
  if (abs !== UPLOAD_ROOT && !abs.startsWith(UPLOAD_ROOT + path.sep)) {
    throw new AppError("Invalid document path", 400, "INVALID_DOCUMENT");
  }
  return abs;
}

// Approve a pending submission and flip the linked provider account to active.
export async function approveVerification(id, adminId, note) {
  const verification = await verificationRepository.findById(id);
  if (!verification) throw new AppError("Verification not found", 404, "VERIFICATION_NOT_FOUND");
  if (verification.status !== VERIFICATION_STATUSES.PENDING) {
    throw new AppError("Only pending verifications can be reviewed", 409, "VERIFICATION_NOT_PENDING");
  }

  const updated = await verificationRepository.updateWithEvent(
    id,
    {
      status: VERIFICATION_STATUSES.APPROVED,
      reviewed_at: new Date(),
      reviewed_by: String(adminId),
    },
    { status: VERIFICATION_STATUSES.APPROVED, actor: String(adminId), note: note || "Approved" },
  );

  // Activate the provider User account if this submission is linked to one.
  if (verification.provider?.id) {
    await userProviderRepository.updateStatus(verification.provider.id, "active");
  }

  publishEvent("admin.verification.approved", { verification_id: id, admin_id: String(adminId) });
  return updated;
}

// Reject a pending submission with a required reason.
export async function rejectVerification(id, adminId, reason) {
  if (!reason) throw new AppError("A rejection reason is required", 400, "REJECTION_REASON_REQUIRED");

  const verification = await verificationRepository.findById(id);
  if (!verification) throw new AppError("Verification not found", 404, "VERIFICATION_NOT_FOUND");
  if (verification.status !== VERIFICATION_STATUSES.PENDING) {
    throw new AppError("Only pending verifications can be reviewed", 409, "VERIFICATION_NOT_PENDING");
  }

  const updated = await verificationRepository.updateWithEvent(
    id,
    {
      status: VERIFICATION_STATUSES.REJECTED,
      reviewed_at: new Date(),
      reviewed_by: String(adminId),
      rejection_reason: reason,
    },
    { status: VERIFICATION_STATUSES.REJECTED, actor: String(adminId), note: reason },
  );

  publishEvent("admin.verification.rejected", { verification_id: id, admin_id: String(adminId) });
  return updated;
}
