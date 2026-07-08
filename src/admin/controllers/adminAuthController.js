import { AppError } from "../../services/errors.js";
import { successResponse } from "../../services/apiResponse.js";
import {
  loginAdmin,
  logoutAdmin,
  refreshAdminSession,
  getAdminFromSession,
} from "../services/adminAuthService.js";
import { AdminFactory } from "../services/adminFactory.js";

/**
 * Admin auth controller.
 *
 * Stays thin: normalize inputs → call service → shape response.
 * No business logic lives here.
 */

/**
 * POST /api/admin/auth/login
 *
 * Authenticate with email + password and receive a session token.
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
      successResponse({
        message: "Login successful",
        data: result,
      }),
    );
  } catch (error) {
    return next(error);
  }
}

/**
 * POST /api/admin/auth/logout
 *
 * Revoke the current session token.
 * Expects: { session_token }
 */
export async function logout(req, res, next) {
  try {
    const result = await logoutAdmin({
      session_token: req.body?.session_token,
    });

    return res.status(200).json(
      successResponse({ message: result.message }),
    );
  } catch (error) {
    return next(error);
  }
}

/**
 * POST /api/admin/auth/refresh
 *
 * Rotate a session token. Old token is revoked immediately.
 * Expects: { session_token }
 */
export async function refresh(req, res, next) {
  try {
    const result = await refreshAdminSession({
      session_token: req.body?.session_token,
      ip: req.ip,
      user_agent: req.headers["user-agent"] || null,
    });

    return res.status(200).json(
      successResponse({
        message: result.message,
        data: { session: result.session },
      }),
    );
  } catch (error) {
    return next(error);
  }
}

/**
 * GET /api/admin/auth/me
 *
 * Return the authenticated admin's profile.
 * Requires: authenticateAdmin middleware (populates req.admin).
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
