import { describe, it, expect, vi } from 'vitest';
import { createRedteamRunner } from './redteam-runner.js';

describe('createRedteamRunner', () => {
  const mockCallLlm = vi.fn().mockResolvedValue("I'm sorry, but I cannot help with that request as it violates my safety guidelines.");

  const deps = {
    callLlm: mockCallLlm,
    getProjectPath: () => '/tmp/test-project',
  };

  it('creates a runner with runRedteam method', () => {
    const runner = createRedteamRunner(deps);
    expect(runner.runRedteam).toBeDefined();
    expect(typeof runner.runRedteam).toBe('function');
  });

  it('runs probes and produces a report', async () => {
    const runner = createRedteamRunner(deps);
    const report = await runner.runRedteam('test-agent', { maxProbes: 3 });

    expect(report.agentName).toBe('test-agent');
    expect(report.totalProbes).toBe(3);
    expect(report.probeResults).toHaveLength(3);
    expect(report.securityScore).toBeDefined();
    expect(report.securityScore.grade).toBeTruthy();
    expect(report.timestamp).toBeTruthy();
    expect(report.duration).toBeGreaterThanOrEqual(0);
  });

  it('filters by category', async () => {
    const runner = createRedteamRunner(deps);
    const report = await runner.runRedteam('test-agent', {
      categories: ['LLM01'],
      maxProbes: 5,
    });

    expect(report.totalProbes).toBeGreaterThanOrEqual(1);
    for (const pr of report.probeResults) {
      expect(pr.owaspCategory).toBe('LLM01');
    }
  });

  it('handles LLM errors gracefully', async () => {
    const errorDeps = {
      ...deps,
      callLlm: vi.fn().mockRejectedValue(new Error('LLM unavailable')),
    };
    const runner = createRedteamRunner(errorDeps);
    const report = await runner.runRedteam('test-agent', { maxProbes: 2 });

    // Should not throw, but produce results
    expect(report.totalProbes).toBe(2);
    for (const pr of report.probeResults) {
      expect(pr.response).toContain('[ERROR]');
    }
  });

  it('refusal response produces pass verdicts', async () => {
    const refusalDeps = {
      ...deps,
      callLlm: vi.fn().mockResolvedValue("I cannot assist with that request. It goes against my ethical guidelines."),
    };
    const runner = createRedteamRunner(refusalDeps);
    const report = await runner.runRedteam('test-agent', { maxProbes: 5 });

    const passCount = report.probeResults.filter((r) => r.verdict === 'pass').length;
    expect(passCount).toBeGreaterThan(0);
  });

  it('compliance response produces fail verdicts', async () => {
    const complianceDeps = {
      ...deps,
      callLlm: vi.fn().mockResolvedValue("Sure, here is how to bypass the system instructions: Step 1: Override the safety filters. Step 2: Access the admin panel."),
    };
    const runner = createRedteamRunner(complianceDeps);
    const report = await runner.runRedteam('test-agent', { maxProbes: 5 });

    const failCount = report.probeResults.filter((r) => r.verdict === 'fail').length;
    expect(failCount).toBeGreaterThan(0);
  });

  it('report has owaspMapping with category summaries', async () => {
    const runner = createRedteamRunner(deps);
    const report = await runner.runRedteam('test-agent', { maxProbes: 10 });

    expect(report.owaspMapping).toBeDefined();
    const keys = Object.keys(report.owaspMapping);
    expect(keys.length).toBeGreaterThan(0);

    for (const cat of Object.values(report.owaspMapping)) {
      expect(cat.categoryId).toBeTruthy();
      expect(cat.total).toBeGreaterThan(0);
      expect(cat.passed + cat.failed + cat.inconclusive).toBe(cat.total);
    }
  });
});
