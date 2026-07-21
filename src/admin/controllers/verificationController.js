import { successResponse, errorResponse } from "../../services/apiResponse.js";
import * as verificationService from "../services/verificationService.js";
import { verifyDocSig } from "../../services/docSigning.js";

export async function list(req, res, next) {
  try {
    const { status, search, page = 1, limit = 20 } = req.query;
    const data = await verificationService.listVerifications({ status, search, page: +page, limit: +limit });
    return res.json(successResponse({ message: "Verifications retrieved", data }));
  } catch (err) { return next(err); }
}

export async function getOne(req, res, next) {
  try {
    const data = await verificationService.getVerification(req.params.id);
    return res.json(successResponse({ message: "Verification retrieved", data }));
  } catch (err) { return next(err); }
}

export async function approve(req, res, next) {
  try {
    const data = await verificationService.approveVerification(req.params.id, req.admin._id, req.body?.note);
    return res.json(successResponse({ message: "Verification approved", data }));
  } catch (err) { return next(err); }
}

export async function reject(req, res, next) {
  try {
    const data = await verificationService.rejectVerification(req.params.id, req.admin._id, req.body?.reason);
    return res.json(successResponse({ message: "Verification rejected", data }));
  } catch (err) { return next(err); }
}

// Public, signature-gated document streamer — lets admin <img> tags load private
// verification files without an auth header. The HMAC signature is the auth.
export async function serveDocument(req, res, next) {
  try {
    const { id, index } = req.params;
    const { exp, sig } = req.query;
    if (!verifyDocSig({ id, index, exp, sig })) {
      return res.status(403).json(errorResponse({ message: "Invalid or expired link", code: "INVALID_SIGNATURE" }));
    }
    const abs = await verificationService.getVerificationDocumentPath(id, Number(index));
    return res.sendFile(abs);
  } catch (err) { return next(err); }
}
