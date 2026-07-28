import { AppError } from "../../services/errors.js";
import { userProviderRepository } from "../repositories/userProviderRepository.js";
import { publishEvent } from "../../services/eventBus.js";

export async function listProviders({ status, search, page, limit }) {
  return userProviderRepository.findAll({ status, search, page, limit });
}

export async function getProviderStats() {
  return userProviderRepository.countByStatus();
}

export async function getProvider(id) {
  const provider = await userProviderRepository.findById(id);
  if (!provider) throw new AppError("Provider not found", 404, "PROVIDER_NOT_FOUND");
  return provider;
}

export async function approveProvider(id, adminId) {
  const provider = await userProviderRepository.findById(id);
  if (!provider) throw new AppError("Provider not found", 404, "PROVIDER_NOT_FOUND");
  if (provider.status === "active") throw new AppError("Provider is already active", 409, "PROVIDER_ALREADY_ACTIVE");

  const updated = await userProviderRepository.updateStatus(id, "active");
  publishEvent("admin.provider.approved", { provider_id: id, admin_id: String(adminId) });
  return updated;
}

export async function suspendProvider(id, adminId) {
  const provider = await userProviderRepository.findById(id);
  if (!provider) throw new AppError("Provider not found", 404, "PROVIDER_NOT_FOUND");
  if (provider.status === "suspended") throw new AppError("Provider is already suspended", 409, "PROVIDER_ALREADY_SUSPENDED");

  const updated = await userProviderRepository.updateStatus(id, "suspended");
  publishEvent("admin.provider.suspended", { provider_id: id, admin_id: String(adminId) });
  return updated;
}

export async function reinstateProvider(id, adminId) {
  const provider = await userProviderRepository.findById(id);
  if (!provider) throw new AppError("Provider not found", 404, "PROVIDER_NOT_FOUND");

  const updated = await userProviderRepository.updateStatus(id, "active");
  publishEvent("admin.provider.reinstated", { provider_id: id, admin_id: String(adminId) });
  return updated;
}
