import { AppError } from "../services/errors.js";
import { successResponse } from "../services/apiResponse.js";
import {
  logoutAllSessions,
  logoutSession,
  prepareOtpPayload,
  refreshUserSession,
  registerOrLoginUser,
  resolveIdentifier,
} from "../services/authService.js";
import { issueOtp, verifyOtp } from "../services/otpService.js";

/**
 * Auth controller layer.
 *
 * Controllers should stay thin: validate/normalize request inputs, pass context
 * (ip/user-agent/session token) into services, and shape consistent API
 * responses. Business rules and persistence live in the service layer.
 */

/**
 * Initiate an OTP flow for a user identifier (e.g. phone).
 *
 * - Expects: `req.body` contains the information needed to request an OTP.
 * - Delegates: payload validation/normalization to `prepareOtpPayload`,
 *   OTP generation/delivery to `issueOtp`.
 */
export async function requestOtp(req, res, next) {
  try {
    const payload = await prepareOtpPayload(req.body);
    const otpResult = issueOtp(req, payload);

    return res.status(200).json(
      successResponse({
        message: "OTP generated successfully",
        data: otpResult,
      }),
    );
  } catch (error) {
    return next(error);
  }
}

/**
 * Verify a user-provided OTP and complete registration/login.
 *
 * - Expects: `req.body.identifier` (phone OR email) or explicit `phone`/`email`,
 *   plus `req.body.otp`.
 * - Notes:
 *   - Identifier resolution is centralized in `resolveIdentifier` so all auth
 *     flows treat phone/email identifiers consistently.
 *   - OTP is coerced to string to avoid subtle numeric issues (e.g. leading
 *     zeros, number parsing).
 * - Delegates: OTP verification to `verifyOtp`, user creation/session issuance
 *   to `registerOrLoginUser`.
 */
export async function verifyOtpAndRegister(req, res, next) {
  try {
    const otp = String(req.body?.otp || "");

    if (!otp) {
      throw new AppError("OTP is required", 400, "VALIDATION_ERROR");
    }

    const { identifier } = resolveIdentifier(req.body);
    const verifiedPayload = verifyOtp(req, { identifier, otp });
    const result = await registerOrLoginUser({
      ...verifiedPayload,
      ip: req.ip,
      // Persisting user agent helps trace sessions across devices; treat missing
      // header as unknown rather than an empty string.
      user_agent: req.headers["user-agent"] || null,
    });

    return res.status(200).json(
      successResponse({
        message: "OTP verified and registration completed",
        data: result,
      }),
    );
  } catch (error) {
    return next(error);
  }
}

/**
 * Exchange an existing session token for a refreshed session.
 *
 * - Expects: `req.body.session_token`
 * - Delegates: validation/rotation rules to `refreshUserSession`.
 */
export async function refreshSession(req, res, next) {
  try {
    const result = await refreshUserSession({
      session_token: req.body?.session_token,
      ip: req.ip,
      user_agent: req.headers["user-agent"] || null,
    });

    return res.status(200).json(
      successResponse({
        message: result.message,
        data: {
          session: result.session,
        },
      }),
    );
  } catch (error) {
    return next(error);
  }
}

/**
 * Revoke a single session (log out the current token).
 *
 * - Expects: `req.body.session_token`
 * - Delegates: token lookup/revocation to `logoutSession`.
 */
export async function logout(req, res, next) {
  try {
    const result = await logoutSession({
      session_token: req.body?.session_token,
    });

    return res.status(200).json(
      successResponse({
        message: result.message,
      }),
    );
  } catch (error) {
    return next(error);
  }
}

/**
 * Revoke all sessions for the token's user (log out everywhere).
 *
 * - Expects: `req.body.session_token`
 * - Delegates: cascade revocation rules to `logoutAllSessions`.
 */
export async function logoutAll(req, res, next) {
  try {
    const result = await logoutAllSessions({
      session_token: req.body?.session_token,
    });

    return res.status(200).json(
      successResponse({
        message: result.message,
        data: {
          revoked_sessions: result.revoked_sessions,
        },
      }),
    );
  } catch (error) {
    return next(error);
  }
}
