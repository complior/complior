import { describe, it, expect, vi } from 'vitest';
import { createEventsRoute } from './events.route.js';
import type { EventBusPort, EventMap, EventHandler } from '../../ports/events.port.js';

const createMockEventBus = (): EventBusPort & { _handlers: Map<string, Set<EventHandler<never>>> } => {
  const handlers = new Map<string, Set<EventHandler<never>>>();
  return {
    _handlers: handlers,
    on: <K extends keyof EventMap>(event: K, handler: EventHandler<EventMap[K]>) => {
      if (!handlers.has(event)) handlers.set(event, new Set());
      handlers.get(event)!.add(handler as EventHandler<never>);
    },
    off: <K extends keyof EventMap>(event: K, handler: EventHandler<EventMap[K]>) => {
      handlers.get(event)?.delete(handler as EventHandler<never>);
    },
    emit: <K extends keyof EventMap>(event: K, payload: EventMap[K]) => {
      const set = handlers.get(event);
      if (set) for (const h of set) (h as EventHandler<EventMap[K]>)(payload);
    },
  };
};

describe('events route', () => {
  it('responds with text/event-stream content type', async () => {
    const events = createMockEventBus();
    const app = createEventsRoute({ events });

    const res = await app.request('/events');
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/event-stream');
  });

  it('registers handlers for agent events on connect', async () => {
    const events = createMockEventBus();
    const app = createEventsRoute({ events });

    // Start SSE connection (don't await body — it's streaming)
    const res = await app.request('/events');
    expect(res.status).toBe(200);

    // Event bus should have handlers registered
    expect(events._handlers.has('agent.scan.completed')).toBe(true);
    expect(events._handlers.has('agent.score.updated')).toBe(true);
    expect(events._handlers.has('scan.completed')).toBe(true);
  });
});

describe('agent events in EventMap', () => {
  it('agent.scan.completed event can be emitted and received', () => {
    const events = createMockEventBus();
    const received: unknown[] = [];

    events.on('agent.scan.completed', (payload) => {
      received.push(payload);
    });

    const mockResult = { score: { score: 82 }, findings: [] } as never;
    events.emit('agent.scan.completed', { agentName: 'test-agent', result: mockResult });

    expect(received).toHaveLength(1);
    expect(received[0]).toMatchObject({ agentName: 'test-agent' });
  });

  it('agent.score.updated event can be emitted and received', () => {
    const events = createMockEventBus();
    const received: unknown[] = [];

    events.on('agent.score.updated', (payload) => {
      received.push(payload);
    });

    events.emit('agent.score.updated', { agentName: 'chat-bot', before: 60, after: 75 });

    expect(received).toHaveLength(1);
    expect(received[0]).toMatchObject({ agentName: 'chat-bot', before: 60, after: 75 });
  });
});

describe('agent strip data extraction', () => {
  it('extracts name, autonomy_level, and score from passport JSON', () => {
    const passport = {
      name: 'core-engine',
      autonomy_level: 3,
      compliance: { complior_score: 82 },
    };

    const name = passport.name;
    const autonomy = passport.autonomy_level;
    const score = passport.compliance.complior_score;

    expect(name).toBe('core-engine');
    expect(autonomy).toBe(3);
    expect(score).toBe(82);
  });

  it('handles missing fields gracefully', () => {
    const passport: Record<string, unknown> = { name: 'minimal' };

    const name = (passport['name'] as string) ?? 'unknown';
    const autonomy = (passport['autonomy_level'] as number) ?? 0;
    const compliance = passport['compliance'] as Record<string, unknown> | undefined;
    const score = (compliance?.['complior_score'] as number) ?? 0;

    expect(name).toBe('minimal');
    expect(autonomy).toBe(0);
    expect(score).toBe(0);
  });
});
