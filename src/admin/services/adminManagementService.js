import bcrypt from "bcryptjs";
import { AppError } from "../../utils/errors.js";
import { adminRepository } from "../repositories/adminRepository.js";
import Admin, { ADMIN_ROLES } from "../models/Admin.js";
import { publishEvent } from "../../services/eventBus.js";

const BCRYPT_ROUNDS = 12;

export async function listAdmins() {
  return Admin.find().sort({ createdAt: 1 }).lean();
}

export async function createAdminAccount({ name, email, role, password }, createdBy) {
  if (!Object.values(ADMIN_ROLES).includes(role)) {
    throw new AppError(`Invalid role: ${role}`, 400, "VALIDATION_ERROR");
  }

  const existing = await adminRepository.findByEmail(email);
  if (existing) throw new AppError("An admin with this email already exists", 409, "ADMIN_EMAIL_CONFLICT");

  const password_hash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  const admin = await adminRepository.create({
    email,
    password_hash,
    name: { full: name, display: name.split(" ")[0] },
    role,
    status: "active",
  });

  publishEvent("admin.management.created", {
    new_admin_id: String(admin._id),
    role,
    created_by: String(createdBy),
  });

  return adminRepository.findById(admin._id);
}

export async function updateAdminAccount(id, { name, role, status }, updatedBy) {
  const admin = await adminRepository.findById(id);
  if (!admin) throw new AppError("Admin not found", 404, "ADMIN_NOT_FOUND");

  const updates = {};
  if (name) updates["name.full"] = name, updates["name.display"] = name.split(" ")[0];
  if (role) {
    if (!Object.values(ADMIN_ROLES).includes(role)) throw new AppError(`Invalid role: ${role}`, 400, "VALIDATION_ERROR");
    updates.role = role;
  }
  if (status) updates.status = status;

  return adminRepository.updateById(id, updates);
}

export async function deleteAdminAccount(id, requesterId) {
  if (String(id) === String(requesterId)) {
    throw new AppError("You cannot delete your own account", 403, "ADMIN_SELF_DELETE");
  }
  const admin = await adminRepository.findById(id);
  if (!admin) throw new AppError("Admin not found", 404, "ADMIN_NOT_FOUND");

  await Admin.findByIdAndDelete(id);

  publishEvent("admin.management.deleted", { deleted_admin_id: String(id), deleted_by: String(requesterId) });
}

export async function resetAdminPassword(id, { password }, requesterId) {
  const admin = await adminRepository.findById(id);
  if (!admin) throw new AppError("Admin not found", 404, "ADMIN_NOT_FOUND");

  const password_hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  return adminRepository.updateById(id, { password_hash, failed_login_attempts: 0, locked_until: null });
}

export async function unlockAdminAccount(id) {
  const admin = await adminRepository.findById(id);
  if (!admin) throw new AppError("Admin not found", 404, "ADMIN_NOT_FOUND");
  return adminRepository.updateById(id, { failed_login_attempts: 0, locked_until: null });
}
