import { AppError } from "../utils/errors.js";
import { successResponse } from "../utils/apiResponse.js";
import {
  logoutAllSessions,
  logoutSession,
  normalizeAndValidatePhone,
  prepareOtpPayload,
  refreshUserSession,
  registerOrLoginUser,
} from "../services/authService.js";
import { issueOtp, verifyOtp } from "../services/otpService.js";

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

export async function verifyOtpAndRegister(req, res, next) {
  try {
    const phone = req.body?.phone;
    const otp = String(req.body?.otp || "");

    if (!phone || !otp) {
      throw new AppError("Phone and OTP are required", 400, "VALIDATION_ERROR");
    }

    const normalizedPhone = normalizeAndValidatePhone(phone);
    const verifiedPayload = verifyOtp(req, { phone: normalizedPhone, otp });
    const result = await registerOrLoginUser({
      ...verifiedPayload,
      ip: req.ip,
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
