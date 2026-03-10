import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import type { EventBusPort, EventMap } from '../../ports/events.port.js';

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

export const createEventsRoute = (deps: EventsRouteDeps) => {
  const app = new Hono();

  app.get('/events', (c) => {
    return streamSSE(c, async (stream) => {
      type Handler = (payload: never) => void;
      const handlers: Array<{ event: keyof EventMap; handler: Handler }> = [];

      for (const eventName of FORWARDED_EVENTS) {
        const handler = ((payload: unknown) => {
          stream.writeSSE({ event: eventName, data: JSON.stringify(payload) }).catch(() => {});
        }) as Handler;
        deps.events.on(eventName, handler);
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
