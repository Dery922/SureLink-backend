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
import cloudinary from "../config/cloudinary.js";

export async function requestOtp(req, res, next) {
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

export async function saveProviderDraft(req, res, next) {
  try {
    if (!req.user || !req.user.id) {
      return res
        .status(401)
        .json({ success: false, message: "Authorization required." });
    }

    const { profileDetails, currentStep } = req.body;
    const user = await User.findById(req.user.id);

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found." });
    }

    // 1. Save whatever fields are currently available from the active frontend state
    user.provider_profile = {
      ...user.provider_profile, // Keep any existing database profile fields safe
      id_type: profileDetails.idType || user.provider_profile?.id_type,
      id_number: profileDetails.idNumber || user.provider_profile?.id_number,
      id_doc_url: profileDetails.idDocUrl || user.provider_profile?.id_doc_url,

      category: profileDetails.category || user.provider_profile?.category,
      secondaryCategories:
        profileDetails.secondaryCategories ||
        user.provider_profile?.secondaryCategories,
      service_area: profileDetails.area || user.provider_profile?.service_area,
      radius:
        Number(profileDetails.radius) || user.provider_profile?.radius || 25,
      bio: profileDetails.bio || user.provider_profile?.bio,
      id_type: profileDetails.idType || user.provider_profile?.id_type,
      id_number: profileDetails.idNumber || user.provider_profile?.id_number,
      avatar_url: profileDetails.avatarUrl || user.provider_profile?.avatar_url,
      base_price:
        Number(profileDetails.basePrice) ||
        user.provider_profile?.base_price ||
        0,
    };

    // 2. 🔑 UPDATE THE ONBOARDING TRAP TRACKER
    // If they just completed 'profile', the next time they log in they should resume at 'verification'
    if (currentStep === "profile") {
      user.onboarding.current_step = "provider_profile_verification";
    } else if (currentStep === "verification") {
      user.onboarding.current_step = "provider_profile_review";
    }

    await user.save();
    console.log(user);

    return res.status(200).json({
      success: true,
      message: "Partial draft synchronized successfully.",
      data: {
        onboardingStep: user.onboarding.current_step,
      },
    });
  } catch (error) {
    console.error("Save Draft Error:", error);
    next(error);
  }
}

export async function saveProviderProfile(req, res, next) {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: "Session authorization missing. Please log in again.",
      });
    }

    const { profileDetails } = req.body;
    if (!profileDetails) {
      return res.status(400).json({
        success: false,
        message: "Profile dataset details are required for final submission.",
      });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Provider profile not found in our database records.",
      });
    }

    // 🚀 CLOUDINARY BASE64 ASSET CAPTURE & UPLOAD
    if (
      profileDetails.avatarUrl &&
      profileDetails.avatarUrl.startsWith("data:image/")
    ) {
      try {
        const uploadResponse = await cloudinary.uploader.upload(
          profileDetails.avatarUrl,
          {
            folder: "provider_avatars", // Groups your image files neatly in Cloudinary
            transformation: [
              { width: 400, height: 400, crop: "fill", gravity: "face" },
            ], // Auto crop & optimize for profiles
          },
        );

        // Map secure links back to your schema structures
        user.avatar = {
          url: uploadResponse.secure_url,
          thumb: uploadResponse.secure_url.replace(
            "/upload/",
            "/upload/w_150,c_thumb/",
          ), // Fast thumbnail path interpolation
        };

        // Also sync it down into provider_profile object fields
        user.provider_profile = {
          ...user.provider_profile,
          avatar_url: uploadResponse.secure_url,
        };
      } catch (uploadErr) {
        console.error("Cloudinary Asset Dispatch Upload Failure:", uploadErr);
        return res.status(500).json({
          success: false,
          message: "Failed to upload profile picture to cloud storage.",
        });
      }
    }

    // 🎯 Persist separate first and last name values securely
    if (profileDetails.firstName || profileDetails.lastName) {
      const fName = (profileDetails.firstName || user.name?.first || "").trim();
      const lName = (profileDetails.lastName || user.name?.last || "").trim();

      user.name = {
        first: fName,
        last: lName,
        full: `${fName} ${lName}`.trim(),
        display: fName,
      };
    }

    // Update steps
    user.type = "provider";
    user.onboarding.current_step = "completed";
    user.onboarding.completed = true;
    user.onboarding.terms_accepted = profileDetails.consent || true;
    user.onboarding.terms_accepted_at = new Date();
    user.current_step = "completed";
    user.status = "verification_pending";

    // Deep merge data fields safely
    user.provider_profile = {
      ...user.provider_profile,
      category: profileDetails.category || user.provider_profile?.category,
      secondaryCategories: profileDetails.secondaryCategory
        ? [profileDetails.secondaryCategory]
        : profileDetails.secondaryCategories ||
          user.provider_profile?.secondaryCategories ||
          [],
      service_area: profileDetails.area || user.provider_profile?.service_area,
      service_radius_km:
        Number(profileDetails.radius) ||
        user.provider_profile?.service_radius_km ||
        5,
      bio: profileDetails.bio || user.provider_profile?.bio,
      id_type: profileDetails.idType || user.provider_profile?.id_type,
      id_number: profileDetails.idNumber || user.provider_profile?.id_number,
      id_doc_url: profileDetails.idDocUrl || user.provider_profile?.id_doc_url,
      base_price:
        Number(profileDetails.basePrice) ||
        user.provider_profile?.base_price ||
        0,
      open_for_work:
        profileDetails.openForWork ??
        user.provider_profile?.open_for_work ??
        true,
    };

    user.audit = {
      ...user.audit,
      updated_at: new Date(),
    };

    await user.save();

    // Sanitize user document so it matches your payload formatting layout perfectly
    const sanitizedUser = formatUserPayload(user);

    return res.status(200).json({
      success: true,
      message: "Provider professional profile completed successfully.",
      data: {
        user: sanitizedUser,
      },
    });
  } catch (error) {
    console.error("Provider Profile Final Save Error:", error);
    next(error);
  }
}

