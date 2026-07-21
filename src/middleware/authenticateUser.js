import { AppError } from "../services/errors.js";
import { SessionFactory } from "../services/sessionFactory.js";
import { sessionRepository } from "../repositories/sessionRepository.js";
import { userRepository } from "../repositories/userRepository.js";

/**
 * Authenticate a customer/provider request via an opaque session token.
 *
 * The token is read from the `Authorization: Bearer <token>` header (falling
 * back to `req.body.session_token` for non-multipart callers), hashed, and
 * matched against the active sessions in Redis — mirroring the token handling
 * in `refreshUserSession`/`logoutSession`. On success the loaded user document
 * is attached as `req.user`.
 *
 * Rejects with 401 when the token is missing, malformed, expired, or its user
 * no longer exists.
 */
export async function authenticateUser(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const bearer = header.startsWith("Bearer ") ? header.slice(7).trim() : null;
    const token = bearer || req.body?.session_token;

    if (!token) {
      throw new AppError("Authentication required", 401, "AUTH_REQUIRED");
    }

    const sessionToken = SessionFactory.ensureSessionTokenShape(token);
    const tokenHash = SessionFactory.hashToken(sessionToken);
    const activeSession = await sessionRepository.findByTokenHash(tokenHash);

    if (!activeSession) {
      throw new AppError("Session not found or expired", 401, "AUTH_SESSION_INVALID");
    }

    const user = await userRepository.findById(activeSession.user_id);
    if (!user) {
      throw new AppError("Session user no longer exists", 401, "AUTH_SESSION_INVALID");
    }

    req.user = user;
    req.session_token = sessionToken;
    return next();
  } catch (error) {
    return next(error);
  }
}
