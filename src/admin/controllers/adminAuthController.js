/**
 * adminAuthController.js
 *
 * HTTP layer for admin authentication. Each function here is thin on purpose —
 * it extracts values from the request, delegates all business logic to
 * adminAuthService, and formats the response. No auth logic lives here.
 *
 * Login is a two-step flow:
 *   1. POST /login        → validates credentials, sends OTP, returns pending_token
 *   2. POST /verify-otp   → validates OTP + pending_token, returns admin + session
 *
 * The pending_token is a short-lived Redis key that links the two steps.
 * It is never stored in the client's localStorage — the frontend holds it in
 * component state only for the duration of the OTP screen.
 */

import { successResponse } from "../../services/apiResponse.js";
import {
  loginAdmin,
  logoutAdmin,
  refreshAdminSession,
  verifyAdminOtp,
  resendAdminOtp,
} from "../services/adminAuthService.js";
import { AdminFactory } from "../services/adminFactory.js";

/**
 * Step 1 of login.
 * Validates email + password. On success, generates a 6-digit OTP,
 * stores it in Redis under a pending_token, and sends the OTP to the
 * admin's registered email. Returns the pending_token to the client
 * so it can be submitted with the OTP in the next step.
 *
 * In development, dev_otp is included in the response for convenience.
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
      successResponse({ message: "OTP sent. Please verify to continue.", data: result }),
    );
  } catch (error) {
    return next(error);
  }
}

/**
 * Step 2 of login.
 * Accepts the pending_token from step 1 and the OTP entered by the admin.
 * Verifies both match the Redis record. On success, deletes the pending
 * state, creates a full session, and returns the admin profile + session token.
 *
 * After 5 failed OTP attempts the pending state is locked and the admin
 * must start over from step 1.
 */
export async function verifyOTP(req, res, next) {
  try {
    const { pending_token, otp } = req.body;
    const result = await verifyAdminOtp({
      pending_token,
      otp,
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
 * Resend OTP.
 * Invalidates the current pending_token + OTP in Redis and generates a
 * fresh OTP with a new pending_token. The client must use the new
 * pending_token for the next verify-otp call.
 */
export async function resendOTP(req, res, next) {
  try {
    const { pending_token } = req.body;
    const result = await resendAdminOtp({ pending_token });
    return res.status(200).json(
      successResponse({ message: "New OTP sent.", data: result }),
    );
  } catch (error) {
    return next(error);
  }
}

/**
 * Logout.
 * Revokes the session token from Redis so it can no longer be used.
 * The client is responsible for clearing the token from localStorage.
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
