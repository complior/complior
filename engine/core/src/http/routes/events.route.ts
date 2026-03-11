import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import type { EventBusPort, EventHandler, EventMap } from '../../ports/events.port.js';

export interface EventsRouteDeps {
  readonly events: EventBusPort;
}

const FORWARDED_EVENTS: readonly (keyof EventMap)[] = [
  'scan.completed',
  'scan.started',
  'scan.drift',
  'score.updated',
  'file.changed',
  'gate.checked',
  'fix.validated',
  'fix.undone',
  'agent.scan.completed',
  'agent.score.updated',
  'badge.generated',
  'share.created',
  'external-scan.completed',
  'report.generated',
];

/** Subscribe to a typed event and forward its payload as SSE JSON. */
const subscribeEvent = <K extends keyof EventMap>(
  events: EventBusPort,
  eventName: K,
  write: (event: string, data: string) => void,
): EventHandler<EventMap[K]> => {
  const handler: EventHandler<EventMap[K]> = (payload) => {
    write(eventName, JSON.stringify(payload));
  };
  events.on(eventName, handler);
  return handler;
};

export const createEventsRoute = (deps: EventsRouteDeps) => {
  const app = new Hono();

  app.get('/events', (c) => {
    return streamSSE(c, async (stream) => {
      const handlers: Array<{ event: keyof EventMap; handler: EventHandler<EventMap[keyof EventMap]> }> = [];

      const write = (event: string, data: string): void => {
        stream.writeSSE({ event, data }).catch(() => {});
      };

      for (const eventName of FORWARDED_EVENTS) {
        const handler = subscribeEvent(deps.events, eventName, write);
        handlers.push({ event: eventName, handler });
      }

      // Keep alive — send comment ping every 30s
      try {
        while (true) {
          await stream.writeSSE({ event: 'ping', data: '' });
          await stream.sleep(30_000);
        }
      } finally {
        // Cleanup listeners on disconnect
        for (const { event, handler } of handlers) {
          deps.events.off(event, handler);
        }
      }
    });
  });

  return app;
};
