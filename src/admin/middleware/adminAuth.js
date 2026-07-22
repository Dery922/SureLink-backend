import { getAdminFromSession } from "../services/adminAuthService.js";
import { AppError } from "../../utils/errors.js";

/**
 * authenticateAdmin — session verification middleware.
 *
 * Reads the bearer token from the Authorization header, verifies it against the
 * admin session store in Redis, and attaches the resolved admin and session to
 * the request object so downstream handlers don't need to repeat the lookup.
 *
 * AppSec notes:
 * - Token is read from Authorization header (Bearer scheme) — never from query
 *   strings, which would be logged by proxies/servers.
 * - The raw token is never logged or stored; only the SHA-256 hash reaches Redis.
 * - An inactive account invalidates the session even if the token is valid.
 * - Generic 401 messages prevent leaking whether the token exists or is expired.
 *
 * Usage:
 *   router.get("/me", authenticateAdmin, handler)
 */
export async function authenticateAdmin(req, res, next) {
  try {
    const authHeader = req.headers["authorization"];

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new AppError(
        "Authorization header missing or malformed",
        401,
        "ADMIN_AUTH_MISSING_TOKEN",
      );
    }

    const token = authHeader.slice(7).trim(); // strip "Bearer "

    if (!token) {
      throw new AppError(
        "No token provided",
        401,
        "ADMIN_AUTH_MISSING_TOKEN",
      );
    }

    const { admin, session } = await getAdminFromSession(token);

    // Attach to request so controllers can use without another DB hit.
    req.admin = admin;
    req.adminSession = session;

    return next();
  } catch (error) {
    return next(error);
  }
}
