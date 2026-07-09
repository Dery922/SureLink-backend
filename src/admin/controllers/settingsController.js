import { successResponse } from "../../services/apiResponse.js";
import * as settingsService from "../services/settingsService.js";

export async function get(req, res, next) {
  try {
    const settings = await settingsService.getSettings();
    return res.json(successResponse({ message: "Settings retrieved", data: { settings } }));
  } catch (err) { return next(err); }
}

export async function update(req, res, next) {
  try {
    const settings = await settingsService.updateSettings(req.body, req.admin._id);
    return res.json(successResponse({ message: "Settings updated", data: { settings } }));
  } catch (err) { return next(err); }
}
