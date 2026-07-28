// src/services/eventBus.js
import { EventEmitter } from "events";

export const subscribeEvent = () => {};

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

// 🔑 THE FIX: Explicitly export this as a named constant!
export const publishEvent = (eventName, eventData) => {
  authEventBusInstance.publishEvent(eventName, eventData);
};

// Keep default export for the instance if needed elsewhere
export default authEventBusInstance;
