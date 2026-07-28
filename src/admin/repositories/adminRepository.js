import Admin from "../models/Admin.js";

/**
 * AdminRepository (MongoDB/Mongoose).
 *
 * Mirrors the UserRepository pattern: services stay decoupled from Mongoose
 * details, and swapping persistence is a one-file change.
 *
 * Security note: `findByEmailWithPassword` is the only method that opts in to
 * `password_hash`. All other finders intentionally exclude it.
 */
export class AdminRepository {
  /**
   * Find an admin by email (password_hash excluded).
   */
  async findByEmail(email) {
    return Admin.findOne({ email: email.toLowerCase().trim() });
  }

  /**
   * Find an admin by email, explicitly including password_hash.
   *
   * Only call this during login — no other flow needs the hash.
   */
  async findByEmailWithPassword(email) {
    return Admin.findOne({ email: email.toLowerCase().trim() }).select(
      "+password_hash",
    );
  }

  /**
   * Find an admin by MongoDB _id (password_hash excluded).
   */
  async findById(id) {
    return Admin.findById(id);
  }

  /**
   * Create a new admin document.
   */
  async create(payload) {
    return Admin.create(payload);
  }

  /**
   * Patch a single admin document.
   *
   * Returns the updated document (new: true) or null if not found.
   */
  async updateById(id, updates) {
    return Admin.findByIdAndUpdate(id, updates, { new: true });
  }

  /**
   * Increment failed login attempts.
   */
  async incrementFailedLogins(id) {
    return Admin.findByIdAndUpdate(
      id,
      { $inc: { failed_login_attempts: 1 } },
      { new: true },
    );
  }

  /**
   * Reset failed login attempts and update last-login metadata.
   */
  async recordSuccessfulLogin(id, { ip }) {
    return Admin.findByIdAndUpdate(
      id,
      {
        $set: {
          failed_login_attempts: 0,
          locked_until: null,
          last_login_at: new Date(),
          last_login_ip: ip || null,
        },
      },
      { new: true },
    );
  }
}

export const adminRepository = new AdminRepository();
