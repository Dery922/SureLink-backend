import { EventEmitter } from "events";

class DomainEventBus extends EventEmitter {}

const eventBus = new DomainEventBus();

export function publishEvent(eventName, payload) {
  eventBus.emit(eventName, payload);
}

export function subscribeEvent(eventName, handler) {
  eventBus.on(eventName, handler);
}

export default eventBus;
