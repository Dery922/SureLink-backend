import { successResponse } from "../../services/apiResponse.js";
import {
  loginAdmin,
  logoutAdmin,
  refreshAdminSession,
  verifyAdminOtp,
  resendAdminOtp,
} from "../services/adminAuthService.js";
import { AdminFactory } from "../services/adminFactory.js";

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

export async function logout(req, res, next) {
  try {
    const result = await logoutAdmin({ session_token: req.body?.session_token });
    return res.status(200).json(successResponse({ message: result.message }));
  } catch (error) {
    return next(error);
  }
}

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
