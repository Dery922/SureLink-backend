import { AppError } from "../../services/errors.js";
import { deliveryRepository } from "../repositories/deliveryRepository.js";
import { zoneRepository } from "../repositories/zoneRepository.js";

export async function getOperationsSummary() {
  const [counts, avgMin, zones] = await Promise.all([
    deliveryRepository.countByStatus(),
    deliveryRepository.avgDeliveryMinutes(),
    zoneRepository.findAll(),
  ]);

  return {
    active_deliveries: counts.active,
    delayed: counts.delayed,
    completed_today: counts.completedToday,
    avg_delivery_minutes: avgMin,
    zones: zones.map((z) => ({
      id: z._id,
      name: z.name,
      capacity: z.capacity,
      active_drivers: z.active_drivers,
      utilisation_pct: z.capacity ? Math.round((z.active_drivers / z.capacity) * 100) : 0,
    })),
  };
}

export async function listDeliveries({ status, page, limit }) {
  return deliveryRepository.findAll({ status, page, limit });
}

export async function listZones() {
  const zones = await zoneRepository.findAll();
  return zones.map((z) => ({
    ...z,
    utilisation_pct: z.capacity ? Math.round((z.active_drivers / z.capacity) * 100) : 0,
  }));
}

export async function updateZone(id, payload) {
  const zone = await zoneRepository.findById(id);
  if (!zone) throw new AppError("Zone not found", 404, "ZONE_NOT_FOUND");
  return zoneRepository.updateById(id, payload);
}
