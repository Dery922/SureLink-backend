/**
 * adminAuthController.js
 *
 * HTTP layer for admin authentication. Each function here is thin on purpose —
 * it extracts values from the request, delegates all business logic to
 * adminAuthService, and formats the response. No auth logic lives here.
 *
 * Login is a single step: POST /login validates email + password and, on
 * success, returns the admin profile plus a session token.
 */

import { successResponse } from "../../services/apiResponse.js";
import {
  loginAdmin,
  logoutAdmin,
  refreshAdminSession,
} from "../services/adminAuthService.js";
import { AdminFactory } from "../services/adminFactory.js";

/**
 * Login.
 * Validates email + password. On success, creates a session and returns
 * the admin profile plus the session token.
 */
export async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const result = await loginAdmin({
      email,
      password,
      ip: req.ip,
      user_agent: req.headers["user-agent"] || null,
    });
    return res.status(200).json(
      successResponse({ message: "Login successful", data: result }),
    );
  } catch (error) {
    return next(error);
  }
}

/**
 * Logout.
 * Revokes the session token from the session store so it can no longer be
 * used. The client is responsible for clearing the token from localStorage.
 */
export async function logout(req, res, next) {
  try {
    const result = await logoutAdmin({ session_token: req.body?.session_token });
    return res.status(200).json(successResponse({ message: result.message }));
  } catch (error) {
    return next(error);
  }
}

/**
 * Refresh session.
 * Rotates the session token — deletes the old one and issues a new one
 * with a fresh expiry. The client should replace its stored token with
 * the one returned here.
 */
export async function refresh(req, res, next) {
  try {
    const result = await refreshAdminSession({
      session_token: req.body?.session_token,
      ip: req.ip,
      user_agent: req.headers["user-agent"] || null,
    });
    return res.status(200).json(
      successResponse({ message: result.message, data: { session: result.session } }),
    );
  } catch (error) {
    return next(error);
  }
}

/**
 * Get current admin profile.
 * The admin object is attached to req.admin by the authenticateAdmin middleware
 * after it validates the Bearer token. This just shapes and returns it.
 * Sensitive fields (password hash, raw session tokens) are stripped by
 * AdminFactory.createPublicAdmin before sending to the client.
 */
export async function me(req, res, next) {
  try {
    return res.status(200).json(
      successResponse({
        message: "Admin profile retrieved",
        data: { admin: AdminFactory.createPublicAdmin(req.admin) },
      }),
    );
  } catch (error) {
    return next(error);
  }
}
