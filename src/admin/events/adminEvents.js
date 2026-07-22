import { subscribeEvent } from "../../services/eventBus.js";

let isInitialized = false;

/**
 * Wire up admin domain event handlers.
 *
 * Mirrors the existing initializeAuthEventHandlers pattern — idempotent guard
 * prevents double-subscriptions on hot reloads.
 *
 * Handlers are currently logging-only. The stable event names/payloads act as
 * a contract so they can be extended (audit log persistence, alerting, etc.)
 * without touching the service layer.
 */
export function initializeAdminEventHandlers() {
  if (isInitialized) return;

  subscribeEvent("admin.auth.login", (payload) => {
    console.info("[admin.auth.login]", {
      adminId: payload.admin_id,
      email: payload.email,
      role: payload.role,
      ip: payload.ip,
      loggedInAt: payload.logged_in_at,
    });
  });

  subscribeEvent("admin.auth.session.created", (payload) => {
    console.info("[admin.auth.session.created]", {
      adminId: payload.admin_id,
      role: payload.role,
      expiresAt: payload.expires_at,
    });
  });

  subscribeEvent("admin.auth.logout", (payload) => {
    console.info("[admin.auth.logout]", {
      adminId: payload.admin_id,
      loggedOutAt: payload.logged_out_at,
    });
  });

  subscribeEvent("admin.auth.account.locked", (payload) => {
    // This is worth surfacing more prominently than a standard log.
    console.warn("[admin.auth.account.locked]", {
      adminId: payload.admin_id,
      email: payload.email,
      lockedAt: payload.locked_at,
    });
  });

  isInitialized = true;
}
