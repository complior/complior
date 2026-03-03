import { describe, it, expect, vi } from 'vitest';
import { compliorAgent } from '../agent.js';
import { PermissionDeniedError, BudgetExceededError, RateLimitError, CircuitBreakerError } from '../errors.js';
import type { AgentPassport, AgentConfig } from '../agent.js';
import type { ActionLogEntry } from '../post/action-log.js';

// Mock LLM client that looks like OpenAI
const createMockClient = () => ({
  chat: {
    completions: {
      create: vi.fn().mockResolvedValue({
        id: 'chatcmpl-test',
        choices: [{ message: { content: 'Hello!' } }],
        usage: { prompt_tokens: 100, completion_tokens: 50 },
      }),
    },
  },
});

const createPassport = (overrides?: Partial<AgentPassport>): AgentPassport => ({
  permissions: {
    tools: [],
    denied: [],
  },
  constraints: {
    rate_limits: { max_actions_per_minute: 60 },
    budget: { max_cost_per_session_usd: 10 },
    prohibited_actions: [],
  },
  ...overrides,
});

describe('compliorAgent', () => {
  describe('permission enforcement', () => {
    it('allows calls when no restrictions', async () => {
      const client = createMockClient();
      const wrapped = compliorAgent(client, {
        passport: createPassport(),
        jurisdictions: ['EU'],
      });

      const result = await wrapped.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'user', content: 'Hello' }],
      });

      expect(result).toBeDefined();
      expect(client.chat.completions.create).toHaveBeenCalled();
    });

    it('blocks denied methods', async () => {
      const client = createMockClient();
      const wrapped = compliorAgent(client, {
        passport: createPassport({
          permissions: { tools: [], denied: ['create'] },
        }),
        jurisdictions: ['EU'],
      });

      await expect(
        wrapped.chat.completions.create({
          model: 'gpt-4',
          messages: [{ role: 'user', content: 'Hello' }],
        }),
      ).rejects.toThrow(PermissionDeniedError);
    });

    it('blocks prohibited actions', async () => {
      const client = createMockClient();
      const wrapped = compliorAgent(client, {
        passport: createPassport({
          constraints: {
            rate_limits: { max_actions_per_minute: 60 },
            budget: { max_cost_per_session_usd: 10 },
            prohibited_actions: ['create'],
          },
        }),
        jurisdictions: ['EU'],
      });

      await expect(
        wrapped.chat.completions.create({
          model: 'gpt-4',
          messages: [{ role: 'user', content: 'Hello' }],
        }),
      ).rejects.toThrow(PermissionDeniedError);
    });

    it('enforces tools allowlist when non-empty', async () => {
      const client = createMockClient();
      const wrapped = compliorAgent(client, {
        passport: createPassport({
          permissions: { tools: ['search', 'read'], denied: [] },
        }),
        jurisdictions: ['EU'],
      });

      await expect(
        wrapped.chat.completions.create({
          model: 'gpt-4',
          messages: [{ role: 'user', content: 'Hello' }],
        }),
      ).rejects.toThrow(PermissionDeniedError);
    });
  });

  describe('rate limiting', () => {
    it('allows calls under rate limit', async () => {
      const client = createMockClient();
      const wrapped = compliorAgent(client, {
        passport: createPassport({
          constraints: {
            rate_limits: { max_actions_per_minute: 10 },
            budget: { max_cost_per_session_usd: 100 },
            prohibited_actions: [],
          },
        }),
        jurisdictions: ['EU'],
      });

      // Should succeed
      const result = await wrapped.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'user', content: 'Hello' }],
      });
      expect(result).toBeDefined();
    });

    it('blocks when rate limit exceeded', async () => {
      const client = createMockClient();
      const config: AgentConfig = {
        passport: createPassport({
          constraints: {
            rate_limits: { max_actions_per_minute: 2 },
            budget: { max_cost_per_session_usd: 100 },
            prohibited_actions: [],
          },
        }),
        jurisdictions: ['EU'],
      };
      const wrapped = compliorAgent(client, config);

      // First two should succeed
      await wrapped.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'user', content: '1' }],
      });
      await wrapped.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'user', content: '2' }],
      });

      // Third should fail
      await expect(
        wrapped.chat.completions.create({
          model: 'gpt-4',
          messages: [{ role: 'user', content: '3' }],
        }),
      ).rejects.toThrow(RateLimitError);
    });
  });

  describe('budget tracking', () => {
    it('tracks cost in metadata', async () => {
      const client = createMockClient();
      const wrapped = compliorAgent(client, {
        passport: createPassport(),
        jurisdictions: ['EU'],
        budgetLimitUsd: 100,
      });

      const result = await wrapped.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'user', content: 'Hello' }],
      }) as Record<string, unknown>;

      const compliorMeta = result['_complior'] as Record<string, unknown>;
      const metadata = compliorMeta['metadata'] as Record<string, unknown>;
      const budget = metadata['budget'] as Record<string, number>;

      expect(budget).toBeDefined();
      expect(budget['totalCost']).toBeGreaterThanOrEqual(0);
      expect(budget['limitUsd']).toBe(100);
    });

    it('throws BudgetExceededError when limit exceeded', async () => {
      const client = createMockClient();
      // Set very low budget
      const wrapped = compliorAgent(client, {
        passport: createPassport({
          constraints: {
            rate_limits: { max_actions_per_minute: 1000 },
            budget: { max_cost_per_session_usd: 0 },
            prohibited_actions: [],
          },
        }),
        jurisdictions: ['EU'],
        budgetLimitUsd: 0.000001,
      });

      // High-token response should exceed tiny budget
      client.chat.completions.create.mockResolvedValue({
        id: 'chatcmpl-test',
        choices: [{ message: { content: 'Long response' } }],
        usage: { prompt_tokens: 10000, completion_tokens: 5000 },
      });

      await expect(
        wrapped.chat.completions.create({
          model: 'gpt-4',
          messages: [{ role: 'user', content: 'Hello' }],
        }),
      ).rejects.toThrow(BudgetExceededError);
    });
  });

  describe('action logging', () => {
    it('calls onAction callback for each call', async () => {
      const actionLog: ActionLogEntry[] = [];
      const client = createMockClient();
      const wrapped = compliorAgent(client, {
        passport: createPassport(),
        jurisdictions: ['EU'],
        onAction: (entry) => actionLog.push(entry),
      });

      await wrapped.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'user', content: 'Hello' }],
      });

      expect(actionLog).toHaveLength(1);
      expect(actionLog[0]!.provider).toBe('openai');
      expect(actionLog[0]!.method).toBe('create');
      expect(actionLog[0]!.timestamp).toBeDefined();
    });
  });

  describe('integration with base hooks', () => {
    it('still runs base compliance hooks (disclosure, prohibited)', async () => {
      const client = createMockClient();
      const wrapped = compliorAgent(client, {
        passport: createPassport(),
        jurisdictions: ['EU'],
      });

      const result = await wrapped.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'user', content: 'Hello' }],
      }) as Record<string, unknown>;

      // Base hooks should have added _complior metadata
      expect(result['_complior']).toBeDefined();
    });
  });

  describe('circuit breaker (C.R14)', () => {
    it('passes through when no errors', async () => {
      const client = createMockClient();
      const wrapped = compliorAgent(client, {
        passport: createPassport(),
        jurisdictions: ['EU'],
        circuitBreaker: { errorThreshold: 3 },
      });

      const result = await wrapped.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'user', content: 'Hello' }],
      }) as Record<string, unknown>;

      const meta = result['_complior'] as Record<string, unknown>;
      const metadata = meta['metadata'] as Record<string, unknown>;
      const cb = metadata['circuitBreaker'] as { state: string };
      expect(cb.state).toBe('closed');
    });

    it('trips after consecutive error responses', async () => {
      const client = createMockClient();
      // Mock to return error responses
      client.chat.completions.create.mockResolvedValue({
        error: 'service unavailable',
        usage: { prompt_tokens: 10, completion_tokens: 5 },
      });

      const wrapped = compliorAgent(client, {
        passport: createPassport(),
        jurisdictions: ['EU'],
        circuitBreaker: { errorThreshold: 2, windowMs: 60_000 },
      });

      // First error — passes through
      await wrapped.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'user', content: '1' }],
      });

      // Second error — trips
      await expect(
        wrapped.chat.completions.create({
          model: 'gpt-4',
          messages: [{ role: 'user', content: '2' }],
        }),
      ).rejects.toThrow(CircuitBreakerError);
    });

    it('recovers after cooldown', async () => {
      const client = createMockClient();
      client.chat.completions.create.mockResolvedValue({
        error: 'down',
        usage: { prompt_tokens: 0, completion_tokens: 0 },
      });

      const transitions: string[] = [];
      const wrapped = compliorAgent(client, {
        passport: createPassport(),
        jurisdictions: ['EU'],
        circuitBreaker: {
          errorThreshold: 1,
          cooldownMs: 50,
          onTrip: (s) => transitions.push(s),
        },
      });

      // Trip the breaker
      await expect(
        wrapped.chat.completions.create({
          model: 'gpt-4',
          messages: [{ role: 'user', content: '1' }],
        }),
      ).rejects.toThrow(CircuitBreakerError);

      // Wait for cooldown
      await new Promise(r => setTimeout(r, 60));

      // Switch back to success responses
      client.chat.completions.create.mockResolvedValue({
        id: 'chatcmpl-ok',
        choices: [{ message: { content: 'Recovered!' } }],
        usage: { prompt_tokens: 10, completion_tokens: 5 },
      });

      // Should recover
      const result = await wrapped.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'user', content: 'probe' }],
      });
      expect(result).toBeDefined();
      expect(transitions).toContain('half-open');
      expect(transitions).toContain('closed');
    });
  });
});
