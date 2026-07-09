import { successResponse } from "../../services/apiResponse.js";
import * as operationsService from "../services/operationsService.js";

export async function summary(req, res, next) {
  try {
    const data = await operationsService.getOperationsSummary();
    return res.json(successResponse({ message: "Operations summary retrieved", data }));
  } catch (err) { return next(err); }
}

export async function listDeliveries(req, res, next) {
  try {
    const { status, page = 1, limit = 30 } = req.query;
    const data = await operationsService.listDeliveries({ status, page: +page, limit: +limit });
    return res.json(successResponse({ message: "Deliveries retrieved", data }));
  } catch (err) { return next(err); }
}

export async function listZones(req, res, next) {
  try {
    const zones = await operationsService.listZones();
    return res.json(successResponse({ message: "Zones retrieved", data: { zones } }));
  } catch (err) { return next(err); }
}

export async function updateZone(req, res, next) {
  try {
    const zone = await operationsService.updateZone(req.params.id, req.body);
    return res.json(successResponse({ message: "Zone updated", data: { zone } }));
  } catch (err) { return next(err); }
}