//export async function // controllers/authController.js

export async function selectRole(req, res) {
  console.log(req.body.role);
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

    const sanitizedUser = formatUserPayload(user);

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

// 📄 Location: src/controllers/authController.js

export async function logoutUser(req, res, next) {
  try {
    // If you use HTTP-Only Cookies alongside tokens, clear them immediately here
    res.clearCookie("token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });

    // Logging telemetry for administrative tracking audit loops
    if (req.user?.id) {
      console.log(`User Session ID ${req.user.id} logged out securely.`);
    }

    return res.status(200).json({
      success: true,
      message: "Session invalidated and logged out successfully.",
    });
  } catch (error) {
    console.error("Backend Logout Error:", error);
    next(error);
  }
}

// 📄 Location: src/controllers/authController.js

export async function getMe(req, res, next) {
  try {
    // 1. Fetch user document from database using the verified token ID
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User account not found.",
      });
    }

    // 2. 🚀 THE ULTIMATE FIX: Cleanly sanitize using your global layout helper!
    // This forces Shape 2 to match the flat structure of Shape 1 perfectly
    const sanitizedUser = formatUserPayload(user);

    // 3. To maintain your specific client navbar badge mapping, inject 'job' onto the clean object
    sanitizedUser.job = user.provider_profile?.category || "Not In Services";

    console.log(sanitizedUser);
    return res.status(200).json({
      success: true,
      data: {
        user: sanitizedUser, // 🔥 Standardized signature matching your authentication paths
      },
    });
  } catch (error) {
    console.error("Hydration route profile recovery error:", error);
    next(error);
  }
}

// 📦 Utility to sanitize and structure the user packet for the frontend
//this function is being call in the
export function formatUserPayload(user) {
  if (!user) return null;

  const typeRole = user.type || user.role || "customer";

  // Isolate first and last names from the database document fields securely
  const firstName = user.name?.first || user.firstName || "";
  const lastName = user.name?.last || user.lastName || "";
  const fullName =
    user.name?.full ||
    user.fullName ||
    `${firstName} ${lastName}`.trim() ||
    "User Account";

  return {
    id: user._id,
    _id: user._id,
    email: user.email || "",
    phone: user.phone || "",
    identifier: user.email || user.phone || "",
    type: typeRole,
    role: typeRole,
    roles: user.roles || ["user"],
    status: user.status || "verification_pending",

    // 🚀 THE BULLETPROOF NAME FIX: Provide BOTH root flat keys AND the nested name object wrapper!
    first: firstName,
    last: lastName,
    full: fullName,
    display: user.name?.display || firstName || "User",

    name: {
      first: firstName,
      last: lastName,
      full: fullName,
      display: user.name?.display || firstName || "User",
    },

    avatar: {
      url: user.avatar?.url || user.provider_profile?.avatar_url || "",
      thumb: user.avatar?.thumb || "",
    },

    completed: user.onboarding?.completed ?? user.completed ?? false,
    current_step:
      user.onboarding?.current_step || user.current_step || "welcome",
    onboarding: {
      completed: user.onboarding?.completed ?? user.completed ?? false,
      terms_accepted: user.onboarding?.terms_accepted ?? false,
      current_step: user.onboarding?.current_step || "welcome",
    },

    provider_profile: user.provider_profile || null,
    job: user.provider_profile?.category || "Not In Services",
  };
}
