import crypto from "crypto";
import { AppError } from "./errors.js";

/**
 * UserFactory - Handles creation of user-related objects
 */
export class UserFactory {
  /**
   * Create a new user object for database insertion.
   *
   * A user needs at least one identifier (phone OR email). `channel` records
   * which one was OTP-verified so the matching verification flag is set.
   */
  static createUserPayload({
    phone,
    email,
    type,
    fullName,
    channel,
  }) {
    if ((!phone && !email) || !fullName || !type) {
      throw new AppError("An identifier (phone or email), fullName, and type are required", 400, "VALIDATION_ERROR");
    }

    const now = new Date();
    return {
      phone: phone || undefined,
      email: email || undefined,
      roles: [type],
      status: "verification_pending",
      name: this.createNameObject(fullName),
      verification: {
        phone: { verified: channel === "phone", verified_at: channel === "phone" ? now : undefined },
        email: { verified: channel === "email", verified_at: channel === "email" ? now : undefined },
      },
    };
  }

  /**
   * Create a name object from full name string
   */
  static createNameObject(fullName) {
    const clean = String(fullName || "").trim().replace(/\s+/g, " ");
    if (!clean) {
      return { full: "", first: "", last: "", display: "" };
    }

    const [first = "", ...rest] = clean.split(" ");
    const last = rest.join(" ");
    return { full: clean, first, last, display: first || clean };
  }

  /**
   * Create a public user response object
   */
  static createPublicUser(user) {
    if (!user || !user._id) {
      throw new AppError("Invalid user object", 500, "USER_FACTORY_ERROR");
    }

    return {
      id: user._id,
      phone: user.phone || null,
      email: user.email || null,
      roles: user.roles || [],
      status: user.status,
      name: user.name,
    };
  }
}
