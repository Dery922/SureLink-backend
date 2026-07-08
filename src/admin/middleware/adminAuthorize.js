import { ADMIN_ROLES } from "../models/Admin.js";
import { AppError } from "../../services/errors.js";

/**
 * requireRole — role-based authorization middleware factory.
 *
 * Returns a middleware function that allows access only to admins whose role
 * is in the provided list. Must be used after `authenticateAdmin` (which
 * populates req.admin).
 *
 * Design goals:
 * - Factory pattern: `requireRole("SUPER_ADMIN")` or
 *   `requireRole("SUPER_ADMIN", "OPERATIONS_ADMIN")` — no refactoring needed
 *   when adding new role constraints to new routes.
 * - SUPER_ADMIN bypass is NOT hardcoded here. If a route should be restricted
 *   to a specific role even for super admins, it can be. Add SUPER_ADMIN to the
 *   allowed list explicitly only when that route should be super-admin-accessible.
 *
 * AppSec notes:
 * - Authorization is checked on every request, not cached. Role changes take
 *   effect on the next request without needing a logout.
 * - 403 (not 404) is returned when the admin exists but lacks the role, so the
 *   caller knows authentication succeeded but authorization failed.
 *
 * Usage:
 *   router.delete(
 *     "/admins/:id",
 *     authenticateAdmin,
 *     requireRole(ADMIN_ROLES.SUPER_ADMIN),
 *     handler
 *   )
 *
 *   router.get(
 *     "/providers",
 *     authenticateAdmin,
 *     requireRole(ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.PROVIDER_MANAGEMENT_ADMIN),
 *     handler
 *   )
 */
export function requireRole(...allowedRoles) {
  // Validate at startup that each role is a known ADMIN_ROLE value.
  const knownRoles = Object.values(ADMIN_ROLES);
  for (const role of allowedRoles) {
    if (!knownRoles.includes(role)) {
      // This is a programmer error, not a runtime error — throw immediately.
      throw new Error(
        `requireRole: "${role}" is not a valid ADMIN_ROLE. Valid values: ${knownRoles.join(", ")}`,
      );
    }
  }

  return function authorizeMiddleware(req, res, next) {
    if (!req.admin) {
      return next(
        new AppError(
          "authenticateAdmin must run before requireRole",
          500,
          "ADMIN_MIDDLEWARE_ORDER_ERROR",
        ),
      );
    }

    if (!allowedRoles.includes(req.admin.role)) {
      return next(
        new AppError(
          "You do not have permission to access this resource",
          403,
          "ADMIN_AUTH_INSUFFICIENT_ROLE",
        ),
      );
    }

    return next();
  };
}

// Re-export ADMIN_ROLES so route files only need one import.
export { ADMIN_ROLES };
