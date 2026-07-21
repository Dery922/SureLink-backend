import { successResponse } from "../../utils/apiResponse.js";
import { AdminFactory } from "../services/adminFactory.js";
import * as adminManagementService from "../services/adminManagementService.js";

function safe(admin) {
  return AdminFactory.createPublicAdmin(admin);
}

export async function list(req, res, next) {
  try {
    const admins = await adminManagementService.listAdmins();
    return res.json(successResponse({ message: "Admins retrieved", data: { admins: admins.map(safe) } }));
  } catch (err) { return next(err); }
}

export async function create(req, res, next) {
  try {
    const admin = await adminManagementService.createAdminAccount(req.body, req.admin._id);
    return res.status(201).json(successResponse({ message: "Admin created", data: { admin: safe(admin) } }));
  } catch (err) { return next(err); }
}

export async function update(req, res, next) {
  try {
    const admin = await adminManagementService.updateAdminAccount(req.params.id, req.body, req.admin._id);
    return res.json(successResponse({ message: "Admin updated", data: { admin: safe(admin) } }));
  } catch (err) { return next(err); }
}

export async function remove(req, res, next) {
  try {
    await adminManagementService.deleteAdminAccount(req.params.id, req.admin._id);
    return res.json(successResponse({ message: "Admin deleted", data: null }));
  } catch (err) { return next(err); }
}

export async function resetPassword(req, res, next) {
  try {
    await adminManagementService.resetAdminPassword(req.params.id, req.body, req.admin._id);
    return res.json(successResponse({ message: "Password reset", data: null }));
  } catch (err) { return next(err); }
}

export async function unlock(req, res, next) {
  try {
    const admin = await adminManagementService.unlockAdminAccount(req.params.id);
    return res.json(successResponse({ message: "Account unlocked", data: { admin: safe(admin) } }));
  } catch (err) { return next(err); }
}
