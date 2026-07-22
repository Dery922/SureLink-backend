/**
 * dashboardController.js
 *
 * HTTP layer for the admin dashboard. Delegates all data fetching to
 * dashboardService, which queries the database and shapes the response
 * based on the requesting admin's role.
 *
 * The admin object on req.admin is set by the authenticateAdmin middleware
 * before this controller is reached.
 */

import { successResponse } from "../../utils/apiResponse.js";
import { getDashboardSummary } from "../services/dashboardService.js";

/**
 * GET /api/admin/dashboard/summary
 *
 * Returns role-scoped stats and recent activity for the dashboard home page.
 *
 * - SUPER_ADMIN        → provider counts, admin count, delivery counts, recent activity across all
 * - PROVIDER_MANAGEMENT_ADMIN → provider-specific stats and recent provider activity
 * - OPERATIONS_ADMIN   → delivery stats, average delivery time, recent operations activity
 *
 * Response shape:
 *   { stats: [{ label, value, change? }], activity: [{ type, description, time }] }
 */
export async function summary(req, res, next) {
  try {
    const data = await getDashboardSummary(req.admin.role);
    return res.json(successResponse({ message: "Dashboard summary", data }));
  } catch (err) {
    return next(err);
  }
}
