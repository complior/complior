import { describe, it, expect } from 'vitest';
import { createPolicyEngine, ProxyPolicySchema } from './policy-engine.js';

describe('createPolicyEngine', () => {
  describe('basic allow/deny', () => {
    it('allows by default when default_action is allow', () => {
      const engine = createPolicyEngine({
        version: '1.0',
        default_action: 'allow',
        rules: [],
      });
      expect(engine.evaluate('any_tool').allowed).toBe(true);
    });

    it('denies by default when default_action is deny', () => {
      const engine = createPolicyEngine({
        version: '1.0',
        default_action: 'deny',
        rules: [],
      });
      const result = engine.evaluate('any_tool');
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('default policy is deny');
    });

    it('denies a specific tool', () => {
      const engine = createPolicyEngine({
        version: '1.0',
        default_action: 'allow',
        rules: [{ name: 'no-exec', action: 'deny', tool: 'execute_command', reason: 'Execution not allowed' }],
      });
      const result = engine.evaluate('execute_command');
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('Execution not allowed');
      expect(result.rule).toBe('no-exec');
    });

    it('allows non-matching tools when a deny rule exists', () => {
      const engine = createPolicyEngine({
        version: '1.0',
        default_action: 'allow',
        rules: [{ name: 'no-exec', action: 'deny', tool: 'execute_command' }],
      });
      expect(engine.evaluate('read_file').allowed).toBe(true);
    });
  });

  describe('tool_pattern matching', () => {
    it('matches tools by regex pattern', () => {
      const engine = createPolicyEngine({
        version: '1.0',
        default_action: 'allow',
        rules: [{ name: 'no-write', action: 'deny', tool_pattern: '^write_' }],
      });
      expect(engine.evaluate('write_file').allowed).toBe(false);
      expect(engine.evaluate('write_db').allowed).toBe(false);
      expect(engine.evaluate('read_file').allowed).toBe(true);
    });

    it('handles invalid regex gracefully', () => {
      const engine = createPolicyEngine({
        version: '1.0',
        default_action: 'allow',
        rules: [{ name: 'bad-regex', action: 'deny', tool_pattern: '[invalid' }],
      });
      // Invalid regex = no match, so default applies
      expect(engine.evaluate('anything').allowed).toBe(true);
    });
  });

  describe('arg_pattern matching', () => {
    it('denies based on argument patterns', () => {
      const engine = createPolicyEngine({
        version: '1.0',
        default_action: 'allow',
        rules: [{
          name: 'no-root-write',
          action: 'deny',
          tool: 'write_file',
          arg_pattern: { path: '^\\/etc\\/' },
          reason: 'Cannot write to /etc/',
        }],
      });
      expect(engine.evaluate('write_file', { path: '/etc/passwd' }).allowed).toBe(false);
      expect(engine.evaluate('write_file', { path: '/home/user/file' }).allowed).toBe(true);
    });

    it('requires all arg patterns to match', () => {
      const engine = createPolicyEngine({
        version: '1.0',
        default_action: 'allow',
        rules: [{
          name: 'strict',
          action: 'deny',
          tool: 'query',
          arg_pattern: { table: 'users', action: 'delete' },
        }],
      });
      expect(engine.evaluate('query', { table: 'users', action: 'delete' }).allowed).toBe(false);
      expect(engine.evaluate('query', { table: 'users', action: 'select' }).allowed).toBe(true);
      expect(engine.evaluate('query', { table: 'logs', action: 'delete' }).allowed).toBe(true);
    });

    it('does not match when args are missing', () => {
      const engine = createPolicyEngine({
        version: '1.0',
        default_action: 'allow',
        rules: [{
          name: 'deny-path',
          action: 'deny',
          tool: 'read_file',
          arg_pattern: { path: 'secret' },
        }],
      });
      expect(engine.evaluate('read_file').allowed).toBe(true); // no args
      expect(engine.evaluate('read_file', {}).allowed).toBe(true); // no path arg
    });
  });

  describe('first-match-wins', () => {
    it('applies first matching rule', () => {
      const engine = createPolicyEngine({
        version: '1.0',
        default_action: 'deny',
        rules: [
          { name: 'allow-read', action: 'allow', tool: 'read_file' },
          { name: 'deny-all', action: 'deny' }, // matches everything
        ],
      });
      expect(engine.evaluate('read_file').allowed).toBe(true);
      expect(engine.evaluate('read_file').rule).toBe('allow-read');
      expect(engine.evaluate('write_file').allowed).toBe(false);
      expect(engine.evaluate('write_file').rule).toBe('deny-all');
    });

    it('stops at first match even with multiple matches', () => {
      const engine = createPolicyEngine({
        version: '1.0',
        default_action: 'allow',
        rules: [
          { name: 'allow-specific', action: 'allow', tool: 'dangerous_tool' },
          { name: 'deny-dangerous', action: 'deny', tool_pattern: 'dangerous' },
        ],
      });
      // First rule matches, second is never evaluated
      expect(engine.evaluate('dangerous_tool').allowed).toBe(true);
    });
  });

  describe('rate limiting', () => {
    it('allows calls within rate limit', () => {
      const engine = createPolicyEngine({
        version: '1.0',
        default_action: 'deny',
        rules: [{
          name: 'limited-read',
          action: 'allow',
          tool: 'read_file',
          rate_limit: { max_calls: 3, window_seconds: 60 },
        }],
      });
      expect(engine.evaluate('read_file').allowed).toBe(true);
      expect(engine.evaluate('read_file').allowed).toBe(true);
      expect(engine.evaluate('read_file').allowed).toBe(true);
    });

    it('denies calls exceeding rate limit', () => {
      const engine = createPolicyEngine({
        version: '1.0',
        default_action: 'deny',
        rules: [{
          name: 'limited-read',
          action: 'allow',
          tool: 'read_file',
          rate_limit: { max_calls: 2, window_seconds: 60 },
        }],
      });
      expect(engine.evaluate('read_file').allowed).toBe(true);
      expect(engine.evaluate('read_file').allowed).toBe(true);
      const result = engine.evaluate('read_file');
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Rate limit exceeded');
    });

    it('rate limit window resets after expiry', async () => {
      const engine = createPolicyEngine({
        version: '1.0',
        default_action: 'deny',
        rules: [{
          name: 'fast-limit',
          action: 'allow',
          tool: 'test_tool',
          rate_limit: { max_calls: 1, window_seconds: 1 },
        }],
      });
      expect(engine.evaluate('test_tool').allowed).toBe(true);
      expect(engine.evaluate('test_tool').allowed).toBe(false);
      // Wait for window to expire
      await new Promise(resolve => setTimeout(resolve, 1100));
      expect(engine.evaluate('test_tool').allowed).toBe(true);
    });

    it('rate limits are per-rule, not per-tool', () => {
      const engine = createPolicyEngine({
        version: '1.0',
        default_action: 'deny',
        rules: [
          { name: 'limit-read', action: 'allow', tool: 'read_file', rate_limit: { max_calls: 1, window_seconds: 60 } },
          { name: 'limit-write', action: 'allow', tool: 'write_file', rate_limit: { max_calls: 1, window_seconds: 60 } },
        ],
      });
      expect(engine.evaluate('read_file').allowed).toBe(true);
      expect(engine.evaluate('write_file').allowed).toBe(true);
      expect(engine.evaluate('read_file').allowed).toBe(false);
      expect(engine.evaluate('write_file').allowed).toBe(false);
    });
  });

  describe('wildcard rules', () => {
    it('rule without tool or tool_pattern matches all tools', () => {
      const engine = createPolicyEngine({
        version: '1.0',
        default_action: 'deny',
        rules: [{ name: 'allow-all', action: 'allow' }],
      });
      expect(engine.evaluate('anything').allowed).toBe(true);
      expect(engine.evaluate('something_else').allowed).toBe(true);
    });
  });

  describe('schema validation', () => {
    it('validates a complete policy', () => {
      const policy = {
        version: '1.0',
        default_action: 'allow',
        rules: [
          { name: 'r1', action: 'deny', tool: 'exec', reason: 'No exec' },
          { name: 'r2', action: 'allow', tool_pattern: '^read_', rate_limit: { max_calls: 10, window_seconds: 60 } },
        ],
      };
      const result = ProxyPolicySchema.safeParse(policy);
      expect(result.success).toBe(true);
    });

    it('rejects invalid version', () => {
      const result = ProxyPolicySchema.safeParse({ version: '2.0', default_action: 'allow', rules: [] });
      expect(result.success).toBe(false);
    });

    it('rejects invalid action', () => {
      const result = ProxyPolicySchema.safeParse({
        version: '1.0',
        default_action: 'allow',
        rules: [{ name: 'bad', action: 'maybe' }],
      });
      expect(result.success).toBe(false);
    });
  });
});
