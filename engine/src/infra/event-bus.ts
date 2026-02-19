import type { EventMap, EventHandler, EventBusPort } from '../ports/events.port.js';

export const createEventBus = (): EventBusPort => {
  // Handlers stored as (payload: never) => void exploiting contravariance:
  // (payload: T) => void is assignable to (payload: never) => void for all T
  const listeners = new Map<string, Set<(payload: never) => void>>();

  const on = <K extends keyof EventMap>(event: K, handler: EventHandler<EventMap[K]>): void => {
    if (!listeners.has(event)) {
      listeners.set(event, new Set());
    }
    listeners.get(event)!.add(handler);
  };

  const off = <K extends keyof EventMap>(event: K, handler: EventHandler<EventMap[K]>): void => {
    listeners.get(event)?.delete(handler);
  };

  const emit = <K extends keyof EventMap>(event: K, payload: EventMap[K]): void => {
    const handlers = listeners.get(event);
    if (handlers !== undefined) {
      for (const handler of handlers) {
        Reflect.apply(handler, undefined, [payload]);
      }
    }
  };

  return Object.freeze({ on, off, emit });
};

export type EventBus = ReturnType<typeof createEventBus>;
