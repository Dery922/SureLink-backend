import crypto from "crypto";
import { AppError } from "../utils/errors.js";

/**
 * UserFactory - Handles creation of user-related objects
 */

export class UserFactory {
  /**
   * Generates a bare-minimum footprint payload for new OTP registrations.
   * Allows fields like name and phone/email to remain unpopulated until onboarding.
   */
  static createUserPayload({ phone, email, type = "customer" }) {
    if (!phone && !email) {
      throw new AppError(
        "An email or phone number is required to register.",
        400,
        "VALIDATION_ERROR",
      );
    }

    // Build the payload mapping structure to strictly match your User.js schema layout
    return {
      phone: phone || undefined, // undefined strips empty fields to avoid unique null conflicts in Mongo
      email: email ? email.trim().toLowerCase() : undefined,
      type: type || "customer",
      roles: ["user"],
      status: "verification_pending", // Held in pending status until profile setup forms are complete
      verification: {
        phone: { verified: !!phone, verified_at: phone ? new Date() : null },
        email: { verified: !!email, verified_at: email ? new Date() : null },
      },
      audit: {
        created_at: new Date(),
        updated_at: new Date(),
      },
    };
  }

  /**
   * Sanitizes a raw database document down to safe public parameters for the client.
   */
  static createPublicUser(userDoc) {
    if (!userDoc) return null;

    return {
      id: userDoc._id.toString() || userDoc.id,
      phone: userDoc.phone || null,
      email: userDoc.email || null,
      name: userDoc.name || { full: "", display: "", first: "", last: "" },
      type: userDoc.type,
      status: userDoc.status,
      roles: userDoc.type,
      onboarding: userDoc.onboarding || {
        completed: false,
        current_step: "role_selection",
      },
    };
  }
}
