// src/services/eventBus.js
import { EventEmitter } from "events";

class AuthEventBus extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(20);
  }

  publishEvent(eventName, eventData) {
    this.emit(eventName, eventData);
  }
}

const authEventBusInstance = new AuthEventBus();

// Publish an event to all subscribers.
export const publishEvent = (eventName, eventData) => {
  authEventBusInstance.publishEvent(eventName, eventData);
};

// Subscribe a handler to an event (used by the admin audit-log handlers).
export const subscribeEvent = (eventName, handler) => {
  authEventBusInstance.on(eventName, handler);
};

// Keep default export for the instance if needed elsewhere
export default authEventBusInstance;
