import type { EventMap, EventHandler, EventBusPort } from '../ports/events.port.js';

export const createEventBus = (): EventBusPort => {
  const listeners = new Map<keyof EventMap, Set<EventHandler<unknown>>>();

  const on = <K extends keyof EventMap>(event: K, handler: EventHandler<EventMap[K]>): void => {
    if (!listeners.has(event)) {
      listeners.set(event, new Set());
    }
    listeners.get(event)!.add(handler as EventHandler<unknown>);
  };

  const off = <K extends keyof EventMap>(event: K, handler: EventHandler<EventMap[K]>): void => {
    listeners.get(event)?.delete(handler as EventHandler<unknown>);
  };

  const emit = <K extends keyof EventMap>(event: K, payload: EventMap[K]): void => {
    const handlers = listeners.get(event);
    if (handlers !== undefined) {
      for (const handler of handlers) {
        handler(payload);
      }
    }
  };

  return Object.freeze({ on, off, emit });
};

export type EventBus = ReturnType<typeof createEventBus>;
