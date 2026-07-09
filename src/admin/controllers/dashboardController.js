import { successResponse } from "../../services/apiResponse.js";
import { getDashboardSummary } from "../services/dashboardService.js";

export async function summary(req, res, next) {
  try {
    const data = await getDashboardSummary(req.admin.role);
    return res.json(successResponse({ message: "Dashboard summary", data }));
  } catch (err) {
    return next(err);
  }
}
