import { describe, it, expect } from 'vitest';
import { generateComplianceTests } from './test-generator.js';

describe('generateComplianceTests', () => {
  it('generates basic test suite', () => {
    const result = generateComplianceTests({ name: 'test-agent' });
    expect(result.filename).toBe('test-agent-compliance-tests.ts');
    expect(result.testCount).toBe(1); // minimum test
    expect(result.content).toContain('test-agent');
  });

  it('generates permission tests', () => {
    const result = generateComplianceTests({
      name: 'bot',
      permissions: { tools: ['read', 'write'], denied: ['delete'] },
    });
    expect(result.testCount).toBe(3);
    expect(result.content).toContain("should allow tool: read");
    expect(result.content).toContain("should allow tool: write");
    expect(result.content).toContain("should block tool: delete");
  });

  it('generates rate limit tests', () => {
    const result = generateComplianceTests({
      name: 'bot',
      constraints: { rate_limits: [{ action: 'api_call', limit: 100, window: '1h' }] },
    });
    expect(result.testCount).toBe(1);
    expect(result.content).toContain('rate limit');
  });

  it('generates prohibited action tests', () => {
    const result = generateComplianceTests({
      name: 'bot',
      constraints: { prohibited_actions: ['deploy', 'delete_data'] },
    });
    expect(result.testCount).toBe(2);
  });

  it('generates escalation rule tests', () => {
    const result = generateComplianceTests({
      name: 'bot',
      constraints: {
        escalation_rules: [
          { condition: 'high_risk_decision', escalate_to: 'human_supervisor' },
        ],
      },
    });
    expect(result.testCount).toBe(1);
    expect(result.content).toContain('escalate');
    expect(result.content).toContain('high_risk_decision');
  });

  it('generates budget tests', () => {
    const result = generateComplianceTests({
      name: 'bot',
      constraints: { budget: { max_cost: 50, currency: 'EUR' } },
    });
    expect(result.testCount).toBe(1);
    expect(result.content).toContain('budget');
    expect(result.content).toContain('50');
  });

  it('generates all constraint types together', () => {
    const result = generateComplianceTests({
      name: 'full-bot',
      permissions: { tools: ['read'], denied: ['delete'] },
      constraints: {
        rate_limits: [{ action: 'api_call', limit: 100, window: '1h' }],
        prohibited_actions: ['deploy'],
        escalation_rules: [{ condition: 'risk', escalate_to: 'admin' }],
        budget: { max_cost: 50, currency: 'USD' },
      },
    });
    // 1 allowed + 1 denied + 1 rate limit + 1 prohibited + 1 escalation + 1 budget = 6
    expect(result.testCount).toBe(6);
  });

  it('includes vitest import', () => {
    const result = generateComplianceTests({ name: 'x' });
    expect(result.content).toContain("import { describe, it, expect } from 'vitest'");
  });

  it('includes regeneration comment', () => {
    const result = generateComplianceTests({ name: 'my-agent' });
    expect(result.content).toContain('complior agent test-gen my-agent');
  });

  it('returns frozen result', () => {
    const result = generateComplianceTests({ name: 'x' });
    expect(Object.isFrozen(result)).toBe(true);
  });
});
