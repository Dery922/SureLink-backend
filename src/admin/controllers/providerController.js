import { successResponse } from "../../utils/apiResponse.js";
import * as providerService from "../services/providerService.js";

export async function list(req, res, next) {
  try {
    const { status, search, page = 1, limit = 20 } = req.query;
    const [result, stats] = await Promise.all([
      providerService.listProviders({ status, search, page: +page, limit: +limit }),
      providerService.getProviderStats(),
    ]);
    return res.json(successResponse({
      message: "Providers retrieved",
      data: { ...result, stats },
    }));
  } catch (err) { return next(err); }
}

export async function getOne(req, res, next) {
  try {
    const provider = await providerService.getProvider(req.params.id);
    return res.json(successResponse({ message: "Provider retrieved", data: { provider } }));
  } catch (err) { return next(err); }
}

export async function approve(req, res, next) {
  try {
    const provider = await providerService.approveProvider(req.params.id, req.admin._id);
    return res.json(successResponse({ message: "Provider approved", data: { provider } }));
  } catch (err) { return next(err); }
}

export async function suspend(req, res, next) {
  try {
    const provider = await providerService.suspendProvider(req.params.id, req.admin._id);
    return res.json(successResponse({ message: "Provider suspended", data: { provider } }));
  } catch (err) { return next(err); }
}

export async function reinstate(req, res, next) {
  try {
    const provider = await providerService.reinstateProvider(req.params.id, req.admin._id);
    return res.json(successResponse({ message: "Provider reinstated", data: { provider } }));
  } catch (err) { return next(err); }
}
