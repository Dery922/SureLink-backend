import crypto from "crypto";
import { AppError } from "../utils/errors.js";

/**
 * UserFactory - Handles creation of user-related objects
 */
export class UserFactory {
  /**
   * Create a new user object for database insertion
   */
  static createUserPayload({
    phone,
    email,
    type,
    fullName,
  }) {
    if (!phone || !fullName || !type) {
      throw new AppError("Phone, fullName, and type are required", 400, "VALIDATION_ERROR");
    }

    return {
      phone,
      email: email || undefined,
      type,
      roles: ["user"],
      status: "verification_pending",
      name: this.createNameObject(fullName),
      verification: {
        phone: { verified: true, verified_at: new Date() },
        email: { verified: false },
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
      phone: user.phone,
      email: user.email || null,
      type: user.type,
      status: user.status,
      name: user.name,
    };
  }

  /**
   * Create audit trail for user
   */
  static createAuditEntry(action, metadata = {}) {
    return {
      action,
      timestamp: new Date(),
      ...metadata,
    };
  }
}
