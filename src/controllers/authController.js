import { AppError } from "../utils/errors.js";
import { successResponse } from "../utils/apiResponse.js";
import User from "../models/User.js";
import {
  logoutAllSessions,
  logoutSession,
  normalizeAndValidatePhone,
  prepareOtpPayload,
  refreshUserSession,
  registerOrLoginUser,
} from "../services/authService.js";
import { issueOtp, verifyOtp } from "../services/otpService.js";
import jwt from "jsonwebtoken";

export async function requestOtp(req, res, next) {
  console.log(req.body, "fgfdt");
  try {
    const payload = await prepareOtpPayload(req.body);

    const otpResult = await issueOtp(payload);

    const purpose = payload.existingUser ? "login" : "signup";

    return res.status(200).json(
      successResponse({
        message: "OTP sent successfully",
        data: {
          ...otpResult,
          purpose,
        },
      }),
    );
  } catch (error) {
    next(error);
  }
}

// Inside your auth controller file
// export async function verifyOtpAndRegister(req, res, next) {
//   try {
//     // 1. Grab inputs directly from the validated incoming request body
//     const { identifier, otp } = req.body;

//     // 2. Run the OTP database verification check
//     // If the code is wrong, this function will throw an error and stop execution immediately
//     await verifyOtp({ identifier, otp });

//     // 3. Evaluate the format of the identifier string directly
//     const cleanIdentifier = String(identifier).trim();
//     const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanIdentifier);

//     // 4. Construct the registration payload cleanly
//     const registrationPayload = {
//       phone: isEmail ? null : cleanIdentifier,
//       email: isEmail ? cleanIdentifier.toLowerCase() : null,
//       ip: req.ip,
//       user_agent: req.headers["user-agent"] || null,
//       type: req.body.type || "customer",
//     };

//     console.log("🚀 DISPATCHING TO DB REGISTRATION ENGINE:", registrationPayload);

//     // 5. Send to user provisioning session service
//     const result = await registerOrLoginUser(registrationPayload);

//     return res.status(200).json(
//       successResponse({
//         message: "OTP verified successfully",
//         data: result,
//       })
//     );
//   } catch (error) {
//     next(error);
//   }
// }

// export async function verifyOtpAndRegister(req, res, next) {
//   try {
//     const { identifier, otp } = req.body;

//     await verifyOtp({ identifier, otp });

//     const cleanIdentifier = String(identifier).trim();
//     const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanIdentifier);

//     const registrationPayload = {
//       phone: isEmail ? null : cleanIdentifier,
//       email: isEmail ? cleanIdentifier.toLowerCase() : null,
//       ip: req.ip,
//       user_agent: req.headers["user-agent"] || null,
//       type: req.body.type || "customer",
//     };

//     const result = await registerOrLoginUser(registrationPayload);

//     // 🔥 IMPORTANT: ISSUE JWT HERE
//     const token = jwt.sign(
//       { id: result.user._id },   // make sure result contains user
//       process.env.JWT_SECRET,
//       { expiresIn: "7d" }
//     );

//     return res.status(200).json(
//       successResponse({
//         message: "OTP verified successfully",
//         data: {
//           user_state: result.user_state,
//           session: {
//             token,
//           },
//           user: result.user,
//         },
//       })
//     );
//   } catch (error) {
//     next(error);
//   }
// }

//
export async function verifyOtpAndRegister(req, res, next) {
  try {
    const { identifier, otp } = req.body;

    // 1. Check code validity
    await verifyOtp({ identifier, otp });

    const cleanIdentifier = String(identifier).trim();
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanIdentifier);

    const registrationPayload = {
      phone: isEmail ? null : cleanIdentifier,
      email: isEmail ? cleanIdentifier.toLowerCase() : null,
      ip: req.ip,
      user_agent: req.headers["user-agent"] || null,
      type: req.body.type || "customer",
    };

    // 2. Invoke service which calls the correct createSessionForUser signature
    const result = await registerOrLoginUser(registrationPayload);

    // Debug confirmation logging
    console.log("📤 CONTROLLER OUTGOING SESSION PACKET:", result.session);

    // 3. Return payload structure cleanly
    return res.status(200).json(
      successResponse({
        message: "OTP verified successfully",
        data: {
          user_state: result.user_state,
          session: result.session, // 🔑 Contains your valid { token } tracking layout
          user: result.user,
        },
      }),
    );
  } catch (error) {
    next(error);
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

//export async function // controllers/authController.js

export async function selectRole(req, res) {
  try {
    const { role } = req.body;

    if (!role) {
      return res.status(400).json({
        success: false,
        message: "Role is required",
      });
    }

    const allowedRoles = ["customer", "provider"];

    if (!allowedRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Invalid role selected",
      });
    }

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // 1. Save the selected role type cleanly
    user.type = role;

    // 2. 🔑 FORCE ALL ROLES TO TERMS SHEET NEXT
    // This allows providers to accept terms before moving to /provider/onboarding
    user.onboarding.current_step = "terms_consent";

    await user.save();

    // 3. Return the payload. 'next_step' will now always be "terms_consent"
    return res.status(200).json({
      success: true,
      message: "Role selected successfully",
      data: {
        role: user.type,
        next_step: user.onboarding.current_step,
      },
    });
  } catch (error) {
    console.error("Select Role Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to save role",
    });
  }
}

export async function acceptTerms(req, res, next) {
  try {
    // 1. Fetch user document from database using req.user.id populated by authMiddleware
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // 2. Mark terms agreement metrics on your user model
    user.onboarding.terms_accepted = true;
    user.onboarding.terms_accepted_at = new Date();

    // 3. Set up the next step depending on their role
    if (user.type === "provider") {
      // Providers are now ready to fill out their profile details on their dashboard page
      user.onboarding.current_step = "provider_profile";
      user.onboarding.completed = false;
    } else {
      // Customers are fully done with all onboarding requirements
      user.onboarding.current_step = "completed";
      user.onboarding.completed = true;
    }

    await user.save();

    // 4. Return success to the client along with the updated step info
    return res.status(200).json({
      success: true,
      message: "Terms and conditions accepted successfully",
      data: {
        role: user.type,
        next_step: user.onboarding.current_step,
      },
    });
  } catch (error) {
    console.error("Accept Terms Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to save terms acceptance details",
    });
  }
}
