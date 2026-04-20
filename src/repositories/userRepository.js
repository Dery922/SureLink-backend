import User from "../models/User.js";

/**
 * UserRepository (MongoDB/Mongoose).
 *
 * This abstraction keeps auth services decoupled from Mongoose details and
 * makes it easier to swap persistence approaches or add caching later.
 */
export class UserRepository {
  /**
   * Find a user by E.164-like normalized phone (e.g. `233XXXXXXXXX`).
   */
  async findByPhone(phone) {
    return User.findOne({ phone });
  }

  async findByEmail(email) {
    return User.findOne({ email });
  }

  /**
   * Create a user document from a validated payload.
   */
  async create(payload) {
    return User.create(payload);
  }
}

export const userRepository = new UserRepository();
