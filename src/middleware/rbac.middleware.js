// middleware/rbac.middleware.js

/**
 * RBAC Middleware — Chain of Responsibility pattern (design doc).
 *
 * All middleware here assumes Obed's requireAuth has already run
 * and attached req.user = { _id, roles: [...], status } to the request.
 *
 * The Awilix container is attached to req via the scope middleware
 * registered in containers/index.js — see registerContainerMiddleware().
 *
 * Usage in routes:
 *   router.get("/admin/users",   requireAuth, requireRole("admin"),                    handler);
 *   router.post("/services",     requireAuth, requirePermission("service:create"),      handler);
 *   router.get("/dashboard",     requireAuth, requireMinLevel("business"),              handler);
 *   router.get("/earnings",      requireAuth, requireRole("driver","provider"),         handler);
 */

/**
 * Resolve rbacService from the Awilix request scope on req.
 * Throws a clean 500 if the container isn't wired up correctly.
 */
const resolveRbac = (req) => {
  if (!req.container) {
    throw new Error("Awilix container not found on request. Check registerContainerMiddleware().");
  }
  return req.container.resolve("rbacService");
};

// ─────────────────────────────────────────────
// 1. requireRole — gate by role (synchronous)
// ─────────────────────────────────────────────
/**
 * User must have AT LEAST ONE of the listed roles.
 * Fast path — no DB call.
 *
 * @param  {...string} roles
 */
export const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        code: "UNAUTHENTICATED",
        message: "Authentication required.",
      });
    }

    const rbacService = resolveRbac(req);
    const allowed = rbacService.hasRole(req.user.roles ?? [], roles);

    if (!allowed) {
      return res.status(403).json({
        success: false,
        code: "FORBIDDEN_ROLE",
        message: `Access requires one of: [${roles.join(", ")}].`,
      });
    }

    next();
  };
};

// ─────────────────────────────────────────────
// 2. requirePermission — gate by permission (async, hits DB for overrides)
// ─────────────────────────────────────────────
/**
 * User must have ALL of the listed permissions (role-based + overrides).
 *
 * @param  {...string} permissions
 */
export const requirePermission = (...permissions) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        code: "UNAUTHENTICATED",
        message: "Authentication required.",
      });
    }

    try {
      const rbacService = resolveRbac(req);
      const allowed = await rbacService.hasPermissions(
        req.user._id,
        req.user.roles ?? [],
        permissions
      );

      if (!allowed) {
        return res.status(403).json({
          success: false,
          code: "FORBIDDEN_PERMISSION",
          message: `Missing required permission(s): [${permissions.join(", ")}].`,
        });
      }

      next();
    } catch (err) {
      next(err);
    }
  };
};

// ─────────────────────────────────────────────
// 3. requireMinLevel — gate by hierarchy level
// ─────────────────────────────────────────────
/**
 * User's highest role must meet or exceed the minimum hierarchy level.
 * e.g. requireMinLevel("business") passes for business AND admin.
 *
 * @param {string} minimumRole
 */
export const requireMinLevel = (minimumRole) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        code: "UNAUTHENTICATED",
        message: "Authentication required.",
      });
    }

    const rbacService = resolveRbac(req);
    const allowed = rbacService.meetsMinimumLevel(req.user.roles ?? [], minimumRole);

    if (!allowed) {
      return res.status(403).json({
        success: false,
        code: "FORBIDDEN_LEVEL",
        message: `Access requires a minimum role level of: ${minimumRole}.`,
      });
    }

    next();
  };
};

// ─────────────────────────────────────────────
// 4. attachPermissions — optional, non-blocking
// ─────────────────────────────────────────────
/**
 * Resolves and attaches the full permission Set to req.permissions.
 * Does NOT block the request — use when a route needs to inspect
 * permissions conditionally rather than enforcing a hard gate.
 *
 * Add to your global middleware chain in app.js AFTER requireAuth.
 */
export const attachPermissions = () => {
  return async (req, res, next) => {
    if (!req.user) return next();

    try {
      const rbacService = resolveRbac(req);
      req.permissions = await rbacService.resolvePermissions(
        req.user._id,
        req.user.roles ?? []
      );
    } catch {
      req.permissions = new Set(); // fail open — hard gates handle blocking
    }

    next();
  };
};