import { EventEmitter } from "events";

/**
 * Minimal in-process domain event bus.
 *
 * Purpose:
 * - Decouple side effects (logging/notifications/analytics) from core auth flows
 *   without introducing a full external queue.
 *
 * Scope:
 * - In-memory only: events are not durable and won't cross process boundaries.
 *   Treat handlers as "best effort" and keep them non-critical.
 */
class DomainEventBus extends EventEmitter {}

const eventBus = new DomainEventBus();

/**
 * Publish a domain event.
 *
 * Keep payloads serializable/plain objects so handlers can later be migrated
 * to a real queue with minimal changes.
 */
export function publishEvent(eventName, payload) {
  eventBus.emit(eventName, payload);
}

/**
 * Subscribe to a domain event.
 *
 * Handlers should be fast and never throw; if they can fail, they should handle
 * their own errors so the caller flow remains unaffected.
 */
export function subscribeEvent(eventName, handler) {
  eventBus.on(eventName, handler);
}

export default eventBus;
