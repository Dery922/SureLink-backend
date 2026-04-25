import { AppError } from "../utils/errors.js";
import { SessionFactory } from "../factories/sessionFactory.js";
import { sessionRepository } from "../repositories/sessionRepository.js";
import { userRepository } from "../repositories/userRepository.js";

function extractSessionToken(req) {
  const auth = req.headers?.authorization || "";
  const bearerMatch = auth.match(/^Bearer\s+(.+)$/i);
  if (bearerMatch?.[1]) return bearerMatch[1];

  const headerToken = req.headers?.["x-session-token"];
  if (headerToken) return headerToken;

  // Fallback for legacy clients (not preferred; header is better)
  const bodyToken = req.body?.session_token;
  if (bodyToken) return bodyToken;

  return null;
}

/**
 * requireAuth
 *
 * Resolves a caller into `req.user` using the opaque `session_token`.
 * - token is validated and hashed
 * - active session is resolved from Redis by hash
 * - user record is resolved from MongoDB
 */
export function requireAuth(req, res, next) {
  (async () => {
    const token = extractSessionToken(req);
    if (!token) {
      throw new AppError("Authentication required", 401, "UNAUTHENTICATED");
    }

    const sessionToken = SessionFactory.ensureSessionTokenShape(token);
    const tokenHash = SessionFactory.hashToken(sessionToken);
    const activeSession = await sessionRepository.findByTokenHash(tokenHash);

    if (!activeSession) {
      throw new AppError("Session not found or expired", 401, "AUTH_SESSION_INVALID");
    }

    const user = await userRepository.findById(activeSession.user_id);
    if (!user) {
      // Defensive: session exists but user deleted.
      throw new AppError("User not found", 401, "AUTH_USER_NOT_FOUND");
    }

    if (user.status === "banned" || user.status === "suspended") {
      throw new AppError("Account is not allowed to access this resource", 403, "ACCOUNT_RESTRICTED");
    }

    req.user = {
      _id: user._id.toString(),
      roles: user.roles ?? [],
      status: user.status,
      phone: user.phone,
    };

    next();
  })().catch(next);
}

