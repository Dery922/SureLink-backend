import { successResponse } from "../../utils/apiResponse.js";
import * as verificationService from "../services/verificationViewService.js";

export async function list(req, res, next) {
  try {
    const { status, search, page = 1, limit = 20 } = req.query;
    const result = await verificationService.listVerifications({ status, search, page: +page, limit: +limit });
    return res.json(successResponse({ message: "Verifications retrieved", data: result }));
  } catch (err) { return next(err); }
}

export async function getOne(req, res, next) {
  try {
    const verification = await verificationService.getVerification(req.params.id);
    return res.json(successResponse({ message: "Verification retrieved", data: verification }));
  } catch (err) { return next(err); }
}

export async function approve(req, res, next) {
  try {
    const verification = await verificationService.approveVerification(req.params.id, req.body?.note, req.admin._id);
    return res.json(successResponse({ message: "Verification approved", data: verification }));
  } catch (err) { return next(err); }
}

export async function reject(req, res, next) {
  try {
    const verification = await verificationService.rejectVerification(req.params.id, req.body?.reason, req.admin._id);
    return res.json(successResponse({ message: "Verification rejected", data: verification }));
  } catch (err) { return next(err); }
}
