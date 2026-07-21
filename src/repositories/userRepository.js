import User from "../models/User.js";

export class UserRepository {
  async findByPhone(phone) {
    return User.findOne({ phone });
  }

  async findByEmail(email) {
    return User.findOne({ email });
  }

  async create(payload) {
    return User.create(payload);
  }

  async updateLastLogin(userId) {
    return User.findByIdAndUpdate(
      userId,
      {
        $set: {
          "audit.last_login_at": new Date(),
        },
      },
      { new: true },
    );
  }
}

export const userRepository = new UserRepository();
