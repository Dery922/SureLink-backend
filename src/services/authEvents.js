import { subscribeEvent } from "./eventBus.js";

let isInitialized = false;

export function initializeAuthEventHandlers() {
  if (isInitialized) return;

  subscribeEvent("auth.otp.requested", (payload) => {
    console.info("[auth.otp.requested]", {
      phone: payload.phone,
      expiresInSeconds: payload.expires_in_seconds,
      requestedAt: payload.requested_at,
    });
  });

  subscribeEvent("auth.otp.verified", (payload) => {
    console.info("[auth.otp.verified]", {
      phone: payload.phone,
      verifiedAt: payload.verified_at,
    });
  });

  subscribeEvent("auth.user.created", (payload) => {
    console.info("[auth.user.created]", {
      userId: payload.user_id,
      phone: payload.phone,
      createdAt: payload.created_at,
    });
  });

  subscribeEvent("auth.session.created", (payload) => {
    console.info("[auth.session.created]", {
      userId: payload.user_id,
      expiresAt: payload.expires_at,
      createdAt: payload.created_at,
    });
  });

  isInitialized = true;
}
